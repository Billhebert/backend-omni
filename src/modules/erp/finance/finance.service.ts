import { PrismaClient } from '@prisma/client';

export class FinanceService {
  constructor(private prisma: PrismaClient) {}
  async getSummary(companyId: string, params?: any) {
    // filtros por período (opcional)
    const from = params?.from ? new Date(params.from) : undefined;
    const to = params?.to ? new Date(params.to) : undefined;

    const invoiceWhere: any = { companyId };
    const expenseWhere: any = { companyId };

    // Se quiser considerar período por issueDate (invoice) e date (expense)
    if (from || to) {
      invoiceWhere.issueDate = {};
      expenseWhere.date = {};
      if (from) {
        invoiceWhere.issueDate.gte = from;
        expenseWhere.date.gte = from;
      }
      if (to) {
        invoiceWhere.issueDate.lte = to;
        expenseWhere.date.lte = to;
      }
    }

    const [invoices, expenses] = await Promise.all([
      this.prisma.invoice.findMany({
        where: invoiceWhere,
        select: {
          total: true,
          status: true,
          type: true,
          taxAmount: true,
          discountAmount: true,
          subtotal: true,
        },
      }),
      this.prisma.expense.findMany({
        where: expenseWhere,
        select: { amount: true, status: true },
      }),
    ]);

    // Receitas (receivable)
    const receivable = invoices.filter((x) => x.type === 'receivable');
    const payable = invoices.filter((x) => x.type === 'payable');

    const sum = (arr: any[], key: string) => arr.reduce((a, x) => a + Number(x[key] ?? 0), 0);

    const revenueTotal = sum(receivable, 'total');
    const payableTotal = sum(payable, 'total');

    // status invoices
    const revenuePaid = sum(
      receivable.filter((x) => x.status === 'paid'),
      'total'
    );
    const revenueOverdue = sum(
      receivable.filter((x) => x.status === 'overdue'),
      'total'
    );
    const revenueOpen = sum(
      receivable.filter((x) => x.status !== 'paid'),
      'total'
    );

    const expensesTotal = expenses.reduce((a, x) => a + Number(x.amount ?? 0), 0);
    const expensesApproved = expenses.filter(
      (e) => e.status === 'approved' || e.status === 'reimbursed'
    );
    const expensesPending = expenses.filter((e) => e.status === 'pending');
    const expensesRejected = expenses.filter((e) => e.status === 'rejected');

    const expensesApprovedTotal = expensesApproved.reduce((a, x) => a + Number(x.amount ?? 0), 0);
    const expensesPendingTotal = expensesPending.reduce((a, x) => a + Number(x.amount ?? 0), 0);
    const expensesRejectedTotal = expensesRejected.reduce((a, x) => a + Number(x.amount ?? 0), 0);

    // lucro simples (receita - despesas)
    const profit = revenuePaid - expensesApprovedTotal;

    return {
      range: {
        from: from ? from.toISOString() : null,
        to: to ? to.toISOString() : null,
      },

      invoices: {
        receivable: {
          total: revenueTotal,
          paid: revenuePaid,
          open: revenueOpen,
          overdue: revenueOverdue,
          count: receivable.length,
        },
        payable: {
          total: payableTotal,
          count: payable.length,
        },
      },

      expenses: {
        total: expensesTotal,
        approvedTotal: expensesApprovedTotal,
        pendingTotal: expensesPendingTotal,
        rejectedTotal: expensesRejectedTotal,
        count: expenses.length,
      },

      profit,
    };
  }

  async updateInvoice(id: string, companyId: string, data: any) {
    const issueDate = data.issueDate ? new Date(data.issueDate) : undefined;
    const dueDate = data.dueDate ? new Date(data.dueDate) : undefined;

    // Atualiza apenas campos do Invoice (não mexe em items aqui)
    const result = await this.prisma.invoice.updateMany({
      where: { id, companyId },
      data: {
        number: data.number ?? data.invoiceNumber ?? undefined,
        type: data.type ?? undefined,
        status: data.status ?? undefined,
        contactId: data.contactId ?? undefined,
        dealId: data.dealId ?? undefined,
        issueDate: issueDate ?? undefined,
        dueDate: dueDate ?? undefined,
        subtotal: data.subtotal ?? undefined,
        taxAmount: data.taxAmount ?? data.tax ?? undefined,
        discountAmount: data.discountAmount ?? undefined,
        total: data.total ?? undefined,
        notes: data.notes ?? undefined,
      },
    });

    if (result.count === 0) return null;

    return this.prisma.invoice.findFirst({
      where: { id, companyId },
      include: { items: true },
    });
  }

  async createInvoice(data: any, companyId: string) {
    // aceita tanto "number" quanto "invoiceNumber"
    const number = data.number ?? data.invoiceNumber;
    if (!number) throw new Error('Invoice number is required (number | invoiceNumber)');

    // DateTime no Prisma -> Date
    const issueDate = data.issueDate ? new Date(data.issueDate) : new Date();
    const dueDate = data.dueDate ? new Date(data.dueDate) : new Date();

    // itens: recalcular subtotal/total se quiser (aqui só normalizo)
    const itemsInput = Array.isArray(data.items?.create)
      ? data.items.create
      : Array.isArray(data.items)
      ? data.items
      : [];

    const itemsCreate = itemsInput.map((it: any) => {
      const quantity = Number(it.quantity ?? 1);
      const unitPrice = Number(it.unitPrice ?? 0);
      const taxRate = Number(it.taxRate ?? 0);
      const discountRate = Number(it.discountRate ?? 0);

      const lineBase = quantity * unitPrice;
      const lineTax = lineBase * (taxRate / 100);
      const lineDiscount = lineBase * (discountRate / 100);
      const total = lineBase + lineTax - lineDiscount;

      return {
        productId: it.productId ?? null,
        description: String(it.description ?? ''),
        quantity,
        unitPrice,
        taxRate,
        discountRate,
        total: Number(it.total ?? total),
      };
    });

    // mapeamentos do schema
    const subtotal = Number(data.subtotal ?? itemsCreate.reduce((a, x) => a + (x.total ?? 0), 0));
    const taxAmount = Number(data.taxAmount ?? data.tax ?? 0);
    const discountAmount = Number(data.discountAmount ?? 0);

    const total = Number(data.total ?? subtotal + taxAmount - discountAmount);

    return this.prisma.invoice.create({
      data: {
        company: { connect: { id: companyId } },

        number: String(number),
        type: data.type ?? 'receivable',
        status: data.status ?? 'draft',

        contactId: data.contactId ?? null,
        dealId: data.dealId ?? null,

        issueDate,
        dueDate,

        subtotal,
        taxAmount,
        discountAmount,
        total,

        notes: data.notes ?? null,

        items: {
          create: itemsCreate,
        },
      },
      include: { items: true },
    });
  }

  async listInvoices(companyId: string, filters?: any) {
    return this.prisma.invoice.findMany({
      where: { companyId, ...(filters ?? {}) },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getInvoice(id: string, companyId: string) {
    return this.prisma.invoice.findFirst({
      where: { id, companyId },
      include: { items: true },
    });
  }

  async deleteInvoice(id: string, companyId: string) {
    const result = await this.prisma.invoice.deleteMany({
      where: { id, companyId },
    });
    return result.count > 0;
  }
}
