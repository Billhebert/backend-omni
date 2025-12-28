// src/modules/auth/auth.routes.ts
import { FastifyInstance } from "fastify";
import { AuthService } from "./auth.service";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  companyId: z.string().uuid(),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  companyId: z.string().uuid(),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(6),
  newPassword: z.string().min(6),
});

export async function authRoutes(fastify: FastifyInstance) {
  const authService = new AuthService(fastify.prisma);

  fastify.post("/auth/register", async (request, reply) => {
    const data = registerSchema.parse(request.body);

    const user = await authService.register(data);

    const token = fastify.jwt.sign({
      id: user.id,
      companyId: user.companyId,
      role: user.role,
    });

    const refreshToken = fastify.jwt.sign({ id: user.id }, { expiresIn: "7d" });

    reply.send({ user, token, refreshToken });
  });

  fastify.post("/auth/login", async (request, reply) => {
    const { email, password, companyId } = loginSchema.parse(request.body);

    const user = await authService.login(email, password, companyId);

    const token = fastify.jwt.sign({
      id: user.id,
      companyId: user.companyId,
      role: user.role,
    });

    const refreshToken = fastify.jwt.sign({ id: user.id }, { expiresIn: "7d" });

    reply.send({ user, token, refreshToken });
  });

  fastify.post("/auth/refresh", async (request, reply) => {
    const { refreshToken } = refreshSchema.parse(request.body);

    const decoded = fastify.jwt.verify(refreshToken) as any;

    // Mantém o comportamento que você já tinha.
    // (Obs: ideal seria buscar user e reemitir também companyId/role)
    const token = fastify.jwt.sign({ id: decoded.id });

    reply.send({ token });
  });

  fastify.get(
    "/auth/me",
    { onRequest: [fastify.authenticate] },
    async (request) => {
      return request.user;
    }
  );

  // ✅ NOVO: change-password
  fastify.post(
    "/auth/change-password",
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as any).id;
      const { oldPassword, newPassword } = changePasswordSchema.parse(
        request.body
      );

      await authService.changePassword(userId, oldPassword, newPassword);

      reply.send({ success: true });
    }
  );

  // ✅ NOVO: logout (stateless JWT)
  fastify.post(
    "/auth/logout",
    { onRequest: [fastify.authenticate] },
    async (_request, reply) => {
      // Como seu auth é JWT stateless e não guarda refresh token no banco,
      // o "logout" efetivo é o front apagar token/refreshToken.
      reply.send({ success: true });
    }
  );
}
