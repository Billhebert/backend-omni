import { PrismaClient } from '@prisma/client';

/**
 * 💰 FINANCE SERVICE - VERSÃO COMPLETA
 * 
 * Funcionalidades EXISTENTES (mantidas):
 * - createInvoice() ✅
 * - listInvoices() ✅
 * - getInvoice() ✅
 * - updateInvoice() ✅
 * - deleteInvoice() ✅
 * - getSummary() ✅
 * 
 * Funcionalidades NOVAS (adicionadas):
 * - send() ✅ Enviar invoice (draft → sent)
 * - markAsPaid() ✅ Marcar como paga
 * - cancel() ✅ Cancelar invoice
 * - checkOverdue() ✅ Marcar vencidas automaticamente
 * - getStats() ✅ Estatísticas detalhadas
 */

export class FinanceService {
  constructor(private prisma: PrismaClient) {}

  // ============================================
  // MÉTODOS EXISTENTES (MANTIDOS)
  // ============================================

  async getSummary(companyId: string, params?: any) {
    const from = params?.from ? new Date(params.from) : undefined;
    const to = params?.to ? new Date(params.to) : undefined;

    const invoiceWhere: any = { companyId };
    const expenseWhere: any = { companyId };

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

    const receivable = invoices.filter((x) => x.type === 'receivable');
    const payable = invoices.filter((x) => x.type === 'payable');

    const sum = (arr: any[], key: string) => arr.reduce((a, x) => a + Number(x[key] ?? 0), 0);

    const revenueTotal = sum(receivable, 'total');
    const payableTotal = sum(payable, 'total');

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
    const number = data.number ?? data.invoiceNumber;
    if (!number) throw new Error('Invoice number is required (number | invoiceNumber)');

    const issueDate = data.issueDate ? new Date(data.issueDate) : new Date();
    const dueDate = data.dueDate ? new Date(data.dueDate) : new Date();

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

  // ============================================
  // 🆕 NOVOS MÉTODOS (ADICIONADOS)
  // ============================================

  /**
   * 📤 SEND INVOICE (draft → sent)
   */
  async sendInvoice(id: string, companyId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, companyId },
    });

    if (!invoice) return null;
    if (invoice.status !== 'draft') {
      throw new Error('Only draft invoices can be sent');
    }

    return this.prisma.invoice.update({
      where: { id },
      data: { status: 'sent' },
      include: { items: true },
    });
  }

  /**
   * 💰 MARK AS PAID
   */
  async markAsPaid(
    id: string,
    companyId: string,
    payment: {
      paidAmount: number;
      paidDate?: Date | string;
      paymentMethod?: string;
    }
  ) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, companyId },
    });

    if (!invoice) return null;

    const paidDate = payment.paidDate ? new Date(payment.paidDate) : new Date();
    const paidAmount = Number(payment.paidAmount);

    // Se pagamento total, marcar como paid
    const status = paidAmount >= invoice.total ? 'paid' : invoice.status;

    return this.prisma.invoice.update({
      where: { id },
      data: {
        status,
        paidAmount,
        paidDate,
        paymentMethod: payment.paymentMethod || invoice.paymentMethod,
      },
      include: { items: true },
    });
  }

  /**
   * ❌ CANCEL INVOICE
   */
  async cancelInvoice(id: string, companyId: string, reason?: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, companyId },
    });

    if (!invoice) return null;
    if (invoice.status === 'paid') {
      throw new Error('Cannot cancel a paid invoice');
    }

    const notes = reason
      ? `${invoice.notes || ''}\n\nCancelled: ${reason}`.trim()
      : invoice.notes;

    return this.prisma.invoice.update({
      where: { id },
      data: { status: 'cancelled', notes },
      include: { items: true },
    });
  }

  /**
   * ⏰ CHECK OVERDUE INVOICES
   * Marca invoices vencidas como overdue
   */
  async checkOverdue(companyId: string) {
    const now = new Date();

    const result = await this.prisma.invoice.updateMany({
      where: {
        companyId,
        status: 'sent',
        dueDate: { lt: now },
      },
      data: { status: 'overdue' },
    });

    return result.count;
  }

  /**
   * 📊 GET DETAILED STATISTICS
   * Estatísticas mais detalhadas que getSummary
   */
  async getStats(companyId: string, type?: 'receivable' | 'payable') {
    const where: any = { companyId };
    if (type) where.type = type;

    const [total, paid, pending, overdue] = await Promise.all([
      // Total
      this.prisma.invoice.aggregate({
        where,
        _sum: { total: true },
        _count: true,
      }),
      // Paid
      this.prisma.invoice.aggregate({
        where: { ...where, status: 'paid' },
        _sum: { paidAmount: true },
        _count: true,
      }),
      // Pending (sent + draft)
      this.prisma.invoice.aggregate({
        where: { ...where, status: { in: ['sent', 'draft'] } },
        _sum: { total: true },
        _count: true,
      }),
      // Overdue
      this.prisma.invoice.aggregate({
        where: { ...where, status: 'overdue' },
        _sum: { total: true },
        _count: true,
      }),
    ]);

    return {
      total: {
        count: total._count,
        amount: total._sum.total || 0,
      },
      paid: {
        count: paid._count,
        amount: paid._sum.paidAmount || 0,
      },
      pending: {
        count: pending._count,
        amount: pending._sum.total || 0,
      },
      overdue: {
        count: overdue._count,
        amount: overdue._sum.total || 0,
      },
    };
  }
}