import { PricingPlan, CurrencySettings } from '../types';
import { ANDORA_PRICING_PLANS, DEFAULT_EXCHANGE_RATE } from '../utils/constants';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface PublicPricingResponse {
  plans: PricingPlan[];
  currency: CurrencySettings['default_currency'];
  exchange_rate: number;
}

const fallbackResponse: PublicPricingResponse = {
  plans: ANDORA_PRICING_PLANS,
  currency: 'NGN',
  exchange_rate: DEFAULT_EXCHANGE_RATE
};

const normalizePlan = (plan: PricingPlan): PricingPlan => ({
  ...plan,
  price_ngn: plan.price_ngn ?? 0,
  price_usd: plan.price_usd ?? 0,
  tokens: plan.tokens ?? 0,
  max_brands: plan.max_brands ?? 0,
  features: Array.isArray(plan.features)
    ? plan.features
    : typeof plan.features === 'string'
      ? plan.features.split(/\r?\n/).map(feature => feature.trim()).filter(Boolean)
      : []
});

export const pricingService = {
  async getPublicPricing(): Promise<PublicPricingResponse> {
    try {
      const response = await fetch(`${API_URL}/public/pricing`);
      if (!response.ok) {
        throw new Error('Failed to load pricing');
      }

      const data = await response.json();
      const plans = Array.isArray(data.plans)
        ? data.plans.map(normalizePlan)
        : fallbackResponse.plans;

      return {
        plans,
        currency: data.currency === 'USD' ? 'USD' : 'NGN',
        exchange_rate: typeof data.exchange_rate === 'number' && data.exchange_rate > 0
          ? data.exchange_rate
          : DEFAULT_EXCHANGE_RATE
      };
    } catch (error) {
      console.error('Failed to fetch pricing:', error);
      return fallbackResponse;
    }
  }
};

export type { PublicPricingResponse };
