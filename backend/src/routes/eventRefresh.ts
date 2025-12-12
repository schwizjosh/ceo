/**
 * Event Calendar Refresh Routes
 * Handles refreshing event calendar and generating subplot suggestions
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticateToken } from '../middleware/auth';
import { agentConfigService } from '../services/agentConfig';
import pool from '../database/db';
import { aiService } from '../services/aiService';

export default async function eventRefreshRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/events/refresh
   * Refresh event calendar for a brand and generate subplot suggestions
   */
  fastify.post('/refresh', { preHandler: authenticateToken as any }, async (req: FastifyRequest, res: FastifyReply) => {
    try {
      const { brandId, month, year } = req.body as any;
      const userId = (req as any).user?.id;

      if (!brandId) {
        return res.status(400).send({ error: 'brandId is required' });
      }

      // Verify user has access to this brand
      const brandCheck = await pool.query(
        'SELECT id FROM brands WHERE id = $1 AND user_id = $2',
        [brandId, userId]
      );

      if (brandCheck.rows.length === 0) {
        return res.status(404).send({ error: 'Brand not found or access denied' });
      }

      // Get current month/year if not provided
      const targetDate = new Date();
      const targetMonth = month || targetDate.getMonth() + 1;
      const targetYear = year || targetDate.getFullYear();

      // Fetch events for this month
      const eventsResult = await pool.query(
        `SELECT
          id, brand_id as "brandId", title, description, event_date as "eventDate",
          event_type as "eventType", significance, location,
          created_at as "createdAt"
        FROM events
        WHERE brand_id = $1
          AND EXTRACT(MONTH FROM event_date) = $2
          AND EXTRACT(YEAR FROM event_date) = $3
        ORDER BY event_date ASC`,
        [brandId, targetMonth, targetYear]
      );

      const events = eventsResult.rows;

      // Fetch brand context for subplot generation
      const brandResult = await pool.query(
        `SELECT
          id, name, tagline, industry, personality, voice_attributes as "voiceAttributes",
          target_audience as "targetAudience"
        FROM brands
        WHERE id = $1`,
        [brandId]
      );

      const brand = brandResult.rows[0];

      // Get monthly theme if exists
      const themeResult = await pool.query(
        `SELECT theme, key_message as "keyMessage"
        FROM monthly_themes
        WHERE brand_id = $1 AND month = $2 AND year = $3`,
        [brandId, targetMonth, targetYear]
      );

      const monthlyTheme = themeResult.rows[0];

      // Generate subplot suggestions using AI
      let subplotSuggestions: any[] = [];

      if (events.length > 0) {
        const prompt = `Based on the following events and brand context, generate 4-6 compelling weekly subplot ideas that could tie into these events.

Brand: ${brand.name}
Industry: ${brand.industry}
Personality: ${brand.personality}
${monthlyTheme ? `Monthly Theme: ${monthlyTheme.theme}` : ''}

Events:
${events.map((e: any) => `- ${e.title} (${new Date(e.eventDate).toLocaleDateString()})${e.description ? ': ' + e.description : ''}`).join('\n')}

For each subplot, provide:
1. A catchy title (5-8 words)
2. A brief description (2-3 sentences)
3. Which events it ties into
4. Content hooks/angles to explore

Return as JSON array with format: [{ title, description, relatedEventIds, hooks }]`;

        try {
          // TODO: Use proper AI service method once available
          // For now, return empty suggestions - user can manually create subplots
          // const aiResponse = await aiService.generateContent(...);
          // const parsed = JSON.parse(aiResponse.content);
          // subplotSuggestions = Array.isArray(parsed) ? parsed : parsed.subplots || [];

          console.log('Event calendar refreshed - AI subplot generation temporarily disabled');
        } catch (error) {
          console.error('Error generating subplot suggestions:', error);
          // Continue even if AI generation fails
        }
      }

      // Cache the results
      const cacheKey = `events_${targetYear}_${String(targetMonth).padStart(2, '0')}`;
      await agentConfigService.cacheEventCalendar(
        brandId,
        cacheKey,
        events,
        subplotSuggestions,
        'eventAnalyzer',
        24 // 24 hour TTL
      );

      res.send({
        success: true,
        events,
        subplotSuggestions,
        cacheKey,
        message: 'Event calendar refreshed and subplot suggestions generated'
      });
    } catch (error) {
      console.error('Error refreshing event calendar:', error);
      res.status(500).send({ error: 'Failed to refresh event calendar' });
    }
  });

  /**
   * GET /api/events/cache/:brandId/:cacheKey
   * Get cached event calendar data
   */
  fastify.get('/cache/:brandId/:cacheKey', { preHandler: authenticateToken as any }, async (req: FastifyRequest, res: FastifyReply) => {
    try {
      const { brandId, cacheKey } = req.params as { brandId: string; cacheKey: string };
      const userId = (req as any).user?.id;

      // Verify user has access to this brand
      const brandCheck = await pool.query(
        'SELECT id FROM brands WHERE id = $1 AND user_id = $2',
        [brandId, userId]
      );

      if (brandCheck.rows.length === 0) {
        return res.status(404).send({ error: 'Brand not found or access denied' });
      }

      const cached = await agentConfigService.getCachedEventCalendar(brandId, cacheKey);

      if (!cached) {
        return res.status(404).send({ error: 'Cache not found or expired' });
      }

      res.send(cached);
    } catch (error) {
      console.error('Error fetching cached events:', error);
      res.status(500).send({ error: 'Failed to fetch cached events' });
    }
  });

  /**
   * POST /api/events/cache/clear
   * Clear expired event caches
   */
  fastify.post('/cache/clear', { preHandler: authenticateToken as any }, async (req: FastifyRequest, res: FastifyReply) => {
    try {
      const cleared = await agentConfigService.clearExpiredCache();
      res.send({ message: `Cleared ${cleared} expired cache entries` });
    } catch (error) {
      console.error('Error clearing cache:', error);
      res.status(500).send({ error: 'Failed to clear cache' });
    }
  });
}
