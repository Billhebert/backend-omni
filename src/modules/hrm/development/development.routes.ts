import { FastifyInstance } from 'fastify';
import { DevelopmentService } from './development.service';

export async function developmentRoutes(fastify: FastifyInstance) {
  const service = new DevelopmentService(fastify.prisma);
  
  fastify.post('/development-plans', { onRequest: [fastify.authenticate] }, async (req) => {
    const userId = (req.user as any).id;
    return service.createPlan(req.body, userId);
  });
  
  fastify.get('/my-development-plans', { onRequest: [fastify.authenticate] }, async (req) => {
    const userId = (req.user as any).id;
    return service.getMyPlans(userId);
  });
  
  fastify.patch('/development-plans/:id/progress', { onRequest: [fastify.authenticate] }, async (req) => {
    const { id } = req.params as any;
    const { progress } = req.body as any;
    return service.updateProgress(id, progress);
  });
}
