import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import pool from '../database/db';
import { authenticate } from '../middleware/auth';
import { orchestrator } from '../agents/orchestrator.agent';

const formatEventRow = (row: any) => {
  // Extract date-only string (now dates come as strings from pg, no timezone conversion)
  const extractDateOnly = (dateValue: any): string => {
    if (!dateValue) return '';

    // If it's already a string (which it should be with our pg config), extract date portion
    if (typeof dateValue === 'string') {
      return dateValue.split('T')[0];
    }

    // Fallback: If it's a Date object, convert to ISO string
    if (dateValue instanceof Date) {
      return dateValue.toISOString().split('T')[0];
    }

    return '';
  };

  const eventDate = extractDateOnly(row.event_date ?? row.start_date);

  return {
    id: row.id,
    brand_id: row.brand_id,
    user_id: row.brand_user_id ?? row.user_id ?? null,
    title: row.title,
    event_type: row.event_type,
    start_date: row.start_date,
    end_date: row.end_date,
    description: row.description,
    relevance_tag: row.relevance_tag,
    remind_andora: row.remind_andora,
    embedded_in_subplot: row.embedded_in_subplot ?? false,
    last_embedded_at: row.last_embedded_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    event_date: eventDate, // Always return date-only format: "2025-10-31"
  };
};

export default async function eventRoutes(fastify: FastifyInstance) {
  // Get all events for a brand
  fastify.get('/brand/:brandId', { preHandler: authenticate as any }, async (req: FastifyRequest, res: FastifyReply): Promise<void> => {
    try {
      const { brandId } = req.params as { brandId: string };
      const userId = (req as any).user.id;

      // Verify brand belongs to user
      const brandCheck = await pool.query(
        'SELECT id FROM brands WHERE id = $1 AND user_id = $2',
        [brandId, userId]
      );

      if (brandCheck.rows.length === 0) {
        res.status(403).send({ error: 'Access denied' });
        return;
      }

      const result = await pool.query(
        `SELECT e.*, e.start_date AS event_date, b.user_id AS brand_user_id
         FROM brand_events e
         JOIN brands b ON e.brand_id = b.id
         WHERE e.brand_id = $1
         ORDER BY e.start_date ASC`,
        [brandId]
      );

      res.send(result.rows.map(formatEventRow));
    } catch (error) {
      console.error('Error fetching events:', error);
      res.status(500).send({ error: 'Failed to fetch events' });
    }
  });

  // Get events by date range
  fastify.get('/brand/:brandId/range', { preHandler: authenticate as any }, async (req: FastifyRequest, res: FastifyReply): Promise<void> => {
    try {
      const { brandId } = req.params as { brandId: string };
      const { startDate, endDate } = req.query as { startDate: string; endDate: string };
      const userId = (req as any).user.id;

      // Verify brand belongs to user
      const brandCheck = await pool.query(
        'SELECT id FROM brands WHERE id = $1 AND user_id = $2',
        [brandId, userId]
      );

      if (brandCheck.rows.length === 0) {
        res.status(403).send({ error: 'Access denied' });
        return;
      }

      const result = await pool.query(
        `SELECT e.*, e.start_date AS event_date, b.user_id AS brand_user_id
         FROM brand_events e
         JOIN brands b ON e.brand_id = b.id
         WHERE e.brand_id = $1
         AND e.start_date >= $2
         AND (e.end_date IS NULL OR e.end_date <= $3)
         ORDER BY e.start_date ASC`,
        [brandId, startDate, endDate]
      );

      res.send(result.rows.map(formatEventRow));
    } catch (error) {
      console.error('Error fetching events by range:', error);
      res.status(500).send({ error: 'Failed to fetch events' });
    }
  });

  // Create new event
  fastify.post('/', { preHandler: authenticate as any }, async (req: FastifyRequest, res: FastifyReply): Promise<void> => {
    try {
      const {
        brand_id,
        title,
        event_type,
        start_date,
        end_date,
        description,
        relevance_tag,
        remind_andora
      } = req.body as any;
      const userId = (req as any).user.id;

      // Normalize dates to ensure they're date-only strings (no timezone issues)
      const normalizeDate = (dateValue: any): string | null => {
        if (!dateValue) return null;
        // Extract date-only portion (YYYY-MM-DD) to avoid timezone conversion
        return String(dateValue).split('T')[0];
      };

      const normalizedStartDate = normalizeDate(start_date);
      const normalizedEndDate = normalizeDate(end_date);

      // Verify brand belongs to user
      const brandCheck = await pool.query(
        'SELECT id FROM brands WHERE id = $1 AND user_id = $2',
        [brand_id, userId]
      );

      if (brandCheck.rows.length === 0) {
        res.status(403).send({ error: 'Access denied' });
        return;
      }

      const insertResult = await pool.query(
        `INSERT INTO brand_events
         (brand_id, title, event_type, start_date, end_date, description, relevance_tag, remind_andora)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [brand_id, title, event_type, normalizedStartDate, normalizedEndDate, description, relevance_tag, remind_andora !== false]
      );

      const createdId = insertResult.rows[0].id;

      const eventResult = await pool.query(
        `SELECT e.*, e.start_date AS event_date, b.user_id AS brand_user_id
         FROM brand_events e
         JOIN brands b ON e.brand_id = b.id
         WHERE e.id = $1`,
        [createdId]
      );

      orchestrator.clearCaches(brand_id);

      res.status(201).send(formatEventRow(eventResult.rows[0]));
    } catch (error) {
      console.error('Error creating event:', error);
      res.status(500).send({ error: 'Failed to create event' });
    }
  });

  // Update event
  fastify.put('/:id', { preHandler: authenticate as any }, async (req: FastifyRequest, res: FastifyReply): Promise<void> => {
    try {
      const { id } = req.params as { id: string };
      const {
        title,
        event_type,
        start_date,
        end_date,
        description,
        relevance_tag,
        remind_andora
      } = req.body as any;
      const userId = (req as any).user.id;

      // Normalize dates to ensure they're date-only strings (no timezone issues)
      const normalizeDate = (dateValue: any): string | null => {
        if (!dateValue) return null;
        return String(dateValue).split('T')[0];
      };

      const normalizedStartDate = normalizeDate(start_date);
      const normalizedEndDate = normalizeDate(end_date);

      // Verify event belongs to user's brand
      const eventCheck = await pool.query(
        `SELECT e.id, e.brand_id FROM brand_events e
         JOIN brands b ON e.brand_id = b.id
         WHERE e.id = $1 AND b.user_id = $2`,
        [id, userId]
      );

      if (eventCheck.rows.length === 0) {
        res.status(403).send({ error: 'Access denied' });
        return;
      }

      const brandId = eventCheck.rows[0].brand_id;
      const remindValue = typeof remind_andora === 'boolean' ? remind_andora : undefined;

      const updateResult = await pool.query(
        `UPDATE brand_events
         SET title = $1, event_type = $2, start_date = $3, end_date = $4,
             description = $5, relevance_tag = $6,
             remind_andora = COALESCE($7, remind_andora)
         WHERE id = $8
         RETURNING id`,
        [title, event_type, normalizedStartDate, normalizedEndDate, description, relevance_tag, remindValue, id]
      );

      const eventResult = await pool.query(
        `SELECT e.*, e.start_date AS event_date, b.user_id AS brand_user_id
         FROM brand_events e
         JOIN brands b ON e.brand_id = b.id
         WHERE e.id = $1`,
        [updateResult.rows[0].id]
      );

      orchestrator.clearCaches(brandId);

      res.send(formatEventRow(eventResult.rows[0]));
    } catch (error) {
      console.error('Error updating event:', error);
      res.status(500).send({ error: 'Failed to update event' });
    }
  });

  // Delete event
  fastify.delete('/:id', { preHandler: authenticate as any }, async (req: FastifyRequest, res: FastifyReply): Promise<void> => {
    try {
      const { id } = req.params as { id: string };
      const userId = (req as any).user.id;

      // Verify event belongs to user's brand
      const eventCheck = await pool.query(
        `SELECT e.id, e.brand_id FROM brand_events e
         JOIN brands b ON e.brand_id = b.id
         WHERE e.id = $1 AND b.user_id = $2`,
        [id, userId]
      );

      if (eventCheck.rows.length === 0) {
        res.status(403).send({ error: 'Access denied' });
        return;
      }

      const brandId = eventCheck.rows[0].brand_id;
      await pool.query('DELETE FROM brand_events WHERE id = $1', [id]);
      orchestrator.clearCaches(brandId);
      res.send({ message: 'Event deleted successfully' });
    } catch (error) {
      console.error('Error deleting event:', error);
      res.status(500).send({ error: 'Failed to delete event' });
    }
  });

  // Get unembedded events for a specific week
  fastify.get('/brand/:brandId/unembedded/:year/:month', { preHandler: authenticate as any }, async (req: FastifyRequest, res: FastifyReply): Promise<void> => {
    try {
      const { brandId, year, month } = req.params as { brandId: string; year: string; month: string };
      const userId = (req as any).user.id;

      // Verify brand belongs to user
      const brandCheck = await pool.query(
        'SELECT id FROM brands WHERE id = $1 AND user_id = $2',
        [brandId, userId]
      );

      if (brandCheck.rows.length === 0) {
        res.status(403).send({ error: 'Access denied' });
        return;
      }

      // Get unembedded events for the specified month
      const startDate = `${year}-${month.padStart(2, '0')}-01`;
      // Calculate the last day of the month properly
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      const endDate = `${year}-${month.padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const result = await pool.query(
        `SELECT e.*, e.start_date AS event_date, b.user_id AS brand_user_id
         FROM brand_events e
         JOIN brands b ON e.brand_id = b.id
         WHERE e.brand_id = $1
         AND e.start_date >= $2
         AND e.start_date <= $3
         AND (e.embedded_in_subplot = FALSE OR e.embedded_in_subplot IS NULL)
         ORDER BY e.start_date ASC`,
        [brandId, startDate, endDate]
      );

      res.send(result.rows.map(formatEventRow));
    } catch (error) {
      console.error('Error fetching unembedded events:', error);
      res.status(500).send({ error: 'Failed to fetch unembedded events' });
    }
  });
}
