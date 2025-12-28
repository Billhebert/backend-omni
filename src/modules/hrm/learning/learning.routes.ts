// backend/src/modules/hrm/learning/learning.routes.ts

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { LearningService, CreateLearningPathInput } from './learning.service';

// ⚠️ Se esse import existir no seu projeto, pode manter.
// Se não existir, remova para não quebrar build.
import { AutoZettelService } from '../../ai-orchestrator/auto-zettel.service';

interface AuthenticatedRequest extends FastifyRequest {
  user: {
    id: string;
    companyId: string;
    role: string;
  };
}

export async function learningRoutes(fastify: FastifyInstance) {
  const learningService = new LearningService(fastify.prisma);

  // ✅ PROTEGE TODAS AS ROTAS DESTE MÓDULO
  fastify.addHook('onRequest', async (request: any, reply: any) => {
    await fastify.authenticate(request, reply);
    if (reply.sent) return;
  });

  // ============================================
  // LEARNING PATHS
  // ============================================

  // 1) CREATE LEARNING PATH
  fastify.post<{ Body: any }>(
    '/learning-paths',
    {
      schema: {
        tags: ['Learning'],
        summary: 'Create a learning path',
      },
    },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        // aceita contentUrl do teste e converte para externalUrl
        const body = request.body ?? {};
        const items = Array.isArray(body.items) ? body.items : [];

        const payload: CreateLearningPathInput = {
          title: body.title,
          description: body.description,
          category: body.category,
          difficulty: body.difficulty,
          estimatedHours: body.estimatedHours,
          targetSkills: body.targetSkills ?? [],
          items: items.map((it: any) => ({
            order: Number(it.order ?? 0),
            contentType: it.contentType,
            title: it.title,
            description: it.description,
            estimatedMinutes: it.estimatedMinutes != null ? Number(it.estimatedMinutes) : undefined,
            required: it.required ?? true,
            externalUrl: it.externalUrl ?? it.contentUrl ?? undefined,
            contentId: it.contentId ?? undefined,
          })),
        };

        const path = await learningService.createLearningPath({
          ...payload,
          companyId: request.user.companyId,
          createdBy: request.user.id,
        });

        reply.code(201).send(path);
      } catch (error: any) {
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // 2) LIST ALL LEARNING PATHS (with filters)
  fastify.get(
    '/learning-paths',
    {
      schema: {
        tags: ['Learning'],
        summary: 'List all learning paths',
      },
    },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const paths = await learningService.listLearningPaths(
          request.user.companyId,
          request.query as any
        );
        reply.send(paths);
      } catch (error: any) {
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // 3) GET LEARNING PATH BY ID
  fastify.get<{ Params: { id: string } }>(
    '/learning-paths/:id',
    {
      schema: {
        tags: ['Learning'],
        summary: 'Get learning path details',
      },
    },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const path = await learningService.getLearningPath(
          request.params.id,
          request.user.companyId
        );
        reply.send(path);
      } catch (error: any) {
        reply.code(404).send({ error: error.message });
      }
    }
  );

  // 4) UPDATE LEARNING PATH
  fastify.patch<{ Params: { id: string }; Body: any }>(
    '/learning-paths/:id',
    {
      schema: {
        tags: ['Learning'],
        summary: 'Update learning path',
      },
    },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const body = request.body ?? {};
        // permite atualizar items também se quiser
        if (Array.isArray(body.items)) {
          body.items = body.items.map((it: any) => ({
            order: Number(it.order ?? 0),
            contentType: it.contentType,
            title: it.title,
            description: it.description,
            estimatedMinutes: it.estimatedMinutes != null ? Number(it.estimatedMinutes) : undefined,
            required: it.required ?? true,
            externalUrl: it.externalUrl ?? it.contentUrl ?? undefined,
            contentId: it.contentId ?? undefined,
          }));
        }

        const path = await learningService.updateLearningPath(
          request.params.id,
          request.user.companyId,
          body
        );
        reply.send(path);
      } catch (error: any) {
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // 5) DELETE LEARNING PATH
  fastify.delete<{ Params: { id: string } }>(
    '/learning-paths/:id',
    {
      schema: {
        tags: ['Learning'],
        summary: 'Delete learning path',
      },
    },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        await learningService.deleteLearningPath(request.params.id, request.user.companyId);
        reply.code(204).send();
      } catch (error: any) {
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // 6) GET LEARNING PATH ANALYTICS
  fastify.get<{ Params: { id: string } }>(
    '/learning-paths/:id/analytics',
    {
      schema: {
        tags: ['Learning'],
        summary: 'Get learning path analytics',
      },
    },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const analytics = await learningService.getPathAnalytics(
          request.params.id,
          request.user.companyId
        );
        reply.send(analytics);
      } catch (error: any) {
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // ============================================
  // ENROLLMENT
  // ============================================

  // 7) ENROLL IN LEARNING PATH
  fastify.post<{ Body: { pathId: string } }>(
    '/enrollments',
    {
      schema: {
        tags: ['Learning'],
        summary: 'Enroll in a learning path',
      },
    },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const enrollment = await learningService.enrollInPath({
          userId: request.user.id,
          pathId: request.body.pathId,
        });

        reply.code(201).send(enrollment);
      } catch (error: any) {
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // 8) GET MY ENROLLMENTS
  fastify.get(
    '/my-enrollments',
    {
      schema: {
        tags: ['Learning'],
        summary: 'Get my enrollments',
      },
    },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const status = (request.query as any)?.status;
        const enrollments = await learningService.getMyEnrollments(request.user.id, status);
        reply.send(enrollments);
      } catch (error: any) {
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // 11) ABANDON ENROLLMENT
  fastify.post<{ Params: { pathId: string }; Body: any }>(
    '/enrollments/:pathId/abandon',
    {
      schema: {
        tags: ['Learning'],
        summary: 'Abandon enrollment',
      },
    },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        // reason vem no teste, mas o schema não tem campo.
        // Aqui a gente só ignora com segurança.
        await learningService.abandonEnrollment(request.user.id, request.params.pathId);
        reply.send({ message: 'Enrollment abandoned' });
      } catch (error: any) {
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // ============================================
  // PROGRESS TRACKING
  // ============================================

  // 9) UPDATE PROGRESS
  // ✅ aceita o formato do teste:
  // { enrollmentId, itemId, completed: true, timeSpentMinutes, notes }
  // ✅ e também o formato antigo:
  // { enrollmentId, itemId, status, timeSpent, score }
  fastify.post<{ Body: any }>(
    '/progress',
    {
      schema: {
        tags: ['Learning'],
        summary: 'Update progress',
      },
    },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const body = request.body ?? {};
        const enrollmentId = body.enrollmentId;
        const itemId = body.itemId;
        const pathId = body.pathId;

        // converte completed -> status
        const status =
          body.status ??
          (body.completed === true
            ? 'completed'
            : body.completed === false
            ? 'in_progress'
            : 'in_progress');

        const timeSpent =
          body.timeSpent != null
            ? Number(body.timeSpent)
            : body.timeSpentMinutes != null
            ? Number(body.timeSpentMinutes)
            : undefined;

        const score = body.score != null ? Number(body.score) : undefined;

        const progress = await learningService.updateProgress({
          userId: request.user.id,
          enrollmentId,
          itemId,
          status,
          timeSpent,
          score,
          pathId, // ✅ ajuda a resolver enrollment automaticamente
        });

        // Auto-zettel quando completar
        if (status === 'completed') {
          try {
            const autoZettel = new AutoZettelService(fastify.prisma, request.user.companyId);
            autoZettel
              .handleEvent({
                eventType: 'employee_completed_course',
                data: {
                  itemId,
                  enrollmentId,
                  score,
                  timeSpent,
                },
                userId: request.user.id,
                companyId: request.user.companyId,
              })
              .catch((err) => console.error('Auto-zettel error:', err));
          } catch (err) {
            // se o serviço não existir/der erro, não quebra a API
          }
        }

        reply.send(progress);
      } catch (error: any) {
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // 10) GET MY PROGRESS FOR A PATH
  fastify.get<{ Params: { pathId: string } }>(
    '/learning-paths/:pathId/my-progress',
    {
      schema: {
        tags: ['Learning'],
        summary: 'Get my progress for a path',
      },
    },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const progress = await learningService.getMyProgress(
          request.user.id,
          request.params.pathId
        );
        reply.send(progress);
      } catch (error: any) {
        reply.code(404).send({ error: error.message });
      }
    }
  );

  // ============================================
  // 12) LEADERBOARD
  // ============================================

  fastify.get(
    '/leaderboard',
    {
      schema: {
        tags: ['Learning'],
        summary: 'Get learning leaderboard',
      },
    },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const q = request.query as any;
        const limit = q?.limit != null ? Number(q.limit) : 10;
        const period = q?.period; // "month" no seu teste

        const leaderboard = await learningService.getLearningLeaderboard(
          request.user.companyId,
          limit,
          period
        );

        reply.send(leaderboard);
      } catch (error: any) {
        reply.code(500).send({ error: error.message });
      }
    }
  );
}
