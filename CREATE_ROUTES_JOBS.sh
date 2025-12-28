#!/bin/bash
cd /home/claude/omni-complete-project

# ========== CRM ROUTES ==========
cat > src/modules/crm/contacts/contacts.routes.ts << 'EOF'
import { FastifyInstance } from 'fastify';
import { ContactsService } from './contacts.service';

export async function contactsRoutes(fastify: FastifyInstance) {
  const service = new ContactsService(fastify.prisma);
  
  fastify.post('/contacts', { onRequest: [fastify.authenticate] }, async (req) => {
    const companyId = (req.user as any).companyId;
    return service.create(req.body, companyId);
  });
  
  fastify.get('/contacts', { onRequest: [fastify.authenticate] }, async (req) => {
    const companyId = (req.user as any).companyId;
    return service.list(companyId, req.query);
  });
  
  fastify.get('/contacts/:id', { onRequest: [fastify.authenticate] }, async (req) => {
    const companyId = (req.user as any).companyId;
    const { id } = req.params as any;
    return service.get(id, companyId);
  });
  
  fastify.patch('/contacts/:id', { onRequest: [fastify.authenticate] }, async (req) => {
    const companyId = (req.user as any).companyId;
    const { id } = req.params as any;
    return service.update(id, companyId, req.body);
  });
  
  fastify.delete('/contacts/:id', { onRequest: [fastify.authenticate] }, async (req) => {
    const companyId = (req.user as any).companyId;
    const { id } = req.params as any;
    return service.delete(id, companyId);
  });
}
EOF

cat > src/modules/crm/deals/deals.routes.ts << 'EOF'
import { FastifyInstance } from 'fastify';
import { DealsService } from './deals.service';

export async function dealsRoutes(fastify: FastifyInstance) {
  const service = new DealsService(fastify.prisma);
  
  fastify.post('/deals', { onRequest: [fastify.authenticate] }, async (req) => {
    const companyId = (req.user as any).companyId;
    return service.create(req.body, companyId);
  });
  
  fastify.get('/deals', { onRequest: [fastify.authenticate] }, async (req) => {
    const companyId = (req.user as any).companyId;
    return service.list(companyId, req.query);
  });
  
  fastify.get('/pipeline', { onRequest: [fastify.authenticate] }, async (req) => {
    const companyId = (req.user as any).companyId;
    return service.getPipeline(companyId);
  });
  
  fastify.post('/deals/:id/move-stage', { onRequest: [fastify.authenticate] }, async (req) => {
    const companyId = (req.user as any).companyId;
    const { id } = req.params as any;
    const { stage } = req.body as any;
    return service.moveStage(id, companyId, stage);
  });
}
EOF

cat > src/modules/crm/interactions/interactions.service.ts << 'EOF'
import { PrismaClient } from '@prisma/client';

export class InteractionsService {
  constructor(private prisma: PrismaClient) {}

  async create(data: any, userId: string) {
    return this.prisma.interaction.create({ data: { ...data, userId } });
  }

  async listByContact(contactId: string) {
    return this.prisma.interaction.findMany({ where: { contactId }, orderBy: { createdAt: 'desc' } });
  }

  async listByDeal(dealId: string) {
    return this.prisma.interaction.findMany({ where: { dealId }, orderBy: { createdAt: 'desc' } });
  }
}
EOF

cat > src/modules/crm/interactions/interactions.routes.ts << 'EOF'
import { FastifyInstance } from 'fastify';
import { InteractionsService } from './interactions.service';

export async function interactionsRoutes(fastify: FastifyInstance) {
  const service = new InteractionsService(fastify.prisma);
  
  fastify.post('/interactions', { onRequest: [fastify.authenticate] }, async (req) => {
    const userId = (req.user as any).id;
    return service.create(req.body, userId);
  });
  
  fastify.get('/contacts/:contactId/interactions', { onRequest: [fastify.authenticate] }, async (req) => {
    const { contactId } = req.params as any;
    return service.listByContact(contactId);
  });
  
  fastify.get('/deals/:dealId/interactions', { onRequest: [fastify.authenticate] }, async (req) => {
    const { dealId } = req.params as any;
    return service.listByDeal(dealId);
  });
}
EOF

# ========== ERP ROUTES ==========
cat > src/modules/erp/finance/finance.routes.ts << 'EOF'
import { FastifyInstance } from 'fastify';
import { FinanceService } from './finance.service';

export async function financeRoutes(fastify: FastifyInstance) {
  const service = new FinanceService(fastify.prisma);
  
  fastify.post('/invoices', { onRequest: [fastify.authenticate] }, async (req) => {
    const companyId = (req.user as any).companyId;
    return service.createInvoice(req.body, companyId);
  });
  
  fastify.get('/invoices', { onRequest: [fastify.authenticate] }, async (req) => {
    const companyId = (req.user as any).companyId;
    return service.listInvoices(companyId, req.query);
  });
  
  fastify.post('/expenses', { onRequest: [fastify.authenticate] }, async (req) => {
    const companyId = (req.user as any).companyId;
    const userId = (req.user as any).id;
    return service.createExpense(req.body, companyId, userId);
  });
  
  fastify.post('/expenses/:id/approve', { onRequest: [fastify.authenticate] }, async (req) => {
    const companyId = (req.user as any).companyId;
    const userId = (req.user as any).id;
    const { id } = req.params as any;
    return service.approveExpense(id, companyId, userId);
  });
  
  fastify.get('/finance/summary', { onRequest: [fastify.authenticate] }, async (req) => {
    const companyId = (req.user as any).companyId;
    const { period } = req.query as any;
    return service.getFinancialSummary(companyId, period);
  });
}
EOF

cat > src/modules/erp/inventory/inventory.routes.ts << 'EOF'
import { FastifyInstance } from 'fastify';
import { InventoryService } from './inventory.service';

export async function inventoryRoutes(fastify: FastifyInstance) {
  const service = new InventoryService(fastify.prisma);
  
  fastify.post('/products', { onRequest: [fastify.authenticate] }, async (req) => {
    const companyId = (req.user as any).companyId;
    return service.createProduct(req.body, companyId);
  });
  
  fastify.get('/products', { onRequest: [fastify.authenticate] }, async (req) => {
    const companyId = (req.user as any).companyId;
    return service.listProducts(companyId, req.query);
  });
  
  fastify.post('/products/:id/stock', { onRequest: [fastify.authenticate] }, async (req) => {
    const userId = (req.user as any).id;
    const { id } = req.params as any;
    const { type, quantity, reason } = req.body as any;
    return service.updateStock(id, type, quantity, userId, reason);
  });
  
  fastify.get('/products/low-stock', { onRequest: [fastify.authenticate] }, async (req) => {
    const companyId = (req.user as any).companyId;
    return service.getLowStockProducts(companyId);
  });
}
EOF

# ========== JOBS ==========
cat > src/jobs/email-queue.ts << 'EOF'
import { Queue, Worker } from 'bullmq';
import { sendEmail } from '../utils/email';

export const emailQueue = new Queue('emails', {
  connection: { host: process.env.REDIS_HOST, port: Number(process.env.REDIS_PORT) }
});

const worker = new Worker('emails', async (job) => {
  const { to, subject, html } = job.data;
  await sendEmail(to, subject, html);
}, {
  connection: { host: process.env.REDIS_HOST, port: Number(process.env.REDIS_PORT) }
});

export async function queueEmail(to: string, subject: string, html: string) {
  return emailQueue.add('send-email', { to, subject, html });
}
EOF

cat > src/jobs/notification-queue.ts << 'EOF'
import { Queue, Worker } from 'bullmq';

export const notificationQueue = new Queue('notifications', {
  connection: { host: process.env.REDIS_HOST, port: Number(process.env.REDIS_PORT) }
});

const worker = new Worker('notifications', async (job) => {
  console.log('Processing notification:', job.data);
  // Implementar lógica de notificação (push, in-app, etc)
}, {
  connection: { host: process.env.REDIS_HOST, port: Number(process.env.REDIS_PORT) }
});

export async function queueNotification(userId: string, message: string, type: string) {
  return notificationQueue.add('send-notification', { userId, message, type });
}
EOF

cat > src/jobs/sync-queue.ts << 'EOF'
import { Queue, Worker } from 'bullmq';
import { SageService } from '../integrations/sage/sage.service';

export const syncQueue = new Queue('sync', {
  connection: { host: process.env.REDIS_HOST, port: Number(process.env.REDIS_PORT) }
});

const sageService = new SageService();

const worker = new Worker('sync', async (job) => {
  const { type, data } = job.data;
  
  if (type === 'invoice') {
    await sageService.syncInvoice(data);
  } else if (type === 'expense') {
    await sageService.syncExpense(data);
  }
}, {
  connection: { host: process.env.REDIS_HOST, port: Number(process.env.REDIS_PORT) }
});

export async function queueSync(type: string, data: any) {
  return syncQueue.add('sync-data', { type, data });
}
EOF

echo "✅ Routes e Jobs criados"
