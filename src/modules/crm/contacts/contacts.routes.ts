// src/modules/crm/contacts/contacts.routes.ts
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ContactsService } from './contacts.service';

const contactCreateSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  companyName: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  zipCode: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
  customFields: z.any().optional().nullable(),
  ownerId: z.string().uuid().optional().nullable(),
  leadSource: z.string().optional().nullable(),
  leadStatus: z.string().optional().nullable(),
  rating: z.number().int().optional().nullable(),
  lastContactedAt: z.string().datetime().optional().nullable(),
});

const contactUpdateSchema = contactCreateSchema.partial();

export async function contactsRoutes(fastify: FastifyInstance) {
  const service = new ContactsService(fastify.prisma);
  fastify.get(
    '/contacts/:id/interactions',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const companyId = (request.user as any).companyId;
      const { id } = request.params as any;

      // valida se o contato pertence à empresa
      const contact = await fastify.prisma.contact.findFirst({
        where: { id, companyId },
        select: { id: true },
      });

      if (!contact) {
        return reply.code(404).send({ message: 'Contact not found' });
      }

      // lista interações do contato (ordenado por data desc)
      const interactions = await fastify.prisma.interaction.findMany({
        where: { companyId, contactId: id },
        include: { user: true, deal: true },
        orderBy: { timestamp: 'desc' },
      });

      return interactions;
    }
  );

  // POST /api/crm/contacts
  fastify.post('/contacts', { onRequest: [fastify.authenticate] }, async (request) => {
    const companyId = (request.user as any).companyId;
    const data = contactCreateSchema.parse(request.body);
    return service.create(data, companyId);
  });

  // GET /api/crm/contacts
  fastify.get('/contacts', { onRequest: [fastify.authenticate] }, async (request) => {
    const companyId = (request.user as any).companyId;

    // filtros simples via querystring
    const q = request.query as any;
    const filters: any = {};
    if (q.ownerId) filters.ownerId = q.ownerId;
    if (q.leadStatus) filters.leadStatus = q.leadStatus;
    if (q.email) filters.email = q.email;
    if (q.phone) filters.phone = q.phone;

    return service.list(companyId, filters);
  });

  // GET /api/crm/contacts/:id
  fastify.get('/contacts/:id', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const companyId = (request.user as any).companyId;
    const { id } = request.params as any;

    const contact = await service.get(id, companyId);
    if (!contact) return reply.code(404).send({ message: 'Contact not found' });

    return contact;
  });

  // PATCH /api/crm/contacts/:id
  fastify.patch('/contacts/:id', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const companyId = (request.user as any).companyId;
    const { id } = request.params as any;

    const data = contactUpdateSchema.parse(request.body);
    const updated = await service.update(id, companyId, data);

    if (!updated) return reply.code(404).send({ message: 'Contact not found' });
    return updated;
  });

  // DELETE /api/crm/contacts/:id
  fastify.delete('/contacts/:id', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const companyId = (request.user as any).companyId;
    const { id } = request.params as any;

    const ok = await service.delete(id, companyId);
    if (!ok) return reply.code(404).send({ message: 'Contact not found' });

    return { success: true };
  });
}
