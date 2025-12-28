import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { PrismaClient } from '@prisma/client';
import { env } from './config/env';

// Auth
import { authRoutes } from './modules/auth/auth.routes';

// HRM
import { learningRoutes } from './modules/hrm/learning/learning.routes';
import { positionsRoutes } from './modules/hrm/positions/positions.routes';
import { developmentRoutes } from './modules/hrm/development/development.routes';
import { performanceRoutes } from './modules/hrm/performance/performance.routes';

// CRM
import { contactsRoutes } from './modules/crm/contacts/contacts.routes';
import { dealsRoutes } from './modules/crm/deals/deals.routes';
import { interactionsRoutes } from './modules/crm/interactions/interactions.routes';
import { pipelineRoutes } from './modules/crm/pipeline/pipeline.routes';

// ERP
import { financeRoutes } from './modules/erp/finance/finance.routes';

import { inventoryRoutes } from './modules/erp/inventory/inventory.routes';
import { expensesRoutes } from './modules/erp/expenses/expenses.routes';

// Knowledge & Chat
import { knowledgeRoutes } from './modules/knowledge/knowledge.routes';
import { chatRoutes } from './modules/chat/chat.routes';

const prisma = new PrismaClient({ log: env.NODE_ENV === 'development' ? ['error'] : [] });

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: { level: env.LOG_LEVEL } });

  // Security
  await app.register(helmet);
  await app.register(cors, { origin: env.CORS_ORIGIN.split(','), credentials: true });
  await app.register(rateLimit, { max: env.RATE_LIMIT_MAX, timeWindow: '1 minute' });

  // JWT
  await app.register(jwt, { secret: env.JWT_SECRET });
  app.decorate('authenticate', async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.code(401).send({ error: 'Unauthorized' });
    }
  });

  // Prisma
  app.decorate('prisma', prisma);

  // Health
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // Routes
  await app.register(authRoutes, { prefix: '/api' });
  await app.register(learningRoutes, { prefix: '/api/hrm' });
  await app.register(positionsRoutes, { prefix: '/api/hrm' });
  await app.register(developmentRoutes, { prefix: '/api/hrm' });
  await app.register(performanceRoutes, { prefix: '/api/hrm' });
  await app.register(contactsRoutes, { prefix: '/api/crm' });
  await app.register(dealsRoutes, { prefix: '/api/crm' });
  await app.register(interactionsRoutes, { prefix: '/api/crm' });
  await app.register(pipelineRoutes, { prefix: '/api/crm' });
  await app.register(financeRoutes, { prefix: '/api/erp' });
  await app.register(inventoryRoutes, { prefix: '/api/erp' });
  await app.register(expensesRoutes, { prefix: '/api/erp' });
  await app.register(knowledgeRoutes, { prefix: '/api' });
  await app.register(chatRoutes, { prefix: '/api' });

  // Error handler
  app.setErrorHandler((error, request, reply) => {
    app.log.error(error);
    reply.code(error.statusCode || 500).send({ error: error.message || 'Internal error' });
  });

  app.addHook('onClose', async () => {
    await prisma.$disconnect();
  });

  return app;
}

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    authenticate: any;
  }
}
