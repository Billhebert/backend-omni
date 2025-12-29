import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { InventoryService } from './inventory.service';

const productCreateSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  subcategory: z.string().optional().nullable(),
  
  unitPrice: z.number().positive().optional(),
  price: z.number().positive().optional(),
  
  costPrice: z.number().positive().optional().nullable(),
  cost: z.number().positive().optional().nullable(),
  
  stock: z.number().int().min(0).optional().default(0),
  minStock: z.number().int().min(0).optional().nullable(),
  maxStock: z.number().int().min(0).optional().nullable(),
  
  unit: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
  
  imageUrl: z.string().url().optional().nullable(),
  barcode: z.string().optional().nullable(),
  supplierId: z.string().uuid().optional().nullable(),
});

const productUpdateSchema = productCreateSchema.partial();

const stockUpdateSchema = z.object({
  type: z.enum(['in', 'out', 'adjustment']),
  quantity: z.number().positive(),
  reason: z.string().optional().nullable(),
});

const productFiltersSchema = z.object({
  category: z.string().optional(),
  isActive: z.string().optional(),
  q: z.string().optional(),
});

export async function inventoryRoutes(fastify: FastifyInstance) {
  const service = new InventoryService(fastify.prisma);

  // CREATE PRODUCT
  fastify.post('/products', { onRequest: [fastify.authenticate] }, async (req) => {
    const companyId = (req.user as any).companyId;
    const data = productCreateSchema.parse(req.body);
    return service.createProduct(data, companyId);
  });

  // LIST PRODUCTS
  fastify.get('/products', { onRequest: [fastify.authenticate] }, async (req) => {
    const companyId = (req.user as any).companyId;
    const filters = productFiltersSchema.parse(req.query);
    return service.listProducts(companyId, filters);
  });

  // GET PRODUCT BY ID
  fastify.get('/products/:id', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const companyId = (req.user as any).companyId;
    const { id } = req.params as any;

    const product = await service.getProduct(id, companyId);
    if (!product) return reply.code(404).send({ message: 'Product not found' });

    return product;
  });

  // UPDATE PRODUCT
  fastify.patch('/products/:id', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const companyId = (req.user as any).companyId;
    const { id } = req.params as any;
    const data = productUpdateSchema.parse(req.body);

    const updated = await service.updateProduct(id, companyId, data);
    if (!updated) return reply.code(404).send({ message: 'Product not found' });

    return updated;
  });

  // DELETE PRODUCT
  fastify.delete('/products/:id', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const companyId = (req.user as any).companyId;
    const { id } = req.params as any;

    const ok = await service.deleteProduct(id, companyId);
    if (!ok) return reply.code(404).send({ message: 'Product not found' });

    return { success: true };
  });

  // UPDATE STOCK
  fastify.post('/products/:id/stock', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const userId = (req.user as any).id;
    const { id } = req.params as any;
    const data = stockUpdateSchema.parse(req.body);

    return service.updateStock(id, data.type, data.quantity, userId, data.reason || undefined);
  });

  // GET LOW STOCK
  fastify.get('/products/low-stock', { onRequest: [fastify.authenticate] }, async (req) => {
    const companyId = (req.user as any).companyId;
    return service.getLowStockProducts(companyId);
  });

  // GET MOVEMENTS
  fastify.get('/products/:id/movements', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const companyId = (req.user as any).companyId;
    const { id } = req.params as any;

    const movements = await service.listMovements(id, companyId);
    if (!movements) return reply.code(404).send({ message: 'Product not found' });

    return movements;
  });

  // 🆕 GET BY SKU
  fastify.get('/products/sku/:sku', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const companyId = (req.user as any).companyId;
    const { sku } = req.params as any;

    const product = await service.getProductBySKU(sku, companyId);
    if (!product) return reply.code(404).send({ message: 'Product not found with this SKU' });

    return product;
  });

  // 🆕 GET BY BARCODE
  fastify.get('/products/barcode/:barcode', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const companyId = (req.user as any).companyId;
    const { barcode } = req.params as any;

    const product = await service.getProductByBarcode(barcode, companyId);
    if (!product) return reply.code(404).send({ message: 'Product not found with this barcode' });

    return product;
  });

  // 🆕 ACTIVATE
  fastify.post('/products/:id/activate', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const companyId = (req.user as any).companyId;
    const { id } = req.params as any;

    const activated = await service.activateProduct(id, companyId);
    if (!activated) return reply.code(404).send({ message: 'Product not found' });

    return activated;
  });

  // 🆕 DEACTIVATE
  fastify.post('/products/:id/deactivate', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const companyId = (req.user as any).companyId;
    const { id } = req.params as any;

    const deactivated = await service.deactivateProduct(id, companyId);
    if (!deactivated) return reply.code(404).send({ message: 'Product not found' });

    return deactivated;
  });

  // 🆕 GET STATS
  fastify.get('/products/stats', { onRequest: [fastify.authenticate] }, async (req) => {
    const companyId = (req.user as any).companyId;
    return service.getInventoryStats(companyId);
  });
}