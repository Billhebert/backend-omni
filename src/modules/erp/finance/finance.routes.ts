import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { FinanceService } from './finance.service';

/**
 * 💰 FINANCE ROUTES - VERSÃO COMPLETA
 * 
 * Rotas EXISTENTES (mantidas):
 * - POST   /invoices ✅
 * - GET    /invoices ✅
 * - GET    /invoices/:id ✅
 * - PATCH  /invoices/:id ✅
 * - DELETE /invoices/:id ✅
 * - GET    /finance/summary ✅
 * 
 * Rotas NOVAS (adicionadas):
 * - POST   /invoices/:id/send ✅
 * - POST   /invoices/:id/pay ✅
 * - POST   /invoices/:id/cancel ✅
 * - POST   /invoices/check-overdue ✅
 * - GET    /invoices/stats ✅
 */

// ============================================
// SCHEMAS (mantidos + novos)
// ============================================

const invoiceItemSchema = z.object({
  productId: z.string().uuid().optional().nullable(),
  description: z.string().min(1),
  quantity: z.number().int().min(1),
  unitPrice: z.number().min(0),
  taxRate: z.number().min(0).optional().nullable(),
  discountRate: z.number().min(0).optional().nullable(),
  total: z.number().min(0).optional().nullable(),
});

const createInvoiceSchema = z.object({
  number: z.string().optional(),
  invoiceNumber: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  contactId: z.string().uuid().optional().nullable(),
  dealId: z.string().uuid().optional().nullable(),
  issueDate: z.string().optional(),
  dueDate: z.string().optional(),
  items: z.array(invoiceItemSchema).optional(),
  itemsCreate: z.array(invoiceItemSchema).optional(),
  subtotal: z.number().optional(),
  tax: z.number().optional(),
  taxAmount: z.number().optional(),
  discountAmount: z.number().optional(),
  total: z.number().optional(),
  notes: z.string().optional().nullable(),
});

// 🆕 Novos schemas
const paymentSchema = z.object({
  paidAmount: z.number().positive(),
  paidDate: z.string().optional(),
  paymentMethod: z.string().optional(),
});

const cancelSchema = z.object({
  reason: z.string().optional(),
});

const statsQuerySchema = z.object({
  type: z.enum(['receivable', 'payable']).optional(),
});

export async function financeRoutes(fastify: FastifyInstance) {
  const service = new FinanceService(fastify.prisma);

  // ============================================
  // ROTAS EXISTENTES (MANTIDAS)
  // ============================================

  /**
   * CREATE INVOICE
   */
  fastify.post('/invoices', { onRequest: [fastify.authenticate] }, async (request) => {
    const companyId = (request.user as any).companyId;
    const body = createInvoiceSchema.parse(request.body);

    const normalized: any = { ...body };
    if (body.itemsCreate && !body.items) normalized.items = body.itemsCreate;

    return service.createInvoice(normalized, companyId);
  });

  /**
   * LIST INVOICES
   */
  fastify.get('/invoices', { onRequest: [fastify.authenticate] }, async (request) => {
    const companyId = (request.user as any).companyId;
    return service.listInvoices(companyId, request.query);
  });

  /**
   * GET ONE INVOICE
   */
  fastify.get('/invoices/:id', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const companyId = (request.user as any).companyId;
    const { id } = request.params as any;

    const invoice = await service.getInvoice(id, companyId);
    if (!invoice) return reply.code(404).send({ message: 'Invoice not found' });

    return invoice;
  });

  /**
   * UPDATE INVOICE
   */
  fastify.patch('/invoices/:id', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const companyId = (request.user as any).companyId;
    const { id } = request.params as any;

    const body = createInvoiceSchema.partial().parse(request.body);

    const updated = await service.updateInvoice(id, companyId, body);
    if (!updated) return reply.code(404).send({ message: 'Invoice not found' });

    return updated;
  });

  /**
   * DELETE INVOICE
   */
  fastify.delete('/invoices/:id', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const companyId = (request.user as any).companyId;
    const { id } = request.params as any;

    const ok = await service.deleteInvoice(id, companyId);
    if (!ok) return reply.code(404).send({ message: 'Invoice not found' });

    return { success: true };
  });

  /**
   * FINANCIAL SUMMARY
   */
  fastify.get('/finance/summary', { onRequest: [fastify.authenticate] }, async (request) => {
    const companyId = (request.user as any).companyId;
    return service.getSummary(companyId, request.query);
  });

  // ============================================
  // 🆕 NOVAS ROTAS (ADICIONADAS)
  // ============================================

  /**
   * SEND INVOICE (draft → sent)
   */
  fastify.post(
    '/invoices/:id/send',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const companyId = (request.user as any).companyId;
      const { id } = request.params as any;

      const sent = await service.sendInvoice(id, companyId);
      if (!sent) {
        return reply.code(404).send({ message: 'Invoice not found' });
      }

      return sent;
    }
  );

  /**
   * MARK AS PAID
   */
  fastify.post(
    '/invoices/:id/pay',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const companyId = (request.user as any).companyId;
      const { id } = request.params as any;
      const payment = paymentSchema.parse(request.body);

      const paid = await service.markAsPaid(id, companyId, payment);
      if (!paid) {
        return reply.code(404).send({ message: 'Invoice not found' });
      }

      return paid;
    }
  );

  /**
   * CANCEL INVOICE
   */
  fastify.post(
    '/invoices/:id/cancel',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const companyId = (request.user as any).companyId;
      const { id } = request.params as any;
      const { reason } = cancelSchema.parse(request.body);

      const cancelled = await service.cancelInvoice(id, companyId, reason);
      if (!cancelled) {
        return reply.code(404).send({ message: 'Invoice not found' });
      }

      return cancelled;
    }
  );

  /**
   * CHECK OVERDUE INVOICES
   * Cron job ou trigger manual
   */
  fastify.post(
    '/invoices/check-overdue',
    { onRequest: [fastify.authenticate] },
    async (request) => {
      const companyId = (request.user as any).companyId;

      const count = await service.checkOverdue(companyId);

      return {
        success: true,
        overdueCount: count,
        message: `${count} invoice(s) marked as overdue`,
      };
    }
  );

  /**
   * GET DETAILED STATISTICS
   */
  fastify.get('/invoices/stats', { onRequest: [fastify.authenticate] }, async (request) => {
    const companyId = (request.user as any).companyId;
    const { type } = statsQuerySchema.parse(request.query);

    return service.getStats(companyId, type);
  });
}