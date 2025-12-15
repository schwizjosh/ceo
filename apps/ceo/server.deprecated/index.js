import express from 'express';
import cors from 'cors';
import pg from 'pg';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const { Pool } = pg;
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@andorabrand.me';
const DEFAULT_EXCHANGE_RATE = parseFloat(process.env.NGN_PER_USD || '1500');

const DEFAULT_PRICING_PLANS = [
  { id: 'free', name: 'Free', price_ngn: 0, price_usd: 0, tokens: 2500, max_brands: 1, features: ['AI-assisted idea prompts', 'Community templates', 'Single brand workspace'], is_popular: false, sort_order: 1 },
  { id: 'starter', name: 'Starter', price_ngn: 5000, price_usd: Math.max(1, Math.round(5000 / DEFAULT_EXCHANGE_RATE)), tokens: 15000, max_brands: 1, features: ['Automated content calendar', 'AI content generation', 'Email support'], is_popular: false, sort_order: 2 },
  { id: 'basic', name: 'Basic', price_ngn: 10000, price_usd: Math.max(1, Math.round(10000 / DEFAULT_EXCHANGE_RATE)), tokens: 34000, max_brands: 1, features: ['Advanced AI workflows', 'Content calendar insights', 'Team collaboration (2 seats)'], is_popular: false, sort_order: 3 },
  { id: 'pro', name: 'Pro', price_ngn: 25000, price_usd: Math.max(1, Math.round(25000 / DEFAULT_EXCHANGE_RATE)), tokens: 90000, max_brands: 3, features: ['AI chat copilot', 'Up to 3 brands', 'Priority support'], is_popular: true, sort_order: 4 },
  { id: 'standard', name: 'Standard', price_ngn: 50000, price_usd: Math.max(1, Math.round(50000 / DEFAULT_EXCHANGE_RATE)), tokens: 200000, max_brands: 3, features: ['Advanced analytics', 'Campaign performance reports', 'Priority support'], is_popular: true, sort_order: 5 },
  { id: 'premium', name: 'Premium', price_ngn: 125000, price_usd: Math.max(1, Math.round(125000 / DEFAULT_EXCHANGE_RATE)), tokens: 600000, max_brands: -1, features: ['Unlimited brands', 'Full AI suite', 'Premium success manager'], is_popular: false, sort_order: 6 },
  { id: 'ultimate', name: 'Ultimate', price_ngn: 250000, price_usd: Math.max(1, Math.round(250000 / DEFAULT_EXCHANGE_RATE)), tokens: 1300000, max_brands: -1, features: ['Unlimited brands', 'Advanced AI automations', 'Agency-focused tooling'], is_popular: false, sort_order: 7 },
  { id: 'enterprise', name: 'Enterprise', price_ngn: 500000, price_usd: Math.max(1, Math.round(500000 / DEFAULT_EXCHANGE_RATE)), tokens: 2800000, max_brands: -1, features: ['Unlimited everything', 'Custom AI models', 'Dedicated enterprise support'], is_popular: false, sort_order: 8 }
];

const DEFAULT_AI_MODELS = [
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', enabled: true, description: 'Flagship reasoning model for production workloads.' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', enabled: true, description: 'Cost-efficient GPT-4o variant for lightweight tasks.' },
  { id: 'o3-mini', name: 'o3 Mini', provider: 'openai', enabled: true, description: 'Optimized reasoning model for structured planning.' },
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'claude', enabled: true, description: 'Anthropic’s balanced flagship model for creative work.' },
  { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'claude', enabled: true, description: 'High-performing model for long-form strategic content.' }
];

// Test DB connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection error:', err);
  } else {
    console.log('✅ Database connected:', res.rows[0].now);
  }
});

const parseFeatures = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }
  if (typeof value === 'string') {
    return value
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const toPricingPlan = (row) => ({
  id: row.plan_id,
  name: row.name,
  price_ngn: Number(row.price_ngn) || 0,
  price_usd: Number(row.price_usd) || 0,
  tokens: Number(row.tokens) || 0,
  max_brands: typeof row.max_brands === 'number' ? row.max_brands : Number(row.max_brands) || 0,
  features: parseFeatures(row.features),
  is_popular: row.is_popular ?? false,
  sort_order: row.sort_order ?? null
});

const fetchPricingPlans = async () => {
  try {
    const result = await pool.query(
      `SELECT plan_id, name, price_ngn, price_usd, tokens, max_brands, features, is_popular, sort_order
       FROM pricing_plans
       ORDER BY sort_order NULLS LAST, price_ngn ASC`
    );

    if (!result.rows.length) {
      return DEFAULT_PRICING_PLANS;
    }

    return result.rows.map(toPricingPlan);
  } catch (error) {
    console.warn('⚠️ Falling back to default pricing plans:', error.message);
    return DEFAULT_PRICING_PLANS;
  }
};

const fetchCurrencySettings = async () => {
  try {
    const result = await pool.query(
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
      exchange_rate: exchangeRate > 0 ? exchangeRate : DEFAULT_EXCHANGE_RATE
    };
  } catch (error) {
    console.warn('⚠️ Using default currency settings:', error.message);
    return { default_currency: 'NGN', exchange_rate: DEFAULT_EXCHANGE_RATE };
  }
};

const fetchAIModels = async () => {
  try {
    const result = await pool.query(
      `SELECT model_id, name, provider, enabled, description, sort_order
       FROM ai_models
       ORDER BY sort_order NULLS LAST, name ASC`
    );

    if (!result.rows.length) {
      return DEFAULT_AI_MODELS;
    }

    return result.rows.map((row) => ({
      id: row.model_id,
      name: row.name,
      provider: row.provider,
      enabled: row.enabled,
      description: row.description
    }));
  } catch (error) {
    console.warn('⚠️ Using default AI models:', error.message);
    return DEFAULT_AI_MODELS;
  }
};

const ensureAdmin = async (req, res, next) => {
  try {
    if (req.userEmail === ADMIN_EMAIL) {
      return next();
    }

    const result = await pool.query('SELECT is_admin FROM users WHERE id = $1 LIMIT 1', [req.userId]);
    if (result.rows.length > 0 && result.rows[0].is_admin === true) {
      return next();
    }

    return res.status(403).json({ error: 'Admin access required' });
  } catch (error) {
    console.error('Admin check failed:', error);
    return res.status(500).json({ error: 'Failed to verify admin access' });
  }
};

const computeSystemLimitsFromPlans = (plans) => {
  return plans.reduce((limits, plan) => {
    limits[plan.id] = {
      tokens: plan.tokens,
      max_brands: plan.max_brands
    };
    return limits;
  }, {});
};

// ========================================
// AUTH MIDDLEWARE
// ========================================
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ========================================
// PUBLIC ROUTES
// ========================================
app.get('/api/public/pricing', async (req, res) => {
  try {
    const [plans, currencySettings] = await Promise.all([
      fetchPricingPlans(),
      fetchCurrencySettings()
    ]);

    res.json({
      plans,
      currency: currencySettings.default_currency,
      exchange_rate: currencySettings.exchange_rate
    });
  } catch (error) {
    console.error('Failed to load pricing:', error);
    res.status(500).json({
      plans: DEFAULT_PRICING_PLANS,
      currency: 'NGN',
      exchange_rate: DEFAULT_EXCHANGE_RATE
    });
  }
});

// ========================================
// AUTH ROUTES
// ========================================

// Register
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body;

  try {
    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (email, password, plan, tokens, preferred_ai_provider, timezone)
       VALUES ($1, $2, 'free', 50, 'openai', 'Africa/Lagos')
       RETURNING id, email, plan, tokens, preferred_ai_provider, timezone`,
      [email, hashedPassword]
    );

    const user = result.rows[0];

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      user: {
        user_id: user.id,
        email: user.email,
        plan: user.plan,
        tokens: user.tokens,
        preferred_ai_provider: user.preferred_ai_provider,
        timezone: user.timezone
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Get user
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      user: {
        user_id: user.id,
        email: user.email,
        plan: user.plan,
        tokens: user.tokens,
        preferred_ai_provider: user.preferred_ai_provider,
        preferred_ai_model: user.preferred_ai_model,
        timezone: user.timezone,
        plan_expiry: user.plan_expiry
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
app.get('/api/auth/me', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, plan, tokens, preferred_ai_provider, preferred_ai_model, timezone, plan_expiry FROM users WHERE id = $1',
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    res.json({
      user_id: user.id,
      email: user.email,
      plan: user.plan,
      tokens: user.tokens,
      preferred_ai_provider: user.preferred_ai_provider,
      preferred_ai_model: user.preferred_ai_model,
      timezone: user.timezone,
      plan_expiry: user.plan_expiry
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// ========================================
// BRANDS ROUTES
// ========================================

// Get user brands
app.get('/api/brands', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM brands WHERE user_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get brands error:', error);
    res.status(500).json({ error: 'Failed to get brands' });
  }
});

// Create brand
app.post('/api/brands', authenticate, async (req, res) => {
  const { brand_name, timezone } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO brands (user_id, brand_name, timezone)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [req.userId, brand_name, timezone || 'Africa/Lagos']
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Create brand error:', error);
    res.status(500).json({ error: 'Failed to create brand' });
  }
});

// Update brand
app.put('/api/brands/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const fields = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');
    
    const values = Object.values(updates);

    const result = await pool.query(
      `UPDATE brands SET ${fields}, updated_at = NOW()
       WHERE id = $1 AND user_id = $${values.length + 2}
       RETURNING *`,
      [id, ...values, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Brand not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update brand error:', error);
    res.status(500).json({ error: 'Failed to update brand' });
  }
});

// ========================================
// EVENTS ROUTES
// ========================================

// Get brand events
app.get('/api/events/:brandId', authenticate, async (req, res) => {
  const { brandId } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM events WHERE brand_id = $1 AND user_id = $2 ORDER BY event_date ASC',
      [brandId, req.userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Failed to get events' });
  }
});

// Create event
app.post('/api/events', authenticate, async (req, res) => {
  const { brand_id, title, description, event_date } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO events (brand_id, user_id, title, description, event_date)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [brand_id, req.userId, title, description, event_date]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Update event
app.put('/api/events/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { title, description, event_date } = req.body;

  try {
    const result = await pool.query(
      `UPDATE events 
       SET title = $1, description = $2, event_date = $3, updated_at = NOW()
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [title, description, event_date, id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// Delete event
app.delete('/api/events/:id', authenticate, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM events WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// ========================================
// CONTENT ITEMS ROUTES
// ========================================

// Get content items
app.get('/api/content/:brandId', authenticate, async (req, res) => {
  const { brandId } = req.params;
  const { month } = req.query;

  try {
    let query = 'SELECT * FROM content_items WHERE brand_id = $1 AND user_id = $2';
    const params = [brandId, req.userId];

    if (month) {
      query += ' AND content_date >= $3 AND content_date < $4';
      const startDate = `${month}-01`;
      const endDate = new Date(month + '-01');
      endDate.setMonth(endDate.getMonth() + 1);
      params.push(startDate, endDate.toISOString().split('T')[0]);
    }

    query += ' ORDER BY content_date ASC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get content error:', error);
    res.status(500).json({ error: 'Failed to get content' });
  }
});

// Create content item
app.post('/api/content', authenticate, async (req, res) => {
  const { brand_id, content_date, channel, title, brief, expanded_brief, user_notes } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO content_items (brand_id, user_id, content_date, channel, title, brief, expanded_brief, user_notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [brand_id, req.userId, content_date, channel, title, brief, expanded_brief, user_notes]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Create content error:', error);
    res.status(500).json({ error: 'Failed to create content' });
  }
});

// Update content item
app.put('/api/content/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const fields = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');
    
    const values = Object.values(updates);

    const result = await pool.query(
      `UPDATE content_items SET ${fields}, updated_at = NOW()
       WHERE id = $1 AND user_id = $${values.length + 2}
       RETURNING *`,
      [id, ...values, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Content not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update content error:', error);
    res.status(500).json({ error: 'Failed to update content' });
  }
});

// ========================================
// TOKENS ROUTES
// ========================================

// Deduct tokens
app.post('/api/tokens/deduct', authenticate, async (req, res) => {
  const { amount } = req.body;

  try {
    const result = await pool.query(
      `UPDATE users
       SET tokens = GREATEST(tokens - $1, 0), updated_at = NOW()
       WHERE id = $2
       RETURNING tokens`,
      [amount, req.userId]
    );

    res.json({ tokens: result.rows[0].tokens });
  } catch (error) {
    console.error('Deduct tokens error:', error);
    res.status(500).json({ error: 'Failed to deduct tokens' });
  }
});

// ========================================
// ADMIN ROUTES
// ========================================
app.get('/api/admin/stats', authenticate, ensureAdmin, async (req, res) => {
  try {
    const userStats = await pool.query(`
      SELECT
        COUNT(*)::int AS total_users,
        COUNT(*) FILTER (WHERE plan = 'free')::int AS free_users,
        COUNT(*) FILTER (WHERE plan <> 'free')::int AS paid_users,
        COALESCE(SUM(tokens), 0)::int AS tokens_distributed
      FROM users
    `);

    const [brands, events, content] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS total_brands FROM brands'),
      pool.query('SELECT COUNT(*)::int AS total_events FROM events'),
      pool.query('SELECT COUNT(*)::int AS total_content FROM content_items')
    ]);

    const statsRow = userStats.rows[0] || {};

    res.json({
      stats: {
        total_users: statsRow.total_users || 0,
        free_users: statsRow.free_users || 0,
        paid_users: statsRow.paid_users || 0,
        tokens_distributed: statsRow.tokens_distributed || 0,
        total_brands: brands.rows[0]?.total_brands || 0,
        total_events: events.rows[0]?.total_events || 0,
        total_content: content.rows[0]?.total_content || 0
      }
    });
  } catch (error) {
    console.error('Failed to fetch admin stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

app.get('/api/admin/users', authenticate, ensureAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, plan, tokens, plan_expiry, preferred_ai_provider, preferred_ai_model, timezone, last_token_reset
       FROM users
       ORDER BY created_at DESC`
    );

    res.json({ users: result.rows });
  } catch (error) {
    console.error('Failed to fetch users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.patch('/api/admin/users/:id', authenticate, ensureAdmin, async (req, res) => {
  const { plan, tokens, plan_expiry, preferred_ai_provider, preferred_ai_model } = req.body || {};
  const updates = [];
  const values = [];
  let index = 1;

  if (plan) {
    updates.push(`plan = $${index++}`);
    values.push(plan);
  }
  if (typeof tokens === 'number') {
    updates.push(`tokens = $${index++}`);
    values.push(tokens);
  }
  if (plan_expiry) {
    updates.push(`plan_expiry = $${index++}`);
    values.push(new Date(plan_expiry).toISOString());
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
    return res.json({ success: true });
  }

  updates.push('updated_at = NOW()');
  values.push(req.params.id);

  try {
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${index}`, values);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to update user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

app.delete('/api/admin/users/:id', authenticate, ensureAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

app.post('/api/admin/users/:id/tokens', authenticate, ensureAdmin, async (req, res) => {
  const amount = Number(req.body.amount) || 0;
  if (amount <= 0) {
    return res.status(400).json({ error: 'Amount must be greater than zero' });
  }

  try {
    const result = await pool.query(
      `UPDATE users
         SET tokens = tokens + $1, updated_at = NOW()
       WHERE id = $2
       RETURNING tokens`,
      [amount, req.params.id]
    );

    res.json({ success: true, tokens: result.rows[0]?.tokens || null });
  } catch (error) {
    console.error('Failed to add tokens:', error);
    res.status(500).json({ error: 'Failed to add tokens' });
  }
});

app.post('/api/admin/tokens/reset', authenticate, ensureAdmin, async (req, res) => {
  const { plan, amount } = req.body || {};
  if (!plan) {
    return res.status(400).json({ error: 'Plan is required' });
  }

  const resetAmount = Number(amount) || 0;

  try {
    await pool.query(
      `UPDATE users
         SET tokens = $1, updated_at = NOW()
       WHERE plan = $2`,
      [resetAmount, plan]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to reset tokens:', error);
    res.status(500).json({ error: 'Failed to reset tokens' });
  }
});

app.get('/api/admin/config', authenticate, ensureAdmin, async (req, res) => {
  try {
    const [plans, models, currencySettings] = await Promise.all([
      fetchPricingPlans(),
      fetchAIModels(),
      fetchCurrencySettings()
    ]);

    res.json({
      available_models: models,
      pricing_plans: plans,
      currency_settings: currencySettings,
      system_limits: computeSystemLimitsFromPlans(plans)
    });
  } catch (error) {
    console.error('Failed to load admin config:', error);
    res.status(500).json({ error: 'Failed to load admin configuration' });
  }
});

app.put('/api/admin/models', authenticate, ensureAdmin, async (req, res) => {
  const { models } = req.body || {};

  if (!Array.isArray(models)) {
    return res.status(400).json({ error: 'Models must be an array' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM ai_models');

    for (let i = 0; i < models.length; i++) {
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
    res.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to update AI models:', error);
    res.status(500).json({ error: 'Failed to update AI models' });
  } finally {
    client.release();
  }
});

app.put('/api/admin/config/currency', authenticate, ensureAdmin, async (req, res) => {
  const { default_currency, exchange_rate } = req.body || {};
  const currency = default_currency === 'USD' ? 'USD' : 'NGN';
  const rate = Number(exchange_rate) || DEFAULT_EXCHANGE_RATE;
  const normalizedRate = rate > 0 ? rate : DEFAULT_EXCHANGE_RATE;

  try {
    await pool.query(
      `INSERT INTO admin_settings (id, default_currency, exchange_rate, updated_at)
       VALUES (1, $1, $2, NOW())
       ON CONFLICT (id)
       DO UPDATE SET default_currency = EXCLUDED.default_currency, exchange_rate = EXCLUDED.exchange_rate, updated_at = NOW()`,
      [currency, normalizedRate]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to update currency settings:', error);
    res.status(500).json({ error: 'Failed to update currency settings' });
  }
});

app.put('/api/admin/config/system-limits', authenticate, ensureAdmin, async (req, res) => {
  const { limits } = req.body || {};

  if (!limits || typeof limits !== 'object') {
    return res.status(400).json({ error: 'limits must be provided' });
  }

  try {
    const planEntries = Object.entries(limits);
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

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to update system limits:', error);
    res.status(500).json({ error: 'Failed to update system limits' });
  }
});

app.put('/api/admin/pricing/:planId', authenticate, ensureAdmin, async (req, res) => {
  const { planId } = req.params;
  const { name, price_ngn, price_usd, tokens, max_brands, features, is_popular, sort_order } = req.body || {};

  const fallbackPlan = DEFAULT_PRICING_PLANS.find((plan) => plan.id === planId);
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
    const result = await pool.query(
      `INSERT INTO pricing_plans (plan_id, name, price_ngn, price_usd, tokens, max_brands, features, is_popular, sort_order, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
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

    res.json({ plan: toPricingPlan(result.rows[0]) });
  } catch (error) {
    console.error('Failed to update pricing plan:', error);
    res.status(500).json({ error: 'Failed to update pricing plan' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Andora API Server' });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   Andora API Server Started! 🚀       ║
╚════════════════════════════════════════╝

Port: ${PORT}
Database: PostgreSQL (Direct)
Status: Ready to accept requests

API Endpoints:
- POST /api/auth/register
- POST /api/auth/login
- GET  /api/auth/me
- GET  /api/brands
- POST /api/brands
- PUT  /api/brands/:id
- GET  /api/events/:brandId
- POST /api/events
- PUT  /api/events/:id
- DELETE /api/events/:id
- GET  /api/content/:brandId
- POST /api/content
- PUT  /api/content/:id
- POST /api/tokens/deduct
`);
});
