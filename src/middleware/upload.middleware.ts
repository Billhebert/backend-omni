import multipart from '@fastify/multipart';
import { FastifyInstance } from 'fastify';

export async function registerUpload(fastify: FastifyInstance) {
  await fastify.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
  });
}
