import { FastifyRequest, FastifyReply } from 'fastify';
import { ZodSchema } from 'zod';

export function validate(schema: ZodSchema) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      schema.parse(request.body);
    } catch (error) {
      reply.code(400).send({ error: 'Validation failed', details: error });
    }
  };
}
