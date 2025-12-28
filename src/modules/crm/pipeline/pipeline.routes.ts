import { FastifyInstance } from "fastify";
import { PipelineService } from "./pipeline.service";

export async function pipelineRoutes(fastify: FastifyInstance) {
  const service = new PipelineService(fastify.prisma);

  // GET /api/crm/pipeline
  fastify.get(
    "/pipeline",
    { onRequest: [fastify.authenticate] },
    async (request) => {
      const companyId = (request.user as any).companyId;
      return service.getPipeline(companyId);
    }
  );
}
