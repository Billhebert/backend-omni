// src/modules/erp/inventory/inventory.service.ts
import { PrismaClient } from '@prisma/client';

export class InventoryService {
  constructor(private prisma: PrismaClient) {}

  async createProduct(data: any, companyId: string) {
    // ✅ Validar SKU único
    if (data.sku) {
      const existing = await this.prisma.product.findFirst({
        where: { companyId, sku: String(data.sku) },
      });
      if (existing) {
        throw new Error(`SKU "${data.sku}" already exists for this company`);
      }
    }

    const unitPrice = data.unitPrice ?? data.price;
    if (unitPrice == null) {
      throw new Error('unitPrice (ou price) é obrigatório');
    }

    const costPrice =
      data.costPrice != null
        ? Number(data.costPrice)
        : data.cost != null
        ? Number(data.cost)
        : null;

    return this.prisma.product.create({
      data: {
        companyId,
        sku: String(data.sku ?? ''),
        name: String(data.name ?? ''),
        description: data.description ?? null,
        category: data.category ?? null,
        subcategory: data.subcategory ?? null,

        unitPrice: Number(unitPrice),
        costPrice,

        stock: Number(data.stock ?? 0),
        minStock: data.minStock != null ? Number(data.minStock) : null,
        maxStock: data.maxStock != null ? Number(data.maxStock) : null,

        unit: data.unit ?? null,
        isActive: data.isActive ?? true,

        imageUrl: data.imageUrl ?? null,
        barcode: data.barcode ?? null,
        supplierId: data.supplierId ?? null,
      },
    });
  }

  async listProducts(companyId: string, filters?: { category?: any; isActive?: any; q?: any }) {
    const where: any = { companyId };

    if (filters?.category != null && String(filters.category).trim() !== '') {
      where.category = String(filters.category);
    }

    if (filters?.isActive != null) {
      const v = String(filters.isActive).toLowerCase().trim();
      if (v === 'true' || v === '1') where.isActive = true;
      else if (v === 'false' || v === '0') where.isActive = false;
    }

    if (filters?.q != null && String(filters.q).trim() !== '') {
      const q = String(filters.q).trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { sku: { contains: q, mode: 'insensitive' } },
      ];
    }

    return this.prisma.product.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async updateStock(
    productId: string,
    type: 'in' | 'out' | 'adjustment',
    quantity: number,
    userId: string,
    reason?: string
  ) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new Error('Product not found');

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) throw new Error('quantity must be a positive number');

    const previousStock = product.stock;

    let newStock = previousStock;
    if (type === 'out') newStock = previousStock - qty;
    else newStock = previousStock + qty;

    if (newStock < 0) throw new Error('Stock cannot go below zero');

    await this.prisma.$transaction([
      this.prisma.product.update({
        where: { id: productId },
        data: { stock: newStock },
      }),
      this.prisma.stockMovement.create({
        data: {
          productId,
          type,
          quantity: qty,
          reason: reason ?? null,
          previousStock,
          newStock,
          userId,
        },
      }),
    ]);

    if (product.minStock != null && newStock <= product.minStock) {
      console.log(`⚠️  Low stock alert: ${product.name} (${newStock}/${product.minStock})`);
    }

    return { previousStock, newStock };
  }

  async getLowStockProducts(companyId: string) {
    return this.prisma.$queryRaw<
      Array<{
        id: string;
        companyId: string;
        sku: string;
        name: string;
        stock: number;
        minStock: number | null;
        isActive: boolean;
        unitPrice: number;
      }>
    >(
      `
    SELECT
      id,
      "companyId",
      sku,
      name,
      stock,
      "minStock",
      "isActive",
      "unitPrice"
    FROM "products"
    WHERE
      "companyId" = $1
      AND "isActive" = true
      AND "minStock" IS NOT NULL
      AND stock <= "minStock"
    ORDER BY name ASC;
  `,
      companyId
    );
  }

  async getProduct(id: string, companyId: string) {
    return this.prisma.product.findFirst({
      where: { id, companyId },
    });
  }

  async updateProduct(id: string, companyId: string, data: any) {
    // ✅ Validar SKU único se estiver mudando
    if (data.sku) {
      const existing = await this.prisma.product.findFirst({
        where: {
          companyId,
          sku: String(data.sku),
          NOT: { id },
        },
      });
      if (existing) {
        throw new Error(`SKU "${data.sku}" already exists for this company`);
      }
    }

    const unitPrice = data.unitPrice ?? data.price;
    const costPrice = data.costPrice ?? data.cost;

    const result = await this.prisma.product.updateMany({
      where: { id, companyId },
      data: {
        sku: data.sku ?? undefined,
        name: data.name ?? undefined,
        description: data.description ?? undefined,
        category: data.category ?? undefined,
        subcategory: data.subcategory ?? undefined,

        unitPrice: unitPrice != null ? Number(unitPrice) : undefined,
        costPrice: costPrice != null ? Number(costPrice) : undefined,

        stock: data.stock != null ? Number(data.stock) : undefined,
        minStock: data.minStock != null ? Number(data.minStock) : undefined,
        maxStock: data.maxStock != null ? Number(data.maxStock) : undefined,

        unit: data.unit ?? undefined,
        isActive: data.isActive ?? undefined,

        imageUrl: data.imageUrl ?? undefined,
        barcode: data.barcode ?? undefined,
        supplierId: data.supplierId ?? undefined,
      },
    });

    if (result.count === 0) return null;
    return this.getProduct(id, companyId);
  }

  async deleteProduct(id: string, companyId: string) {
    const result = await this.prisma.product.deleteMany({
      where: { id, companyId },
    });
    return result.count > 0;
  }

  async listMovements(productId: string, companyId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, companyId },
      select: { id: true },
    });
    if (!product) return null;

    return this.prisma.stockMovement.findMany({
      where: { productId },
      include: { user: true, product: true },
      orderBy: { timestamp: 'desc' },
    });
  }

  // 🆕 NOVOS MÉTODOS
  async getProductBySKU(sku: string, companyId: string) {
    return this.prisma.product.findFirst({
      where: {
        companyId,
        sku: String(sku),
      },
    });
  }

  async getProductByBarcode(barcode: string, companyId: string) {
    return this.prisma.product.findFirst({
      where: {
        companyId,
        barcode: String(barcode),
      },
    });
  }

  async activateProduct(id: string, companyId: string) {
    const result = await this.prisma.product.updateMany({
      where: { id, companyId },
      data: { isActive: true },
    });

    if (result.count === 0) return null;
    return this.getProduct(id, companyId);
  }

  async deactivateProduct(id: string, companyId: string) {
    const result = await this.prisma.product.updateMany({
      where: { id, companyId },
      data: { isActive: false },
    });

    if (result.count === 0) return null;
    return this.getProduct(id, companyId);
  }

  async getInventoryStats(companyId: string) {
    const [total, active, inactive, lowStock, outOfStock] = await Promise.all([
      this.prisma.product.count({
        where: { companyId },
      }),

      this.prisma.product.count({
        where: { companyId, isActive: true },
      }),

      this.prisma.product.count({
        where: { companyId, isActive: false },
      }),

      this.prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) as count
        FROM "products"
        WHERE 
          "companyId" = ${companyId}
          AND "isActive" = true
          AND "minStock" IS NOT NULL
          AND stock <= "minStock"
          AND stock > 0
      `,

      this.prisma.product.count({
        where: {
          companyId,
          isActive: true,
          stock: 0,
        },
      }),
    ]);

    const stockValue = await this.prisma.product.aggregate({
      where: { companyId, isActive: true },
      _sum: {
        stock: true,
      },
    });

    const products = await this.prisma.product.findMany({
      where: { companyId, isActive: true },
      select: { stock: true, unitPrice: true },
    });

    const totalValue = products.reduce((sum, p) => {
      return sum + p.stock * p.unitPrice;
    }, 0);

    return {
      total,
      active,
      inactive,
      lowStock: Number(lowStock[0].count),
      outOfStock,
      totalStockUnits: stockValue._sum.stock || 0,
      totalStockValue: totalValue,
    };
  }
}
