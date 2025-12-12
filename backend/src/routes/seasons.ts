import { FastifyInstance } from 'fastify';
import pool from '../database/db';
import { authenticate } from '../middleware/auth';
import { SeasonsController } from '../controllers/seasonsController';

export default async function seasonRoutes(fastify: FastifyInstance) {
  const controller = new SeasonsController();

  // ========== SEASONS (QUARTERLY) ==========
  fastify.get('/brand/:brandId/seasons', { preHandler: authenticate as any }, controller.getSeasons.bind(controller));
  fastify.post('/generate', { preHandler: authenticate as any }, controller.generateSeasonTheme.bind(controller));
  fastify.put('/seasons/:id', { preHandler: authenticate as any }, controller.updateSeason.bind(controller));

  // ========== MONTHLY PLOTS (PHASE 5) ==========
  fastify.get('/brand/:brandId/months', { preHandler: authenticate as any }, controller.getMonthlyThemes.bind(controller));
  fastify.post('/monthly/generate', { preHandler: authenticate as any }, controller.generateMonthlyPlot.bind(controller));
  fastify.put('/monthly/:id', { preHandler: authenticate as any }, controller.updateMonthlyPlot.bind(controller));

  // ========== WEEKLY SUBPLOTS (PHASE 6) ==========
  fastify.get('/monthly/:monthId/subplots', { preHandler: authenticate as any }, controller.getWeeklySubplots.bind(controller));
  fastify.post('/weekly/generate', { preHandler: authenticate as any }, controller.generateWeeklySubplot.bind(controller));
  fastify.put('/weekly/:id', { preHandler: authenticate as any }, controller.updateWeeklySubplot.bind(controller));

  // ========== CALENDAR BATCH GENERATION (PHASE 7) ==========
  fastify.post('/calendar/generate', { preHandler: authenticate as any }, controller.generateCalendarBatch.bind(controller));
}
