import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import pool from '../database/db';
import { authenticate, requireAdmin } from '../middleware/auth';

const DEFAULT_EXCHANGE_RATE = Number(process.env.NGN_PER_USD || process.env.DEFAULT_EXCHANGE_RATE || 1500);

const DEFAULT_PRICING_PLANS = [
  { id: 'free', name: 'Free', price_ngn: 0, price_usd: 0, tokens: 10000, max_brands: 1, features: ['AI-assisted idea prompts', 'Community templates', 'Single brand workspace'], is_popular: false, sort_order: 1 },
  { id: 'starter', name: 'Starter', price_ngn: 5000, price_usd: Math.max(1, Math.round(5000 / DEFAULT_EXCHANGE_RATE)), tokens: 15000, max_brands: 1, features: ['Automated content calendar', 'AI content generation', 'Email support'], is_popular: false, sort_order: 2 },
  { id: 'basic', name: 'Basic', price_ngn: 10000, price_usd: Math.max(1, Math.round(10000 / DEFAULT_EXCHANGE_RATE)), tokens: 34000, max_brands: 1, features: ['Advanced AI workflows', 'Content calendar insights', 'Team collaboration (2 seats)'], is_popular: false, sort_order: 3 },
  { id: 'pro', name: 'Pro', price_ngn: 25000, price_usd: Math.max(1, Math.round(25000 / DEFAULT_EXCHANGE_RATE)), tokens: 90000, max_brands: 3, features: ['AI chat copilot', 'Up to 3 brands', 'Priority support'], is_popular: true, sort_order: 4 },
  { id: 'standard', name: 'Standard', price_ngn: 50000, price_usd: Math.max(1, Math.round(50000 / DEFAULT_EXCHANGE_RATE)), tokens: 200000, max_brands: 3, features: ['Advanced analytics', 'Campaign performance reports', 'Priority support'], is_popular: true, sort_order: 5 },
  { id: 'premium', name: 'Premium', price_ngn: 125000, price_usd: Math.max(1, Math.round(125000 / DEFAULT_EXCHANGE_RATE)), tokens: 600000, max_brands: -1, features: ['Unlimited brands', 'Full AI suite', 'Premium success manager'], is_popular: false, sort_order: 6 },
  { id: 'ultimate', name: 'Ultimate', price_ngn: 250000, price_usd: Math.max(1, Math.round(250000 / DEFAULT_EXCHANGE_RATE)), tokens: 1300000, max_brands: -1, features: ['Unlimited brands', 'Advanced AI automations', 'Agency-focused tooling'], is_popular: false, sort_order: 7 },
  { id: 'enterprise', name: 'Enterprise', price_ngn: 500000, price_usd: Math.max(1, Math.round(500000 / DEFAULT_EXCHANGE_RATE)), tokens: 2800000, max_brands: -1, features: ['Unlimited everything', 'Custom AI models', 'Dedicated enterprise support'], is_popular: false, sort_order: 8 }
] as const;

const DEFAULT_AI_MODELS = [
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai' as const, enabled: true, description: 'Flagship creative model for production workloads.' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai' as const, enabled: true, description: 'Cost-efficient GPT-4o variant for lightweight tasks.' },
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'claude' as const, enabled: true, description: 'Anthropic\'s balanced flagship model for creative work.' },
  { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'claude' as const, enabled: true, description: 'High-performing model for long-form strategic content.' },
  { id: 'deepseek-v3.2', name: 'DeepSeek V3.2', provider: 'deepseek' as const, enabled: true, description: 'DeepSeek\'s most powerful creative model (Dec 2024) for content generation.' }
];

type PricingPlanRow = {
  plan_id: string;
  name: string;
  price_ngn: number;
  price_usd: number;
  tokens: number;
  max_brands: number;
  features: string[] | null;
  is_popular: boolean | null;
  sort_order: number | null;
};

type CurrencySettingsRow = {
  default_currency: string;
  exchange_rate: number;
};

type AIModelRow = {
  model_id: string;
  name: string;
  provider: 'openai' | 'claude';
  enabled: boolean;
  description: string;
  sort_order: number | null;
};

const parseFeatures = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map(item => String(item));
  }
  if (typeof value === 'string') {
    return value
      .split(/\r?\n/)
      .map(item => item.trim())
      .filter(Boolean);
  }
  return [];
};

const toPricingPlan = (row: PricingPlanRow) => ({
  id: row.plan_id,
  name: row.name,
  price_ngn: Number(row.price_ngn) || 0,
  price_usd: Number(row.price_usd) || 0,
  tokens: Number(row.tokens) || 0,
  max_brands: typeof row.max_brands === 'number' ? row.max_brands : Number(row.max_brands) || 0,
  features: parseFeatures(row.features ?? []),
  is_popular: row.is_popular ?? false,
  sort_order: row.sort_order ?? null,
});

const fetchPricingPlans = async () => {
  try {
    const result = await pool.query<PricingPlanRow>(
      `SELECT plan_id, name, price_ngn, price_usd, tokens, max_brands, features, is_popular, sort_order
         FROM pricing_plans
         ORDER BY sort_order NULLS LAST, price_ngn ASC`
    );

    if (!result.rows.length) {
      return [...DEFAULT_PRICING_PLANS];
    }

    return result.rows.map(toPricingPlan);
  } catch (error) {
    console.warn('Falling back to default pricing plans:', error);
    return [...DEFAULT_PRICING_PLANS];
  }
};

const fetchCurrencySettings = async () => {
  try {
    const result = await pool.query<CurrencySettingsRow>(
      `SELECT default_currency, exchange_rate
         FROM admin_settings
         ORDER BY updated_at DESC NULLS LAST
         LIMIT 1`
    );

    if (!result.rows.length) {
      return { default_currency: 'NGN', exchange_rate: DEFAULT_EXCHANGE_RATE };
    }

    const row = result.rows[0];
    const exchangeRate = Number(row.exchange_rate) || DEFAULT_EXCHANGE_RATE;
    return {
      default_currency: row.default_currency === 'USD' ? 'USD' : 'NGN',
      exchange_rate: exchangeRate > 0 ? exchangeRate : DEFAULT_EXCHANGE_RATE,
    };
  } catch (error) {
    console.warn('Using default currency settings:', error);
    return { default_currency: 'NGN', exchange_rate: DEFAULT_EXCHANGE_RATE };
  }
};

const fetchAIModels = async () => {
  try {
    const result = await pool.query<AIModelRow>(
      `SELECT model_id, name, provider, enabled, description, sort_order
         FROM ai_models
         ORDER BY sort_order NULLS LAST, name ASC`
    );

    if (!result.rows.length) {
      return [...DEFAULT_AI_MODELS];
    }

    return result.rows.map(row => ({
      id: row.model_id,
      name: row.name,
      provider: row.provider,
      enabled: row.enabled,
      description: row.description,
    }));
  } catch (error) {
    console.warn('Using default AI models:', error);
    return [...DEFAULT_AI_MODELS];
  }
};

const computeSystemLimitsFromPlans = (plans: Array<{ id: string; tokens: number; max_brands: number }>) => {
  return plans.reduce<Record<string, { tokens: number; max_brands: number }>>((limits, plan) => {
    limits[plan.id] = {
      tokens: plan.tokens,
      max_brands: plan.max_brands,
    };
    return limits;
  }, {});
};

export default async function adminRoutes(fastify: FastifyInstance) {
  fastify.get('/stats', { preHandler: [authenticate as any, requireAdmin as any] }, async (req: FastifyRequest, res: FastifyReply) => {
    try {
      const userStats = await pool.query(
        `SELECT
           COUNT(*)::int AS total_users,
           COUNT(*) FILTER (WHERE plan = 'free')::int AS free_users,
           COUNT(*) FILTER (WHERE plan <> 'free')::int AS paid_users,
           COALESCE(SUM(tokens), 0)::int AS tokens_remaining
         FROM users`
      );

      const [brands, events, content, tokenUsage] = await Promise.all([
        pool.query('SELECT COUNT(*)::int AS total_brands FROM brands'),
        pool.query('SELECT COUNT(*)::int AS total_events FROM brand_events'),
        pool.query("SELECT COUNT(*)::int AS total_content FROM content_calendar"),
        pool.query('SELECT COALESCE(SUM(tokens_used), 0)::int AS tokens_consumed FROM brand_token_usage'),
      ]);

      const statsRow = userStats.rows[0] || {};
      const tokensRemaining = Number(statsRow.tokens_remaining) || 0;
      const tokensConsumed = Number(tokenUsage.rows[0]?.tokens_consumed) || 0;
      const tokensDistributed = tokensRemaining + tokensConsumed;

      res.send({
        stats: {
          total_users: Number(statsRow.total_users) || 0,
          free_users: Number(statsRow.free_users) || 0,
          paid_users: Number(statsRow.paid_users) || 0,
          tokens_distributed: tokensDistributed,
          tokens_consumed: tokensConsumed,
          total_brands: Number(brands.rows[0]?.total_brands) || 0,
          total_events: Number(events.rows[0]?.total_events) || 0,
          total_content: Number(content.rows[0]?.total_content) || 0,
        },
      });
    } catch (error) {
      console.error('Failed to fetch admin stats:', error);
      res.status(500).send({ error: 'Failed to fetch statistics' });
    }
  });

  fastify.get('/users', { preHandler: [authenticate as any, requireAdmin as any] }, async (req: FastifyRequest, res: FastifyReply) => {
    try {
      const result = await pool.query(
        `SELECT id, email, plan, tokens, plan_expiry, preferred_ai_provider, preferred_ai_model, timezone, last_token_reset
           FROM users
           ORDER BY created_at DESC`
      );

      res.send({ users: result.rows });
    } catch (error) {
      console.error('Failed to fetch users:', error);
      res.status(500).send({ error: 'Failed to fetch users' });
    }
  });

  fastify.patch('/users/:id', { preHandler: [authenticate as any, requireAdmin as any] }, async (req: FastifyRequest, res: FastifyReply) => {
    const { plan, tokens, plan_expiry, preferred_ai_provider, preferred_ai_model } = (req.body as any) || {};
    const { id } = (req.params as any) || {};
    const updates: string[] = [];
    const values: unknown[] = [];
    let index = 1;

    if (plan) {
      updates.push(`plan = $${index++}`);
      values.push(plan);
    }
    if (typeof tokens === 'number') {
      updates.push(`tokens = $${index++}`);
      values.push(tokens);
    }
    if (plan_expiry !== undefined) {
      updates.push(`plan_expiry = $${index++}`);
      values.push(plan_expiry === null ? null : new Date(plan_expiry).toISOString());
    }
    if (preferred_ai_provider) {
      updates.push(`preferred_ai_provider = $${index++}`);
      values.push(preferred_ai_provider);
    }
    if (preferred_ai_model) {
      updates.push(`preferred_ai_model = $${index++}`);
      values.push(preferred_ai_model);
    }

    if (!updates.length) {
      res.send({ success: true });
      return;
    }

    updates.push('updated_at = NOW()');
    values.push(id);

    try {
      await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${index}`, values);
      res.send({ success: true });
    } catch (error) {
      console.error('Failed to update user:', error);
      res.status(500).send({ error: 'Failed to update user' });
    }
  });

  fastify.delete('/users/:id', { preHandler: [authenticate as any, requireAdmin as any] }, async (req: FastifyRequest, res: FastifyReply) => {
    try {
      const { id } = (req.params as any) || {};
      await pool.query('DELETE FROM users WHERE id = $1', [id]);
      res.send({ success: true });
    } catch (error) {
      console.error('Failed to delete user:', error);
      res.status(500).send({ error: 'Failed to delete user' });
    }
  });

  fastify.post('/users/:id/tokens', { preHandler: [authenticate as any, requireAdmin as any] }, async (req: FastifyRequest, res: FastifyReply) => {
    const { amount } = (req.body as any) || {};
    const { id } = (req.params as any) || {};
    const amountNum = Number(amount) || 0;
    if (amountNum <= 0) {
      res.status(400).send({ error: 'Amount must be greater than zero' });
      return;
    }

    try {
      const result = await pool.query<{ tokens: number }>(
        `UPDATE users
           SET tokens = COALESCE(tokens, 0) + $1, updated_at = NOW()
         WHERE id = $2
         RETURNING tokens`,
        [amountNum, id]
      );

      res.send({ success: true, tokens: result.rows[0]?.tokens ?? null });
    } catch (error) {
      console.error('Failed to add tokens:', error);
      res.status(500).send({ error: 'Failed to add tokens' });
    }
  });

  fastify.post('/tokens/reset', { preHandler: [authenticate as any, requireAdmin as any] }, async (req: FastifyRequest, res: FastifyReply) => {
    const { plan, amount } = (req.body as any) || {};

    if (!plan) {
      res.status(400).send({ error: 'Plan is required' });
      return;
    }

    const resetAmount = Number(amount) || 0;

    try {
      await pool.query(
        `UPDATE users
           SET tokens = $1, last_token_reset = NOW(), updated_at = NOW()
         WHERE plan = $2`,
        [resetAmount, plan]
      );

      res.send({ success: true });
    } catch (error) {
      console.error('Failed to reset tokens:', error);
      res.status(500).send({ error: 'Failed to reset tokens' });
    }
  });

  fastify.get('/config', { preHandler: [authenticate as any, requireAdmin as any] }, async (req: FastifyRequest, res: FastifyReply) => {
    try {
      const [plans, models, currencySettings] = await Promise.all([
        fetchPricingPlans(),
        fetchAIModels(),
        fetchCurrencySettings(),
      ]);

      res.send({
        available_models: models,
        pricing_plans: plans,
        currency_settings: currencySettings,
        system_limits: computeSystemLimitsFromPlans(plans),
      });
    } catch (error) {
      console.error('Failed to load admin config:', error);
      res.status(500).send({ error: 'Failed to load admin configuration' });
    }
  });

  fastify.put('/models', { preHandler: [authenticate as any, requireAdmin as any] }, async (req: FastifyRequest, res: FastifyReply) => {
    const { models } = (req.body as any) || {};

    if (!Array.isArray(models)) {
      res.status(400).send({ error: 'Models must be an array' });
      return;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM ai_models');

      for (let i = 0; i < models.length; i += 1) {
        const model = models[i];
        await client.query(
          `INSERT INTO ai_models (model_id, name, provider, enabled, description, sort_order)
             VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (model_id)
           DO UPDATE SET
             name = EXCLUDED.name,
             provider = EXCLUDED.provider,
             enabled = EXCLUDED.enabled,
             description = EXCLUDED.description,
             sort_order = EXCLUDED.sort_order`,
          [model.id, model.name, model.provider, model.enabled, model.description, i + 1]
        );
      }

      await client.query('COMMIT');
      res.send({ success: true });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Failed to update AI models:', error);
      res.status(500).send({ error: 'Failed to update AI models' });
    } finally {
      client.release();
    }
  });

  fastify.put('/config/currency', { preHandler: [authenticate as any, requireAdmin as any] }, async (req: FastifyRequest, res: FastifyReply) => {
    const { default_currency, exchange_rate } = (req.body as any) || {};
    const currency = default_currency === 'USD' ? 'USD' : 'NGN';
    const rate = Number(exchange_rate) || DEFAULT_EXCHANGE_RATE;
    const normalizedRate = rate > 0 ? rate : DEFAULT_EXCHANGE_RATE;

    try {
      await pool.query(
        `INSERT INTO admin_settings (id, default_currency, exchange_rate, updated_at)
           VALUES (1, $1, $2, NOW())
         ON CONFLICT (id)
         DO UPDATE SET default_currency = EXCLUDED.default_currency, exchange_rate = EXCLUDED.exchange_rate, updated_at = NOW()` ,
        [currency, normalizedRate]
      );

      res.send({ success: true });
    } catch (error) {
      console.error('Failed to update currency settings:', error);
      res.status(500).send({ error: 'Failed to update currency settings' });
    }
  });

  fastify.put('/config/system-limits', { preHandler: [authenticate as any, requireAdmin as any] }, async (req: FastifyRequest, res: FastifyReply) => {
    const { limits } = (req.body as any) || {};

    if (!limits || typeof limits !== 'object') {
      res.status(400).send({ error: 'limits must be provided' });
      return;
    }

    try {
      const planEntries = Object.entries(limits) as Array<[
        string,
        { tokens?: number; max_brands?: number }
      ]>;

      for (const [planId, limit] of planEntries) {
        const tokensValue = Number(limit.tokens) || 0;
        const maxBrandsValue = typeof limit.max_brands === 'number' ? limit.max_brands : Number(limit.max_brands) || 0;

        await pool.query(
          `INSERT INTO pricing_plans (plan_id, name, price_ngn, price_usd, tokens, max_brands, features, is_popular, updated_at)
             VALUES ($1, $1, 0, 0, $2, $3, ARRAY[]::text[], false, NOW())
           ON CONFLICT (plan_id)
           DO UPDATE SET tokens = EXCLUDED.tokens, max_brands = EXCLUDED.max_brands, updated_at = NOW()`,
          [planId, tokensValue, maxBrandsValue]
        );
      }

      res.send({ success: true });
    } catch (error) {
      console.error('Failed to update system limits:', error);
      res.status(500).send({ error: 'Failed to update system limits' });
    }
  });

  fastify.put('/pricing/:planId', { preHandler: [authenticate as any, requireAdmin as any] }, async (req: FastifyRequest, res: FastifyReply) => {
    const { planId } = (req.params as any) || {};
    const { name, price_ngn, price_usd, tokens, max_brands, features, is_popular, sort_order } = (req.body as any) || {};

    const fallbackPlan = DEFAULT_PRICING_PLANS.find(plan => plan.id === planId);
    const normalizedName = name || fallbackPlan?.name || planId;
    const ngn = Math.max(0, Number(price_ngn) || 0);
    const currencySettings = await fetchCurrencySettings();
    const usd = typeof price_usd === 'number' && price_usd >= 0
      ? Math.round(price_usd)
      : ngn === 0
        ? 0
        : Math.max(1, Math.round(ngn / (currencySettings.exchange_rate || DEFAULT_EXCHANGE_RATE)));
    const tokenValue = Math.max(0, Number(tokens) || 0);
    const maxBrandsValue = typeof max_brands === 'number' ? max_brands : Number(max_brands) || 0;
    const featuresArray = parseFeatures(features);
    const popularValue = typeof is_popular === 'boolean' ? is_popular : Boolean(fallbackPlan?.is_popular);
    const sortOrderValue = typeof sort_order === 'number' ? sort_order : fallbackPlan?.sort_order || null;

    try {
      const result = await pool.query<PricingPlanRow>(
        `INSERT INTO pricing_plans (plan_id, name, price_ngn, price_usd, tokens, max_brands, features, is_popular, sort_order, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7::text[], $8, $9, NOW())
         ON CONFLICT (plan_id)
         DO UPDATE SET
           name = EXCLUDED.name,
           price_ngn = EXCLUDED.price_ngn,
           price_usd = EXCLUDED.price_usd,
           tokens = EXCLUDED.tokens,
           max_brands = EXCLUDED.max_brands,
           features = EXCLUDED.features,
           is_popular = EXCLUDED.is_popular,
           sort_order = EXCLUDED.sort_order,
           updated_at = NOW()
         RETURNING plan_id, name, price_ngn, price_usd, tokens, max_brands, features, is_popular, sort_order`,
        [planId, normalizedName, ngn, usd, tokenValue, maxBrandsValue, featuresArray, popularValue, sortOrderValue]
      );

      res.send({ plan: toPricingPlan(result.rows[0]) });
    } catch (error) {
      console.error('Failed to update pricing plan:', error);
      res.status(500).send({ error: 'Failed to update pricing plan' });
    }
  });
}
