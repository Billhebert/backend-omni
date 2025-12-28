import { FastifyInstance } from 'fastify';
import { InventoryService } from './inventory.service';

export async function inventoryRoutes(fastify: FastifyInstance) {
  const service = new InventoryService(fastify.prisma);

  fastify.post('/products', { onRequest: [fastify.authenticate] }, async (req) => {
    const companyId = (req.user as any).companyId;
    return service.createProduct(req.body, companyId);
  });

  fastify.get('/products', { onRequest: [fastify.authenticate] }, async (req) => {
    const companyId = (req.user as any).companyId;
    return service.listProducts(companyId, req.query as any);
  });

  fastify.post('/products/:id/stock', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const userId = (req.user as any).id;
    const { id } = req.params as any;
    const { type, quantity, reason } = req.body as any;

    const qty = Number(quantity);

    if (!Number.isFinite(qty) || qty <= 0) {
      return reply.code(400).send({
        message: 'quantity must be a positive number',
        received: quantity,
      });
    }

    return service.updateStock(id, type, qty, userId, reason);
  });

  fastify.get('/products/low-stock', { onRequest: [fastify.authenticate] }, async (req) => {
    const companyId = (req.user as any).companyId;
    return service.getLowStockProducts(companyId);
  });
  fastify.get('/products/:id', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const companyId = (req.user as any).companyId;
    const { id } = req.params as any;

    const product = await service.getProduct(id, companyId);
    if (!product) return reply.code(404).send({ message: 'Product not found' });

    return product;
  });
  fastify.patch('/products/:id', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const companyId = (req.user as any).companyId;
    const { id } = req.params as any;

    const updated = await service.updateProduct(id, companyId, req.body);
    if (!updated) return reply.code(404).send({ message: 'Product not found' });

    return updated;
  });
  fastify.delete('/products/:id', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const companyId = (req.user as any).companyId;
    const { id } = req.params as any;

    const ok = await service.deleteProduct(id, companyId);
    if (!ok) return reply.code(404).send({ message: 'Product not found' });

    return { success: true };
  });
  fastify.get(
    '/products/:id/movements',
    { onRequest: [fastify.authenticate] },
    async (req, reply) => {
      const companyId = (req.user as any).companyId;
      const { id } = req.params as any;

      const movements = await service.listMovements(id, companyId);
      if (!movements) return reply.code(404).send({ message: 'Product not found' });

      return movements;
    }
  );
}
