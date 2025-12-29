// src/modules/sync/core/SyncEngine.ts

import { PrismaClient } from '@prisma/client';
import { SyncQueue } from './SyncQueue';
import { DeduplicationEngine } from './DeduplicationEngine';
import { ConflictResolver } from './ConflictResolver';
import { getPluginRegistry } from '../plugins/PluginRegistry';
import {
  SyncContext,
  SyncResult,
  SyncStatus,
  EntityType,
  ConflictStrategy,
  SyncDirection,
  IntegrationConfig
} from './types';

/**
 * 🚀 SYNC ENGINE
 * 
 * Motor principal de sincronização que orquestra:
 * - Plugins
 * - Fila de jobs
 * - Deduplicação
 * - Resolução de conflitos
 * - Logs
 */
export class SyncEngine {
  private queue: SyncQueue;
  private deduplicationEngine: DeduplicationEngine;
  private conflictResolver: ConflictResolver;

  constructor(private prisma: PrismaClient) {
    this.queue = new SyncQueue(prisma);
    this.deduplicationEngine = new DeduplicationEngine();
    this.conflictResolver = new ConflictResolver();
  }

  /**
   * SYNC TO OMNI
   * Sincroniza dados de sistema externo para OMNI
   */
  async syncToOmni(
    companyId: string,
    integration: string,
    entity: EntityType,
    externalData: any,
    options?: {
      dryRun?: boolean;
      skipDeduplication?: boolean;
    }
  ): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      // 1. Buscar configuração
      const config = await this.getIntegrationConfig(companyId, integration);
      if (!config || !config.enabled) {
        return this.createErrorResult(
          'INTEGRATION_DISABLED',
          `Integration ${integration} is not enabled for this company`
        );
      }

      // 2. Buscar plugin
      const plugin = getPluginRegistry().getInitializedPlugin(companyId, integration);
      if (!plugin) {
        return this.createErrorResult(
          'PLUGIN_NOT_FOUND',
          `Plugin ${integration} not initialized`
        );
      }

      // 3. Validar se plugin suporta entidade
      if (!plugin.supportsEntity(entity)) {
        return this.createErrorResult(
          'ENTITY_NOT_SUPPORTED',
          `Plugin ${integration} does not support entity ${entity}`
        );
      }

      // 4. Mapear dados para formato OMNI
      const mappedData = plugin.mapToOmni(entity, externalData);

      // 5. Deduplicação (se não for skip)
      let internalId: string | undefined;
      
      if (!options?.skipDeduplication) {
        const matchResult = await this.findDuplicates(companyId, entity, mappedData.data);
        
        if (matchResult.matched && matchResult.candidateId) {
          internalId = matchResult.candidateId;
          
          // Registrar mapeamento
          await this.createEntityMapping(
            companyId,
            entity,
            internalId,
            externalData.id,
            integration,
            matchResult.matchScore,
            matchResult.matchMethod
          );
        }
      }

      // 6. Executar sync via plugin (se não for dry run)
      const context: SyncContext = {
        companyId,
        integration,
        config,
        direction: SyncDirection.TO_OMNI,
        dryRun: options?.dryRun
      };

      const result = await plugin.syncToOmni(entity, externalData, context);

      // 7. Registrar log
      const duration = Date.now() - startTime;
      await this.logSync({
        companyId,
        integration,
        entity,
        action: internalId ? 'update' : 'create',
        direction: 'to_omni',
        externalId: externalData.id,
        internalId: result.internalId || internalId,
        status: result.success ? 'success' : 'failed',
        errorMessage: result.error?.message,
        duration
      });

      return { ...result, duration };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      await this.logSync({
        companyId,
        integration,
        entity,
        action: 'create',
        direction: 'to_omni',
        externalId: externalData.id,
        status: 'failed',
        errorMessage: error.message,
        duration
      });

      return this.createErrorResult('SYNC_ERROR', error.message);
    }
  }

  /**
   * SYNC FROM OMNI
   * Sincroniza dados de OMNI para sistema externo
   */
  async syncFromOmni(
    companyId: string,
    integration: string,
    entity: EntityType,
    omniData: any,
    options?: {
      dryRun?: boolean;
    }
  ): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      // 1. Buscar configuração
      const config = await this.getIntegrationConfig(companyId, integration);
      if (!config || !config.enabled) {
        return this.createErrorResult(
          'INTEGRATION_DISABLED',
          `Integration ${integration} is not enabled`
        );
      }

      // 2. Buscar plugin
      const plugin = getPluginRegistry().getInitializedPlugin(companyId, integration);
      if (!plugin) {
        return this.createErrorResult(
          'PLUGIN_NOT_FOUND',
          `Plugin ${integration} not initialized`
        );
      }

      // 3. Validar se plugin suporta entidade
      if (!plugin.supportsEntity(entity)) {
        return this.createErrorResult(
          'ENTITY_NOT_SUPPORTED',
          `Plugin ${integration} does not support entity ${entity}`
        );
      }

      // 4. Executar sync via plugin
      const context: SyncContext = {
        companyId,
        integration,
        config,
        direction: SyncDirection.FROM_OMNI,
        dryRun: options?.dryRun
      };

      const result = await plugin.syncFromOmni(entity, omniData, context);

      // 5. Registrar mapeamento se criou novo
      if (result.success && result.externalId && omniData.id) {
        await this.createEntityMapping(
          companyId,
          entity,
          omniData.id,
          result.externalId,
          integration,
          100,
          'exact_email'
        );
      }

      // 6. Registrar log
      const duration = Date.now() - startTime;
      await this.logSync({
        companyId,
        integration,
        entity,
        action: result.externalId ? 'create' : 'update',
        direction: 'from_omni',
        internalId: omniData.id,
        externalId: result.externalId,
        status: result.success ? 'success' : 'failed',
        errorMessage: result.error?.message,
        duration
      });

      return { ...result, duration };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      await this.logSync({
        companyId,
        integration,
        entity,
        action: 'create',
        direction: 'from_omni',
        internalId: omniData.id,
        status: 'failed',
        errorMessage: error.message,
        duration
      });

      return this.createErrorResult('SYNC_ERROR', error.message);
    }
  }

  /**
   * HANDLE WEBHOOK
   * Processa webhook de sistema externo
   */
  async handleWebhook(
    integration: string,
    payload: any,
    companyId: string
  ): Promise<SyncResult> {
    try {
      // 1. Registrar webhook recebido
      await this.prisma.webhookLog.create({
        data: {
          integration,
          event: payload.event || 'unknown',
          payload,
          status: 'received'
        }
      });

      // 2. Buscar configuração
      const config = await this.getIntegrationConfig(companyId, integration);
      if (!config || !config.enabled) {
        return this.createErrorResult(
          'INTEGRATION_DISABLED',
          `Integration ${integration} is not enabled`
        );
      }

      // 3. Buscar plugin
      const plugin = getPluginRegistry().getInitializedPlugin(companyId, integration);
      if (!plugin) {
        return this.createErrorResult(
          'PLUGIN_NOT_FOUND',
          `Plugin ${integration} not initialized`
        );
      }

      // 4. Processar via plugin
      const context: SyncContext = {
        companyId,
        integration,
        config,
        direction: SyncDirection.TO_OMNI
      };

      const result = await plugin.handleWebhook(payload, context);

      // 5. Atualizar status do webhook
      await this.prisma.webhookLog.updateMany({
        where: {
          integration,
          createdAt: { gte: new Date(Date.now() - 5000) } // últimos 5s
        },
        data: {
          status: result.success ? 'processed' : 'failed',
          processedAt: new Date(),
          error: result.error?.message
        }
      });

      return result;

    } catch (error: any) {
      await this.prisma.webhookLog.updateMany({
        where: {
          integration,
          createdAt: { gte: new Date(Date.now() - 5000) }
        },
        data: {
          status: 'failed',
          processedAt: new Date(),
          error: error.message
        }
      });

      return this.createErrorResult('WEBHOOK_ERROR', error.message);
    }
  }

  /**
   * FIND DUPLICATES
   * Busca duplicatas usando deduplication engine
   */
  private async findDuplicates(
    companyId: string,
    entity: EntityType,
    data: any
  ) {
    // Buscar candidatos no banco
    let candidates: any[] = [];

    if (entity === EntityType.CONTACT) {
      candidates = await this.prisma.contact.findMany({
        where: { companyId },
        take: 100 // Limitar para performance
      });
    } else if (entity === EntityType.DEAL) {
      candidates = await this.prisma.deal.findMany({
        where: { companyId },
        take: 100
      });
    }

    // Executar fuzzy matching
    return this.deduplicationEngine.findMatches(entity, data, candidates);
  }

  /**
   * CREATE ENTITY MAPPING
   * Cria mapeamento entre ID interno e externo
   */
  private async createEntityMapping(
    companyId: string,
    entity: string,
    internalId: string,
    externalId: string,
    integration: string,
    matchScore: number,
    matchMethod: string
  ): Promise<void> {
    await this.prisma.entityMapping.upsert({
      where: {
        companyId_entity_internalId_integration: {
          companyId,
          entity,
          internalId,
          integration
        }
      },
      create: {
        companyId,
        entity,
        internalId,
        externalId,
        integration,
        matchScore,
        matchMethod
      },
      update: {
        externalId,
        matchScore,
        matchMethod,
        updatedAt: new Date()
      }
    });
  }

  /**
   * GET INTEGRATION CONFIG
   * Busca configuração de integração
   */
  private async getIntegrationConfig(
    companyId: string,
    integration: string
  ): Promise<IntegrationConfig | null> {
    const config = await this.prisma.integrationConfig.findUnique({
      where: {
        companyId_integration: {
          companyId,
          integration
        }
      }
    });

    if (!config) return null;

    return {
      integration: config.integration,
      enabled: config.enabled,
      config: config.config as Record<string, any>,
      syncSettings: config.syncSettings as any
    };
  }

  /**
   * LOG SYNC
   * Registra log de sincronização
   */
  private async logSync(data: {
    companyId: string;
    integration: string;
    entity: string;
    action: string;
    direction: string;
    externalId?: string;
    internalId?: string;
    status: string;
    errorMessage?: string;
    duration?: number;
  }): Promise<void> {
    await this.prisma.syncLog.create({
      data: {
        companyId: data.companyId,
        integration: data.integration,
        entity: data.entity,
        action: data.action,
        direction: data.direction,
        externalId: data.externalId,
        internalId: data.internalId,
        status: data.status,
        errorMessage: data.errorMessage,
        duration: data.duration
      }
    });
  }

  /**
   * CREATE ERROR RESULT
   */
  private createErrorResult(code: string, message: string): SyncResult {
    return {
      success: false,
      status: SyncStatus.FAILED,
      error: {
        code,
        message,
        retryable: true
      }
    };
  }

  /**
   * GET QUEUE
   * Acesso à fila
   */
  getQueue(): SyncQueue {
    return this.queue;
  }
}