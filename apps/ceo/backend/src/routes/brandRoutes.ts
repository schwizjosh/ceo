import { FastifyInstance } from 'fastify';
import { brandController } from '../controllers/brandController';
import { authenticate } from '../middleware/auth';

export default async function brandRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('preHandler', authenticate as any);

  // GET /api/brands - Get all brands for current user
  fastify.get('/', brandController.getAll);

  // GET /api/brands/:id - Get single brand
  fastify.get('/:id', brandController.getById);

  // POST /api/brands - Create new brand
  fastify.post('/', brandController.create);

  // PUT /api/brands/:id - Update brand
  fastify.put('/:id', brandController.update);

  // PUT /api/brands/:id/archive - Archive brand
  fastify.put('/:id/archive', brandController.archive);

  // PUT /api/brands/:id/unarchive - Unarchive brand
  fastify.put('/:id/unarchive', brandController.unarchive);

  // POST /api/brands/:id/generate-narrative - Generate brand narrative (AI Prefill)
  fastify.post('/:id/generate-narrative', brandController.generateNarrative);

  // GET /api/brands/:id/token-usage - Fetch monthly token usage summary
  fastify.get('/:id/token-usage', brandController.getTokenUsage);

  // DELETE /api/brands/:id - Delete brand
  fastify.delete('/:id', brandController.delete);
}
