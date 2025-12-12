import { PricingPlan } from '../types';

export const DEFAULT_EXCHANGE_RATE = 1500; // NGN per USD fallback when no admin setting

const withUsd = (priceNgn: number) => {
  if (priceNgn === 0) {
    return 0;
  }
  return Math.max(1, Math.round(priceNgn / DEFAULT_EXCHANGE_RATE));
};

export const ANDORA_PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price_ngn: 0,
    price_usd: 0,
    tokens: 2500,
    max_brands: 1,
    features: ['AI-assisted idea prompts', 'Community templates', 'Single brand workspace']
  },
  {
    id: 'starter',
    name: 'Starter',
    price_ngn: 5000,
    price_usd: withUsd(5000),
    tokens: 15000,
    max_brands: 1,
    features: ['Automated content calendar', 'AI content generation', 'Email support']
  },
  {
    id: 'basic',
    name: 'Basic',
    price_ngn: 10000,
    price_usd: withUsd(10000),
    tokens: 34000,
    max_brands: 1,
    features: ['Advanced AI workflows', 'Content calendar insights', 'Team collaboration (2 seats)']
  },
  {
    id: 'pro',
    name: 'Pro',
    price_ngn: 25000,
    price_usd: withUsd(25000),
    tokens: 90000,
    max_brands: 3,
    features: ['AI chat copilot', 'Up to 3 brands', 'Priority support'],
    is_popular: true
  },
  {
    id: 'standard',
    name: 'Standard',
    price_ngn: 50000,
    price_usd: withUsd(50000),
    tokens: 200000,
    max_brands: 3,
    features: ['Advanced analytics', 'Campaign performance reports', 'Priority support'],
    is_popular: true
  },
  {
    id: 'premium',
    name: 'Premium',
    price_ngn: 125000,
    price_usd: withUsd(125000),
    tokens: 600000,
    max_brands: -1, // Unlimited
    features: ['Unlimited brands', 'Full AI suite', 'Premium success manager']
  },
  {
    id: 'ultimate',
    name: 'Ultimate',
    price_ngn: 250000,
    price_usd: withUsd(250000),
    tokens: 1300000,
    max_brands: -1, // Unlimited
    features: ['Unlimited brands', 'Advanced AI automations', 'Agency-focused tooling']
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price_ngn: 500000,
    price_usd: withUsd(500000),
    tokens: 2800000,
    max_brands: -1, // Unlimited
    features: ['Unlimited everything', 'Custom AI models', 'Dedicated enterprise support']
  }
];

export const ANDORA_PLAN_LOOKUP = ANDORA_PRICING_PLANS.reduce<Record<string, PricingPlan>>((acc, plan) => {
  acc[plan.id] = plan;
  return acc;
}, {});

export const ANDORA_CHAR_LIMITS = {
  taglines: 300,              // Allow for multiple tagline variations
  about: 1000,                // Foundation for AI context - needs depth
  vision: 600,                // Strategic statements need room to breathe
  mission: 600,               // Same as vision for consistency
  products: 2000,             // Multiple products with detailed descriptions
  persona: 1000,              // Richer persona = better content voice
  buyer_profile: 1000,        // Detailed audience = more targeted content
  colors: 250,                // Allow for color palette descriptions
  brand_hq_location: 150,     // Room for location context
  narrative_why: 800,         // Core emotional driver needs space
  narrative_problem: 800,     // Detailed problem = resonant content
  narrative_solution: 800,    // Solution narrative matters for storytelling
  narrative_cta: 400,         // Compelling CTAs need room
  narrative_failure: 600,     // Storytelling stakes
  narrative_success: 600      // Vision of transformation
};

export const CHANNEL_OPTIONS = [
  'Facebook',
  'Instagram',
  'X',
  'LinkedIn',
  'TikTok',
  'YouTube',
  'Pinterest',
  'Blog',
  'Email',
  'WhatsApp'
];

export const CONTENT_TYPE_OPTIONS = [
  'Graphic Design',
  'Image Carousel',
  'Reel (Interview)',
  'Reel (Short Play)',
  'Blog Post',
  'Infographic',
  'Text & Image',
  'Video',
  'Story',
  'Article',
  'Poll',
  'Live Stream'
];

export const DAYS_OF_WEEK = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
];