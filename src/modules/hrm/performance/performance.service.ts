import { PrismaClient } from '@prisma/client';

export class PerformanceService {
  constructor(private prisma: PrismaClient) {}

  async createReview(data: any, reviewerId: string) {
    return this.prisma.performanceReview.create({
      data: { ...data, reviewerId }
    });
  }

  async getReviews(userId: string) {
    return this.prisma.performanceReview.findMany({
      where: { userId },
      include: { reviewer: true },
      orderBy: { reviewDate: 'desc' }
    });
  }
}
