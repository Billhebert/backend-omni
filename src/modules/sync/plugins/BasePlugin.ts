// src/modules/sync/plugins/BasePlugin.ts

import {
  ISyncPlugin,
  PluginMetadata,
  IntegrationConfig,
  SyncContext,
  SyncResult,
  SyncStatus,
  EntityType,
  EntityData,
  WebhookPayload,
  SyncError
} from '../core/types';

/**
 * 🔌 BASE PLUGIN
 * 
 * Classe abstrata base para todos os plugins de sincronização.
 * Implementa funcionalidades comuns e define interface padrão.
 */
export abstract class BasePlugin implements ISyncPlugin {
  // Metadata do plugin (deve ser definido pela classe filha)
  abstract name: string;
  abstract version: string;
  abstract description?: string;

  protected config?: IntegrationConfig;
  protected isInitialized: boolean = false;

  /**
   * METADATA
   * Deve ser implementado pela classe filha
   */
  abstract getMetadata(): PluginMetadata;

  /**
   * INITIALIZE
   * Inicializa o plugin com configurações
   */
  async initialize(config: IntegrationConfig): Promise<void> {
    if (!this.validateConfig(config.config)) {
      throw new Error(`Invalid configuration for plugin ${this.name}`);
    }

    this.config = config;
    this.isInitialized = true;

    // Hook para inicialização customizada
    await this.onInitialize(config);
  }

  /**
   * Hook para inicialização customizada
   * Pode ser sobrescrito pela classe filha
   */
  protected async onInitialize(config: IntegrationConfig): Promise<void> {
    // Override in child class if needed
  }

  /**
   * VALIDATE CONFIG
   * Valida se a configuração tem todos os campos necessários
   */
  validateConfig(config: Record<string, any>): boolean {
    const metadata = this.getMetadata();
    
    // Verificar campos obrigatórios
    for (const field of metadata.requiredConfig) {
      if (!config[field]) {
        console.error(`Missing required config field: ${field}`);
        return false;
      }
    }

    return true;
  }

  /**
   * SYNC TO OMNI
   * Sincroniza dados do sistema externo para o OMNI
   * DEVE ser implementado pela classe filha
   */
  abstract syncToOmni(
    entity: EntityType,
    externalData: any,
    context: SyncContext
  ): Promise<SyncResult>;

  /**
   * SYNC FROM OMNI
   * Sincroniza dados do OMNI para o sistema externo
   * DEVE ser implementado pela classe filha
   */
  abstract syncFromOmni(
    entity: EntityType,
    omniData: any,
    context: SyncContext
  ): Promise<SyncResult>;

  /**
   * HANDLE WEBHOOK
   * Processa webhook do sistema externo
   * DEVE ser implementado pela classe filha
   */
  abstract handleWebhook(
    payload: WebhookPayload,
    context: SyncContext
  ): Promise<SyncResult>;

  /**
   * MAP TO OMNI
   * Mapeia dados externos para formato OMNI
   * DEVE ser implementado pela classe filha
   */
  abstract mapToOmni(entity: EntityType, externalData: any): EntityData;

  /**
   * MAP FROM OMNI
   * Mapeia dados OMNI para formato externo
   * DEVE ser implementado pela classe filha
   */
  abstract mapFromOmni(entity: EntityType, omniData: any): any;

  /**
   * SUPPORTS ENTITY
   * Verifica se o plugin suporta uma entidade
   */
  supportsEntity(entity: EntityType): boolean {
    return this.getMetadata().supportedEntities.includes(entity);
  }

  /**
   * GET SUPPORTED ENTITIES
   * Retorna lista de entidades suportadas
   */
  getSupportedEntities(): EntityType[] {
    return this.getMetadata().supportedEntities;
  }

  /**
   * HEALTH CHECK
   * Verifica se a integração está funcionando
   * Pode ser sobrescrito pela classe filha
   */
  async healthCheck(): Promise<boolean> {
    if (!this.isInitialized) {
      return false;
    }

    // Override in child class for actual health check
    return true;
  }

  /**
   * UTILITY: Ensure initialized
   */
  protected ensureInitialized(): void {
    if (!this.isInitialized || !this.config) {
      throw new Error(`Plugin ${this.name} not initialized`);
    }
  }

  /**
   * UTILITY: Create success result
   */
  protected createSuccessResult(
    internalId?: string,
    externalId?: string,
    metadata?: Record<string, any>
  ): SyncResult {
    return {
      success: true,
      status: SyncStatus.SUCCESS,
      internalId,
      externalId,
      metadata
    };
  }

  /**
   * UTILITY: Create error result
   */
  protected createErrorResult(
    error: SyncError,
    status: SyncStatus = SyncStatus.FAILED
  ): SyncResult {
    return {
      success: false,
      status,
      error
    };
  }

  /**
   * UTILITY: Create sync error
   */
  protected createError(
    code: string,
    message: string,
    retryable: boolean = true,
    details?: any
  ): SyncError {
    return {
      code,
      message,
      retryable,
      details
    };
  }

  /**
   * UTILITY: Normalize phone number
   */
  protected normalizePhone(phone?: string): string | null {
    if (!phone) return null;
    
    // Remove tudo que não é número
    const digits = phone.replace(/\D/g, '');
    
    // Adiciona +55 se for brasileiro e não tiver código de país
    if (digits.length === 11 || digits.length === 10) {
      return `+55${digits}`;
    }
    
    if (digits.length > 0 && !digits.startsWith('+')) {
      return `+${digits}`;
    }
    
    return digits.length > 0 ? `+${digits}` : null;
  }

  /**
   * UTILITY: Normalize email
   */
  protected normalizeEmail(email?: string): string | null {
    if (!email) return null;
    return email.toLowerCase().trim();
  }

  /**
   * UTILITY: Normalize tax ID (CPF/CNPJ)
   */
  protected normalizeTaxId(taxId?: string): string | null {
    if (!taxId) return null;
    // Remove tudo que não é número
    return taxId.replace(/\D/g, '');
  }

  /**
   * UTILITY: Safe get nested property
   */
  protected getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * UTILITY: Set nested property
   */
  protected setNestedProperty(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }
}