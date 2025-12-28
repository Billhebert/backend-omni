import { FastifyInstance } from 'fastify';
import { PerformanceService } from './performance.service';

export async function performanceRoutes(fastify: FastifyInstance) {
  const service = new PerformanceService(fastify.prisma);
  
  fastify.post('/performance-reviews', { onRequest: [fastify.authenticate] }, async (req) => {
    const reviewerId = (req.user as any).id;
    return service.createReview(req.body, reviewerId);
  });
  
  fastify.get('/users/:userId/performance-reviews', { onRequest: [fastify.authenticate] }, async (req) => {
    const { userId } = req.params as any;
    return service.getReviews(userId);
  });
}
