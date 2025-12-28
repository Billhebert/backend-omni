import { PrismaClient } from "@prisma/client";

export class PipelineService {
  constructor(private prisma: PrismaClient) {}

  async getPipeline(companyId: string) {
    const stages = ["lead", "qualified", "proposal", "negotiation", "won", "lost"];

    // traz todos os deals da empresa (você pode paginar depois)
    const deals = await this.prisma.deal.findMany({
      where: { companyId },
      include: {
        contact: true,
        owner: true,
        products: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // organiza por stage
    const byStage: Record<string, any[]> = {};
    for (const s of stages) byStage[s] = [];

    for (const d of deals) {
      const s = d.stage || "lead";
      if (!byStage[s]) byStage[s] = [];
      byStage[s].push(d);
    }

    // resumo por stage
    const summary = Object.keys(byStage).map((stage) => {
      const items = byStage[stage];
      const count = items.length;
      const totalValue = items.reduce((acc, x) => acc + (x.value ?? 0), 0);

      return { stage, count, totalValue };
    });

    return {
      stages,
      summary,
      columns: byStage,
      totalDeals: deals.length,
      totalValue: deals.reduce((acc, x) => acc + (x.value ?? 0), 0),
    };
  }
}
