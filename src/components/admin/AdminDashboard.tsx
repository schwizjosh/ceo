import React, { useMemo, useState } from 'react';
import {
  User,
  AdminConfig,
  UserStats,
  AIModel,
  UserPlan,
  PricingPlan,
  CurrencySettings
} from '../../types';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Modal } from '../common/Modal';
import { adminService } from '../../services/adminService';
import {
  Users,
  Settings,
  Database,
  Zap,
  Crown,
  Edit3,
  Trash2,
  Save,
  RefreshCw,
  BarChart3,
  PieChart,
  Activity,
  Target,
  CalendarCheck,
  Bot,
  FileText
} from 'lucide-react';
import { ANDORA_PRICING_PLANS, DEFAULT_EXCHANGE_RATE } from '../../utils/constants';
import { AgentConfigTab } from './AgentConfigTab';
import { BlogCMSTab } from './BlogCMSTab';

const createPlanLookup = (plans: PricingPlan[]) => {
  return plans.reduce<Record<UserPlan, PricingPlan>>((acc, plan) => {
    acc[plan.id] = plan;
    return acc;
  }, {} as Record<UserPlan, PricingPlan>);
};

const computeSystemLimits = (plans: PricingPlan[]) => {
  return plans.reduce((limits, plan) => {
    limits[plan.id] = {
      tokens: plan.tokens,
      max_brands: plan.max_brands
    };
    return limits;
  }, {} as AdminConfig['system_limits']);
};

const formatFeaturesForInput = (features: string[]) => features.join('\n');

interface AdminDashboardProps {
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'config' | 'agents' | 'blog'>('dashboard');
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [adminConfig, setAdminConfig] = useState<AdminConfig | null>(null);
  const [currencyForm, setCurrencyForm] = useState<CurrencySettings>({
    default_currency: 'NGN',
    exchange_rate: DEFAULT_EXCHANGE_RATE
  });
  const [loading, setLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingUserOriginalPlan, setEditingUserOriginalPlan] = useState<UserPlan | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [savingPlanId, setSavingPlanId] = useState<string | null>(null);
  const [savingCurrency, setSavingCurrency] = useState(false);
  const [planAssignment, setPlanAssignment] = useState<{
    userId: string;
    plan: UserPlan;
    tokens: number;
    expiry: string;
  }>({
    userId: '',
    plan: 'free',
    tokens: 0,
    expiry: ''
  });
  const [syncWithPlanDefaults, setSyncWithPlanDefaults] = useState(true);
  const [assigningPlan, setAssigningPlan] = useState(false);


  const plansForUi = useMemo(() => adminConfig?.pricing_plans ?? ANDORA_PRICING_PLANS, [adminConfig]);
  const planLookup = useMemo(() => createPlanLookup(plansForUi), [plansForUi]);
  const planOptions = useMemo(() => plansForUi.map(plan => ({
    id: plan.id,
    label: plan.name,
    tokens: plan.tokens,
    maxBrands: plan.max_brands
  })), [plansForUi]);
  const selectedPlanMeta = planLookup[planAssignment.plan];
  const selectedUser = useMemo(
    () => users.find(user => user.user_id === planAssignment.userId) ?? null,
    [users, planAssignment.userId]
  );
  const projectedTokenBalance = useMemo(() => {
    if (!selectedUser) return 0;
    const currentTokens = selectedUser.tokens ?? 0;
    const currentPlan = selectedUser.plan;
    const isUpgradingPlan = currentPlan !== planAssignment.plan;

    if (isUpgradingPlan && syncWithPlanDefaults) {
      const planTokens = planLookup[planAssignment.plan]?.tokens ?? 0;
      return currentTokens + planTokens;
    }
    return planAssignment.tokens;
  }, [selectedUser, planAssignment.plan, planAssignment.tokens, syncWithPlanDefaults, planLookup]);
  const totalTokensRemaining = useMemo(
    () => users.reduce((sum, user) => sum + (user.tokens ?? 0), 0),
    [users]
  );
  const totalUsers = stats?.total_users ?? 0;
  const tokensDistributed = stats?.tokens_distributed ?? 0;
  const tokensConsumed = stats?.tokens_consumed ?? 0;
  const averageTokensPerUser = useMemo(() => {
    if (totalUsers === 0) {
      return 0;
    }
    return Math.round(totalTokensRemaining / totalUsers);
  }, [totalTokensRemaining, totalUsers]);
  const paidConversionRate = useMemo(() => {
    if (totalUsers === 0) {
      return 0;
    }
    return Math.round(((stats?.paid_users ?? 0) / totalUsers) * 100);
  }, [stats?.paid_users, totalUsers]);
  const brandsPerPaidUser = useMemo(() => {
    if (!stats || stats.paid_users === 0) {
      return '0.0';
    }
    return (stats.total_brands / stats.paid_users).toFixed(1);
  }, [stats]);
  const planDistribution = useMemo(() => {
    if (users.length === 0) {
      return [] as Array<{
        plan: UserPlan;
        count: number;
        label: string;
        percentage: number;
      }>;
    }

    const counts = users.reduce<Record<UserPlan, number>>((acc, user) => {
      const plan = user.plan;
      acc[plan] = (acc[plan] ?? 0) + 1;
      return acc;
    }, {} as Record<UserPlan, number>);

    return (Object.entries(counts) as Array<[UserPlan, number]>).map(([plan, count]) => {
      const planMeta = planLookup[plan];
      const label = planMeta?.name ?? plan.charAt(0).toUpperCase() + plan.slice(1);
      const percentage = totalUsers === 0 ? 0 : Math.round((count / totalUsers) * 100);
      return { plan, count, label, percentage };
    }).sort((a, b) => b.count - a.count);
  }, [users, planLookup, totalUsers]);

  React.useEffect(() => {
    loadData();
  }, []);

  React.useEffect(() => {
    if (adminConfig?.currency_settings) {
      setCurrencyForm(adminConfig.currency_settings);
    }
  }, [adminConfig?.currency_settings]);


  React.useEffect(() => {
    if (!planAssignment.userId && planAssignment.tokens === 0) {
      const defaultTokens = planLookup[planAssignment.plan]?.tokens ?? 0;
      if (defaultTokens !== planAssignment.tokens) {
        setPlanAssignment(prev => ({ ...prev, tokens: defaultTokens }));
      }
    }
  }, [planAssignment.userId, planAssignment.tokens, planAssignment.plan, planLookup]);

  React.useEffect(() => {
    if (!syncWithPlanDefaults) {
      return;
    }

    const defaultTokens = planLookup[planAssignment.plan]?.tokens;
    if (typeof defaultTokens === 'number' && defaultTokens !== planAssignment.tokens) {
      setPlanAssignment(prev => ({ ...prev, tokens: defaultTokens }));
    }
  }, [planAssignment.plan, planAssignment.tokens, planLookup, syncWithPlanDefaults]);

  React.useEffect(() => {
    if (!selectedUser) {
      return;
    }

    const planExpiry = selectedUser.plan_expiry ? new Date(selectedUser.plan_expiry) : null;
    const formattedExpiry = planExpiry ? planExpiry.toISOString().slice(0, 10) : '';

    setPlanAssignment(prev => ({
      ...prev,
      plan: selectedUser.plan,
      tokens: selectedUser.tokens ?? 0,
      expiry: formattedExpiry
    }));
    setSyncWithPlanDefaults(false);
  }, [selectedUser?.user_id]);

  React.useEffect(() => {
    if (planAssignment.plan === 'free') {
      if (planAssignment.expiry !== '') {
        setPlanAssignment(prev => ({ ...prev, expiry: '' }));
      }
      return;
    }

    if (!planAssignment.expiry) {
      const defaultExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      setPlanAssignment(prev => ({ ...prev, expiry: defaultExpiry }));
    }
  }, [planAssignment.plan, planAssignment.expiry]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersData, statsData, configData] = await Promise.all([
        adminService.getAllUsers(),
        adminService.getUserStats(),
        adminService.getAdminConfig()
      ]);

      setUsers(usersData);
      setStats(statsData);
      setAdminConfig(configData);
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      const success = await adminService.deleteUser(userId);
      if (success) {
        setUsers(users.filter(u => u.user_id !== userId));
      }
    }
  };

  const updatePlanAssignment = <K extends keyof typeof planAssignment>(field: K, value: (typeof planAssignment)[K]) => {
    setPlanAssignment(prev => ({ ...prev, [field]: value }));
  };

  const handleAssignPlan = async () => {
    if (!planAssignment.userId) {
      alert('Select a user before assigning a plan.');
      return;
    }

    setAssigningPlan(true);

    // Get the user's current token balance and plan
    const currentUser = users.find(u => u.user_id === planAssignment.userId);
    const currentTokens = currentUser?.tokens ?? 0;
    const currentPlan = currentUser?.plan;
    const isUpgradingPlan = currentPlan !== planAssignment.plan;

    // If upgrading to a new plan, ADD the new plan's tokens to existing balance
    // If just modifying tokens on same plan, use the specified amount
    let finalTokens = planAssignment.tokens;
    if (isUpgradingPlan && syncWithPlanDefaults) {
      // Add new plan's allocation to existing tokens
      const planTokens = planLookup[planAssignment.plan]?.tokens ?? 0;
      finalTokens = currentTokens + planTokens;
    }

    const updates: Partial<User> = {
      plan: planAssignment.plan,
      tokens: Math.max(0, Number.isFinite(finalTokens) ? finalTokens : 0)
    };

    if (planAssignment.plan === 'free') {
      (updates as Partial<User> & { plan_expiry?: Date | null }).plan_expiry = null;
    } else if (planAssignment.expiry) {
      (updates as Partial<User> & { plan_expiry?: Date | null }).plan_expiry = new Date(`${planAssignment.expiry}T00:00:00Z`);
    }

    const success = await adminService.updateUser(planAssignment.userId, updates);
    setAssigningPlan(false);

    if (success) {
      const planName = planLookup[planAssignment.plan]?.name ?? planAssignment.plan;
      const addedTokens = finalTokens - currentTokens;
      alert(`Plan updated successfully.\n${planName} assigned with ${finalTokens.toLocaleString()} total tokens${addedTokens > 0 ? ` (+${addedTokens.toLocaleString()} added)` : ''}.`);
      setPlanAssignment({
        userId: '',
        plan: 'free',
        tokens: planLookup['free']?.tokens ?? 0,
        expiry: ''
      });
      setSyncWithPlanDefaults(true);
      loadData();
    }
  };

  const handlePlanUpdate = (planId: UserPlan, updates: Partial<PricingPlan>) => {
    if (!adminConfig) {
      return;
    }

    const updatedPlans = adminConfig.pricing_plans.map(plan =>
      plan.id === planId ? { ...plan, ...updates } : plan
    );

    setAdminConfig({
      ...adminConfig,
      pricing_plans: updatedPlans,
      system_limits: computeSystemLimits(updatedPlans)
    });
  };

  const handlePlanPriceChange = (planId: UserPlan, currency: 'NGN' | 'USD', rawValue: string) => {
    const parsedValue = Math.max(0, parseInt(rawValue, 10) || 0);
    const rate = currencyForm.exchange_rate > 0 ? currencyForm.exchange_rate : DEFAULT_EXCHANGE_RATE;

    if (currency === 'NGN') {
      const price_ngn = parsedValue;
      const price_usd = price_ngn === 0 ? 0 : Math.max(1, Math.round(price_ngn / rate));
      handlePlanUpdate(planId, { price_ngn, price_usd });
    } else {
      const price_usd = parsedValue;
      const price_ngn = price_usd === 0 ? 0 : Math.round(price_usd * rate);
      handlePlanUpdate(planId, { price_usd, price_ngn });
    }
  };

  const handlePlanFeatureChange = (planId: UserPlan, value: string) => {
    const features = value
      .split(/\r?\n/)
      .map(feature => feature.trim())
      .filter(Boolean);
    handlePlanUpdate(planId, { features });
  };

  const handleSavePlan = async (planId: UserPlan) => {
    if (!adminConfig) {
      return;
    }

    const existingPlan = adminConfig.pricing_plans.find(plan => plan.id === planId);
    if (!existingPlan) {
      return;
    }

    const planName = existingPlan.name;
    setSavingPlanId(planId);
    const updatedPlan = await adminService.updatePricingPlan(planId, existingPlan);
    setSavingPlanId(null);

    if (updatedPlan) {
      const updatedPlans = adminConfig.pricing_plans.map(plan =>
        plan.id === planId ? { ...updatedPlan } : plan
      );
      setAdminConfig({
        ...adminConfig,
        pricing_plans: updatedPlans,
        system_limits: computeSystemLimits(updatedPlans)
      });
      alert(`${planName} plan saved successfully.`);
    }
  };

  const handleCurrencyFieldChange = <K extends keyof CurrencySettings>(field: K, value: CurrencySettings[K]) => {
    setCurrencyForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveCurrencySettings = async () => {
    if (!adminConfig) {
      return;
    }

    setSavingCurrency(true);
    const success = await adminService.updateAdminConfig({ currency_settings: currencyForm });
    setSavingCurrency(false);

    if (success) {
      setAdminConfig({ ...adminConfig, currency_settings: currencyForm });
      alert('Currency settings updated successfully.');
    }
  };

  const handleRecalculateUsd = () => {
    if (!adminConfig) {
      return;
    }

    const rate = currencyForm.exchange_rate > 0 ? currencyForm.exchange_rate : DEFAULT_EXCHANGE_RATE;
    const recalculatedPlans = adminConfig.pricing_plans.map(plan => ({
      ...plan,
      price_usd: plan.price_ngn === 0 ? 0 : Math.max(1, Math.round(plan.price_ngn / rate))
    }));

    setAdminConfig({
      ...adminConfig,
      pricing_plans: recalculatedPlans
    });
  };

  const handleUpdateUser = async (userToSave: User) => {
    if (!editingUser) {
      return;
    }

    const planChanged = editingUserOriginalPlan && editingUserOriginalPlan !== userToSave.plan;
    const planExpiry = planChanged
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      : userToSave.plan_expiry;

    const updates: Partial<User> = {
      tokens: Math.max(0, userToSave.tokens),
      preferred_ai_provider: userToSave.preferred_ai_provider,
      preferred_ai_model: userToSave.preferred_ai_model
    };

    if (planChanged) {
      updates.plan = userToSave.plan;
      if (planExpiry) {
        updates.plan_expiry = planExpiry;
      }
    } else if (userToSave.plan_expiry) {
      updates.plan_expiry = userToSave.plan_expiry;
    }

    const success = await adminService.updateUser(userToSave.user_id, updates);

    if (success) {
      setUsers(users.map(u => (
        u.user_id === userToSave.user_id
          ? {
              ...u,
              ...updates,
              plan_expiry: planExpiry || undefined
            }
          : u
      )));
      setIsEditModalOpen(false);
      setEditingUser(null);
      setEditingUserOriginalPlan(null);
    }
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingUser(null);
    setEditingUserOriginalPlan(null);
  };

  const handleSyncSystemLimits = async () => {
    if (!adminConfig) {
      return;
    }

    const success = await adminService.updateSystemLimits(adminConfig.system_limits);
    if (success) {
      alert('Token limits saved successfully.');
    }
  };

  const tabs = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: BarChart3 },
    { id: 'users' as const, label: 'Users', icon: Users },
    { id: 'agents' as const, label: 'AI Agents', icon: Bot },
    { id: 'blog' as const, label: 'Blog & Newsletter', icon: FileText },
    { id: 'config' as const, label: 'Config', icon: Settings }
  ];

  return (
    <div className="relative">
      <div className="flex relative z-10">
        {/* Sidebar */}
        <div className="hidden lg:block w-64 glass-effect border-r border-primary-200/60 min-h-screen p-6 border border-primary-500/20">
          <nav className="space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-primary-600 to-purple-600 text-white'
                      : 'text-slate-600 hover:bg-white/70 hover:text-primary-900'
                  }`}
                >
                  <Icon size={20} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Mobile Tab Navigation */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 glass-effect border-t border-primary-200/60 p-4 z-20">
          <div className="flex justify-around">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-primary-600 to-purple-600 text-white'
                      : 'text-slate-600 hover:bg-white/70 hover:text-primary-900'
                  }`}
                >
                  <Icon size={16} />
                  <span className="text-xs">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-4 sm:p-6 pb-20 lg:pb-6">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl sm:text-2xl font-bold text-primary-900">Admin Dashboard</h2>
                <Button onClick={loadData} loading={loading} className="flex items-center" size="sm">
                  <RefreshCw size={16} className="mr-2" />
                  <span className="hidden sm:inline">Refresh Data</span>
                </Button>
              </div>

              {stats && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    <div className="glass-effect p-4 sm:p-6 rounded-lg border border-primary-500/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs sm:text-sm text-slate-500">Total Users</p>
                          <p className="text-xl sm:text-2xl font-bold text-primary-300">{stats.total_users}</p>
                        </div>
                        <Users className="w-6 h-6 sm:w-8 sm:h-8 text-primary-400" />
                      </div>
                      <p className="text-xs text-slate-500 mt-3">{paidConversionRate}% on paid plans</p>
                    </div>

                    <div className="glass-effect p-4 sm:p-6 rounded-lg border border-green-500/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs sm:text-sm text-slate-500">Total Brands</p>
                          <p className="text-xl sm:text-2xl font-bold text-green-300">{stats.total_brands}</p>
                        </div>
                        <Database className="w-6 h-6 sm:w-8 sm:h-8 text-green-400" />
                      </div>
                      <p className="text-xs text-slate-500 mt-3">{brandsPerPaidUser} brands per paid user</p>
                    </div>

                    <div className="glass-effect p-4 sm:p-6 rounded-lg border border-accent-500/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs sm:text-sm text-slate-500">Tokens Distributed</p>
                          <p className="text-xl sm:text-2xl font-bold text-accent-300">{tokensDistributed.toLocaleString()}</p>
                        </div>
                        <Zap className="w-6 h-6 sm:w-8 sm:h-8 text-accent-400" />
                      </div>
                      <p className="text-xs text-slate-500 mt-3">{totalTokensRemaining.toLocaleString()} tokens currently held</p>
                    </div>

                    <div className="glass-effect p-4 sm:p-6 rounded-lg border border-purple-500/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs sm:text-sm text-slate-500">Paid Users</p>
                          <p className="text-xl sm:text-2xl font-bold text-purple-300">{stats.paid_users}</p>
                        </div>
                        <Crown className="w-6 h-6 sm:w-8 sm:h-8 text-purple-400" />
                      </div>
                      <p className="text-xs text-slate-500 mt-3">{stats.free_users} free members active</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
                    <div className="glass-effect p-4 sm:p-6 rounded-lg border border-primary-500/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs sm:text-sm text-slate-500">Total Tokens Consumed</p>
                          <p className="text-xl sm:text-2xl font-bold text-primary-300">{tokensConsumed.toLocaleString()}</p>
                        </div>
                        <PieChart className="w-6 h-6 sm:w-8 sm:h-8 text-primary-400" />
                      </div>
                      <p className="text-xs text-slate-500 mt-3">{totalTokensRemaining.toLocaleString()} tokens remaining across users</p>
                    </div>

                    <div className="glass-effect p-4 sm:p-6 rounded-lg border border-green-500/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs sm:text-sm text-slate-500">Total Events</p>
                          <p className="text-xl sm:text-2xl font-bold text-green-300">{stats.total_events}</p>
                        </div>
                        <CalendarCheck className="w-6 h-6 sm:w-8 sm:h-8 text-green-400" />
                      </div>
                      <p className="text-xs text-slate-500 mt-3">Context-aware planning moments logged</p>
                    </div>

                    <div className="glass-effect p-4 sm:p-6 rounded-lg border border-accent-500/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs sm:text-sm text-slate-500">Content Items Delivered</p>
                          <p className="text-xl sm:text-2xl font-bold text-accent-300">{stats.total_content}</p>
                        </div>
                        <Activity className="w-6 h-6 sm:w-8 sm:h-8 text-accent-400" />
                      </div>
                      <p className="text-xs text-slate-500 mt-3">Generated briefs ready for publishing</p>
                    </div>

                    <div className="glass-effect p-4 sm:p-6 rounded-lg border border-purple-500/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs sm:text-sm text-slate-500">Avg Tokens / User</p>
                          <p className="text-xl sm:text-2xl font-bold text-purple-300">{averageTokensPerUser.toLocaleString()}</p>
                        </div>
                        <Target className="w-6 h-6 sm:w-8 sm:h-8 text-purple-400" />
                      </div>
                      <p className="text-xs text-slate-500 mt-3">Helps forecast refill cadence</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
                    <div className="glass-effect p-4 sm:p-6 rounded-lg border border-primary-500/20 xl:col-span-2">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div>
                          <h3 className="text-base sm:text-lg font-semibold text-primary-900">Plan Management</h3>
                          <p className="text-sm text-slate-500">Assign subscription plans, align token allocations, and set renewal dates.</p>
                        </div>
                        {selectedPlanMeta && (
                          <div className="bg-white/60 rounded-lg px-4 py-3 border border-primary-200/40 text-xs text-slate-500">
                            <p className="font-semibold text-primary-700">{selectedPlanMeta.name}</p>
                            <p>{selectedPlanMeta.tokens.toLocaleString()} tokens • {selectedPlanMeta.max_brands} brand seats</p>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-2">Select User</label>
                          <select
                            value={planAssignment.userId}
                            onChange={(event) => updatePlanAssignment('userId', event.target.value)}
                            className="w-full px-3 py-2 glass-effect rounded-lg text-primary-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          >
                            <option value="" className="bg-white text-primary-900">Select a user</option>
                            {users.map(user => (
                              <option key={user.user_id} value={user.user_id} className="bg-white text-primary-900">
                                {user.email || user.user_id}
                              </option>
                            ))}
                          </select>
                          <p className="text-xs text-slate-500 mt-2">Pulls current plan and token balance automatically.</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-2">Assign Plan</label>
                          <select
                            value={planAssignment.plan}
                            onChange={(event) => {
                              updatePlanAssignment('plan', event.target.value as UserPlan);
                              if (syncWithPlanDefaults) {
                                const defaultTokens = planLookup[event.target.value as UserPlan]?.tokens ?? planAssignment.tokens;
                                updatePlanAssignment('tokens', defaultTokens);
                              }
                            }}
                            className="w-full px-3 py-2 glass-effect rounded-lg text-primary-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          >
                            {planOptions.map(option => (
                              <option key={option.id} value={option.id} className="bg-white text-primary-900">
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <p className="text-xs text-slate-500 mt-2">Switch between plans while keeping context of limits.</p>
                        </div>

                        <Input
                          label="Token Allocation"
                          type="number"
                          min={0}
                          value={planAssignment.tokens}
                          onChange={(event) => updatePlanAssignment('tokens', Math.max(0, parseInt(event.target.value, 10) || 0))}
                          helperText={
                            selectedUser && selectedUser.plan !== planAssignment.plan && syncWithPlanDefaults
                              ? `Current: ${selectedUser.tokens?.toLocaleString() ?? 0} → New total: ${projectedTokenBalance.toLocaleString()} (+${(projectedTokenBalance - (selectedUser.tokens ?? 0)).toLocaleString()} added)`
                              : syncWithPlanDefaults
                              ? 'Auto-syncing with plan defaults.'
                              : 'Custom allocation applied.'
                          }
                        />

                        {planAssignment.plan !== 'free' && (
                          <Input
                            label="Plan Renewal Date"
                            type="date"
                            value={planAssignment.expiry}
                            onChange={(event) => updatePlanAssignment('expiry', event.target.value)}
                            helperText="When the subscription should renew."
                          />
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
                        <label className="inline-flex items-center space-x-2 text-sm text-slate-600">
                          <input
                            type="checkbox"
                            checked={syncWithPlanDefaults}
                            onChange={(event) => {
                              setSyncWithPlanDefaults(event.target.checked);
                              if (event.target.checked) {
                                const defaultTokens = planLookup[planAssignment.plan]?.tokens ?? planAssignment.tokens;
                                updatePlanAssignment('tokens', defaultTokens);
                              }
                            }}
                            className="rounded border-primary-200 bg-white/80 text-primary-600 focus:ring-primary-500"
                          />
                          <span>Add plan tokens to user's existing balance when upgrading</span>
                        </label>

                        <Button onClick={handleAssignPlan} loading={assigningPlan} className="flex items-center justify-center w-full sm:w-auto">
                          <Crown size={16} className="mr-2" />
                          Apply Plan Changes
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="glass-effect p-4 sm:p-6 rounded-lg border border-primary-500/20">
                        <h3 className="text-base sm:text-lg font-semibold text-primary-900 mb-3">Plan Distribution</h3>
                        {planDistribution.length === 0 ? (
                          <p className="text-sm text-slate-500">No users available yet.</p>
                        ) : (
                          <div className="space-y-3">
                            {planDistribution.map((entry) => (
                              <div key={entry.plan}>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="font-medium text-primary-800">{entry.label}</span>
                                  <span className="text-slate-500">{entry.count} • {entry.percentage}%</span>
                                </div>
                                <div className="w-full h-2 bg-white/40 rounded-full overflow-hidden mt-1">
                                  <div
                                    className="h-full bg-gradient-to-r from-primary-500 to-purple-500"
                                    style={{ width: `${entry.percentage}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="glass-effect p-4 sm:p-6 rounded-lg border border-primary-500/20">
                        <h3 className="text-base sm:text-lg font-semibold text-primary-900 mb-3">Key Insights</h3>
                        <ul className="space-y-2 text-sm text-slate-600">
                          <li>Paid conversion sits at {paidConversionRate}% of the user base.</li>
                          <li>Average token balance is {averageTokensPerUser.toLocaleString()} per user.</li>
                          <li>Total consumption this month: {tokensConsumed.toLocaleString()} tokens.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Recent Activity */}
              <div className="glass-effect p-4 sm:p-6 rounded-lg border border-primary-500/20">
                <h3 className="text-base sm:text-lg font-semibold text-primary-900 mb-4">Recent Users</h3>
                <div className="space-y-2">
                  {users.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-4">No users found</p>
                  ) : (
                    users.slice(0, 5).map((user) => (
                      <div key={user.user_id} className="flex items-center justify-between p-2 glass-effect rounded border border-primary-200/40">
                        <div>
                          <p className="text-sm text-primary-800 truncate max-w-[150px] sm:max-w-none">{user.email || user.user_id}</p>
                          <p className="text-xs text-slate-500 capitalize">{user.plan} • {user.tokens} tokens</p>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingUser({ ...user });
                              setEditingUserOriginalPlan(user.plan);
                              setIsEditModalOpen(true);
                            }}
                          >
                            <Edit3 size={14} />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl sm:text-2xl font-bold text-primary-900">User Management</h2>
                <Button onClick={loadData} loading={loading} className="flex items-center" size="sm">
                  <RefreshCw size={16} className="mr-2" />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
              </div>

              <div className="glass-effect rounded-lg overflow-hidden border border-primary-500/20">
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <table className="w-full border border-primary-200/40">
                    <thead className="bg-white/60">
                      <tr>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-primary-800 uppercase tracking-wider border-b border-primary-200/40">User</th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-primary-800 uppercase tracking-wider border-b border-primary-200/40">Plan</th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-primary-800 uppercase tracking-wider border-b border-primary-200/40">Tokens</th>
                        <th className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-primary-800 uppercase tracking-wider border-b border-primary-200/40">Expiry</th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-primary-800 uppercase tracking-wider border-b border-primary-200/40">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-600/30">
                      {users.map((user) => (
                        <tr key={user.user_id} className="hover:bg-white/80 transition-colors">
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                            <div className="text-xs sm:text-sm text-primary-800 truncate max-w-[100px] sm:max-w-none">{user.email || user.user_id}</div>
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Crown size={14} className="text-accent-400 mr-1 sm:mr-2" />
                              <span className="text-xs sm:text-sm text-primary-800 capitalize">{user.plan}</span>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Zap size={14} className="text-primary-400 mr-1 sm:mr-2" />
                              <span className="text-xs sm:text-sm text-primary-800">{user.tokens}</span>
                            </div>
                          </td>
                          <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap text-sm text-primary-800">
                            {user.plan_expiry ? user.plan_expiry.toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-1 sm:space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingUser({ ...user });
                                  setEditingUserOriginalPlan(user.plan);
                                  setIsEditModalOpen(true);
                                }}
                              >
                                <Edit3 size={14} />
                              </Button>
                              <Button size="sm" variant="danger" onClick={() => handleDeleteUser(user.user_id)}>
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'agents' && (
            <AgentConfigTab />
          )}

          {activeTab === 'blog' && (
            <BlogCMSTab />
          )}

          {activeTab === 'config' && (
            <div className="space-y-6">
              <h2 className="text-xl sm:text-2xl font-bold text-primary-900">System Configuration</h2>
              {adminConfig ? (
                <>
                  <div className="glass-effect p-4 sm:p-6 rounded-lg border border-primary-500/20 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <h3 className="text-base sm:text-lg font-semibold text-primary-900">Currency & Billing Preferences</h3>
                        <p className="text-sm text-slate-500">
                          Control how pricing is displayed publicly and throughout the dashboards.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-600 mb-2">Default Display Currency</label>
                        <select
                          value={currencyForm.default_currency}
                          onChange={(e) => handleCurrencyFieldChange('default_currency', e.target.value as CurrencySettings['default_currency'])}
                          className="w-full px-3 py-2 glass-effect rounded-lg text-primary-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="NGN" className="bg-white text-primary-900">NGN — Nigerian Naira</option>
                          <option value="USD" className="bg-white text-primary-900">USD — United States Dollar</option>
                        </select>
                        <p className="text-xs text-slate-500 mt-2">
                          Determines the default currency shown on the public pricing page and in user dashboards.
                        </p>
                      </div>
                      <Input
                        label="NGN per $1"
                        type="number"
                        value={currencyForm.exchange_rate}
                        onChange={(e) => handleCurrencyFieldChange('exchange_rate', Math.max(1, parseInt(e.target.value, 10) || DEFAULT_EXCHANGE_RATE))}
                        helperText="Used to auto-calculate USD pricing when NGN changes."
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                      <p className="text-xs text-slate-500">
                        Update the exchange rate to refresh every plan’s USD price. You can still override individual plans manually.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button variant="outline" onClick={handleRecalculateUsd}>
                          Recalculate USD Values
                        </Button>
                        <Button onClick={handleSaveCurrencySettings} loading={savingCurrency}>
                          Save Currency Settings
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="glass-effect p-4 sm:p-6 rounded-lg border border-primary-500/20 space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <h3 className="text-base sm:text-lg font-semibold text-primary-900">Pricing & Token Catalogue</h3>
                        <p className="text-sm text-slate-500">
                          Edit live plan prices, allocations, and features. Changes sync instantly to the public site.
                        </p>
                      </div>
                      <Button size="sm" onClick={handleSyncSystemLimits} className="flex items-center">
                        <Save size={16} className="mr-2" />
                        Save Token Limits
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {adminConfig.pricing_plans.map((plan) => (
                        <div key={plan.id} className="glass-effect border border-primary-200/50 rounded-lg p-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-lg font-semibold text-primary-900">{plan.name}</h4>
                              <p className="text-xs text-slate-500 uppercase tracking-wide">{plan.id}</p>
                            </div>
                            {plan.is_popular && (
                              <span className="text-xs text-accent-300 bg-accent-500/10 px-2 py-1 rounded-full">Popular</span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Input
                              label="Price (NGN)"
                              type="number"
                              value={plan.price_ngn}
                              onChange={(e) => handlePlanPriceChange(plan.id, 'NGN', e.target.value)}
                            />
                            <Input
                              label="Price (USD)"
                              type="number"
                              value={plan.price_usd}
                              onChange={(e) => handlePlanPriceChange(plan.id, 'USD', e.target.value)}
                              helperText={`≈ ₦${plan.price_ngn.toLocaleString()} at ₦${currencyForm.exchange_rate.toLocaleString()} / $1`}
                            />
                            <Input
                              label="Monthly Tokens"
                              type="number"
                              value={plan.tokens}
                              onChange={(e) => handlePlanUpdate(plan.id, { tokens: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                            />
                            <Input
                              label="Max Brands"
                              type="number"
                              value={plan.max_brands}
                              onChange={(e) => handlePlanUpdate(plan.id, { max_brands: parseInt(e.target.value, 10) || 0 })}
                              helperText="Use -1 for unlimited brands"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-600 mb-2">Included Features</label>
                            <textarea
                              value={formatFeaturesForInput(plan.features)}
                              onChange={(e) => handlePlanFeatureChange(plan.id, e.target.value)}
                              className="w-full min-h-[100px] glass-effect rounded-lg text-primary-900 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                              placeholder="One feature per line"
                            />
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                            <p className="text-xs text-slate-500">
                              Displayed as {currencyForm.default_currency === 'USD' ? `$${plan.price_usd.toLocaleString()}` : `₦${plan.price_ngn.toLocaleString()}`} on the pricing page.
                            </p>
                            <Button
                              size="sm"
                              onClick={() => handleSavePlan(plan.id)}
                              loading={savingPlanId === plan.id}
                            >
                              <Save size={14} className="mr-2" />
                              Save Plan
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="glass-effect p-4 sm:p-6 rounded-lg border border-primary-500/20 space-y-3">
                    <h3 className="text-base sm:text-lg font-semibold text-primary-900">Billing Automation</h3>
                    <p className="text-sm text-slate-500">
                      Every plan assignment receives an automatic 30-day expiry with renewal reminders seven days before the deadline.
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-slate-600">
                      <li>Monthly allowances match the pricing grid, keeping tokens and limits in sync.</li>
                      <li>Admins can top up or reset tokens without breaking the automated renewal cycle.</li>
                      <li>Yearly billing support flows from the pricing page toggle into analytics automatically.</li>
                    </ul>
                  </div>
                </>
              ) : (
                <div className="glass-effect p-6 rounded-lg border border-primary-500/20 text-center text-slate-500">
                  Loading configuration...
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit User Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        title="Edit User"
        size="md"
      >
        {editingUser && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Plan</label>
                <select
                  value={editingUser.plan}
                  onChange={(e) => {
                    const planId = e.target.value as UserPlan;
                    const selectedPlan = planLookup[planId] || planLookup['free'];
                    const nextExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                    setEditingUser({
                      ...editingUser,
                      plan: planId,
                      tokens: selectedPlan?.tokens ?? editingUser.tokens,
                      plan_expiry: nextExpiry
                    });
                  }}
                  className="w-full px-3 py-2 glass-effect rounded-lg text-primary-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {planOptions.map(option => (
                    <option key={option.id} value={option.id} className="bg-white text-primary-900">
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-2">
                  Plans renew monthly. Changing a plan sets a new expiry on {editingUser.plan_expiry ? editingUser.plan_expiry.toLocaleDateString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}.
                </p>
              </div>
              <Input
                label="Tokens"
                type="number"
                value={editingUser.tokens}
                onChange={(e) => {
                  const value = Math.max(0, parseInt(e.target.value, 10) || 0);
                  setEditingUser({ ...editingUser, tokens: value });
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">AI Provider</label>
              <select
                value={editingUser.preferred_ai_provider}
                onChange={(e) => setEditingUser({ ...editingUser, preferred_ai_provider: e.target.value as any })}
                className="w-full px-3 py-2 glass-effect rounded-lg text-primary-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="openai">OpenAI</option>
                <option value="claude">Claude</option>
              </select>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="ghost" onClick={closeEditModal}>
                Cancel
              </Button>
              <Button onClick={() => handleUpdateUser(editingUser)}>
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};