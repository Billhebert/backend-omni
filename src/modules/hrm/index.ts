// backend/src/modules/hrm/index.ts

import { FastifyInstance } from 'fastify';
import { learningRoutes } from './learning/learning.routes';
// import { positionsRoutes } from './positions/positions.routes';
// import { developmentRoutes } from './development/plans.routes';

/**
 * HRM Module - Human Resources Management
 * 
 * Registra todas as rotas relacionadas a gestão de pessoas:
 * - Learning Management
 * - Job Positions & Applications
 * - Skill Development Plans
 * - Performance Reviews
 */
export async function hrmModule(fastify: FastifyInstance) {
  // ✅ Learning Management System
  await fastify.register(learningRoutes, { prefix: '/hrm' });

  // 🔨 TODO: Descomentar quando implementar
  // await fastify.register(positionsRoutes, { prefix: '/hrm' });
  // await fastify.register(developmentRoutes, { prefix: '/hrm' });

  fastify.log.info('✅ HRM Module registered');
}
