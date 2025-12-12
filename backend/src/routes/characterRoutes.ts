import { FastifyInstance } from 'fastify';
import { characterController } from '../controllers/characterController';
import { authenticate } from '../middleware/auth';

export default async function characterRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('preHandler', authenticate as any);

  // POST /api/characters/generate - Generate characters with AI
  fastify.post('/generate', characterController.generate);

  // POST /api/characters/regenerate - Regenerate non-perfect characters
  fastify.post('/regenerate', characterController.regenerate);

  // GET /api/characters/brand/:brandId - Get all characters for a brand
  fastify.get('/brand/:brandId', characterController.getByBrand);

  // POST /api/characters - Create single character
  fastify.post('/', characterController.create);

  // PUT /api/characters/:id/perfect - Mark character as perfect (must come before /:id)
  fastify.put('/:id/perfect', characterController.markPerfect);

  // PUT /api/characters/:id/mute - Toggle mute status (must come before /:id)
  fastify.put('/:id/mute', characterController.toggleMute);

  // PUT /api/characters/:id - Update character
  fastify.put('/:id', characterController.update);

  // DELETE /api/characters/:id - Delete character
  fastify.delete('/:id', characterController.delete);
}
