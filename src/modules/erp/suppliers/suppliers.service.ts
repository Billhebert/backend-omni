// src/modules/erp/suppliers/suppliers.service.ts
import { PrismaClient } from '@prisma/client';

/**
 * 🏭 SUPPLIERS SERVICE - GESTÃO DE FORNECEDORES
 * 
 * Funcionalidades:
 * - CRUD completo de fornecedores
 * - Sistema de rating (1-5 estrelas)
 * - Ativar/desativar fornecedores
 * - Validação de documentos únicos (CNPJ/CPF)
 * - Busca por documento
 * - Estatísticas de fornecedores
 * - Multi-tenant safety
 */

export class SuppliersService {
  constructor(private prisma: PrismaClient) {}

  /**
   * CREATE SUPPLIER
   */
  async create(data: any, companyId: string) {
    // Validar documento único (CNPJ/CPF)
    if (data.taxId) {
      const existing = await this.prisma.supplier.findFirst({
        where: { 
          companyId, 
          taxId: String(data.taxId) 
        },
      });
      if (existing) {
        throw new Error(`Supplier with tax ID "${data.taxId}" already exists`);
      }
    }

    return this.prisma.supplier.create({
      data: {
        companyId,
        name: String(data.name),
        legalName: data.legalName ?? null,
        taxId: data.taxId ?? null,
        
        email: data.email ?? null,
        phone: data.phone ?? null,
        website: data.website ?? null,
        
        address: data.address ?? null,
        city: data.city ?? null,
        state: data.state ?? null,
        zipCode: data.zipCode ?? null,
        country: data.country ?? null,
        
        contactPerson: data.contactPerson ?? null,
        contactEmail: data.contactEmail ?? null,
        contactPhone: data.contactPhone ?? null,
        
        paymentTerms: data.paymentTerms ?? null,
        deliveryTime: data.deliveryTime != null ? Number(data.deliveryTime) : null,
        
        rating: data.rating != null ? Number(data.rating) : null,
        notes: data.notes ?? null,
        
        isActive: data.isActive ?? true,
      },
    });
  }

  /**
   * LIST SUPPLIERS (com filtros)
   */
  async list(companyId: string, filters?: {
    isActive?: any;
    minRating?: any;
    q?: any;
  }) {
    const where: any = { companyId };

    // Filtro: isActive
    if (filters?.isActive != null) {
      const v = String(filters.isActive).toLowerCase().trim();
      if (v === 'true' || v === '1') where.isActive = true;
      else if (v === 'false' || v === '0') where.isActive = false;
    }

    // Filtro: rating mínimo
    if (filters?.minRating != null) {
      const minRating = Number(filters.minRating);
      if (!isNaN(minRating)) {
        where.rating = { gte: minRating };
      }
    }

    // Filtro: busca por texto
    if (filters?.q != null && String(filters.q).trim() !== '') {
      const q = String(filters.q).trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { legalName: { contains: q, mode: 'insensitive' } },
        { taxId: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    return this.prisma.supplier.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  /**
   * GET SUPPLIER BY ID
   */
  async getById(id: string, companyId: string) {
    return this.prisma.supplier.findFirst({
      where: { id, companyId },
    });
  }

  /**
   * GET SUPPLIER BY TAX ID (CNPJ/CPF)
   */
  async getByTaxId(taxId: string, companyId: string) {
    return this.prisma.supplier.findFirst({
      where: { 
        companyId, 
        taxId: String(taxId) 
      },
    });
  }

  /**
   * UPDATE SUPPLIER
   */
  async update(id: string, companyId: string, data: any) {
    // Validar documento único se estiver mudando
    if (data.taxId) {
      const existing = await this.prisma.supplier.findFirst({
        where: { 
          companyId, 
          taxId: String(data.taxId),
          NOT: { id }
        },
      });
      if (existing) {
        throw new Error(`Supplier with tax ID "${data.taxId}" already exists`);
      }
    }

    const result = await this.prisma.supplier.updateMany({
      where: { id, companyId },
      data: {
        name: data.name ?? undefined,
        legalName: data.legalName ?? undefined,
        taxId: data.taxId ?? undefined,
        
        email: data.email ?? undefined,
        phone: data.phone ?? undefined,
        website: data.website ?? undefined,
        
        address: data.address ?? undefined,
        city: data.city ?? undefined,
        state: data.state ?? undefined,
        zipCode: data.zipCode ?? undefined,
        country: data.country ?? undefined,
        
        contactPerson: data.contactPerson ?? undefined,
        contactEmail: data.contactEmail ?? undefined,
        contactPhone: data.contactPhone ?? undefined,
        
        paymentTerms: data.paymentTerms ?? undefined,
        deliveryTime: data.deliveryTime != null ? Number(data.deliveryTime) : undefined,
        
        rating: data.rating != null ? Number(data.rating) : undefined,
        notes: data.notes ?? undefined,
        
        isActive: data.isActive ?? undefined,
      },
    });

    if (result.count === 0) return null;
    return this.getById(id, companyId);
  }

  /**
   * DELETE SUPPLIER
   */
  async delete(id: string, companyId: string) {
    const result = await this.prisma.supplier.deleteMany({
      where: { id, companyId },
    });
    return result.count > 0;
  }

  /**
   * ACTIVATE SUPPLIER
   */
  async activate(id: string, companyId: string) {
    const result = await this.prisma.supplier.updateMany({
      where: { id, companyId },
      data: { isActive: true },
    });

    if (result.count === 0) return null;
    return this.getById(id, companyId);
  }

  /**
   * DEACTIVATE SUPPLIER
   */
  async deactivate(id: string, companyId: string) {
    const result = await this.prisma.supplier.updateMany({
      where: { id, companyId },
      data: { isActive: false },
    });

    if (result.count === 0) return null;
    return this.getById(id, companyId);
  }

  /**
   * UPDATE RATING
   */
  async updateRating(id: string, companyId: string, rating: number, notes?: string) {
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    const supplier = await this.getById(id, companyId);
    if (!supplier) return null;

    const updatedNotes = notes 
      ? `${supplier.notes || ''}\n\n[${new Date().toISOString()}] Rating: ${rating}/5 - ${notes}`.trim()
      : supplier.notes;

    return this.prisma.supplier.update({
      where: { id },
      data: { 
        rating,
        notes: updatedNotes,
      },
    });
  }

  /**
   * ADD NOTE
   */
  async addNote(id: string, companyId: string, note: string) {
    const supplier = await this.getById(id, companyId);
    if (!supplier) return null;

    const timestamp = new Date().toISOString();
    const newNote = `[${timestamp}] ${note}`;
    const updatedNotes = supplier.notes 
      ? `${supplier.notes}\n\n${newNote}`
      : newNote;

    return this.prisma.supplier.update({
      where: { id },
      data: { notes: updatedNotes },
    });
  }

  /**
   * GET STATISTICS
   */
  async getStats(companyId: string) {
    const [total, active, inactive] = await Promise.all([
      this.prisma.supplier.count({
        where: { companyId },
      }),
      this.prisma.supplier.count({
        where: { companyId, isActive: true },
      }),
      this.prisma.supplier.count({
        where: { companyId, isActive: false },
      }),
    ]);

    // Rating médio
    const avgRating = await this.prisma.supplier.aggregate({
      where: { companyId, isActive: true, rating: { not: null } },
      _avg: { rating: true },
      _count: { rating: true },
    });

    // Suppliers por rating
    const [rating5, rating4, rating3, rating2, rating1] = await Promise.all([
      this.prisma.supplier.count({ where: { companyId, rating: 5 } }),
      this.prisma.supplier.count({ where: { companyId, rating: 4 } }),
      this.prisma.supplier.count({ where: { companyId, rating: 3 } }),
      this.prisma.supplier.count({ where: { companyId, rating: 2 } }),
      this.prisma.supplier.count({ where: { companyId, rating: 1 } }),
    ]);

    return {
      total,
      active,
      inactive,
      averageRating: avgRating._avg.rating || 0,
      ratedCount: avgRating._count.rating || 0,
      byRating: {
        5: rating5,
        4: rating4,
        3: rating3,
        2: rating2,
        1: rating1,
      },
    };
  }

  /**
   * GET TOP RATED SUPPLIERS
   */
  async getTopRated(companyId: string, limit: number = 10) {
    return this.prisma.supplier.findMany({
      where: { 
        companyId, 
        isActive: true,
        rating: { not: null }
      },
      orderBy: { rating: 'desc' },
      take: limit,
    });
  }
}
