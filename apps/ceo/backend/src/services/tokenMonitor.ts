/**
 * TOKEN MONITORING SERVICE
 *
 * Comprehensive monitoring and alerting for token usage across the system.
 * Tracks anomalies, provides insights, and prevents abuse.
 */

import pool from '../database/db';

interface TokenAlert {
  userId: string;
  type: 'low_balance' | 'high_usage' | 'suspicious_pattern' | 'negative_balance';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  details: Record<string, any>;
  timestamp: Date;
}

interface UsagePattern {
  userId: string;
  avgTokensPerDay: number;
  peakUsage: number;
  lowBalance: boolean;
  suspiciousActivity: boolean;
}

class TokenMonitorService {
  private alerts: TokenAlert[] = [];
  private readonly LOW_BALANCE_THRESHOLD = 1000; // Alert when below 1000 tokens
  private readonly HIGH_USAGE_THRESHOLD = 5000;  // Alert when single operation > 5000
  private readonly ALERT_RETENTION_HOURS = 24;

  /**
   * Monitor token deduction and generate alerts
   */
  async monitorDeduction(userId: string, amount: number, taskType: string, success: boolean): Promise<void> {
    try {
      // Get current balance
      const result = await pool.query(
        'SELECT tokens, plan FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) return;

      const currentBalance = result.rows[0].tokens || 0;
      const plan = result.rows[0].plan || 'free';

      // Check for negative balance (critical)
      if (currentBalance < 0) {
        this.addAlert({
          userId,
          type: 'negative_balance',
          severity: 'critical',
          message: 'User has negative token balance',
          details: { balance: currentBalance, amount, taskType },
          timestamp: new Date()
        });
      }

      // Check for low balance (warning)
      if (currentBalance < this.LOW_BALANCE_THRESHOLD && currentBalance >= 0) {
        this.addAlert({
          userId,
          type: 'low_balance',
          severity: 'warning',
          message: 'User token balance is low',
          details: { balance: currentBalance, threshold: this.LOW_BALANCE_THRESHOLD, plan },
          timestamp: new Date()
        });
      }

      // Check for high usage (warning)
      if (amount > this.HIGH_USAGE_THRESHOLD) {
        this.addAlert({
          userId,
          type: 'high_usage',
          severity: 'warning',
          message: 'Single operation consumed significant tokens',
          details: { amount, taskType, balance: currentBalance },
          timestamp: new Date()
        });
      }

      // Log the deduction
      console.log(`📊 Token Monitor: User ${userId} | Task: ${taskType} | Used: ${amount} | Balance: ${currentBalance} | Success: ${success}`);
    } catch (error) {
      console.error('Token monitoring error:', error);
    }
  }

  /**
   * Analyze usage patterns for a user
   */
  async analyzeUserPattern(userId: string): Promise<UsagePattern> {
    try {
      // Get user's brands
      const brandsResult = await pool.query(
        'SELECT id FROM brands WHERE user_id = $1',
        [userId]
      );

      if (brandsResult.rows.length === 0) {
        return {
          userId,
          avgTokensPerDay: 0,
          peakUsage: 0,
          lowBalance: false,
          suspiciousActivity: false
        };
      }

      const brandIds = brandsResult.rows.map(r => r.id);

      // Get usage stats for last 7 days
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      const usageResult = await pool.query(
        `SELECT
           usage_date,
           SUM(tokens_used) as daily_tokens,
           COUNT(DISTINCT task_type) as task_variety
         FROM brand_token_usage
         WHERE brand_id = ANY($1)
           AND usage_date >= $2
         GROUP BY usage_date
         ORDER BY usage_date DESC`,
        [brandIds, startDate.toISOString().split('T')[0]]
      );

      const dailyUsage = usageResult.rows.map(r => parseInt(r.daily_tokens || '0'));
      const avgTokensPerDay = dailyUsage.length > 0
        ? dailyUsage.reduce((sum, val) => sum + val, 0) / dailyUsage.length
        : 0;
      const peakUsage = dailyUsage.length > 0 ? Math.max(...dailyUsage) : 0;

      // Get current balance
      const balanceResult = await pool.query(
        'SELECT tokens FROM users WHERE id = $1',
        [userId]
      );
      const currentBalance = balanceResult.rows[0]?.tokens || 0;
      const lowBalance = currentBalance < this.LOW_BALANCE_THRESHOLD;

      // Detect suspicious patterns (e.g., sudden spike in usage)
      const suspiciousActivity = peakUsage > avgTokensPerDay * 5 && dailyUsage.length > 2;

      return {
        userId,
        avgTokensPerDay: Math.round(avgTokensPerDay),
        peakUsage,
        lowBalance,
        suspiciousActivity
      };
    } catch (error) {
      console.error('Pattern analysis error:', error);
      return {
        userId,
        avgTokensPerDay: 0,
        peakUsage: 0,
        lowBalance: false,
        suspiciousActivity: false
      };
    }
  }

  /**
   * Get all active alerts
   */
  getAlerts(userId?: string): TokenAlert[] {
    // Clean old alerts
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - this.ALERT_RETENTION_HOURS);

    this.alerts = this.alerts.filter(a => a.timestamp > cutoff);

    if (userId) {
      return this.alerts.filter(a => a.userId === userId);
    }

    return this.alerts;
  }

  /**
   * Get system-wide token statistics
   */
  async getSystemStats(): Promise<{
    totalUsersWithTokens: number;
    avgBalancePerUser: number;
    totalTokensUsedToday: number;
    lowBalanceUsers: number;
    activeAlerts: number;
  }> {
    try {
      // Get user token stats
      const userStatsResult = await pool.query(
        `SELECT
           COUNT(*) as total_users,
           COALESCE(AVG(tokens), 0) as avg_balance,
           COUNT(CASE WHEN tokens < $1 THEN 1 END) as low_balance_count
         FROM users
         WHERE tokens IS NOT NULL`,
        [this.LOW_BALANCE_THRESHOLD]
      );

      // Get today's usage
      const today = new Date().toISOString().split('T')[0];
      const usageResult = await pool.query(
        `SELECT COALESCE(SUM(tokens_used), 0) as total_used
         FROM brand_token_usage
         WHERE usage_date = $1`,
        [today]
      );

      const stats = userStatsResult.rows[0];
      const usage = usageResult.rows[0];

      return {
        totalUsersWithTokens: parseInt(stats.total_users || '0'),
        avgBalancePerUser: Math.round(parseFloat(stats.avg_balance || '0')),
        totalTokensUsedToday: parseInt(usage.total_used || '0'),
        lowBalanceUsers: parseInt(stats.low_balance_count || '0'),
        activeAlerts: this.alerts.length
      };
    } catch (error) {
      console.error('System stats error:', error);
      return {
        totalUsersWithTokens: 0,
        avgBalancePerUser: 0,
        totalTokensUsedToday: 0,
        lowBalanceUsers: 0,
        activeAlerts: 0
      };
    }
  }

  /**
   * Add alert to the queue
   */
  private addAlert(alert: TokenAlert): void {
    this.alerts.push(alert);

    // Log critical alerts immediately
    if (alert.severity === 'critical') {
      console.error(`🚨 CRITICAL TOKEN ALERT: ${alert.message}`, alert.details);
    } else if (alert.severity === 'warning') {
      console.warn(`⚠️  TOKEN WARNING: ${alert.message}`, alert.details);
    }

    // Keep alerts list manageable
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-500); // Keep most recent 500
    }
  }

  /**
   * Get detailed usage breakdown for a user
   */
  async getUserUsageBreakdown(userId: string, days: number = 7): Promise<{
    byTaskType: Record<string, number>;
    byDate: Array<{ date: string; tokens: number }>;
    totalTokens: number;
    avgPerDay: number;
  }> {
    try {
      // Get user's brands
      const brandsResult = await pool.query(
        'SELECT id FROM brands WHERE user_id = $1',
        [userId]
      );

      if (brandsResult.rows.length === 0) {
        return {
          byTaskType: {},
          byDate: [],
          totalTokens: 0,
          avgPerDay: 0
        };
      }

      const brandIds = brandsResult.rows.map(r => r.id);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get usage by task type
      const taskTypeResult = await pool.query(
        `SELECT task_type, SUM(tokens_used) as total
         FROM brand_token_usage
         WHERE brand_id = ANY($1)
           AND usage_date >= $2
         GROUP BY task_type
         ORDER BY total DESC`,
        [brandIds, startDate.toISOString().split('T')[0]]
      );

      // Get usage by date
      const dateResult = await pool.query(
        `SELECT usage_date, SUM(tokens_used) as total
         FROM brand_token_usage
         WHERE brand_id = ANY($1)
           AND usage_date >= $2
         GROUP BY usage_date
         ORDER BY usage_date DESC`,
        [brandIds, startDate.toISOString().split('T')[0]]
      );

      const byTaskType: Record<string, number> = {};
      let totalTokens = 0;

      taskTypeResult.rows.forEach(row => {
        const tokens = parseInt(row.total || '0');
        byTaskType[row.task_type] = tokens;
        totalTokens += tokens;
      });

      const byDate = dateResult.rows.map(row => ({
        date: row.usage_date.toISOString().split('T')[0],
        tokens: parseInt(row.total || '0')
      }));

      return {
        byTaskType,
        byDate,
        totalTokens,
        avgPerDay: byDate.length > 0 ? Math.round(totalTokens / byDate.length) : 0
      };
    } catch (error) {
      console.error('Usage breakdown error:', error);
      return {
        byTaskType: {},
        byDate: [],
        totalTokens: 0,
        avgPerDay: 0
      };
    }
  }
}

export const tokenMonitorService = new TokenMonitorService();
