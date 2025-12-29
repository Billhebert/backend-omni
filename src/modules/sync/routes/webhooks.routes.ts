// src/modules/sync/routes/webhooks.routes.ts

import { FastifyInstance } from 'fastify';
import { SyncEngine } from '../core/SyncEngine';

/**
 * 🪝 WEBHOOK ROUTES
 * 
 * Endpoints para receber webhooks de sistemas externos.
 * Cada integração tem seu próprio endpoint.
 */

export async function webhooksRoutes(fastify: FastifyInstance) {
  const engine = new SyncEngine(fastify.prisma);

  // ============================================
  // RDSTATION WEBHOOKS
  // ============================================

  /**
   * RDSTATION WEBHOOK
   * Endpoint para receber webhooks do RD Station
   */
  fastify.post('/webhooks/rdstation', async (req, reply) => {
    try {
      // Extrair companyId do payload ou headers
      // (RDStation permite custom fields no webhook config)
      const companyId = (req.body as any).customData?.companyId || 
                       req.headers['x-company-id'] as string;

      if (!companyId) {
        return reply.code(400).send({
          error: 'Missing company identifier',
          message: 'companyId required in payload or headers'
        });
      }

      // Processar webhook
      const result = await engine.handleWebhook(
        'rdstation',
        req.body,
        companyId
      );

      if (!result.success) {
        return reply.code(500).send({
          error: 'Webhook processing failed',
          message: result.error?.message
        });
      }

      return {
        success: true,
        message: 'Webhook processed',
        result
      };

    } catch (error: any) {
      fastify.log.error('RDStation webhook error:', error);
      return reply.code(500).send({
        error: 'Internal error',
        message: error.message
      });
    }
  });

  // ============================================
  // CONFIRM8 WEBHOOKS
  // ============================================

  /**
   * CONFIRM8 WEBHOOK
   * Endpoint para receber webhooks do Confirm8
   */
  fastify.post('/webhooks/confirm8', async (req, reply) => {
    try {
      // Confirm8 pode enviar domain no payload
      const domain = (req.body as any).account?.domain;
      
      if (!domain) {
        return reply.code(400).send({
          error: 'Missing domain',
          message: 'Confirm8 domain required'
        });
      }

      // Buscar companyId pelo domain
      const config = await fastify.prisma.integrationConfig.findFirst({
        where: {
          integration: 'confirm8',
          enabled: true,
          config: {
            path: ['apiDomain'],
            equals: domain
          }
        }
      });

      if (!config) {
        return reply.code(404).send({
          error: 'Integration not found',
          message: `No active Confirm8 integration for domain ${domain}`
        });
      }

      // Processar webhook
      const result = await engine.handleWebhook(
        'confirm8',
        req.body,
        config.companyId
      );

      if (!result.success) {
        return reply.code(500).send({
          error: 'Webhook processing failed',
          message: result.error?.message
        });
      }

      return {
        success: true,
        message: 'Webhook processed',
        result
      };

    } catch (error: any) {
      fastify.log.error('Confirm8 webhook error:', error);
      return reply.code(500).send({
        error: 'Internal error',
        message: error.message
      });
    }
  });

  // ============================================
  // GENERIC WEBHOOK (para testes)
  // ============================================

  /**
   * GENERIC WEBHOOK
   * Webhook genérico para qualquer integração
   * Útil para desenvolvimento e testes
   */
  fastify.post('/webhooks/:integration/:companyId', async (req, reply) => {
    const { integration, companyId } = req.params as any;

    try {
      // Verificar se integração existe e está ativa
      const config = await fastify.prisma.integrationConfig.findUnique({
        where: {
          companyId_integration: {
            companyId,
            integration
          }
        }
      });

      if (!config || !config.enabled) {
        return reply.code(404).send({
          error: 'Integration not found or disabled',
          integration,
          companyId
        });
      }

      // Processar webhook
      const result = await engine.handleWebhook(
        integration,
        req.body,
        companyId
      );

      if (!result.success) {
        return reply.code(500).send({
          error: 'Webhook processing failed',
          message: result.error?.message
        });
      }

      return {
        success: true,
        message: 'Webhook processed',
        result
      };

    } catch (error: any) {
      fastify.log.error(`${integration} webhook error:`, error);
      return reply.code(500).send({
        error: 'Internal error',
        message: error.message
      });
    }
  });

  // ============================================
  // WEBHOOK LOGS
  // ============================================

  /**
   * GET WEBHOOK LOGS
   * Lista webhooks recebidos (útil para debugging)
   */
  fastify.get(
    '/webhooks/logs',
    { onRequest: [fastify.authenticate] },
    async (req) => {
      const { integration, status, limit } = req.query as any;

      const where: any = {};
      if (integration) where.integration = integration;
      if (status) where.status = status;

      const logs = await fastify.prisma.webhookLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit ? parseInt(limit) : 50
      });

      return { logs, total: logs.length };
    }
  );

  /**
   * GET WEBHOOK LOG BY ID
   * Busca webhook específico
   */
  fastify.get(
    '/webhooks/logs/:id',
    { onRequest: [fastify.authenticate] },
    async (req, reply) => {
      const { id } = req.params as any;

      const log = await fastify.prisma.webhookLog.findUnique({
        where: { id }
      });

      if (!log) {
        return reply.code(404).send({ error: 'Webhook log not found' });
      }

      return log;
    }
  );
}