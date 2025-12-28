import { PrismaClient } from '@prisma/client';

export class ExpensesService {
  constructor(private prisma: PrismaClient) {}

  async create(data: any, companyId: string, userId: string) {
    const date = data?.date ? new Date(data.date) : new Date();

    return this.prisma.expense.create({
      data: {
        company: { connect: { id: companyId } },
        user: { connect: { id: userId } },

        category: data.category,
        subcategory: data.subcategory ?? null,
        description: data.description,
        amount: Number(data.amount ?? 0),
        currency: data.currency ?? 'USD',
        date,

        status: data.status ?? 'pending',
        receipt: data.receipt ?? null,

        projectId: data.projectId ?? null,
        approvedBy: data.approvedBy ?? null,
        approvedAt: data.approvedAt ? new Date(data.approvedAt) : null,
        reimbursedAt: data.reimbursedAt ? new Date(data.reimbursedAt) : null,

        notes: data.notes ?? null,
      },
    });
  }

  async list(companyId: string, filters?: any) {
    return this.prisma.expense.findMany({
      where: { companyId, ...(filters ?? {}) },
      include: { user: true },
      orderBy: { date: 'desc' },
    });
  }

  async get(id: string, companyId: string) {
    return this.prisma.expense.findFirst({
      where: { id, companyId },
      include: { user: true },
    });
  }

  async update(id: string, companyId: string, data: any) {
    const date = data?.date ? new Date(data.date) : undefined;
    const approvedAt = data?.approvedAt ? new Date(data.approvedAt) : undefined;
    const reimbursedAt = data?.reimbursedAt ? new Date(data.reimbursedAt) : undefined;

    const result = await this.prisma.expense.updateMany({
      where: { id, companyId },
      data: {
        category: data.category ?? undefined,
        subcategory: data.subcategory ?? undefined,
        description: data.description ?? undefined,
        amount: data.amount != null ? Number(data.amount) : undefined,
        currency: data.currency ?? undefined,
        date: date ?? undefined,
        status: data.status ?? undefined,
        receipt: data.receipt ?? undefined,
        projectId: data.projectId ?? undefined,
        approvedBy: data.approvedBy ?? undefined,
        approvedAt: approvedAt ?? undefined,
        reimbursedAt: reimbursedAt ?? undefined,
        notes: data.notes ?? undefined,
      },
    });

    if (result.count === 0) return null;
    return this.get(id, companyId);
  }

  async delete(id: string, companyId: string) {
    const result = await this.prisma.expense.deleteMany({
      where: { id, companyId },
    });
    return result.count > 0;
  }
  async approve(id: string, companyId: string, approverId: string) {
    const result = await this.prisma.expense.updateMany({
      where: { id, companyId },
      data: {
        status: 'approved',
        approvedBy: approverId,
        approvedAt: new Date(),
      },
    });

    if (result.count === 0) return null;
    return this.get(id, companyId);
  }

  async reject(id: string, companyId: string, approverId: string, reason?: string) {
    const result = await this.prisma.expense.updateMany({
      where: { id, companyId },
      data: {
        status: 'rejected',
        approvedBy: approverId,
        approvedAt: new Date(),
        notes: reason ? `Rejected: ${reason}` : undefined,
      },
    });

    if (result.count === 0) return null;
    return this.get(id, companyId);
  }

  async reimburse(id: string, companyId: string) {
    const result = await this.prisma.expense.updateMany({
      where: { id, companyId },
      data: {
        status: 'reimbursed',
        reimbursedAt: new Date(),
      },
    });

    if (result.count === 0) return null;
    return this.get(id, companyId);
  }
}
