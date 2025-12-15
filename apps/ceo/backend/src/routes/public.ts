import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

// Default pricing plans
const PRICING_PLANS = [
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
    price_usd: 3,
    tokens: 15000,
    max_brands: 1,
    features: ['Automated content calendar', 'AI content generation', 'Email support']
  },
  {
    id: 'basic',
    name: 'Basic',
    price_ngn: 10000,
    price_usd: 7,
    tokens: 34000,
    max_brands: 1,
    features: ['Advanced AI workflows', 'Content calendar insights', 'Team collaboration (2 seats)']
  },
  {
    id: 'pro',
    name: 'Pro',
    price_ngn: 25000,
    price_usd: 17,
    tokens: 90000,
    max_brands: 3,
    features: ['AI chat copilot', 'Up to 3 brands', 'Priority support'],
    is_popular: true
  },
  {
    id: 'agency',
    name: 'Agency',
    price_ngn: 50000,
    price_usd: 33,
    tokens: 200000,
    max_brands: 10,
    features: ['White-label options', 'Up to 10 brands', '5 team seats', 'Dedicated account manager']
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price_ngn: 0,
    price_usd: 0,
    tokens: 0,
    max_brands: 999,
    features: ['Custom AI models', 'Unlimited brands', 'Unlimited team seats', 'Custom integrations'],
    cta: 'Contact Sales'
  }
];

const DEFAULT_EXCHANGE_RATE = 1500; // NGN per USD

export default async function publicRoutes(fastify: FastifyInstance) {
  // Get public pricing information
  fastify.get('/pricing', async (req: FastifyRequest, res: FastifyReply): Promise<void> => {
    try {
      res.send({
        plans: PRICING_PLANS,
        currency: 'NGN',
        exchange_rate: DEFAULT_EXCHANGE_RATE
      });
    } catch (error) {
      console.error('Error fetching pricing:', error);
      res.status(500).send({ error: 'Failed to fetch pricing' });
    }
  });
}
