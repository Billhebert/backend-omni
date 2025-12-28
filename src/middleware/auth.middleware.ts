// src/middleware/auth.middleware.ts
import { FastifyRequest, FastifyReply } from 'fastify';

export interface AuthenticatedRequest extends FastifyRequest {
  user: {
    id: string;
    companyId: string;
    email: string;
    role: string;
  };
}

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    // User is attached to request by @fastify/jwt
  } catch (err) {
    reply.code(401).send({ error: 'Unauthorized' });
  }
}

export function requireRole(...roles: string[]) {
  return async (request: AuthenticatedRequest, reply: FastifyReply) => {
    await authMiddleware(request, reply);
    
    const user = request.user;
    if (!roles.includes(user.role)) {
      reply.code(403).send({ error: 'Forbidden' });
    }
  };
}
