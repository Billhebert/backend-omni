// src/modules/sync/core/SyncQueue.ts

import { PrismaClient } from '@prisma/client';
import { SyncJob, SyncResult, SyncStatus, RetryOptions } from './types';

/**
 * 📋 SYNC QUEUE
 * 
 * Gerencia fila de jobs de sincronização com:
 * - Priorização
 * - Retry com backoff
 * - Rate limiting
 * - Processamento em lote
 */
export class SyncQueue {
  private processing: boolean = false;
  private processingInterval?: NodeJS.Timer;

  constructor(private prisma: PrismaClient) {}

  /**
   * ENQUEUE
   * Adiciona job à fila
   */
  async enqueue(job: Omit<SyncJob, 'id'>): Promise<string> {
    const created = await this.prisma.syncQueue.create({
      data: {
        companyId: job.companyId,
        integration: job.integration,
        entity: job.entity,
        action: job.action,
        payload: job.payload,
        priority: job.priority || 5,
        scheduledFor: job.scheduledFor || new Date(),
        status: 'pending'
      }
    });

    console.log(`✅ Job enqueued: ${created.id} (${job.integration}.${job.entity}.${job.action})`);
    
    return created.id;
  }

  /**
   * ENQUEUE BATCH
   * Adiciona múltiplos jobs de uma vez
   */
  async enqueueBatch(jobs: Array<Omit<SyncJob, 'id'>>): Promise<string[]> {
    const ids: string[] = [];
    
    for (const job of jobs) {
      const id = await this.enqueue(job);
      ids.push(id);
    }

    return ids;
  }

  /**
   * GET NEXT JOBS
   * Busca próximos jobs para processar
   */
  async getNextJobs(limit: number = 10): Promise<SyncJob[]> {
    const now = new Date();

    const jobs = await this.prisma.syncQueue.findMany({
      where: {
        status: 'pending',
        scheduledFor: { lte: now },
        attempts: { lt: this.prisma.syncQueue.fields.maxAttempts }
      },
      orderBy: [
        { priority: 'desc' },
        { scheduledFor: 'asc' }
      ],
      take: limit
    });

    return jobs.map(job => ({
      id: job.id,
      companyId: job.companyId,
      integration: job.integration,
      entity: job.entity as any,
      action: job.action as any,
      payload: job.payload,
      priority: job.priority,
      scheduledFor: job.scheduledFor
    }));
  }

  /**
   * MARK AS PROCESSING
   * Marca job como sendo processado
   */
  async markAsProcessing(jobId: string): Promise<void> {
    await this.prisma.syncQueue.update({
      where: { id: jobId },
      data: {
        status: 'processing',
        attempts: { increment: 1 }
      }
    });
  }

  /**
   * MARK AS COMPLETED
   * Marca job como completado com sucesso
   */
  async markAsCompleted(jobId: string): Promise<void> {
    await this.prisma.syncQueue.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        processedAt: new Date(),
        completedAt: new Date()
      }
    });

    console.log(`✅ Job completed: ${jobId}`);
  }

  /**
   * MARK AS FAILED
   * Marca job como falho e agenda retry se possível
   */
  async markAsFailed(
    jobId: string,
    error: string,
    retryOptions?: RetryOptions
  ): Promise<void> {
    const job = await this.prisma.syncQueue.findUnique({
      where: { id: jobId }
    });

    if (!job) return;

    const shouldRetry = job.attempts < job.maxAttempts;

    if (shouldRetry && retryOptions) {
      // Calcular próximo retry com backoff
      const nextRetry = this.calculateNextRetry(
        job.attempts,
        retryOptions
      );

      await this.prisma.syncQueue.update({
        where: { id: jobId },
        data: {
          status: 'pending',
          error,
          scheduledFor: nextRetry,
          processedAt: new Date()
        }
      });

      console.log(`⚠️  Job failed, retry scheduled: ${jobId} (attempt ${job.attempts}/${job.maxAttempts})`);
    } else {
      // Não há mais retries
      await this.prisma.syncQueue.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          error,
          processedAt: new Date()
        }
      });

      console.error(`❌ Job permanently failed: ${jobId}`);
    }
  }

  /**
   * CALCULATE NEXT RETRY
   * Calcula próximo horário de retry com backoff
   */
  private calculateNextRetry(
    attemptNumber: number,
    options: RetryOptions
  ): Date {
    let delayMs: number;

    if (options.backoff === 'exponential') {
      // Exponential: 2^attempt * initialDelay
      delayMs = Math.pow(2, attemptNumber) * options.initialDelay;
    } else {
      // Linear: attempt * initialDelay
      delayMs = attemptNumber * options.initialDelay;
    }

    // Aplicar maxDelay se definido
    if (options.maxDelay) {
      delayMs = Math.min(delayMs, options.maxDelay);
    }

    return new Date(Date.now() + delayMs);
  }

  /**
   * GET QUEUE STATS
   * Retorna estatísticas da fila
   */
  async getQueueStats(companyId?: string): Promise<{
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    const where = companyId ? { companyId } : {};

    const [total, pending, processing, completed, failed] = await Promise.all([
      this.prisma.syncQueue.count({ where }),
      this.prisma.syncQueue.count({ where: { ...where, status: 'pending' } }),
      this.prisma.syncQueue.count({ where: { ...where, status: 'processing' } }),
      this.prisma.syncQueue.count({ where: { ...where, status: 'completed' } }),
      this.prisma.syncQueue.count({ where: { ...where, status: 'failed' } })
    ]);

    return { total, pending, processing, completed, failed };
  }

  /**
   * CLEAN OLD JOBS
   * Remove jobs antigos completados/falhados
   */
  async cleanOldJobs(olderThanDays: number = 7): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.prisma.syncQueue.deleteMany({
      where: {
        status: { in: ['completed', 'failed'] },
        completedAt: { lt: cutoffDate }
      }
    });

    console.log(`🗑️  Cleaned ${result.count} old jobs`);
    
    return result.count;
  }

  /**
   * CANCEL JOB
   * Cancela um job pendente
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const result = await this.prisma.syncQueue.updateMany({
      where: {
        id: jobId,
        status: 'pending'
      },
      data: {
        status: 'failed',
        error: 'Cancelled by user'
      }
    });

    return result.count > 0;
  }

  /**
   * RETRY FAILED JOB
   * Reagenda job falho para retry imediato
   */
  async retryFailedJob(jobId: string): Promise<boolean> {
    const result = await this.prisma.syncQueue.updateMany({
      where: {
        id: jobId,
        status: 'failed'
      },
      data: {
        status: 'pending',
        attempts: 0,
        error: null,
        scheduledFor: new Date()
      }
    });

    return result.count > 0;
  }

  /**
   * GET JOBS BY INTEGRATION
   * Busca jobs de uma integração específica
   */
  async getJobsByIntegration(
    integration: string,
    status?: string,
    limit: number = 100
  ): Promise<any[]> {
    const where: any = { integration };
    if (status) where.status = status;

    return this.prisma.syncQueue.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }
}