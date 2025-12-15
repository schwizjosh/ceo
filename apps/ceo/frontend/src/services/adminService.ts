import { AdminConfig, CurrencySettings, PricingPlan, SystemLimits, User, UserStats } from '../types';
import { ANDORA_PRICING_PLANS, DEFAULT_EXCHANGE_RATE } from '../utils/constants';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    throw new Error('Not authenticated');
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  } satisfies HeadersInit;
};

const normalizeDate = (value: string | null): Date | undefined => {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const normalizePlan = (plan: any): PricingPlan => {
  const coerceFeatures = (features: unknown): string[] => {
    if (Array.isArray(features)) {
      return features.map(feature => String(feature));
    }
    if (typeof features === 'string') {
      return features
        .split(/\r?\n/)
        .map(feature => feature.trim())
        .filter(Boolean);
    }
    return [];
  };

  return {
    id: plan.id,
    name: plan.name,
    price_ngn: Number(plan.price_ngn) || 0,
    price_usd: Number(plan.price_usd) || 0,
    tokens: Number(plan.tokens) || 0,
    max_brands: typeof plan.max_brands === 'number' ? plan.max_brands : Number(plan.max_brands) || 0,
    features: coerceFeatures(plan.features),
    is_popular: plan.is_popular ?? false,
    sort_order: plan.sort_order ?? null
  };
};

const fallbackCurrencySettings: CurrencySettings = {
  default_currency: 'NGN',
  exchange_rate: DEFAULT_EXCHANGE_RATE
};

const computeSystemLimits = (plans: PricingPlan[]): SystemLimits => {
  return plans.reduce<SystemLimits>((limits, plan) => {
    limits[plan.id] = {
      tokens: plan.tokens,
      max_brands: plan.max_brands
    };
    return limits;
  }, {} as SystemLimits);
};

class AdminService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
          ...(options.headers || {}),
          ...getAuthHeaders()
        }
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const message = errorBody.error || errorBody.message || 'Admin request failed';
        throw new Error(message);
      }

      if (response.status === 204) {
        return undefined as T;
      }

      return response.json() as Promise<T>;
    } catch (error) {
      console.error(`Admin request failed (${endpoint}):`, error);
      throw error;
    }
  }

  private withFallbackPlans(plans?: PricingPlan[]): PricingPlan[] {
    return plans && plans.length > 0 ? plans : ANDORA_PRICING_PLANS;
  }

  async getAllUsers(): Promise<User[]> {
    try {
      const data = await this.request<{ users: any[] }>('/admin/users');
      return data.users.map((user) => ({
        user_id: user.id,
        email: user.email,
        plan: user.plan,
        tokens: user.tokens,
        plan_expiry: normalizeDate(user.plan_expiry),
        last_token_reset: normalizeDate(user.last_token_reset),
        preferred_ai_provider: user.preferred_ai_provider || 'openai',
        preferred_ai_model: user.preferred_ai_model || 'gpt-4o',
        timezone: user.timezone
      }));
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<boolean> {
    try {
      const payload: Record<string, unknown> = {};

      if (updates.plan) payload.plan = updates.plan;
      if (typeof updates.tokens === 'number') payload.tokens = updates.tokens;
      if ('plan_expiry' in updates) {
        if (updates.plan_expiry === null) {
          payload.plan_expiry = null;
        } else if (updates.plan_expiry) {
          payload.plan_expiry = updates.plan_expiry instanceof Date
            ? updates.plan_expiry.toISOString()
            : new Date(updates.plan_expiry).toISOString();
        }
      }
      if (updates.preferred_ai_provider) payload.preferred_ai_provider = updates.preferred_ai_provider;
      if (updates.preferred_ai_model) payload.preferred_ai_model = updates.preferred_ai_model;

      if (Object.keys(payload).length === 0) {
        return true;
      }

      await this.request(`/admin/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
      return true;
    } catch (error) {
      console.error('Error updating user:', error);
      return false;
    }
  }

  async deleteUser(userId: string): Promise<boolean> {
    try {
      await this.request(`/admin/users/${userId}`, {
        method: 'DELETE'
      });
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }

  async addTokensToUser(userId: string, amount: number): Promise<boolean> {
    try {
      await this.request(`/admin/users/${userId}/tokens`, {
        method: 'POST',
        body: JSON.stringify({ amount })
      });
      return true;
    } catch (error) {
      console.error('Error adding tokens:', error);
      return false;
    }
  }

  async resetAllUserTokens(plan: string, resetAmount: number): Promise<boolean> {
    try {
      await this.request('/admin/tokens/reset', {
        method: 'POST',
        body: JSON.stringify({ plan, amount: resetAmount })
      });
      return true;
    } catch (error) {
      console.error('Error resetting tokens:', error);
      return false;
    }
  }

  async getUserStats(): Promise<UserStats> {
    try {
      const data = await this.request<{ stats: UserStats }>('/admin/stats');
      return data.stats;
    } catch (error) {
      console.error('Error fetching stats:', error);
      return {
        total_users: 0,
        free_users: 0,
        paid_users: 0,
        total_brands: 0,
        total_events: 0,
        total_content: 0,
        tokens_distributed: 0
      };
    }
  }

  async getAdminConfig(): Promise<AdminConfig> {
    try {
      const data = await this.request<{
        available_models: AdminConfig['available_models'];
        pricing_plans: PricingPlan[];
        currency_settings: CurrencySettings;
      }>('/admin/config');

      const plans = this.withFallbackPlans(data.pricing_plans?.map(normalizePlan));
      const systemLimits = computeSystemLimits(plans);

      return {
        available_models: data.available_models,
        pricing_plans: plans,
        currency_settings: data.currency_settings ?? fallbackCurrencySettings,
        system_limits: systemLimits
      };
    } catch (error) {
      console.error('Error loading admin config:', error);
      const plans = ANDORA_PRICING_PLANS;
      return {
        available_models: [
          {
            id: 'gpt-4o',
            name: 'GPT-4o',
            provider: 'openai',
            enabled: true,
            description: 'Flagship reasoning model for production workloads.'
          },
          {
            id: 'gpt-4o-mini',
            name: 'GPT-4o Mini',
            provider: 'openai',
            enabled: true,
            description: 'Cost-efficient GPT-4o variant for lightweight tasks.'
          },
          {
            id: 'o3-mini',
            name: 'o3 Mini',
            provider: 'openai',
            enabled: true,
            description: 'Optimized reasoning model for structured planning.'
          },
          {
            id: 'claude-3-5-sonnet',
            name: 'Claude 3.5 Sonnet',
            provider: 'claude',
            enabled: true,
            description: 'Anthropic’s balanced flagship model for creative work.'
          },
          {
            id: 'claude-3-opus',
            name: 'Claude 3 Opus',
            provider: 'claude',
            enabled: true,
            description: 'High-performing model for long-form strategic content.'
          }
        ],
        pricing_plans: plans,
        currency_settings: fallbackCurrencySettings,
        system_limits: computeSystemLimits(plans)
      };
    }
  }

  async updateAdminConfig(config: Partial<AdminConfig>): Promise<boolean> {
    try {
      if (config.available_models) {
        await this.request('/admin/models', {
          method: 'PUT',
          body: JSON.stringify({ models: config.available_models })
        });
      }

      if (config.currency_settings) {
        await this.request('/admin/config/currency', {
          method: 'PUT',
          body: JSON.stringify(config.currency_settings)
        });
      }

      return true;
    } catch (error) {
      console.error('Error updating admin config:', error);
      return false;
    }
  }

  async updateSystemLimits(limits: SystemLimits): Promise<boolean> {
    try {
      await this.request('/admin/config/system-limits', {
        method: 'PUT',
        body: JSON.stringify({ limits })
      });
      return true;
    } catch (error) {
      console.error('Error updating system limits:', error);
      return false;
    }
  }

  async updatePricingPlan(planId: string, updates: Partial<PricingPlan>): Promise<PricingPlan | null> {
    try {
      const data = await this.request<{ plan: PricingPlan }>(`/admin/pricing/${planId}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      return normalizePlan(data.plan);
    } catch (error) {
      console.error('Error updating pricing plan:', error);
      return null;
    }
  }
}

export const adminService = new AdminService();
