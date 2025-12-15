import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import pool from '../database/db';
import { authenticate } from '../middleware/auth';

export default async function undoEmbedEventRoutes(fastify: FastifyInstance) {
  fastify.post('/:brandId/:year/:month/:week', { preHandler: authenticate as any }, async (req: FastifyRequest, res: FastifyReply): Promise<void> => {
    try {
      const { brandId, year, month, week } = req.params as { brandId: string; year: string; month: string; week: string };
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

      if (!weekPlan || !weekPlan.previous_subplot) {
        res.status(404).send({ error: 'No previous subplot to restore' });
        return;
      }

      // Restore the subplot
      weekPlan.subplot = weekPlan.previous_subplot;
      delete weekPlan.previous_subplot;

      // Update the database
      seasonPlan.weekly[weekNum] = weekPlan;
      seasonPlans[yearMonth] = seasonPlan;
      brandData.season_plans = seasonPlans;

      await pool.query(
        'UPDATE brands SET data = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [brandData, brandId]
      );

      // Mark recently embedded events as unembedded
      // This is a bit of a hack, but it's the best we can do without a more complex tracking system
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      await pool.query(
        `UPDATE brand_events
         SET embedded_in_subplot = FALSE, last_embedded_at = NULL
         WHERE brand_id = $1 AND last_embedded_at > $2`,
        [brandId, fiveMinutesAgo]
      );

      res.status(200).send({
        message: `Successfully restored subplot for week ${weekNum}`,
        weekPlan,
      });

    } catch (error) {
      console.error('Error undoing embed events:', error);
      res.status(500).send({ error: 'Failed to undo embed events' });
    }
  });
}
