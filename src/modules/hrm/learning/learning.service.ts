// backend/src/modules/hrm/learning/learning.service.ts

import { PrismaClient } from '@prisma/client';

export interface CreateLearningPathInput {
  title: string;
  description?: string;
  targetSkills: string[];
  estimatedHours?: number;
  category?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  items: Array<{
    order: number;
    contentType: 'video' | 'article' | 'quiz' | 'zettel' | 'external' | 'document';
    title: string;
    description?: string;
    estimatedMinutes?: number;
    required?: boolean;
    externalUrl?: string;
    contentId?: string;
  }>;
}

export interface EnrollInPathInput {
  userId: string;
  pathId: string;
}

export interface UpdateProgressInput {
  userId: string;
  itemId: string;
  enrollmentId: string;
  status: 'not_started' | 'in_progress' | 'completed';
  score?: number;
  timeSpent?: number;
}

export class LearningService {
  constructor(private prisma: PrismaClient) {}

  // ============================================
  // LEARNING PATHS
  // ============================================

  async createLearningPath(
    data: CreateLearningPathInput & { companyId: string; createdBy: string }
  ) {
    const { items, ...pathData } = data;

    return this.prisma.learningPath.create({
      data: {
        ...pathData,
        items: { create: items },
      },
      include: {
        items: { orderBy: { order: 'asc' } },
      },
    });
  }

  async listLearningPaths(
    companyId: string,
    filters?: {
      category?: any;
      difficulty?: any;
      isActive?: any; // pode vir string "true"
    }
  ) {
    // ✅ normaliza isActive (string -> boolean)
    let isActive: boolean | undefined = undefined;
    if (filters?.isActive != null) {
      const v = String(filters.isActive).toLowerCase().trim();
      if (v === 'true' || v === '1') isActive = true;
      else if (v === 'false' || v === '0') isActive = false;
    }

    return this.prisma.learningPath.findMany({
      where: {
        companyId,
        ...(filters?.category ? { category: String(filters.category) } : {}),
        ...(filters?.difficulty ? { difficulty: String(filters.difficulty) } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
      include: {
        items: { orderBy: { order: 'asc' } },
        _count: { select: { enrollments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getLearningPath(id: string, companyId: string) {
    const path = await this.prisma.learningPath.findFirst({
      where: { id, companyId },
      include: {
        items: { orderBy: { order: 'asc' } },
        enrollments: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            progresses: true,
          },
        },
      },
    });

    if (!path) throw new Error('Learning path not found');
    return path;
  }

  async updateLearningPath(id: string, companyId: string, data: Partial<CreateLearningPathInput>) {
    const { items, ...pathData } = data;

    // atualiza path
    await this.prisma.learningPath.update({
      where: { id, companyId },
      data: pathData as any,
    });

    // se vier items, substitui tudo
    if (items) {
      await this.prisma.learningPathItem.deleteMany({ where: { pathId: id } });
      await this.prisma.learningPathItem.createMany({
        data: items.map((item) => ({
          ...item,
          pathId: id,
        })),
      });
    }

    return this.getLearningPath(id, companyId);
  }

  async deleteLearningPath(id: string, companyId: string) {
    const enrollments = await this.prisma.learningEnrollment.count({
      where: {
        pathId: id,
        status: { in: ['enrolled', 'in_progress'] },
      },
    });

    if (enrollments > 0) {
      throw new Error('Cannot delete path with active enrollments');
    }

    // soft delete
    return this.prisma.learningPath.update({
      where: { id, companyId },
      data: { isActive: false },
    });
  }

  // ============================================
  // ENROLLMENT
  // ============================================

  async enrollInPath(data: EnrollInPathInput) {
    const existing = await this.prisma.learningEnrollment.findUnique({
      where: { userId_pathId: { userId: data.userId, pathId: data.pathId } },
    });

    if (existing) throw new Error('Already enrolled in this path');

    return this.prisma.learningEnrollment.create({
      data: {
        userId: data.userId,
        pathId: data.pathId,
        status: 'enrolled',
      },
      include: {
        path: { include: { items: true } },
      },
    });
  }

  async getMyEnrollments(userId: string, status?: string) {
    const enrollments = await this.prisma.learningEnrollment.findMany({
      where: {
        userId,
        ...(status ? { status } : {}),
      },
      include: {
        path: { include: { items: true } },
        progresses: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return enrollments.map((enrollment) => {
      const totalItems = enrollment.path.items.length;
      const completedItems = enrollment.progresses.filter((p) => p.status === 'completed').length;
      const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

      return {
        ...enrollment,
        completedItems,
        totalItems,
        progress,
      };
    });
  }

  async abandonEnrollment(userId: string, pathId: string) {
    return this.prisma.learningEnrollment.update({
      where: { userId_pathId: { userId, pathId } },
      data: { status: 'abandoned' },
    });
  }

  // ============================================
  // PROGRESS TRACKING
  // ============================================

  async updateProgress(data: UpdateProgressInput & { pathId?: string }) {
    // 1) tenta achar o enrollment pelo ID (se veio)
    let enrollment = null;

    if (data.enrollmentId) {
      enrollment = await this.prisma.learningEnrollment.findFirst({
        where: {
          id: data.enrollmentId,
          userId: data.userId,
        },
        include: { path: { include: { items: true } } },
      });
    }

    // 2) se não achou e veio pathId, tenta resolver automaticamente
    if (!enrollment && (data as any).pathId) {
      const pathId = (data as any).pathId as string;
      enrollment = await this.prisma.learningEnrollment.findFirst({
        where: {
          pathId,
          userId: data.userId,
        },
        include: { path: { include: { items: true } } },
      });
    }

    // 3) se ainda não achou, retorna erro claro (não estoura FK)
    if (!enrollment) {
      throw new Error('Enrollment not found for this user/path. Create enrollment first.');
    }

    // 4) valida se o item pertence ao path do enrollment
    const itemExists = enrollment.path.items.some((it) => it.id === data.itemId);
    if (!itemExists) {
      throw new Error('Item not found in this learning path.');
    }

    // 5) usa o enrollmentId correto (resolve FK)
    const enrollmentId = enrollment.id;

    const progress = await this.prisma.learningProgress.upsert({
      where: {
        userId_itemId: {
          userId: data.userId,
          itemId: data.itemId,
        },
      },
      create: {
        userId: data.userId,
        itemId: data.itemId,
        enrollmentId,
        status: data.status,
        score: data.score,
        timeSpent: data.timeSpent,
        completedAt: data.status === 'completed' ? new Date() : null,
      },
      update: {
        status: data.status,
        score: data.score,
        timeSpent: data.timeSpent,
        completedAt: data.status === 'completed' ? new Date() : null,
        attempts: { increment: 1 },
        enrollmentId, // ✅ garante que FK sempre aponta pro enrollment correto
      },
    });

    await this.updateEnrollmentProgress(enrollmentId);
    return progress;
  }

  async getMyProgress(userId: string, pathId: string) {
    const enrollment = await this.prisma.learningEnrollment.findUnique({
      where: { userId_pathId: { userId, pathId } },
      include: {
        path: { include: { items: { orderBy: { order: 'asc' } } } },
        progresses: true,
      },
    });

    if (!enrollment) throw new Error('Enrollment not found');

    const items = enrollment.path.items.map((item) => {
      const progress = enrollment.progresses.find((p) => p.itemId === item.id);
      return { ...item, progress: progress || null };
    });

    return {
      enrollment,
      items,
      overallProgress: enrollment.progress,
    };
  }

  private async updateEnrollmentProgress(enrollmentId: string) {
    const enrollment = await this.prisma.learningEnrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        path: { include: { items: true } },
        progresses: true,
      },
    });

    if (!enrollment) return;

    const totalItems = enrollment.path.items.length;
    const completedItems = enrollment.progresses.filter((p) => p.status === 'completed').length;
    const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    await this.prisma.learningEnrollment.update({
      where: { id: enrollmentId },
      data: {
        progress,
        status: progress === 100 ? 'completed' : progress > 0 ? 'in_progress' : 'enrolled',
        startedAt: enrollment.startedAt || (progress > 0 ? new Date() : null),
        completedAt: progress === 100 ? new Date() : null,
      },
    });
  }

  // ============================================
  // ANALYTICS
  // ============================================

  async getPathAnalytics(pathId: string, companyId: string) {
    const path = await this.prisma.learningPath.findFirst({
      where: { id: pathId, companyId },
      include: {
        enrollments: { include: { progresses: true } },
      },
    });

    if (!path) throw new Error('Path not found');

    const totalEnrollments = path.enrollments.length;
    const activeEnrollments = path.enrollments.filter((e) => e.status === 'in_progress').length;
    const completedEnrollments = path.enrollments.filter((e) => e.status === 'completed').length;

    const averageProgress =
      totalEnrollments > 0
        ? Math.round(path.enrollments.reduce((sum, e) => sum + e.progress, 0) / totalEnrollments)
        : 0;

    const completionRate =
      totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0;

    return {
      pathId,
      pathTitle: path.title,
      totalEnrollments,
      activeEnrollments,
      completedEnrollments,
      averageProgress,
      completionRate,
    };
  }

  // ============================================
  // LEADERBOARD (aceita period do teste)
  // ============================================

  async getLearningLeaderboard(companyId: string, limit: number = 10, period?: string) {
    // period: "month" | "week" | "year" (o teste usa month)
    let since: Date | undefined = undefined;
    const now = new Date();

    if (period) {
      const p = String(period).toLowerCase().trim();
      if (p === 'week') since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      else if (p === 'month') since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      else if (p === 'year') since = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    }

    const users = await this.prisma.user.findMany({
      where: { companyId },
      include: {
        learningEnrollments: {
          where: {
            status: 'completed',
            ...(since ? { completedAt: { gte: since } } : {}),
          },
        },
      },
    });

    return users
      .map((user) => ({
        userId: user.id,
        userName: user.name,
        completedPaths: user.learningEnrollments.length,
      }))
      .filter((u) => u.completedPaths > 0)
      .sort((a, b) => b.completedPaths - a.completedPaths)
      .slice(0, limit);
  }
}
