import { PrismaClient } from '@prisma/client';

export class PositionsService {
  constructor(private prisma: PrismaClient) {}

  async create(data: any, companyId: string, userId: string) {
    return this.prisma.jobPosition.create({
      data: { ...data, companyId, createdBy: userId }
    });
  }

  async list(companyId: string, filters?: any) {
    return this.prisma.jobPosition.findMany({
      where: { companyId, ...filters },
      include: { requiredSkills: { include: { skill: true } } }
    });
  }

  async getApplications(positionId: string) {
    return this.prisma.jobApplication.findMany({
      where: { positionId },
      include: { applicant: true }
    });
  }
}
