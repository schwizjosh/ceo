/**
 * SEASONS CONTROLLER
 *
 * Handles all season/monthly/weekly/calendar operations
 * Integrates with multi-agent orchestration system
 *
 * Routes:
 * - GET /api/seasons/brand/:brandId/seasons - Get all seasons
 * - POST /api/seasons/generate - Generate season theme
 * - PUT /api/seasons/:id - Update season
 *
 * - GET /api/seasons/brand/:brandId/months - Get all monthly themes
 * - POST /api/seasons/monthly/generate - Generate monthly plot (PHASE 5)
 * - PUT /api/seasons/monthly/:id - Update monthly plot
 *
 * - GET /api/seasons/monthly/:monthId/subplots - Get weekly subplots
 * - POST /api/seasons/weekly/generate - Generate weekly subplot (PHASE 6)
 * - PUT /api/seasons/weekly/:id - Update weekly subplot
 *
 * - POST /api/seasons/calendar/generate - Generate calendar batch (PHASE 7)
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import pool from '../database/db';
import { orchestrator } from '../agents/orchestrator.agent';

export class SeasonsController {

  // ========== SEASONS (QUARTERLY) ==========

  /**
   * Get all seasons for a brand
   * GET /api/seasons/brand/:brandId/seasons
   */
  async getSeasons(request: FastifyRequest, reply: FastifyReply): Promise<any> {
    try {
      const { brandId } = request.params as any;
      const userId = (request as any).user.id;

      // Verify brand ownership
      const brandCheck = await pool.query(
        'SELECT id FROM brands WHERE id = $1 AND user_id = $2',
        [brandId, userId]
      );

      if (brandCheck.rows.length === 0) {
        reply.status(403).send({ error: 'Access denied' });
        return;
      }

      const result = await pool.query(
        `SELECT * FROM brand_seasons
         WHERE brand_id = $1
         ORDER BY year DESC, quarter DESC`,
        [brandId]
      );

      reply.send(result.rows);
    } catch (error) {
      console.error('Error fetching seasons:', error);
      reply.status(500).send({ error: 'Failed to fetch seasons' });
    }
  }

  /**
   * Generate Season Theme (AI-powered)
   * POST /api/seasons/generate
   */
  async generateSeasonTheme(request: FastifyRequest, reply: FastifyReply): Promise<any> {
    try {
      const { brandId, quarter, year, themePrompt } = request.body as any;
      const userId = (request as any).user.id;

      // Verify brand ownership
      const brandCheck = await pool.query(
        'SELECT id FROM brands WHERE id = $1 AND user_id = $2',
        [brandId, userId]
      );

      if (brandCheck.rows.length === 0) {
        reply.status(403).send({ error: 'Access denied' });
        return;
      }

      // Call orchestrator
      const result = await orchestrator.execute({
        task: 'generate-season-theme',
        context: {
          type: 'generate-season-theme',
          brandId,
          payload: { quarter, year, themePrompt }
        }
      });

      // Save to database
      const saveResult = await pool.query(
        `INSERT INTO brand_seasons (brand_id, quarter, year, theme, description)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (brand_id, quarter, year)
         DO UPDATE SET theme = $4, description = $5
         RETURNING *`,
        [brandId, quarter, year, result.result.theme, result.result.description]
      );

      reply.send({
        season: saveResult.rows[0],
        metadata: result.metadata
      });
    } catch (error) {
      console.error('Error generating season theme:', error);
      reply.status(500).send({ error: 'Failed to generate season theme' });
    }
  }

  /**
   * Update Season
   * PUT /api/seasons/:id
   */
  async updateSeason(request: FastifyRequest, reply: FastifyReply): Promise<any> {
    try {
      const { id } = request.params as any;
      const { theme, description } = request.body as any;
      const userId = (request as any).user.id;

      // Verify ownership
      const seasonCheck = await pool.query(
        `SELECT s.id FROM brand_seasons s
         JOIN brands b ON s.brand_id = b.id
         WHERE s.id = $1 AND b.user_id = $2`,
        [id, userId]
      );

      if (seasonCheck.rows.length === 0) {
        reply.status(403).send({ error: 'Access denied' });
        return;
      }

      const result = await pool.query(
        `UPDATE brand_seasons
         SET theme = $1, description = $2
         WHERE id = $3
         RETURNING *`,
        [theme, description, id]
      );

      reply.send(result.rows[0]);
    } catch (error) {
      console.error('Error updating season:', error);
      reply.status(500).send({ error: 'Failed to update season' });
    }
  }

  // ========== MONTHLY PLOTS (PHASE 5) ==========

  /**
   * Get all monthly themes for a brand
   * GET /api/seasons/brand/:brandId/months
   */
  async getMonthlyThemes(request: FastifyRequest, reply: FastifyReply): Promise<any> {
    try {
      const { brandId } = request.params as any;
      const userId = (request as any).user.id;

      const brandCheck = await pool.query(
        'SELECT id FROM brands WHERE id = $1 AND user_id = $2',
        [brandId, userId]
      );

      if (brandCheck.rows.length === 0) {
        reply.status(403).send({ error: 'Access denied' });
        return;
      }

      const result = await pool.query(
        `SELECT * FROM brand_monthly_themes
         WHERE brand_id = $1
         ORDER BY year DESC, month DESC`,
        [brandId]
      );

      reply.send(result.rows);
    } catch (error) {
      console.error('Error fetching monthly themes:', error);
      reply.status(500).send({ error: 'Failed to fetch monthly themes' });
    }
  }

  /**
   * Generate Monthly Plot (AI-powered PHASE 5)
   * POST /api/seasons/monthly/generate
   */
  async generateMonthlyPlot(request: FastifyRequest, reply: FastifyReply): Promise<any> {
    try {
      const { brandId, month, year, seasonId, themePrompt } = request.body as any;
      const userId = (request as any).user.id;

      // Verify brand ownership
      const brandCheck = await pool.query(
        'SELECT id FROM brands WHERE id = $1 AND user_id = $2',
        [brandId, userId]
      );

      if (brandCheck.rows.length === 0) {
        reply.status(403).send({ error: 'Access denied' });
        return;
      }

      // Call orchestrator
      const result = await orchestrator.execute({
        task: 'generate-monthly-plot',
        context: {
          type: 'generate-monthly-plot',
          brandId,
          payload: { month, year, themePrompt }
        }
      });

      // Save to database
      const saveResult = await pool.query(
        `INSERT INTO brand_monthly_themes (brand_id, season_id, month, year, theme, description)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (brand_id, month, year)
         DO UPDATE SET theme = $5, description = $6, season_id = $2
         RETURNING *`,
        [brandId, seasonId || null, month, year, result.result.theme, result.result.description]
      );

      reply.send({
        monthlyTheme: saveResult.rows[0],
        metadata: result.metadata
      });
    } catch (error) {
      console.error('Error generating monthly plot:', error);
      reply.status(500).send({ error: 'Failed to generate monthly plot' });
    }
  }

  /**
   * Update Monthly Plot
   * PUT /api/seasons/monthly/:id
   */
  async updateMonthlyPlot(request: FastifyRequest, reply: FastifyReply): Promise<any> {
    try {
      const { id } = request.params as any;
      const { theme, description, is_finalized } = request.body as any;
      const userId = (request as any).user.id;

      // Verify ownership
      const monthCheck = await pool.query(
        `SELECT m.id FROM brand_monthly_themes m
         JOIN brands b ON m.brand_id = b.id
         WHERE m.id = $1 AND b.user_id = $2`,
        [id, userId]
      );

      if (monthCheck.rows.length === 0) {
        reply.status(403).send({ error: 'Access denied' });
        return;
      }

      const result = await pool.query(
        `UPDATE brand_monthly_themes
         SET theme = $1, description = $2, is_finalized = $3
         WHERE id = $4
         RETURNING *`,
        [theme, description, is_finalized !== undefined ? is_finalized : false, id]
      );

      reply.send(result.rows[0]);
    } catch (error) {
      console.error('Error updating monthly plot:', error);
      reply.status(500).send({ error: 'Failed to update monthly plot' });
    }
  }

  // ========== WEEKLY SUBPLOTS (PHASE 6) ==========

  /**
   * Get weekly subplots for a monthly theme
   * GET /api/seasons/monthly/:monthId/subplots
   */
  async getWeeklySubplots(request: FastifyRequest, reply: FastifyReply): Promise<any> {
    try {
      const { monthId } = request.params as any;
      const userId = (request as any).user.id;

      // Verify ownership
      const monthCheck = await pool.query(
        `SELECT m.id FROM brand_monthly_themes m
         JOIN brands b ON m.brand_id = b.id
         WHERE m.id = $1 AND b.user_id = $2`,
        [monthId, userId]
      );

      if (monthCheck.rows.length === 0) {
        reply.status(403).send({ error: 'Access denied' });
        return;
      }

      const result = await pool.query(
        `SELECT * FROM brand_weekly_subplots
         WHERE monthly_theme_id = $1
         ORDER BY week_number ASC`,
        [monthId]
      );

      reply.send(result.rows);
    } catch (error) {
      console.error('Error fetching weekly subplots:', error);
      reply.status(500).send({ error: 'Failed to fetch weekly subplots' });
    }
  }

  /**
   * Generate Weekly Subplot (AI-powered PHASE 6)
   * POST /api/seasons/weekly/generate
   */
  async generateWeeklySubplot(request: FastifyRequest, reply: FastifyReply): Promise<any> {
    try {
      const { brandId, monthlyThemeId, weekNumber, weekThemePrompt } = request.body as any;
      const userId = (request as any).user.id;

      // Verify brand ownership
      const brandCheck = await pool.query(
        'SELECT id FROM brands WHERE id = $1 AND user_id = $2',
        [brandId, userId]
      );

      if (brandCheck.rows.length === 0) {
        reply.status(403).send({ error: 'Access denied' });
        return;
      }

      // Call orchestrator
      const result = await orchestrator.execute({
        task: 'generate-weekly-subplot',
        context: {
          type: 'generate-weekly-subplot',
          brandId,
          payload: { monthlyThemeId, weekNumber, weekThemePrompt }
        }
      });

      // Save to database
      const saveResult = await pool.query(
        `INSERT INTO brand_weekly_subplots
         (monthly_theme_id, week_number, subplot_title, description, characters_involved, related_events, next_scene_hooks)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (monthly_theme_id, week_number)
         DO UPDATE SET subplot_title = $3, description = $4, next_scene_hooks = $7
         RETURNING *`,
        [
          monthlyThemeId,
          weekNumber,
          result.result.subplot_title,
          result.result.description,
          JSON.stringify([]),
          JSON.stringify([]),
          JSON.stringify(result.result.next_scene_hooks || [])
        ]
      );

      reply.send({
        weeklySubplot: saveResult.rows[0],
        metadata: result.metadata
      });
    } catch (error) {
      console.error('Error generating weekly subplot:', error);
      reply.status(500).send({ error: 'Failed to generate weekly subplot' });
    }
  }

  /**
   * Update Weekly Subplot
   * PUT /api/seasons/weekly/:id
   */
  async updateWeeklySubplot(request: FastifyRequest, reply: FastifyReply): Promise<any> {
    try {
      const { id } = request.params as any;
      const { subplot_title, description, characters_involved, related_events, next_scene_hooks } = request.body as any;
      const userId = (request as any).user.id;

      // Verify ownership
      const subplotCheck = await pool.query(
        `SELECT s.id FROM brand_weekly_subplots s
         JOIN brand_monthly_themes m ON s.monthly_theme_id = m.id
         JOIN brands b ON m.brand_id = b.id
         WHERE s.id = $1 AND b.user_id = $2`,
        [id, userId]
      );

      if (subplotCheck.rows.length === 0) {
        reply.status(403).send({ error: 'Access denied' });
        return;
      }

      const result = await pool.query(
        `UPDATE brand_weekly_subplots
         SET subplot_title = $1,
             description = $2,
             characters_involved = $3,
             related_events = $4,
             next_scene_hooks = $5
         WHERE id = $6
         RETURNING *`,
        [
          subplot_title,
          description,
          JSON.stringify(characters_involved || []),
          JSON.stringify(related_events || []),
          JSON.stringify(next_scene_hooks || []),
          id
        ]
      );

      reply.send(result.rows[0]);
    } catch (error) {
      console.error('Error updating weekly subplot:', error);
      reply.status(500).send({ error: 'Failed to update weekly subplot' });
    }
  }

  // ========== CALENDAR BATCH GENERATION (PHASE 7) ==========

  /**
   * Generate Calendar Batch (AI-powered PHASE 7)
   * POST /api/seasons/calendar/generate
   */
  async generateCalendarBatch(request: FastifyRequest, reply: FastifyReply): Promise<any> {
    try {
      const { brandId, monthlyThemeId, weeklySubplotId, startDay, endDay } = request.body as any;
      const userId = (request as any).user.id;

      // Verify brand ownership
      const brandCheck = await pool.query(
        'SELECT id FROM brands WHERE id = $1 AND user_id = $2',
        [brandId, userId]
      );

      if (brandCheck.rows.length === 0) {
        reply.status(403).send({ error: 'Access denied' });
        return;
      }

      // Call orchestrator
      const result = await orchestrator.execute({
        task: 'generate-calendar-batch',
        context: {
          type: 'generate-calendar-batch',
          brandId,
          payload: { monthlyThemeId, weeklySubplotId, startDay, endDay }
        }
      });

      reply.send({
        calendar: result.result.calendar,
        metadata: result.metadata
      });
    } catch (error) {
      console.error('Error generating calendar batch:', error);
      reply.status(500).send({ error: 'Failed to generate calendar batch' });
    }
  }
}
