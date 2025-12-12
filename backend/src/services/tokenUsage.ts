import pool from '../database/db';

interface RecordUsageOptions {
  brandId: string;
  tokensUsed: number;
  taskType: string;
  usageDate?: Date;
  metadata?: Record<string, any> | null;
}

interface MonthlyUsageSummary {
  total: number;
  byTask: Record<string, number>;
  daily: Array<{ date: string; tokens: number }>;
}

class TokenUsageService {
  /**
   * Record token usage and deduct from user balance
   * This ensures both tracking (brand_token_usage) and deduction (users.tokens) happen together
   */
  async recordUsage({ brandId, tokensUsed, taskType, usageDate, metadata }: RecordUsageOptions): Promise<void> {
    if (!brandId || !taskType || !Number.isFinite(tokensUsed) || tokensUsed <= 0) {
      return;
    }

    const date = usageDate ? usageDate : new Date();
    const isoDate = date.toISOString().split('T')[0];

    try {
      // Start a transaction to ensure atomicity
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // 1. Record usage in brand_token_usage table for analytics
        await client.query(
          `INSERT INTO brand_token_usage (brand_id, usage_date, task_type, tokens_used, metadata)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (brand_id, usage_date, task_type)
           DO UPDATE SET
             tokens_used = brand_token_usage.tokens_used + EXCLUDED.tokens_used,
             metadata = COALESCE(brand_token_usage.metadata, '{}'::jsonb) || COALESCE(EXCLUDED.metadata, '{}'::jsonb),
             updated_at = CURRENT_TIMESTAMP`,
          [brandId, isoDate, taskType, Math.round(tokensUsed), metadata ? JSON.stringify(metadata) : null]
        );

        // 2. Deduct tokens from user account
        // Find the user_id for this brand
        const userResult = await client.query(
          `SELECT user_id FROM brands WHERE id = $1`,
          [brandId]
        );

        if (userResult.rows.length > 0) {
          const userId = userResult.rows[0].user_id;

          // Deduct tokens from user balance
          const deductResult = await client.query(
            `UPDATE users
             SET tokens = GREATEST(tokens - $1, 0), updated_at = NOW()
             WHERE id = $2
             RETURNING tokens`,
            [Math.round(tokensUsed), userId]
          );

          if (deductResult.rows.length > 0) {
            const newBalance = deductResult.rows[0].tokens;
            console.log(`💰 Token Deduction: -${Math.round(tokensUsed)} tokens for ${taskType}. User ${userId} balance: ${newBalance}`);
          }
        }

        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Failed to record token usage and deduct:', error);
    }
  }

  async getMonthlySummary(brandId: string, month: number, year: number): Promise<MonthlyUsageSummary> {
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 1));

    try {
      const summaryResult = await pool.query(
        `SELECT task_type, SUM(tokens_used)::int AS tokens
         FROM brand_token_usage
         WHERE brand_id = $1
           AND usage_date >= $2::date
           AND usage_date < $3::date
         GROUP BY task_type`,
        [brandId, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
      );

      const dailyResult = await pool.query(
        `SELECT usage_date, SUM(tokens_used)::int AS tokens
         FROM brand_token_usage
         WHERE brand_id = $1
           AND usage_date >= $2::date
           AND usage_date < $3::date
         GROUP BY usage_date
         ORDER BY usage_date ASC`,
        [brandId, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
      );

      const byTask: Record<string, number> = {};
      let total = 0;

      summaryResult.rows.forEach(row => {
        const tokens = Number(row.tokens) || 0;
        byTask[row.task_type] = tokens;
        total += tokens;
      });

      const daily = dailyResult.rows.map(row => ({
        date: row.usage_date.toISOString().split('T')[0],
        tokens: Number(row.tokens) || 0,
      }));

      return { total, byTask, daily };
    } catch (error) {
      console.error('Failed to fetch token usage summary:', error);
      return { total: 0, byTask: {}, daily: [] };
    }
  }
}

export const tokenUsageService = new TokenUsageService();
