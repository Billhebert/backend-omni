#!/bin/bash
cd /home/claude/omni-complete-project

# ========== MIDDLEWARES ==========
cat > src/middleware/validation.middleware.ts << 'EOF'
import { FastifyRequest, FastifyReply } from 'fastify';
import { ZodSchema } from 'zod';

export function validate(schema: ZodSchema) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      schema.parse(request.body);
    } catch (error) {
      reply.code(400).send({ error: 'Validation failed', details: error });
    }
  };
}
EOF

cat > src/middleware/error-handler.middleware.ts << 'EOF'
import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../utils/logger';

export async function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  logger.error(error);
  
  if (error.validation) {
    return reply.code(400).send({ error: 'Validation error', details: error.validation });
  }
  
  reply.code(error.statusCode || 500).send({
    error: error.message || 'Internal server error'
  });
}
EOF

cat > src/middleware/upload.middleware.ts << 'EOF'
import multipart from '@fastify/multipart';
import { FastifyInstance } from 'fastify';

export async function registerUpload(fastify: FastifyInstance) {
  await fastify.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
  });
}
EOF

# ========== APP.TS COMPLETO ==========
cat > src/app.ts << 'EOF'
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

// ERP
import { financeRoutes } from './modules/erp/finance/finance.routes';
import { inventoryRoutes } from './modules/erp/inventory/inventory.routes';

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
  await app.register(financeRoutes, { prefix: '/api/erp' });
  await app.register(inventoryRoutes, { prefix: '/api/erp' });
  await app.register(knowledgeRoutes, { prefix: '/api' });
  await app.register(chatRoutes, { prefix: '/api' });

  // Error handler
  app.setErrorHandler((error, request, reply) => {
    app.log.error(error);
    reply.code(error.statusCode || 500).send({ error: error.message || 'Internal error' });
  });

  app.addHook('onClose', async () => { await prisma.$disconnect(); });

  return app;
}

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    authenticate: any;
  }
}
EOF

# ========== PACKAGE.JSON COMPLETO ==========
cat > package.json << 'EOF'
{
  "name": "omni-platform-complete",
  "version": "3.0.0",
  "description": "OMNI Platform - Complete Enterprise Solution",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "jest",
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx prisma/seed.ts",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "@fastify/cors": "^9.0.1",
    "@fastify/helmet": "^11.1.1",
    "@fastify/jwt": "^8.0.1",
    "@fastify/multipart": "^8.1.0",
    "@fastify/rate-limit": "^9.1.0",
    "@prisma/client": "^6.0.0",
    "@qdrant/js-client-rest": "^1.8.2",
    "axios": "^1.6.5",
    "bcryptjs": "^2.4.3",
    "bullmq": "^5.1.0",
    "fastify": "^4.29.1",
    "ioredis": "^5.3.2",
    "nodemailer": "^6.9.8",
    "openai": "^4.24.1",
    "pino": "^8.17.2",
    "xlsx": "^0.18.5",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/jest": "^29.5.11",
    "@types/node": "^20.11.5",
    "@types/nodemailer": "^6.4.14",
    "jest": "^29.7.0",
    "pino-pretty": "^11.0.0",
    "prisma": "^6.0.0",
    "ts-jest": "^29.1.1",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3"
  }
}
EOF

echo "✅ Middlewares, app.ts e package.json criados"
