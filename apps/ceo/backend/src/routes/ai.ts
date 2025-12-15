/**
 * AI ROUTES
 *
 * All AI generation endpoints
 */

import { FastifyInstance } from 'fastify';
import * as aiController from '../controllers/aiController';
import { authenticate } from '../middleware/auth';
import { deductTokensHook, checkTokenBalance } from '../middleware/tokenDeduction';

export default async function aiRoutes(fastify: FastifyInstance) {
  // All AI routes require authentication
  fastify.addHook('preHandler', authenticate as any);

  // Check token balance before processing AI requests
  fastify.addHook('preHandler', checkTokenBalance as any);

  // Automatically deduct tokens after successful AI responses
  fastify.addHook('onSend', deductTokensHook as any);

  // Configuration helpers
  fastify.post('/generate-vision', aiController.generateVision);
  fastify.post('/generate-mission', aiController.generateMission);
  fastify.post('/generate-persona', aiController.generatePersona);
  fastify.post('/generate-buyer-profile', aiController.generateBuyerProfile);
  fastify.post('/generate-content-strategy', aiController.generateContentStrategy);

  // Character generation
  // PHASE 3: AI generates cast
  fastify.post('/generate-characters', aiController.generateCharacters);

  // PHASE 4: User provides cast, AI refines
  fastify.post('/resolve-cast', aiController.resolveCast);

  // Plot and subplot generation
  fastify.post('/generate-monthly-plot', aiController.generateMonthlyPlot);
  fastify.post('/generate-weekly-subplot', aiController.generateWeeklySubplot);

  // Content generation
  fastify.post('/generate-content-brief', aiController.generateContentBrief);

  // PHASE 2: Narrative Prefill
  fastify.post('/prefill-narrative', aiController.generateNarrativePrefill);

  // PHASE 7: Calendar Generation
  fastify.post('/generate-calendar', aiController.generateCalendar);

  // PHASE 8: Content Refinement
  fastify.post('/refine-content', aiController.refineContent);

  // PHASE 9: Brief Expansion
  fastify.post('/expand-brief', aiController.expandBrief);

  // PHASE 9B: Brief Expansion with Streaming
  fastify.post('/expand-brief-stream', aiController.expandBriefStream);

  // Character Cast Training
  fastify.post('/train-character-cast', aiController.trainCharacterCast);

  // Additional AI endpoints
  fastify.post('/generate-monthly-theme', aiController.generateMonthlyTheme);
  fastify.post('/generate-calendar-entry', aiController.generateCalendarEntry);
  fastify.post('/refine-character-field', aiController.refineCharacterField);
  fastify.post('/chat', aiController.chatWithAndora);

  // Observer evaluation endpoints (quality gating)
  fastify.post('/observe-narrative', aiController.observeNarrative);
  fastify.post('/observe-characters', aiController.observeCharacters);
}
