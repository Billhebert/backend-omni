import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ExpensesService } from './expenses.service';

const expenseCreateSchema = z.object({
  category: z.string().min(1),
  subcategory: z.string().optional().nullable(),
  description: z.string().min(1),
  amount: z.number(),
  currency: z.string().optional().nullable(),
  date: z.string().optional().nullable(),

  status: z.string().optional().nullable(),
  receipt: z.string().optional().nullable(),

  projectId: z.string().uuid().optional().nullable(),
  approvedBy: z.string().uuid().optional().nullable(),
  approvedAt: z.string().optional().nullable(),
  reimbursedAt: z.string().optional().nullable(),

  notes: z.string().optional().nullable(),
});

const expenseUpdateSchema = expenseCreateSchema.partial();

export async function expensesRoutes(fastify: FastifyInstance) {
  const service = new ExpensesService(fastify.prisma);

  // POST /api/erp/expenses
  fastify.post('/expenses', { onRequest: [fastify.authenticate] }, async (request) => {
    const companyId = (request.user as any).companyId;
    const userId = (request.user as any).id;

    const data = expenseCreateSchema.parse(request.body);
    return service.create(data, companyId, userId);
  });

  // GET /api/erp/expenses
  fastify.get('/expenses', { onRequest: [fastify.authenticate] }, async (request) => {
    const companyId = (request.user as any).companyId;
    return service.list(companyId, request.query);
  });

  // GET /api/erp/expenses/:id
  fastify.get('/expenses/:id', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const companyId = (request.user as any).companyId;
    const { id } = request.params as any;

    const expense = await service.get(id, companyId);
    if (!expense) return reply.code(404).send({ message: 'Expense not found' });

    return expense;
  });

  // PATCH /api/erp/expenses/:id
  fastify.patch('/expenses/:id', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const companyId = (request.user as any).companyId;
    const { id } = request.params as any;

    const data = expenseUpdateSchema.parse(request.body);
    const updated = await service.update(id, companyId, data);

    if (!updated) return reply.code(404).send({ message: 'Expense not found' });
    return updated;
  });

  // DELETE /api/erp/expenses/:id
  fastify.delete('/expenses/:id', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const companyId = (request.user as any).companyId;
    const { id } = request.params as any;

    const ok = await service.delete(id, companyId);
    if (!ok) return reply.code(404).send({ message: 'Expense not found' });

    return { success: true };
  });

  fastify.post(
    '/expenses/:id/approve',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const companyId = (request.user as any).companyId;
      const approverId = (request.user as any).id;
      const { id } = request.params as any;

      const updated = await service.approve(id, companyId, approverId);
      if (!updated) return reply.code(404).send({ message: 'Expense not found' });

      return updated;
    }
  );
  fastify.post(
    '/expenses/:id/reject',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const companyId = (request.user as any).companyId;
      const approverId = (request.user as any).id;
      const { id } = request.params as any;

      const body = (request.body ?? {}) as any;
      const reason = body.reason ?? body.notes ?? null;

      const updated = await service.reject(id, companyId, approverId, reason);
      if (!updated) return reply.code(404).send({ message: 'Expense not found' });

      return updated;
    }
  );
  fastify.post(
    '/expenses/:id/reimburse',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const companyId = (request.user as any).companyId;
      const { id } = request.params as any;

      const updated = await service.reimburse(id, companyId);
      if (!updated) return reply.code(404).send({ message: 'Expense not found' });

      return updated;
    }
  );
}
