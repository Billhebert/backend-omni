import { FastifyInstance } from 'fastify';
import { PositionsService } from './positions.service';
import { MatchingEngine } from './matching.service';

export async function positionsRoutes(fastify: FastifyInstance) {
  const service = new PositionsService(fastify.prisma);

  fastify.post(
    '/positions',
    { onRequest: [fastify.authenticate] },
    async (req) => {
      const companyId = (req.user as any).companyId;
      const userId = (req.user as any).id;
      return service.create(req.body, companyId, userId);
    }
  );

  fastify.get(
    '/positions',
    { onRequest: [fastify.authenticate] },
    async (req) => {
      const companyId = (req.user as any).companyId;
      return service.list(companyId, req.query);
    }
  );

  fastify.get(
    '/positions/:id/applications',
    { onRequest: [fastify.authenticate] },
    async (req) => {
      const { id } = req.params as any;
      return service.getApplications(id);
    }
  );

  fastify.post(
    '/positions/:id/match',
    { onRequest: [fastify.authenticate] },
    async (req) => {
      const companyId = (req.user as any).companyId;
      const { id } = req.params as any;
      const { userId } = req.body as any;

      const matching = new MatchingEngine(fastify.prisma, companyId);
      return matching.matchUserToPosition(userId, id);
    }
  );

  fastify.get(
    '/positions/:id/candidates',
    { onRequest: [fastify.authenticate] },
    async (req) => {
      const companyId = (req.user as any).companyId;
      const { id } = req.params as any;

      const matching = new MatchingEngine(fastify.prisma, companyId);
      return matching.findCandidatesForPosition(id);
    }
  );
}
