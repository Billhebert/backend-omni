// src/modules/crm/contacts/contacts.service.ts
import { PrismaClient } from "@prisma/client";

export class ContactsService {
  constructor(private prisma: PrismaClient) {}

  async create(data: any, companyId: string) {
    return this.prisma.contact.create({
      data: { ...data, companyId },
    });
  }

  async list(companyId: string, filters?: any) {
    return this.prisma.contact.findMany({
      where: { companyId, ...(filters ?? {}) },
      include: { owner: true, deals: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async get(id: string, companyId: string) {
    return this.prisma.contact.findFirst({
      where: { id, companyId },
      include: { owner: true, deals: true, interactions: true },
    });
  }

  async update(id: string, companyId: string, data: any) {
    const result = await this.prisma.contact.updateMany({
      where: { id, companyId },
      data,
    });

    if (result.count === 0) return null;
    return this.get(id, companyId);
  }

  async delete(id: string, companyId: string) {
    const result = await this.prisma.contact.deleteMany({
      where: { id, companyId },
    });

    return result.count > 0;
  }
}
