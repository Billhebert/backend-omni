import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { FinanceService } from './finance.service';

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
  // aceita number ou invoiceNumber (service faz o mapeamento)
  number: z.string().optional(),
  invoiceNumber: z.string().optional(),

  type: z.string().optional(), // receivable | payable
  status: z.string().optional(),

  contactId: z.string().uuid().optional().nullable(),
  dealId: z.string().uuid().optional().nullable(),

  issueDate: z.string().optional(),
  dueDate: z.string().optional(),

  items: z.array(invoiceItemSchema).optional(),
  // também aceita formato { create: [...] }
  itemsCreate: z.array(invoiceItemSchema).optional(),

  subtotal: z.number().optional(),
  tax: z.number().optional(),
  taxAmount: z.number().optional(),
  discountAmount: z.number().optional(),
  total: z.number().optional(),

  notes: z.string().optional().nullable(),
});

export async function financeRoutes(fastify: FastifyInstance) {
  const service = new FinanceService(fastify.prisma);

  // POST /api/erp/invoices
  fastify.post('/invoices', { onRequest: [fastify.authenticate] }, async (request) => {
    const companyId = (request.user as any).companyId;
    const body = createInvoiceSchema.parse(request.body);

    // normaliza items: aceita items ou itemsCreate
    const normalized: any = { ...body };
    if (body.itemsCreate && !body.items) normalized.items = body.itemsCreate;

    return service.createInvoice(normalized, companyId);
  });

  // GET /api/erp/invoices
  fastify.get('/invoices', { onRequest: [fastify.authenticate] }, async (request) => {
    const companyId = (request.user as any).companyId;
    return service.listInvoices(companyId, request.query);
  });

  // GET /api/erp/invoices/:id  ✅ (rota que você está chamando)
  fastify.get('/invoices/:id', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const companyId = (request.user as any).companyId;
    const { id } = request.params as any;

    const invoice = await service.getInvoice(id, companyId);
    if (!invoice) return reply.code(404).send({ message: 'Invoice not found' });

    return invoice;
  });

  // DELETE /api/erp/invoices/:id
  fastify.delete('/invoices/:id', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const companyId = (request.user as any).companyId;
    const { id } = request.params as any;

    const ok = await service.deleteInvoice(id, companyId);
    if (!ok) return reply.code(404).send({ message: 'Invoice not found' });

    return { success: true };
  });
  fastify.patch('/invoices/:id', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const companyId = (request.user as any).companyId;
    const { id } = request.params as any;

    // aceita o mesmo schema do create (parcial)
    const body = createInvoiceSchema.partial().parse(request.body);

    const updated = await service.updateInvoice(id, companyId, body);
    if (!updated) return reply.code(404).send({ message: 'Invoice not found' });

    return updated;
  });
  fastify.get('/finance/summary', { onRequest: [fastify.authenticate] }, async (request) => {
    const companyId = (request.user as any).companyId;
    return service.getSummary(companyId, request.query);
  });
}
