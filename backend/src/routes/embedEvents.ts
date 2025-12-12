import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import pool from '../database/db';
import { authenticate } from '../middleware/auth';
import { brandContextEngine } from '../services/brandContext';
import { modelRouter } from '../services/modelRouter';
import { aiService } from '../services/aiService';

export default async function embedEventRoutes(fastify: FastifyInstance) {
  /**
   * Embed pending events into weekly subplots
   * POST /api/embed-events/:brandId/:year/:month/:week
   */
  fastify.post('/:brandId/:year/:month/:week', { preHandler: authenticate as any }, async (req: FastifyRequest, res: FastifyReply): Promise<void> => {
    try {
      const { brandId, year, month, week } = req.params as { brandId: string; year: string; month: string; week: string };
      const { forceReflow } = req.body as any; // Whether to reflow even if week is perfect
      const userId = (req as any).user.id;

      // Verify brand belongs to user
      const brandCheck = await pool.query(
        'SELECT data FROM brands WHERE id = $1 AND user_id = $2',
        [brandId, userId]
      );

      if (brandCheck.rows.length === 0) {
        res.status(403).send({ error: 'Access denied' });
        return;
      }

      const brandData = brandCheck.rows[0].data;
      const seasonPlans = brandData.season_plans || {};
      const yearMonth = `${year}-${month.padStart(2, '0')}`;
      const seasonPlan = seasonPlans[yearMonth];

      if (!seasonPlan || !seasonPlan.weekly) {
        res.status(404).send({ error: 'Week plan not found' });
        return;
      }

      const weekNum = parseInt(week);
      const weekPlan = seasonPlan.weekly[weekNum];

      if (!weekPlan) {
        res.status(404).send({ error: 'Week not found in season plan' });
        return;
      }

      // Check if week subplot is perfect
      if (weekPlan.perfect && !forceReflow) {
        res.status(200).send({
          message: 'Week subplot is marked as perfect. Set forceReflow=true to update anyway.',
          needsConfirmation: true,
          weekPlan
        });
        return;
      }

      // Get unembedded events for this week
      // Calculate week date range
      const monthStart = new Date(`${yearMonth}-01T00:00:00Z`);
      const firstDay = monthStart.getUTCDay(); // 0 = Sunday
      const daysToFirstMonday = (8 - firstDay) % 7 || 7;
      const weekStartDate = new Date(monthStart);
      weekStartDate.setUTCDate(monthStart.getUTCDate() + daysToFirstMonday + (weekNum - 1) * 7);

      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setUTCDate(weekStartDate.getUTCDate() + 6);

      const startDateStr = weekStartDate.toISOString().split('T')[0];
      const endDateStr = weekEndDate.toISOString().split('T')[0];

      // Get unembedded events
      const eventsResult = await pool.query(
        `SELECT * FROM brand_events
         WHERE brand_id = $1
         AND start_date >= $2
         AND start_date <= $3
         AND (embedded_in_subplot = FALSE OR embedded_in_subplot IS NULL)
         ORDER BY start_date ASC`,
        [brandId, startDateStr, endDateStr]
      );

      const unembeddedEvents = eventsResult.rows;

      if (unembeddedEvents.length === 0) {
        res.status(200).send({
          message: 'No unembedded events found for this week',
          weekPlan,
          eventsEmbedded: 0
        });
        return;
      }

      // Use AI to update subplot with new events
      const brand = await brandContextEngine.getBrandIdentity(brandId);
      const monthlyTheme = seasonPlan.theme || '';
      const currentSubplot = weekPlan.subplot || '';

      const systemPrompt = `You are a brand storytelling strategist. Your task is to update a weekly subplot to incorporate new events while maintaining narrative cohesion.

IMPORTANT:
- Keep the existing subplot structure and narrative arc
- Weave in the new events naturally without extending the subplot unnecessarily
- Maintain the original tone and pacing
- The subplot should still be concise (2-4 sentences max)
- Focus on how these events advance the brand story`;

      const userPrompt = `BRAND: ${brand.name}
MONTHLY THEME: ${monthlyTheme}
CURRENT WEEKLY SUBPLOT: ${currentSubplot}

NEW EVENTS TO INCORPORATE:
${unembeddedEvents.map((e: any) => `- ${e.title} (${e.start_date}): ${e.description || 'No description'}`).join('\n')}

Update the weekly subplot to incorporate these events naturally. Return ONLY the updated subplot text (2-4 sentences).`;

      const task = modelRouter.analyzeTask('content-writing', {
        userComplexity: 'medium',
        contextSize: 1500
      });
      const model = modelRouter.selectModel(task);

      const response = await aiService.generate({
        model,
        systemPrompt,
        userPrompt,
        temperature: 0.7,
        maxTokens: 500
      });

      const updatedSubplot = response.content.trim();

      // Update week subplot in database
      weekPlan.previous_subplot = currentSubplot; // Store previous version for undo
      weekPlan.subplot = updatedSubplot;
      weekPlan.perfect = false; // Mark as imperfect since it's been auto-updated
      seasonPlan.weekly[weekNum] = weekPlan;
      seasonPlans[yearMonth] = seasonPlan;
      brandData.season_plans = seasonPlans;

      await pool.query(
        'UPDATE brands SET data = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [brandData, brandId]
      );

      // Mark events as embedded
      const eventIds = unembeddedEvents.map((e: any) => e.id);
      if (eventIds.length > 0) {
        await pool.query(
          `UPDATE brand_events
           SET embedded_in_subplot = TRUE, last_embedded_at = CURRENT_TIMESTAMP
           WHERE id = ANY($1)`,
          [eventIds]
        );
      }

      // Clear caches (if method exists)
      // brandContextEngine.clearCache(brandId);

      res.status(200).send({
        message: `Successfully embedded ${unembeddedEvents.length} event(s) into week ${weekNum} subplot`,
        updatedSubplot,
        eventsEmbedded: unembeddedEvents.length,
        weekPlan,
        shouldRegenerateContent: !weekPlan.perfect // Suggest regenerating if week wasn't perfect
      });

    } catch (error) {
      console.error('Error embedding events:', error);
      res.status(500).send({ error: 'Failed to embed events into subplot' });
    }
  });
}
