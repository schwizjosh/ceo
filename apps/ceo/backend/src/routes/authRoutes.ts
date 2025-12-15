import { FastifyInstance } from 'fastify';
import { authController } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

export default async function authRoutes(fastify: FastifyInstance) {
  // POST /api/auth/register
  fastify.post('/register', authController.register);

  // POST /api/auth/login
  fastify.post('/login', authController.login);

  // GET /api/auth/me - Get current user
  fastify.get('/me', {
    preHandler: authenticate as any
  }, authController.me);

  // POST /api/auth/forgot-password - Request password reset
  fastify.post('/forgot-password', authController.forgotPassword);

  // POST /api/auth/reset-password - Reset password with token
  fastify.post('/reset-password', authController.resetPassword);

  // PATCH /api/auth/preferences - Update AI/model/timezone preferences
  fastify.patch('/preferences', {
    preHandler: authenticate as any
  }, authController.updatePreferences);
}
