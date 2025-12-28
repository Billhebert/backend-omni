import { FastifyInstance } from "fastify";
import { z } from "zod";
import { InteractionsService } from "./interactions.service";

const interactionCreateSchema = z.object({
  type: z.string().min(1), // call, email, meeting, note, whatsapp
  direction: z.string().optional().nullable(),
  subject: z.string().optional().nullable(),

  // aceita notes OU content
  notes: z.string().optional().nullable(),
  content: z.string().optional().nullable(),

  duration: z.number().optional().nullable(),
  outcome: z.string().optional().nullable(),

  nextAction: z.string().optional().nullable(),
  nextActionDate: z.string().optional().nullable(),

  contactId: z.string().uuid().optional().nullable(),
  dealId: z.string().uuid().optional().nullable(),
});

export async function interactionsRoutes(fastify: FastifyInstance) {
  const service = new InteractionsService(fastify.prisma);

  // CREATE
  fastify.post(
    "/interactions",
    { onRequest: [fastify.authenticate] },
    async (request) => {
      const userId = (request.user as any).id;
      const companyId = (request.user as any).companyId;

      const data = interactionCreateSchema.parse(request.body);
      return service.create(data, userId, companyId);
    }
  );

  // LIST
  fastify.get(
    "/interactions",
    { onRequest: [fastify.authenticate] },
    async (request) => {
      const companyId = (request.user as any).companyId;
      return service.list(companyId, request.query);
    }
  );

  // GET ONE
  fastify.get(
    "/interactions/:id",
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const companyId = (request.user as any).companyId;
      const { id } = request.params as any;

      const interaction = await service.get(id, companyId);
      if (!interaction)
        return reply.code(404).send({ message: "Interaction not found" });

      return interaction;
    }
  );

  // DELETE
  fastify.delete(
    "/interactions/:id",
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const companyId = (request.user as any).companyId;
      const { id } = request.params as any;

      const ok = await service.delete(id, companyId);
      if (!ok)
        return reply.code(404).send({ message: "Interaction not found" });

      return { success: true };
    }
  );
}
