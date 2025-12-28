import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { DealsService } from './deals.service';

const dealProductSchema = z.object({
  productId: z.string(),
  productName: z.string().optional().nullable(),
  quantity: z.number().int(),
  unitPrice: z.number().optional().nullable(),
  price: z.number().optional().nullable(), // compat (caso o front mande "price")
  discount: z.number().optional().nullable(),
  tax: z.number().optional().nullable(),
});

const dealCreateSchema = z.object({
  contactId: z.string().uuid(),
  title: z.string().min(1),
  value: z.number(),
  currency: z.string().optional().nullable(),
  stage: z.string().optional().nullable(),
  probability: z.number().int().optional().nullable(),
  expectedCloseDate: z.string().optional().nullable(), // convertido no service
  closedDate: z.string().optional().nullable(),

  // ✅ manter notes no request
  notes: z.string().optional().nullable(),

  // ✅ products relacional (vira DealProduct via nested create)
  products: z.array(dealProductSchema).optional().default([]),
});

const dealUpdateSchema = dealCreateSchema.partial();
const moveStageSchema = z.object({
  stage: z.string().min(1),
  probability: z.number().int().optional().nullable(),
  wonReason: z.string().optional().nullable(),
  lostReason: z.string().optional().nullable(),
  competitorName: z.string().optional().nullable(),
  closedDate: z.string().optional().nullable(), // opcional (senão usa now)
});

export async function dealsRoutes(fastify: FastifyInstance) {
  const service = new DealsService(fastify.prisma);
  // LIST INTERACTIONS
  fastify.get(
    '/deals/:id/interactions',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const companyId = (request.user as any).companyId;
      const { id } = request.params as any;

      // valida se o deal pertence à empresa
      const deal = await fastify.prisma.deal.findFirst({
        where: { id, companyId },
        select: { id: true },
      });

      if (!deal) {
        return reply.code(404).send({ message: 'Deal not found' });
      }

      // lista interações do deal
      const interactions = await fastify.prisma.interaction.findMany({
        where: { companyId, dealId: id },
        include: { user: true, contact: true },
        orderBy: { timestamp: 'desc' },
      });

      return interactions;
    }
  );
  // MOVE STAGE
  fastify.post(
    '/deals/:id/move-stage',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const companyId = (request.user as any).companyId;
      const userId = (request.user as any).id;
      const { id } = request.params as any;

      const payload = moveStageSchema.parse(request.body);

      const moved = await service.moveStage(id, companyId, userId, payload);
      if (!moved) return reply.code(404).send({ message: 'Deal not found' });

      return moved;
    }
  );

  // CREATE
  fastify.post('/deals', { onRequest: [fastify.authenticate] }, async (request) => {
    const companyId = (request.user as any).companyId;
    const ownerId = (request.user as any).id; // obrigatório no schema Deal.ownerId

    const data = dealCreateSchema.parse(request.body);
    return service.create(data, companyId, ownerId);
  });

  // LIST
  fastify.get('/deals', { onRequest: [fastify.authenticate] }, async (request) => {
    const companyId = (request.user as any).companyId;
    return service.list(companyId, request.query);
  });

  // GET ONE
  fastify.get('/deals/:id', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const companyId = (request.user as any).companyId;
    const { id } = request.params as any;

    const deal = await service.get(id, companyId);
    if (!deal) return reply.code(404).send({ message: 'Deal not found' });

    return deal;
  });

  // UPDATE
  fastify.patch('/deals/:id', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const companyId = (request.user as any).companyId;
    const userId = (request.user as any).id;
    const { id } = request.params as any;

    const data = dealUpdateSchema.parse(request.body);
    const updated = await service.update(id, companyId, userId, data);

    if (!updated) return reply.code(404).send({ message: 'Deal not found' });
    return updated;
  });

  // DELETE
  fastify.delete('/deals/:id', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const companyId = (request.user as any).companyId;
    const { id } = request.params as any;

    const ok = await service.delete(id, companyId);
    if (!ok) return reply.code(404).send({ message: 'Deal not found' });

    return { success: true };
  });
}
