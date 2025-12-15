import React from 'react';
import { Button } from '../common/Button';
import { ANDORA_PRICING_PLANS, DEFAULT_EXCHANGE_RATE } from '../../utils/constants';
import { Crown, Zap, Check, MessageCircle, ArrowLeft } from 'lucide-react';
import { CurrencyCode, PricingPlan, User } from '../../types';
import { useNavigate } from 'react-router-dom';

interface TokensPageProps {
  user: User | null;
  pricingPlans: PricingPlan[];
  currency: CurrencyCode;
  exchangeRate: number;
}

export const TokensPage: React.FC<TokensPageProps> = ({
  user,
  pricingPlans,
  currency,
  exchangeRate
}) => {
  const navigate = useNavigate();
  const plans = pricingPlans.length > 0 ? pricingPlans : ANDORA_PRICING_PLANS;
  const normalizedExchangeRate = exchangeRate > 0 ? exchangeRate : DEFAULT_EXCHANGE_RATE;
  const currentPlan = user?.plan || 'free';

  const formatPriceSummary = (plan: PricingPlan) => {
    if (plan.price_ngn === 0) {
      return 'Free';
    }

    const ngnLabel = `₦${plan.price_ngn.toLocaleString()}`;
    const usdLabel = plan.price_usd > 0
      ? `$${plan.price_usd.toLocaleString()}`
      : `$${Math.max(1, Math.round(plan.price_ngn / normalizedExchangeRate)).toLocaleString()}`;

    if (currency === 'USD') {
      return `${usdLabel} (≈ ${ngnLabel})`;
    }
    return `${ngnLabel} (≈ ${usdLabel})`;
  };

  const handlePurchase = (plan: PricingPlan) => {
    const formattedPrice = formatPriceSummary(plan);
    const message = encodeURIComponent(
      `Hi! I'd like to purchase the ${plan.name} plan for ${formattedPrice} (${plan.tokens.toLocaleString()} tokens). Please let me know how to proceed with payment.`
    );

    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const formatTokens = (tokens: number) => tokens.toLocaleString();
  const formatMaxBrands = (maxBrands: number) => (maxBrands === -1 ? 'Unlimited' : maxBrands.toString());

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Back Button */}
      <button
        onClick={() => navigate('/dashboard/settings')}
        className="flex items-center text-slate-600 hover:text-slate-900 mb-6 transition-colors"
      >
        <ArrowLeft size={20} className="mr-2" />
        Back to Settings
      </button>

      {/* Page Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-primary-900 mb-2">Buy More Tokens</h1>
        <p className="text-slate-600 mb-4">
          Select a plan to upgrade your account. All purchases are processed via WhatsApp.
        </p>
        <p className="text-xs text-slate-500">
          Prices shown in {currency === 'USD' ? 'US Dollars' : 'Nigerian Naira'} using an exchange rate of
          {' '}₦{normalizedExchangeRate.toLocaleString()} ≈ $1.
        </p>
        <div className="flex items-center justify-center space-x-2 text-sm text-accent-300 mt-2">
          <MessageCircle size={16} />
          <span>Secure payment via WhatsApp</span>
        </div>
      </div>

      {/* Current Balance */}
      {user && (
        <div className="max-w-md mx-auto mb-8 neural-glow p-6 rounded-lg border border-primary-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Current Balance</p>
              <p className="text-2xl font-bold text-primary-800">{user.tokens} tokens</p>
            </div>
            <Zap size={32} className="text-primary-400" />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Plan: <span className="font-semibold capitalize">{user.plan}</span>
          </p>
        </div>
      )}

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrentPlan = plan.id === currentPlan;
          const isPopular = plan.is_popular || plan.id === 'pro';

          return (
            <div
              key={plan.id}
              className={`relative glass-effect rounded-lg p-6 border-2 transition-all duration-300 ${
                isCurrentPlan
                  ? 'border-green-500/50 bg-green-500/10'
                  : isPopular
                  ? 'border-primary-500/50 bg-primary-500/10'
                  : 'border-primary-200/60 hover:border-primary-400/50'
              }`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-primary-600 to-purple-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                    Most Popular
                  </div>
                </div>
              )}

              {isCurrentPlan && (
                <div className="absolute -top-3 right-3">
                  <div className="bg-green-500 text-white p-1 rounded-full">
                    <Check size={12} />
                  </div>
                </div>
              )}

              <div className="text-center mb-4">
                <div className="flex items-center justify-center mb-2">
                  <Crown className="w-6 h-6 text-accent-400 mr-2" />
                  <h3 className="text-lg font-semibold text-primary-900 capitalize">
                    {plan.name}
                  </h3>
                </div>

                <div className="text-lg font-bold text-primary-300 mb-1">
                  {formatPriceSummary(plan)}
                </div>

                <div className="flex items-center justify-center space-x-2 text-sm text-slate-500">
                  <Zap size={14} className="text-primary-400" />
                  <span>{formatTokens(plan.tokens)} tokens</span>
                </div>

                <div className="text-xs text-slate-500 mt-1">
                  Max brands: {formatMaxBrands(plan.max_brands)}
                </div>
              </div>

              <div className="space-y-2 mb-6">
                {plan.features.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-2 text-sm">
                    <Check size={14} className="text-green-400 flex-shrink-0" />
                    <span className="text-slate-600">{feature}</span>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => handlePurchase(plan)}
                disabled={isCurrentPlan}
                className={`w-full ${
                  isCurrentPlan
                    ? 'bg-green-600 hover:bg-green-600 cursor-not-allowed'
                    : ''
                }`}
                variant={isCurrentPlan ? 'secondary' : 'primary'}
              >
                {isCurrentPlan ? 'Current Plan' : `Buy ${plan.name}`}
              </Button>
            </div>
          );
        })}
      </div>

      <div className="text-center text-sm text-slate-500 mt-8">
        <p>
          After clicking "Buy", you'll be redirected to WhatsApp to complete your purchase.
          Your account will be upgraded once payment is confirmed.
        </p>
      </div>
    </div>
  );
};
