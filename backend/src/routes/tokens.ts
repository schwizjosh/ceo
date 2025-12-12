import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import pool from '../database/db';
import { authenticate } from '../middleware/auth';

export default async function tokenRoutes(fastify: FastifyInstance) {
  /**
   * Deduct tokens from user account
   * POST /api/tokens/deduct
   */
  fastify.post('/deduct', { preHandler: authenticate as any }, async (req: FastifyRequest, res: FastifyReply) => {
    try {
      const userId = (req as any).user?.id;
      const { amount } = (req.body as any) || {};

      if (!userId) {
        res.status(401).send({ error: 'Not authenticated' });
        return;
      }

      if (typeof amount !== 'number' || amount <= 0) {
        res.status(400).send({ error: 'Invalid token amount' });
        return;
      }

      // Get current token balance
      const userResult = await pool.query(
        'SELECT tokens FROM users WHERE id = $1',
        [userId]
      );

      if (!userResult.rows.length) {
        res.status(404).send({ error: 'User not found' });
        return;
      }

      const currentTokens = userResult.rows[0].tokens || 0;

      // Check if user has enough tokens
      if (currentTokens < amount) {
        res.status(402).send({
          error: 'Insufficient tokens',
          required: amount,
          available: currentTokens
        });
        return;
      }

      // Deduct tokens
      const updateResult = await pool.query(
        `UPDATE users
         SET tokens = tokens - $1, updated_at = NOW()
         WHERE id = $2
         RETURNING tokens`,
        [amount, userId]
      );

      const newBalance = updateResult.rows[0]?.tokens || 0;

      res.send({
        success: true,
        tokensDeducted: amount,
        remainingTokens: newBalance
      });
    } catch (error) {
      console.error('Token deduction error:', error);
      res.status(500).send({ error: 'Failed to deduct tokens' });
    }
  });

  /**
   * Get current token balance
   * GET /api/tokens/balance
   */
  fastify.get('/balance', { preHandler: authenticate as any }, async (req: FastifyRequest, res: FastifyReply) => {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).send({ error: 'Not authenticated' });
        return;
      }

      const result = await pool.query(
        'SELECT tokens, plan FROM users WHERE id = $1',
        [userId]
      );

      if (!result.rows.length) {
        res.status(404).send({ error: 'User not found' });
        return;
      }

      res.send({
        tokens: result.rows[0].tokens || 0,
        plan: result.rows[0].plan || 'free'
      });
    } catch (error) {
      console.error('Token balance error:', error);
      res.status(500).send({ error: 'Failed to get token balance' });
    }
  });
}
