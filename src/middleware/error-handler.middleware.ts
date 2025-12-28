import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../utils/logger';

export async function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  logger.error(error);
  
  if (error.validation) {
    return reply.code(400).send({ error: 'Validation error', details: error.validation });
  }
  
  reply.code(error.statusCode || 500).send({
    error: error.message || 'Internal server error'
  });
}
