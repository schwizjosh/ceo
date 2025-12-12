import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../common/Button';
import { PyAvatar } from '../common/PyAvatar';
import { ArrowLeft, Check } from 'lucide-react';
import { ANDORA_PRICING_PLANS, DEFAULT_EXCHANGE_RATE } from '../../utils/constants';
import { pricingService, PublicPricingResponse } from '../../services/pricingService';
import { CurrencyCode, PricingPlan } from '../../types';

const YEARLY_DISCOUNT = 0.9; // 10% discount when billed yearly
const BILLING_CYCLES = {
  monthly: { label: 'Monthly', multiplier: 1 },
  yearly: { label: 'Yearly', multiplier: 12 }
} as const;

interface PricingPageProps {
  onBack?: () => void;
  onGetStarted?: () => void;
  onContactSales?: () => void;
}

export const PricingPage: React.FC<PricingPageProps> = ({ onBack, onGetStarted, onContactSales }) => {
  const navigate = useNavigate();
  const handleBack = onBack || (() => navigate('/'));
  const handleGetStarted = onGetStarted || (() => navigate('/register'));
  const handleContactSales =
    onContactSales || (() => window.open('https://wa.me/2347069719374', '_blank'));
  const [billingCycle, setBillingCycle] = React.useState<'monthly' | 'yearly'>('monthly');
  const [currency, setCurrency] = React.useState<CurrencyCode>('NGN');
  const [pricingData, setPricingData] = React.useState<PublicPricingResponse>({
    plans: ANDORA_PRICING_PLANS,
    currency: 'NGN',
    exchange_rate: DEFAULT_EXCHANGE_RATE
  });
  const [loadingPlans, setLoadingPlans] = React.useState(true);
  const isYearly = billingCycle === 'yearly';

  React.useEffect(() => {
    let isMounted = true;

    const loadPricing = async () => {
      const data = await pricingService.getPublicPricing();
      if (isMounted) {
        setPricingData(data);
        setCurrency(data.currency);
        setLoadingPlans(false);
      }
    };

    loadPricing();

    return () => {
      isMounted = false;
    };
  }, []);

  const plans = React.useMemo<PricingPlan[]>(() => {
    const sorted = [...pricingData.plans].sort((a, b) => {
      if (typeof a.sort_order === 'number' && typeof b.sort_order === 'number') {
        return a.sort_order - b.sort_order;
      }
      if (typeof a.sort_order === 'number') return -1;
      if (typeof b.sort_order === 'number') return 1;
      const priceA = currency === 'USD' ? a.price_usd : a.price_ngn;
      const priceB = currency === 'USD' ? b.price_usd : b.price_ngn;
      return priceA - priceB;
    });
    return sorted;
  }, [pricingData.plans, currency]);

  const exchangeRate = pricingData.exchange_rate || DEFAULT_EXCHANGE_RATE;

  return (
    <div className="min-h-screen bg-[#f8f6f2] text-slate-900">
      <header className="border-b border-slate-200 bg-[#f8f6f2]/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
          <div className="flex items-center gap-3">
            <Button onClick={handleBack} variant="ghost" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="hidden items-center gap-3 md:flex">
              <PyAvatar size="sm" className="ring-2 ring-slate-200" />
              <span className="font-display text-lg font-semibold tracking-tight">Py</span>
            </div>
          </div>
          <Button size="sm" onClick={handleGetStarted}>
            Start working with him
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-16">
        <section className="mb-16 space-y-6">
          <div className="eyebrow">Pricing</div>
          <h1 className="font-display text-4xl font-semibold sm:text-5xl">
            Invest in the agent who knows your strategy best.
          </h1>
          <p className="max-w-2xl text-base text-slate-600">
            Every plan gives you direct access to Py—your personified teammate who plans, writes, and analyses your company's strategy.
            Choose how closely you want him to work with your team.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" onClick={handleGetStarted} className="w-full sm:w-auto">
              Begin a session
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={handleContactSales}
              className="w-full sm:w-auto"
            >
              Talk to our team
            </Button>
          </div>
        </section>

        <section className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-3">
            {(['NGN', 'USD'] as CurrencyCode[]).map((code) => {
              const isActive = currency === code;
              return (
                <button
                  key={code}
                  onClick={() => setCurrency(code)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 text-slate-600 hover:border-slate-900 hover:text-slate-900'
                  }`}
                >
                  {code === 'NGN' ? '₦ NGN' : '$ USD'}
                </button>
              );
            })}
          </div>
          <div className="text-xs text-slate-500">
            <p>Exchange rate: ₦{exchangeRate.toLocaleString()} ≈ $1</p>
          </div>
        </section>

        <section className="mb-16 flex flex-wrap gap-3">
          {(Object.keys(BILLING_CYCLES) as Array<'monthly' | 'yearly'>).map((cycle) => {
            const isActive = billingCycle === cycle;
            return (
              <button
                key={cycle}
                onClick={() => setBillingCycle(cycle)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 text-slate-600 hover:border-slate-900 hover:text-slate-900'
                }`}
              >
                {BILLING_CYCLES[cycle].label}
                {cycle === 'yearly' && (
                  <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                    Save 10%
                  </span>
                )}
              </button>
            );
          })}
        </section>

        <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => {
            const isPopular = plan.is_popular || plan.id === 'pro' || plan.id === 'standard';
            const cycleMultiplier = BILLING_CYCLES[billingCycle].multiplier;
            const basePrice = currency === 'USD' ? plan.price_usd : plan.price_ngn;
            const rawPrice = basePrice * cycleMultiplier * (isYearly && basePrice > 0 ? YEARLY_DISCOUNT : 1);
            const billedAmount = basePrice === 0 ? 0 : Math.round(rawPrice);
            const displaySuffix = basePrice === 0 ? '' : isYearly ? '/ year' : '/ month';
            const cycleTokens = plan.tokens * cycleMultiplier;
            const monthlyEquivalent = isYearly && basePrice > 0 ? Math.round(billedAmount / 12) : null;
            const currencySymbol = currency === 'USD' ? '$' : '₦';

            return (
              <div
                key={plan.id}
                className={`flex h-full flex-col rounded-3xl border bg-white p-6 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.55)] ${
                  isPopular ? 'border-slate-900' : 'border-slate-200'
                }`}
              >
                <div className="mb-6">
                  <h3 className="font-display text-2xl font-semibold capitalize text-slate-900">{plan.name}</h3>
                  <p className="mt-2 text-sm text-slate-500">{plan.description}</p>
                </div>

                <div className="mb-6">
                  <span className="font-display text-4xl text-slate-900">
                    {basePrice === 0 ? 'Free' : `${currencySymbol}${billedAmount.toLocaleString()}`}
                  </span>
                  {basePrice > 0 && <span className="ml-2 text-sm text-slate-500">{displaySuffix}</span>}
                  {isYearly && basePrice > 0 && monthlyEquivalent && (
                    <p className="mt-1 text-xs text-slate-500">
                      ≈ {currencySymbol}{monthlyEquivalent.toLocaleString()}/month billed annually
                    </p>
                  )}
                </div>

                <ul className="mb-8 space-y-3 text-sm text-slate-600">
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 text-slate-400" />
                    <span>
                      {plan.max_brands === -1 ? 'Unlimited' : plan.max_brands} Companies{plan.max_brands !== 1 ? '' : ''}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 text-slate-400" />
                    <span>{cycleTokens.toLocaleString()} strategy tokens per {isYearly ? 'year' : 'month'}</span>
                  </li>
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 text-slate-400" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto flex flex-col gap-3">
                  <Button onClick={handleGetStarted}>Choose plan</Button>
                  <Button variant="outline" onClick={handleContactSales}>
                    Ask Py about this plan
                  </Button>
                </div>
              </div>
            );
          })}
          {loadingPlans && (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
              Fetching the latest pricing from Py’s desk...
            </div>
          )}
        </section>

        <section className="mt-20 grid gap-10 rounded-3xl border border-slate-200 bg-white p-8 md:grid-cols-2 md:p-12">
          <div className="space-y-4">
            <h2 className="font-display text-3xl font-semibold">What changes as you scale.</h2>
            <p className="text-sm text-slate-600">
              Higher tiers unlock deeper rituals with Py—more strategic sessions, richer company libraries, and dedicated time reserved just for your team.
            </p>
          </div>
          <ul className="space-y-3 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 text-slate-400" />
              Access to collaborative workrooms for long-form campaigns.
            </li>
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 text-slate-400" />
              Extended review cycles where he tracks performance and recommends next actions.
            </li>
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 text-slate-400" />
              Priority support from the humans at Raysource Labs.
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
};
