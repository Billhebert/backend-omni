import { PrismaClient } from "@prisma/client";

export class InteractionsService {
  constructor(private prisma: PrismaClient) {}

  async create(data: any, userId: string, companyId: string) {
    if (!data?.type) throw new Error("type is required");
    if (!data?.content && !data?.notes)
      throw new Error("content or notes is required");

    // ✅ conteúdo principal (obrigatório no schema)
    const content =
      data.content ??
      data.notes ??
      "Interaction created";

    return this.prisma.interaction.create({
      data: {
        type: data.type,
        direction: data.direction ?? null,
        subject: data.subject ?? null,
        content: String(content),

        duration: data.duration ?? null,
        sentiment: data.outcome ?? null, // mapeia outcome → sentiment

        // relações
        company: { connect: { id: companyId } },
        user: { connect: { id: userId } },

        ...(data.contactId
          ? { contact: { connect: { id: data.contactId } } }
          : {}),

        ...(data.dealId
          ? { deal: { connect: { id: data.dealId } } }
          : {}),

        // ✅ tudo que não existe no schema vai para metadata
        metadata: {
          nextAction: data.nextAction ?? null,
          nextActionDate: data.nextActionDate ?? null,
        },
      },
    });
  }

  async list(companyId: string, filters?: any) {
    return this.prisma.interaction.findMany({
      where: { companyId, ...(filters ?? {}) },
      include: {
        contact: true,
        deal: true,
        user: true,
      },
      orderBy: { timestamp: "desc" },
    });
  }

  async get(id: string, companyId: string) {
    return this.prisma.interaction.findFirst({
      where: { id, companyId },
      include: {
        contact: true,
        deal: true,
        user: true,
      },
    });
  }

  async delete(id: string, companyId: string) {
    const result = await this.prisma.interaction.deleteMany({
      where: { id, companyId },
    });

    return result.count > 0;
  }
}
