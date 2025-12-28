import { PrismaClient } from '@prisma/client';

type DealProductInput = {
  productId: string;
  productName?: string | null;
  quantity: number;
  unitPrice?: number | null;
  price?: number | null; // compat
  discount?: number | null;
  tax?: number | null;
};

export class DealsService {
  constructor(private prisma: PrismaClient) {}

  async create(data: any, companyId: string, ownerId: string) {
    if (!companyId) throw new Error('companyId is required');
    if (!ownerId) throw new Error('ownerId is required');

    const contactId = data?.contactId;
    if (!contactId) throw new Error('contactId is required');

    // ✅ valida se o contato pertence à mesma empresa
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, companyId },
      select: { id: true },
    });
    if (!contact) throw new Error('Contact not found for this company');

    // ✅ normaliza datas (DateTime)
    const expectedCloseDate = data?.expectedCloseDate
      ? new Date(data.expectedCloseDate)
      : undefined;
    const closedDate = data?.closedDate ? new Date(data.closedDate) : undefined;

    // ✅ products: array simples -> DealProduct[] via nested create
    const productsInput: DealProductInput[] = Array.isArray(data?.products) ? data.products : [];

    const productsCreate = productsInput.map((p) => {
      const quantity = Number(p.quantity ?? 0);
      const unitPrice = Number(p.unitPrice ?? p.price ?? 0);
      const discount = Number(p.discount ?? 0);
      const tax = Number(p.tax ?? 0);
      const total = quantity * unitPrice - discount + tax;

      return {
        productId: String(p.productId),
        productName: String(p.productName ?? ''),
        quantity,
        unitPrice,
        discount,
        tax,
        total,
      };
    });

    // ✅ cria Deal (sem notes, porque schema Deal não tem notes)
    const deal = await this.prisma.deal.create({
      data: {
        title: data.title,
        value: Number(data.value ?? 0),
        currency: data.currency ?? 'USD',
        stage: data.stage ?? 'lead',
        probability: data.probability ?? null,
        expectedCloseDate,
        closedDate,

        // relações obrigatórias:
        company: { connect: { id: companyId } },
        contact: { connect: { id: contactId } },
        owner: { connect: { id: ownerId } },

        ...(productsCreate.length ? { products: { create: productsCreate } } : {}),
      },
      include: { contact: true, owner: true, products: true },
    });

    // ✅ mantém notes “sem perder nada”: grava como Interaction do tipo "note"
    if (data?.notes && String(data.notes).trim().length > 0) {
      await this.prisma.interaction.create({
        data: {
          company: { connect: { id: companyId } },
          type: 'note',
          contact: { connect: { id: contactId } },
          deal: { connect: { id: deal.id } },
          user: { connect: { id: ownerId } },
          subject: 'Deal note',
          content: String(data.notes),
          direction: 'outbound',
        },
      });
    }

    // opcional: devolver o deal + uma flag indicando que notes foi salvo em interactions
    return deal;
  }

  async list(companyId: string, filters?: any) {
    return this.prisma.deal.findMany({
      where: { companyId, ...(filters ?? {}) },
      include: { contact: true, owner: true, products: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(id: string, companyId: string) {
    return this.prisma.deal.findFirst({
      where: { id, companyId },
      include: { contact: true, owner: true, products: true, interactions: true },
    });
  }

  async update(id: string, companyId: string, userId: string, data: any) {
    const expectedCloseDate = data?.expectedCloseDate
      ? new Date(data.expectedCloseDate)
      : undefined;
    const closedDate = data?.closedDate ? new Date(data.closedDate) : undefined;

    // ✅ update seguro (id não é composto com companyId)
    const result = await this.prisma.deal.updateMany({
      where: { id, companyId },
      data: {
        ...data,
        expectedCloseDate,
        closedDate,
        // não deixa o cliente trocar relations por aqui sem controle
        companyId: undefined,
        contactId: undefined,
        ownerId: undefined,
      },
    });

    if (result.count === 0) return null;

    // ✅ se vier notes no update, também salva como Interaction
    if (data?.notes && String(data.notes).trim().length > 0) {
      // pega contactId do deal para relacionar a interaction
      const current = await this.prisma.deal.findFirst({
        where: { id, companyId },
        select: { contactId: true },
      });

      if (current?.contactId) {
        await this.prisma.interaction.create({
          data: {
            company: { connect: { id: companyId } },
            type: 'note',
            contact: { connect: { id: current.contactId } },
            deal: { connect: { id } },
            user: { connect: { id: userId } },
            subject: 'Deal note',
            content: String(data.notes),
            direction: 'outbound',
          },
        });
      }
    }

    return this.get(id, companyId);
  }

  async delete(id: string, companyId: string) {
    const result = await this.prisma.deal.deleteMany({
      where: { id, companyId },
    });
    return result.count > 0;
  }
  async moveStage(id: string, companyId: string, userId: string, data: any) {
    const stage = data?.stage;
    if (!stage) throw new Error('stage is required');

    const patch: any = {
      stage,
      probability: data?.probability ?? null,
      competitorName: data?.competitorName ?? null,
    };

    // Se mover para won/lost, marcar closedDate
    if (stage === 'won') {
      patch.wonReason = data?.wonReason ?? null;
      patch.lostReason = null;
      patch.closedDate = data?.closedDate ? new Date(data.closedDate) : new Date();
    } else if (stage === 'lost') {
      patch.lostReason = data?.lostReason ?? null;
      patch.wonReason = null;
      patch.closedDate = data?.closedDate ? new Date(data.closedDate) : new Date();
    } else {
      // se voltar para um estágio aberto, pode limpar closedDate
      patch.closedDate = null;
      patch.wonReason = null;
      patch.lostReason = null;
    }

    const result = await this.prisma.deal.updateMany({
      where: { id, companyId },
      data: patch,
    });

    if (result.count === 0) return null;

    // Registrar histórico como Interaction (mantém “sem remover nada”)
    await this.prisma.interaction.create({
      data: {
        company: { connect: { id: companyId } },
        type: 'note',
        deal: { connect: { id } },
        user: { connect: { id: userId } },
        subject: 'Deal stage updated',
        content: `Stage moved to "${stage}"`,
        direction: 'outbound',
      },
    });

    return this.get(id, companyId);
  }
}
