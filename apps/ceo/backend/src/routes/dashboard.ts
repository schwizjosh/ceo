import { FastifyInstance } from 'fastify';
import {
  getDashboardBrief,
  getDashboardInsights,
  getDashboardSettings,
  updateDashboardSettings,
} from '../controllers/dashboardController';
import { authenticateToken } from '../middleware/auth';

export default async function dashboardRoutes(fastify: FastifyInstance) {
  // All dashboard routes require authentication
  fastify.addHook('preHandler', authenticateToken as any);

  // GET /api/dashboard/brief/:brandId - Generate a creative brief
  fastify.get('/brief/:brandId', getDashboardBrief);

  // GET /api/dashboard/insights/:brandId - Get brand insights
  fastify.get('/insights/:brandId', getDashboardInsights);

  // GET /api/dashboard/settings - Get user's dashboard settings
  fastify.get('/settings', getDashboardSettings);

  // PUT /api/dashboard/settings - Update user's dashboard settings
  fastify.put('/settings', updateDashboardSettings);
}
