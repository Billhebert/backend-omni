// src/modules/sync/routes/sync.routes.ts

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { SyncEngine } from '../core/SyncEngine';
import { getPluginRegistry } from '../plugins/PluginRegistry';
import { EntityType, ConflictStrategy, SyncDirection } from '../core/types';

/**
 * 🔄 SYNC ROUTES
 * 
 * Endpoints para gerenciar sincronizações:
 * - Ativar/desativar integrações
 * - Sincronização manual
 * - Estatísticas
 * - Logs
 * - Fila
 */

// ============================================
// SCHEMAS
// ============================================

const createIntegrationConfigSchema = z.object({
  integration: z.string().min(1),
  enabled: z.boolean().default(true),
  config: z.record(z.any()),
  syncSettings: z.object({
    entities: z.array(z.enum(['contact', 'deal', 'appointment', 'product', 'invoice'])),
    direction: z.enum(['to_omni', 'from_omni', 'bidirectional']),
    conflictStrategy: z.enum(['newest_wins', 'omni_wins', 'external_wins', 'merge', 'manual']),
    autoSync: z.boolean().default(true),
    syncInterval: z.number().optional(),
    batchSize: z.number().optional()
  }).optional()
});

const updateIntegrationConfigSchema = createIntegrationConfigSchema.partial();

const manualSyncSchema = z.object({
  integration: z.string(),
  entity: z.enum(['contact', 'deal', 'appointment', 'product', 'invoice']),
  direction: z.enum(['to_omni', 'from_omni']),
  entityId: z.string().optional(), // Se omitido, sync todos
  dryRun: z.boolean().optional().default(false)
});

const logFiltersSchema = z.object({
  integration: z.string().optional(),
  entity: z.enum(['contact', 'deal', 'appointment', 'product', 'invoice']).optional(),
  status: z.enum(['success', 'failed', 'skipped', 'conflict']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 50).pipe(z.number().min(1).max(500))
});

export async function syncRoutes(fastify: FastifyInstance) {
  const engine = new SyncEngine(fastify.prisma);
  const registry = getPluginRegistry();

  // ============================================
  // CONFIGURAÇÕES DE INTEGRAÇÃO
  // ============================================

  /**
   * CREATE/UPDATE INTEGRATION CONFIG
   * Ativa ou atualiza configuração de integração
   */
  fastify.post(
    '/sync/config',
    { onRequest: [fastify.authenticate] },
    async (req, reply) => {
      const companyId = (req.user as any).companyId;
      const data = createIntegrationConfigSchema.parse(req.body);

      // Verificar se plugin existe
      if (!registry.hasPlugin(data.integration)) {
        return reply.code(404).send({
          error: 'Plugin not found',
          availablePlugins: registry.listPluginNames()
        });
      }

      // Criar/atualizar configuração
      const config = await fastify.prisma.integrationConfig.upsert({
        where: {
          companyId_integration: {
            companyId,
            integration: data.integration
          }
        },
        create: {
          companyId,
          integration: data.integration,
          enabled: data.enabled,
          config: data.config,
          syncSettings: data.syncSettings || {}
        },
        update: {
          enabled: data.enabled,
          config: data.config,
          syncSettings: data.syncSettings,
          updatedAt: new Date()
        }
      });

      // Se ativado, inicializar plugin
      if (data.enabled) {
        try {
          await registry.initializeForCompany(companyId, data.integration, {
            integration: data.integration,
            enabled: data.enabled,
            config: data.config,
            syncSettings: data.syncSettings
          });

          return {
            success: true,
            message: `Integration ${data.integration} configured and initialized`,
            config
          };
        } catch (error: any) {
          return reply.code(400).send({
            error: 'Failed to initialize plugin',
            message: error.message
          });
        }
      }

      // Se desativado, remover plugin inicializado
      if (!data.enabled) {
        registry.removeInitializedPlugin(companyId, data.integration);
      }

      return {
        success: true,
        message: `Integration ${data.integration} ${data.enabled ? 'enabled' : 'disabled'}`,
        config
      };
    }
  );

  /**
   * LIST INTEGRATION CONFIGS
   * Lista configurações de integração da empresa
   */
  fastify.get(
    '/sync/config',
    { onRequest: [fastify.authenticate] },
    async (req) => {
      const companyId = (req.user as any).companyId;

      const configs = await fastify.prisma.integrationConfig.findMany({
        where: { companyId },
        orderBy: { integration: 'asc' }
      });

      return {
        configs,
        availablePlugins: registry.listPluginNames()
      };
    }
  );

  /**
   * GET INTEGRATION CONFIG
   * Busca configuração específica
   */
  fastify.get(
    '/sync/config/:integration',
    { onRequest: [fastify.authenticate] },
    async (req, reply) => {
      const companyId = (req.user as any).companyId;
      const { integration } = req.params as any;

      const config = await fastify.prisma.integrationConfig.findUnique({
        where: {
          companyId_integration: {
            companyId,
            integration
          }
        }
      });

      if (!config) {
        return reply.code(404).send({ error: 'Integration config not found' });
      }

      return config;
    }
  );

  /**
   * DELETE INTEGRATION CONFIG
   * Remove configuração de integração
   */
  fastify.delete(
    '/sync/config/:integration',
    { onRequest: [fastify.authenticate] },
    async (req, reply) => {
      const companyId = (req.user as any).companyId;
      const { integration } = req.params as any;

      // Verificar se existe
      const config = await fastify.prisma.integrationConfig.findUnique({
        where: {
          companyId_integration: {
            companyId,
            integration
          }
        }
      });

      if (!config) {
        return reply.code(404).send({ 
          error: 'Integration config not found',
          integration 
        });
      }

      // Remover plugin inicializado
      registry.removeInitializedPlugin(companyId, integration);

      // Deletar configuração
      await fastify.prisma.integrationConfig.delete({
        where: {
          companyId_integration: {
            companyId,
            integration
          }
        }
      });

      return { success: true, message: `Integration ${integration} removed` };
    }
  );

  // ============================================
  // SINCRONIZAÇÃO MANUAL
  // ============================================

  /**
   * MANUAL SYNC
   * Trigger sincronização manual
   */
  fastify.post(
    '/sync/manual',
    { onRequest: [fastify.authenticate] },
    async (req, reply) => {
      const companyId = (req.user as any).companyId;
      const data = manualSyncSchema.parse(req.body);

      // Verificar se integração está ativa
      const config = await fastify.prisma.integrationConfig.findUnique({
        where: {
          companyId_integration: {
            companyId,
            integration: data.integration
          }
        }
      });

      if (!config || !config.enabled) {
        return reply.code(400).send({
          error: 'Integration not enabled',
          integration: data.integration
        });
      }

      // TODO: Implementar sync manual
      // Se entityId fornecido, sync apenas essa entidade
      // Senão, sync todas as entidades configuradas

      return {
        success: true,
        message: 'Manual sync triggered',
        dryRun: data.dryRun
      };
    }
  );

  // ============================================
  // LOGS & ESTATÍSTICAS
  // ============================================

  /**
   * GET SYNC LOGS
   * Busca logs de sincronização
   */
  fastify.get(
    '/sync/logs',
    { onRequest: [fastify.authenticate] },
    async (req) => {
      const companyId = (req.user as any).companyId;
      const filters = logFiltersSchema.parse(req.query);

      const where: any = { companyId };

      if (filters.integration) where.integration = filters.integration;
      if (filters.entity) where.entity = filters.entity;
      if (filters.status) where.status = filters.status;

      if (filters.startDate || filters.endDate) {
        where.createdAt = {};
        if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
        if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
      }

      const logs = await fastify.prisma.syncLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filters.limit
      });

      return { logs, total: logs.length };
    }
  );

  /**
   * GET SYNC STATS
   * Estatísticas de sincronização
   */
  fastify.get(
    '/sync/stats',
    { onRequest: [fastify.authenticate] },
    async (req) => {
      const companyId = (req.user as any).companyId;

      const [total, success, failed, conflict, queueStats] = await Promise.all([
        fastify.prisma.syncLog.count({ where: { companyId } }),
        fastify.prisma.syncLog.count({ where: { companyId, status: 'success' } }),
        fastify.prisma.syncLog.count({ where: { companyId, status: 'failed' } }),
        fastify.prisma.syncLog.count({ where: { companyId, status: 'conflict' } }),
        engine.getQueue().getQueueStats(companyId)
      ]);

      // Stats por integração
      const byIntegration = await fastify.prisma.syncLog.groupBy({
        by: ['integration', 'status'],
        where: { companyId },
        _count: true
      });

      return {
        total,
        success,
        failed,
        conflict,
        successRate: total > 0 ? (success / total) * 100 : 0,
        queue: queueStats,
        byIntegration
      };
    }
  );

  // ============================================
  // FILA
  // ============================================

  /**
   * GET QUEUE STATUS
   * Status da fila de sincronização
   */
  fastify.get(
    '/sync/queue',
    { onRequest: [fastify.authenticate] },
    async (req) => {
      const companyId = (req.user as any).companyId;
      return engine.getQueue().getQueueStats(companyId);
    }
  );

  /**
   * RETRY FAILED JOB
   * Reagenda job falho
   */
  fastify.post(
    '/sync/queue/:jobId/retry',
    { onRequest: [fastify.authenticate] },
    async (req, reply) => {
      const { jobId } = req.params as any;

      const success = await engine.getQueue().retryFailedJob(jobId);

      if (!success) {
        return reply.code(404).send({ error: 'Job not found or not failed' });
      }

      return { success: true, message: 'Job rescheduled' };
    }
  );

  /**
   * CANCEL JOB
   * Cancela job pendente
   */
  fastify.delete(
    '/sync/queue/:jobId',
    { onRequest: [fastify.authenticate] },
    async (req, reply) => {
      const { jobId } = req.params as any;

      const success = await engine.getQueue().cancelJob(jobId);

      if (!success) {
        return reply.code(404).send({ error: 'Job not found or not pending' });
      }

      return { success: true, message: 'Job cancelled' };
    }
  );

  // ============================================
  // CONFLITOS
  // ============================================

  /**
   * LIST CONFLICTS
   * Lista conflitos pendentes
   */
  fastify.get(
    '/sync/conflicts',
    { onRequest: [fastify.authenticate] },
    async (req) => {
      const companyId = (req.user as any).companyId;

      const conflicts = await fastify.prisma.syncConflict.findMany({
        where: {
          companyId,
          status: 'pending'
        },
        orderBy: { createdAt: 'desc' }
      });

      return { conflicts, total: conflicts.length };
    }
  );

  /**
   * RESOLVE CONFLICT
   * Resolve conflito manualmente
   */
  fastify.post(
    '/sync/conflicts/:conflictId/resolve',
    { onRequest: [fastify.authenticate] },
    async (req, reply) => {
      const userId = (req.user as any).id;
      const { conflictId } = req.params as any;
      const { action, resolution } = req.body as any;

      // Verificar se conflito existe
      const conflict = await fastify.prisma.syncConflict.findUnique({
        where: { id: conflictId }
      });

      if (!conflict) {
        return reply.code(404).send({ 
          error: 'Conflict not found',
          conflictId 
        });
      }

      await fastify.prisma.syncConflict.update({
        where: { id: conflictId },
        data: {
          status: 'resolved',
          resolvedBy: userId,
          resolvedAt: new Date(),
          resolution
        }
      });

      return { success: true, message: 'Conflict resolved' };
    }
  );

  // ============================================
  // PLUGINS INFO
  // ============================================

  /**
   * LIST AVAILABLE PLUGINS
   * Lista plugins disponíveis no sistema
   */
  fastify.get('/sync/plugins', async () => {
    const plugins = registry.getAllPlugins();

    return {
      plugins: plugins.map(p => ({
        name: p.name,
        version: p.version,
        description: p.description,
        supportedEntities: p.getSupportedEntities()
      }))
    };
  });
}