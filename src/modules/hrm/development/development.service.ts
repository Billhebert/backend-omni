import { PrismaClient } from '@prisma/client';

export class DevelopmentService {
  constructor(private prisma: PrismaClient) {}

  async createPlan(data: any, userId: string) {
    return this.prisma.skillDevelopmentPlan.create({
      data: { ...data, userId }
    });
  }

  async getMyPlans(userId: string) {
    return this.prisma.skillDevelopmentPlan.findMany({
      where: { userId },
      include: { skill: true }
    });
  }

  async updateProgress(planId: string, progress: number) {
    return this.prisma.skillDevelopmentPlan.update({
      where: { id: planId },
      data: { progress, ...(progress >= 100 && { completedAt: new Date() }) }
    });
  }
}
