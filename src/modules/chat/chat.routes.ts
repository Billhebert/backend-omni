import { FastifyInstance } from 'fastify';
import { ChatService } from './chat.service';

export async function chatRoutes(fastify: FastifyInstance) {
  const service = new ChatService(fastify.prisma);
  
  fastify.post('/chat', { onRequest: [fastify.authenticate] }, async (req) => {
    const companyId = (req.user as any).companyId;
    const { message } = req.body as any;
    return service.chat(message, companyId);
  });
}
