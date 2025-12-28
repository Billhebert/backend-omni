import { FastifyInstance } from 'fastify';
import { KnowledgeService } from './knowledge.service';

export async function knowledgeRoutes(fastify: FastifyInstance) {
  const service = new KnowledgeService(fastify.prisma);
  
  fastify.post('/knowledge/nodes', { onRequest: [fastify.authenticate] }, async (req) => {
    const companyId = (req.user as any).companyId;
    const userId = (req.user as any).id;
    return service.createNode(req.body, companyId, userId);
  });
  
  fastify.get('/knowledge/search', { onRequest: [fastify.authenticate] }, async (req) => {
    const companyId = (req.user as any).companyId;
    const { query, limit } = req.query as any;
    return service.search(query, companyId, limit);
  });
}
