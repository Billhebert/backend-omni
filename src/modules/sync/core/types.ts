// src/modules/sync/core/types.ts

/**
 * 🔄 SYNC ENGINE - TYPES & INTERFACES
 * 
 * Definições de tipos centrais para o sistema de sincronização modular
 */

// ============================================
// ENUMS
// ============================================

export enum SyncDirection {
  TO_OMNI = 'to_omni',       // Sistema externo → OMNI
  FROM_OMNI = 'from_omni',   // OMNI → Sistema externo
  BIDIRECTIONAL = 'bidirectional'
}

export enum SyncStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
  SKIPPED = 'skipped',
  CONFLICT = 'conflict'
}

export enum ConflictStrategy {
  NEWEST_WINS = 'newest_wins',           // Mais recente ganha
  OMNI_WINS = 'omni_wins',              // OMNI sempre ganha
  EXTERNAL_WINS = 'external_wins',       // Externo sempre ganha
  MERGE = 'merge',                       // Mesclar dados
  MANUAL = 'manual'                      // Requer aprovação manual
}

export enum EntityType {
  CONTACT = 'contact',
  DEAL = 'deal',
  APPOINTMENT = 'appointment',
  PRODUCT = 'product',
  INVOICE = 'invoice'
}

// ============================================
// INTERFACES PRINCIPAIS
// ============================================

/**
 * Configuração de uma integração
 */
export interface IntegrationConfig {
  integration: string;
  enabled: boolean;
  config: Record<string, any>;
  syncSettings?: SyncSettings;
}

/**
 * Preferências de sincronização
 */
export interface SyncSettings {
  entities: EntityType[];
  direction: SyncDirection;
  conflictStrategy: ConflictStrategy;
  autoSync: boolean;
  syncInterval?: number; // minutos
  batchSize?: number;
  rateLimit?: RateLimitConfig;
}

/**
 * Configuração de rate limiting
 */
export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

/**
 * Job de sincronização
 */
export interface SyncJob {
  id: string;
  companyId: string;
  integration: string;
  entity: EntityType;
  action: 'create' | 'update' | 'delete';
  payload: any;
  priority?: number;
  scheduledFor?: Date;
}

/**
 * Resultado de sincronização
 */
export interface SyncResult {
  success: boolean;
  status: SyncStatus;
  internalId?: string;
  externalId?: string;
  error?: SyncError;
  duration?: number;
  metadata?: Record<string, any>;
}

/**
 * Erro de sincronização
 */
export interface SyncError {
  code: string;
  message: string;
  details?: any;
  retryable: boolean;
}

/**
 * Conflito de dados
 */
export interface DataConflict {
  entity: EntityType;
  entityId: string;
  conflictType: 'duplicate' | 'data_mismatch' | 'circular_update';
  omniData: any;
  externalData: any;
  suggestedAction?: ConflictStrategy;
}

/**
 * Resultado de matching (deduplicação)
 */
export interface MatchResult {
  matched: boolean;
  matchScore: number; // 0-100
  matchMethod: 'exact_email' | 'fuzzy_name' | 'phone' | 'tax_id' | 'manual';
  candidateId?: string;
  candidates?: MatchCandidate[];
}

/**
 * Candidato de matching
 */
export interface MatchCandidate {
  id: string;
  score: number;
  data: any;
  reason: string;
}

/**
 * Dados de entidade para sincronização
 */
export interface EntityData {
  id?: string;
  type: EntityType;
  data: Record<string, any>;
  metadata?: {
    source: string;
    lastModified?: Date;
    version?: number;
  };
}

/**
 * Webhook payload
 */
export interface WebhookPayload {
  event: string;
  data: any;
  timestamp: Date;
  signature?: string;
}

/**
 * Contexto de sincronização
 */
export interface SyncContext {
  companyId: string;
  integration: string;
  config: IntegrationConfig;
  direction: SyncDirection;
  dryRun?: boolean;
}

// ============================================
// PLUGIN INTERFACES
// ============================================

/**
 * Interface base que todo plugin deve implementar
 */
export interface ISyncPlugin {
  // Metadados do plugin
  name: string;
  version: string;
  description?: string;

  // Configuração
  initialize(config: IntegrationConfig): Promise<void>;
  validateConfig(config: Record<string, any>): boolean;

  // Operações de sync
  syncToOmni(entity: EntityType, externalData: any, context: SyncContext): Promise<SyncResult>;
  syncFromOmni(entity: EntityType, omniData: any, context: SyncContext): Promise<SyncResult>;

  // Webhooks
  handleWebhook(payload: WebhookPayload, context: SyncContext): Promise<SyncResult>;

  // Mapeamento de dados
  mapToOmni(entity: EntityType, externalData: any): EntityData;
  mapFromOmni(entity: EntityType, omniData: any): any;

  // Suporte a entidades
  supportsEntity(entity: EntityType): boolean;
  getSupportedEntities(): EntityType[];

  // Health check
  healthCheck(): Promise<boolean>;
}

/**
 * Metadata do plugin para registro
 */
export interface PluginMetadata {
  name: string;
  version: string;
  description?: string;
  author?: string;
  supportedEntities: EntityType[];
  requiredConfig: string[];
  optionalConfig?: string[];
  webhookEvents?: string[];
  rateLimits?: RateLimitConfig;
}

// ============================================
// UTILITY TYPES
// ============================================

/**
 * Opções de retry
 */
export interface RetryOptions {
  maxAttempts: number;
  backoff: 'linear' | 'exponential';
  initialDelay: number; // ms
  maxDelay?: number; // ms
}

/**
 * Estatísticas de sincronização
 */
export interface SyncStats {
  totalJobs: number;
  successfulJobs: number;
  failedJobs: number;
  pendingJobs: number;
  averageDuration: number;
  lastSyncAt?: Date;
}

/**
 * Filtros para logs
 */
export interface SyncLogFilters {
  companyId?: string;
  integration?: string;
  entity?: EntityType;
  status?: SyncStatus;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}