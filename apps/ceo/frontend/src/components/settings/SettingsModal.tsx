import React, { useState } from 'react';
import { User, Brand, AIProvider, AIModel, PricingPlan, CurrencyCode } from '../../types';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { PricingModal } from './PricingModal';
import { Zap, Plus, Crown, Sparkles, LogOut } from 'lucide-react';
import { PyAvatar } from '../common/PyAvatar';
import { ANDORA_PRICING_PLANS, DEFAULT_EXCHANGE_RATE } from '../../utils/constants';
import { COMMON_TIMEZONES } from '../../utils/timezones';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  brands: Brand[];
  currentBrandId: string | null;
  onBrandChange: (brandId: string) => void;
  onCreateBrand: (name: string) => void;
  onAIProviderChange: (provider: AIProvider) => void;
  onAIModelChange: (modelId: string) => void;
  onTimezoneChange?: (timezone: string) => void;
  availableModels: AIModel[];
  onLogout: () => void;
  pricingPlans: PricingPlan[];
  pricingCurrency: CurrencyCode;
  pricingExchangeRate: number;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  user,
  brands,
  currentBrandId,
  onBrandChange,
  onCreateBrand,
  onAIProviderChange,
  onAIModelChange,
  onTimezoneChange,
  availableModels,
  onLogout,
  pricingPlans,
  pricingCurrency,
  pricingExchangeRate
}) => {
  const [newBrandName, setNewBrandName] = useState('');
  const [showCreateBrand, setShowCreateBrand] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [brandError, setBrandError] = useState<string | null>(null);

  if (!user) return null;

  const livePlans = pricingPlans.length > 0 ? pricingPlans : ANDORA_PRICING_PLANS;
  const currentPlan = livePlans.find(plan => plan.id === user.plan);
  const canCreateMoreBrands = (currentPlan?.max_brands === -1) || brands.length < (currentPlan?.max_brands || 1);
  const normalizedExchangeRate = pricingExchangeRate > 0 ? pricingExchangeRate : DEFAULT_EXCHANGE_RATE;

  const handleCreateBrand = async () => {
    if (newBrandName.trim() && !isCreating) {
      setIsCreating(true);
      setBrandError(null);
      try {
        await onCreateBrand(newBrandName.trim());
        setNewBrandName('');
        setShowCreateBrand(false);
      } catch (error) {
        console.error('Error creating brand:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to create brand. Please try again.';
        setBrandError(errorMessage);
      } finally {
        setIsCreating(false);
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings" size="lg">
      <>
        <div className="space-y-8">
          {/* Subscription Status */}
          <div className="neural-glow p-6 rounded-lg relative overflow-hidden border border-primary-500/30">
            <div className="absolute top-2 right-2">
              <PyAvatar size="sm" />
            </div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Crown className="w-6 h-6 text-accent-400 mr-2" />
                <h3 className="text-lg font-semibold text-primary-900">Subscription Status</h3>
              </div>
              <div className="flex items-center space-x-2 px-3 py-1 glass-effect rounded-full border border-primary-500/30">
                <Zap size={16} className="text-primary-400" />
                <span className="text-sm font-bold text-primary-300">{user.tokens} tokens</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Plan:</span>
                <p className="font-semibold text-primary-800 capitalize">{user.plan}</p>
              </div>
              <div>
                <span className="text-slate-500">Max Brands:</span>
                <p className="font-semibold text-primary-800">
                  {currentPlan?.max_brands === -1 ? 'Unlimited' : (currentPlan?.max_brands || 1)}
                </p>
              </div>
              {user.plan_expiry && (
                <div>
                  <span className="text-slate-500">Expires:</span>
                  <p className="font-semibold text-primary-800">
                    {user.plan_expiry.toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
            
            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => setShowPricingModal(true)}
                className="flex items-center justify-center"
                size="sm"
              >
                <Zap size={16} className="mr-2" />
                Buy More Tokens
              </Button>
              
              {user.plan === 'free' && (
                <div className="flex-1 p-3 glass-effect border border-accent-500/30 rounded-lg">
                  <p className="text-sm text-accent-300">
                    Upgrade to unlock more brands, higher token limits, and advanced features!
                  </p>
                </div>
              )}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Pricing defaults to {pricingCurrency === 'USD' ? 'US Dollars ($)' : 'Nigerian Naira (₦)'}.
              Current exchange rate: ₦{normalizedExchangeRate.toLocaleString()} ≈ $1.
            </p>
          </div>

          {/* Preferences */}
          <div className="glass-effect p-6 rounded-lg border border-primary-500/20">
            <div className="flex items-center space-x-2 mb-4">
              <Sparkles className="w-5 h-5 text-primary-400" />
              <h3 className="text-lg font-semibold text-primary-900">Preferences</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-600 mb-2 block">Timezone</label>
                <select
                  value={user.timezone || 'Africa/Lagos'}
                  onChange={(e) => onTimezoneChange?.(e.target.value)}
                  className="w-full bg-white/80 text-primary-900 p-3 rounded-lg border border-primary-200 focus:border-primary-400 outline-none transition-colors"
                >
                  {COMMON_TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-600 mb-2 block">AI Provider</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                  {(['gemini', 'openai', 'claude', 'deepseek'] as AIProvider[]).map((provider) => (
                    <button
                      key={provider}
                      onClick={() => onAIProviderChange(provider)}
                      className={`p-2 sm:p-3 lg:p-4 border-2 rounded-lg transition-all duration-300 glass-effect min-w-0 ${
                        user.preferred_ai_provider === provider
                          ? 'border-primary-500 bg-primary-500/10'
                          : 'border-primary-200 hover:border-primary-400'
                      }`}
                    >
                      <div className="text-left">
                        <h4 className="font-semibold text-primary-800 capitalize text-xs sm:text-sm lg:text-base truncate">{provider === 'gemini' ? 'Gemini (FREE)' : provider}</h4>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 mb-2 block">AI Model</label>
                <select
                  value={user.preferred_ai_model}
                  onChange={(e) => onAIModelChange(e.target.value)}
                  className="w-full bg-white/80 text-primary-900 p-2 sm:p-3 rounded-lg border border-primary-200 focus:border-primary-400 outline-none transition-colors text-xs sm:text-sm truncate"
                >
                  {availableModels
                    .filter((model) => model.provider === user.preferred_ai_provider)
                    .map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>
          {/* Brand Management */}
          <div className="glass-effect p-6 rounded-lg border border-primary-500/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-primary-900">Brand Management</h3>
              {canCreateMoreBrands && (
                <Button
                  size="sm"
                  onClick={() => setShowCreateBrand(true)}
                  className="flex items-center"
                >
                  <Plus size={16} className="mr-1" />
                  New Brand
                </Button>
              )}
            </div>
            
            {showCreateBrand && (
              <div className="mb-4 p-4 glass-effect rounded-lg">
                {brandError && (
                  <div className="mb-3 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-red-400 text-sm">{brandError}</p>
                  </div>
                )}
                <div className="flex space-x-2">
                  <Input
                    placeholder="Enter brand name"
                    value={newBrandName}
                    onChange={(e) => setNewBrandName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !isCreating && handleCreateBrand()}
                    className="flex-1"
                    disabled={isCreating}
                  />
                  <Button onClick={handleCreateBrand} size="sm" disabled={isCreating}>
                    {isCreating ? 'Creating...' : 'Create'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowCreateBrand(false);
                      setNewBrandName('');
                      setBrandError(null);
                    }}
                    disabled={isCreating}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              {brands.map((brand) => (
                <div
                  key={brand.brand_id}
                  className={`p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
                    brand.brand_id === currentBrandId
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-primary-200 hover:border-primary-500/50'
                  }`}
                  onClick={() => onBrandChange(brand.brand_id)}
                >
                  <h4 className="font-medium text-primary-800">{brand.brand_name}</h4>
                  <p className="text-sm text-slate-500 mt-1">
                    {brand.channels.length} channels • {brand.posting_frequency}x/week
                  </p>
                </div>
              ))}
            </div>
            
            {!canCreateMoreBrands && (
              <p className="text-sm text-slate-500 mt-2">
                You've reached the maximum number of brands for your plan. 
                {user.plan === 'free' && ' Upgrade to manage more brands!'}
              </p>
            )}
          </div>
        </div>
        
        {/* Logout Section */}
        <div className="glass-effect p-6 rounded-lg border border-red-500/20">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-primary-900">Account</h3>
              <p className="text-sm text-slate-500 mt-1">Sign out of your Andora account</p>
            </div>
            <Button
              onClick={onLogout}
              variant="danger"
              className="flex items-center"
            >
              <LogOut size={16} className="mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
        
        <PricingModal
          isOpen={showPricingModal}
          onClose={() => setShowPricingModal(false)}
          currentPlan={user.plan}
          pricingPlans={livePlans}
          currency={pricingCurrency}
          exchangeRate={pricingExchangeRate}
        />
      </>
    </Modal>
  );
};