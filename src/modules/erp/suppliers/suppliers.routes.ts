// src/modules/erp/suppliers/suppliers.routes.ts
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { SuppliersService } from './suppliers.service';

// SCHEMAS ZOD
const supplierCreateSchema = z.object({
  name: z.string().min(1),
  legalName: z.string().optional().nullable(),
  taxId: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  website: z.string().url().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zipCode: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  contactPerson: z.string().optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  contactPhone: z.string().optional().nullable(),
  paymentTerms: z.string().optional().nullable(),
  deliveryTime: z.number().int().min(0).optional().nullable(),
  rating: z.number().int().min(1).max(5).optional().nullable(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

const supplierUpdateSchema = supplierCreateSchema.partial();

const ratingSchema = z.object({
  rating: z.number().int().min(1).max(5),
  notes: z.string().optional(),
});

const noteSchema = z.object({
  note: z.string().min(1),
});

const filtersSchema = z.object({
  isActive: z.string().optional(),
  minRating: z.string().optional(),
  q: z.string().optional(),
});

const topRatedQuerySchema = z.object({
  limit: z.string().optional().transform((val) => val ? parseInt(val, 10) : 10),
});

export async function suppliersRoutes(fastify: FastifyInstance) {
  const service = new SuppliersService(fastify.prisma);

  // ============================================
  // ROTAS ESPECÍFICAS (DEVEM VIR PRIMEIRO!)
  // ============================================

  /**
   * GET STATISTICS
   */
  fastify.get('/suppliers/stats', { onRequest: [fastify.authenticate] }, async (req) => {
    const companyId = (req.user as any).companyId;
    return service.getStats(companyId);
  });

  /**
   * GET TOP RATED
   */
  fastify.get('/suppliers/top-rated', { onRequest: [fastify.authenticate] }, async (req) => {
    const companyId = (req.user as any).companyId;
    const { limit } = topRatedQuerySchema.parse(req.query);
    return service.getTopRated(companyId, limit);
  });

  /**
   * GET SUPPLIER BY TAX ID (CNPJ/CPF)
   */
  fastify.get('/suppliers/taxid/:taxId', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const companyId = (req.user as any).companyId;
    const { taxId } = req.params as any;

    const supplier = await service.getByTaxId(taxId, companyId);
    if (!supplier) {
      return reply.code(404).send({ message: 'Supplier not found with this tax ID' });
    }

    return supplier;
  });

  // ============================================
  // CRUD BÁSICO
  // ============================================

  /**
   * CREATE SUPPLIER
   */
  fastify.post('/suppliers', { onRequest: [fastify.authenticate] }, async (req) => {
    const companyId = (req.user as any).companyId;
    const data = supplierCreateSchema.parse(req.body);
    return service.create(data, companyId);
  });

  /**
   * LIST SUPPLIERS
   */
  fastify.get('/suppliers', { onRequest: [fastify.authenticate] }, async (req) => {
    const companyId = (req.user as any).companyId;
    const filters = filtersSchema.parse(req.query);
    return service.list(companyId, filters);
  });

  /**
   * GET SUPPLIER BY ID (DEVE VIR DEPOIS DAS ROTAS ESPECÍFICAS)
   */
  fastify.get('/suppliers/:id', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const companyId = (req.user as any).companyId;
    const { id } = req.params as any;

    const supplier = await service.getById(id, companyId);
    if (!supplier) {
      return reply.code(404).send({ message: 'Supplier not found' });
    }

    return supplier;
  });

  /**
   * UPDATE SUPPLIER
   */
  fastify.patch('/suppliers/:id', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const companyId = (req.user as any).companyId;
    const { id } = req.params as any;
    const data = supplierUpdateSchema.parse(req.body);

    const updated = await service.update(id, companyId, data);
    if (!updated) {
      return reply.code(404).send({ message: 'Supplier not found' });
    }

    return updated;
  });

  /**
   * DELETE SUPPLIER
   */
  fastify.delete('/suppliers/:id', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const companyId = (req.user as any).companyId;
    const { id } = req.params as any;

    const deleted = await service.delete(id, companyId);
    if (!deleted) {
      return reply.code(404).send({ message: 'Supplier not found' });
    }

    return { success: true };
  });

  // ============================================
  // AÇÕES
  // ============================================

  /**
   * ACTIVATE SUPPLIER
   */
  fastify.post('/suppliers/:id/activate', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const companyId = (req.user as any).companyId;
    const { id } = req.params as any;

    const activated = await service.activate(id, companyId);
    if (!activated) {
      return reply.code(404).send({ message: 'Supplier not found' });
    }

    return activated;
  });

  /**
   * DEACTIVATE SUPPLIER
   */
  fastify.post('/suppliers/:id/deactivate', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const companyId = (req.user as any).companyId;
    const { id } = req.params as any;

    const deactivated = await service.deactivate(id, companyId);
    if (!deactivated) {
      return reply.code(404).send({ message: 'Supplier not found' });
    }

    return deactivated;
  });

  /**
   * UPDATE RATING
   */
  fastify.post('/suppliers/:id/rating', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const companyId = (req.user as any).companyId;
    const { id } = req.params as any;
    const { rating, notes } = ratingSchema.parse(req.body);

    const updated = await service.updateRating(id, companyId, rating, notes);
    if (!updated) {
      return reply.code(404).send({ message: 'Supplier not found' });
    }

    return updated;
  });

  /**
   * ADD NOTE
   */
  fastify.post('/suppliers/:id/note', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const companyId = (req.user as any).companyId;
    const { id } = req.params as any;
    const { note } = noteSchema.parse(req.body);

    const updated = await service.addNote(id, companyId, note);
    if (!updated) {
      return reply.code(404).send({ message: 'Supplier not found' });
    }

    return updated;
  });
}