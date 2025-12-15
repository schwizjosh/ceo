import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { NavBar } from '../layout/NavBar';
import { NoBrandPlaceholder } from '../common/NoBrandPlaceholder';
import { useAppState } from '../../hooks/useAppState';
import { AIProvider, Brand, User, TeamMember, AccessLevel } from '../../types';
import { pricingService, PublicPricingResponse } from '../../services/pricingService';
import { ANDORA_PRICING_PLANS, DEFAULT_EXCHANGE_RATE } from '../../utils/constants';
import { AccessRestricted } from '../common/AccessRestricted';
import { AIDebugModal } from '../common/AIDebugModal';
import { LoadingFallback } from '../common/LoadingFallback';
import { apiClient } from '../../lib/api';

// Lazy load dashboard page components for better code splitting
const SettingsPage = lazy(() => import('../pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const TokensPage = lazy(() => import('../pages/TokensPage').then(m => ({ default: m.TokensPage })));
const ConfigPage = lazy(() => import('../pages/ConfigPage').then(m => ({ default: m.ConfigPage })));
const PersonnelStudioPage = lazy(() => import('../pages/PersonnelStudioPage').then(m => ({ default: m.PersonnelStudioPage })));
const EventsPage = lazy(() => import('../pages/EventsPage').then(m => ({ default: m.EventsPage })));
const SeasonPage = lazy(() => import('../pages/SeasonPage').then(m => ({ default: m.SeasonPage })));
const MonthlyPage = lazy(() => import('../pages/MonthlyPage').then(m => ({ default: m.MonthlyPage })));
const ChatPage = lazy(() => import('../pages/ChatPage').then(m => ({ default: m.ChatPage })));
const DashboardPage = lazy(() => import('../pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const OnboardingSlides = lazy(() => import('../onboarding/OnboardingSlides').then(m => ({ default: m.OnboardingSlides })));
const AdminDashboard = lazy(() => import('../admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));

interface DashboardProps {
  user: User;
  onLogout: () => void;
  isAdmin?: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onLogout, isAdmin = false }) => {
  const navigate = useNavigate();
  const [newBrandName, setNewBrandName] = React.useState('');
  const [isCreatingBrand, setIsCreatingBrand] = React.useState(false);
  const [brandError, setBrandError] = React.useState<string | null>(null);
  const [pricingData, setPricingData] = React.useState<PublicPricingResponse>({
    plans: ANDORA_PRICING_PLANS,
    currency: 'NGN',
    exchange_rate: DEFAULT_EXCHANGE_RATE
  });
  const [showDebugModal, setShowDebugModal] = React.useState(false);
  const [isStudioOpen, setIsStudioOpen] = React.useState(false);

  const {
    appState,
    showOnboarding,
    isDataLoaded,
    setShowOnboarding,
    updateState,
    getCurrentBrand,
    updateBrand,
    addEvent,
    updateEvent,
    deleteEvent,
    createBrand,
    generateCast,
    prefillNarrative
  } = useAppState(user);

  const currentBrand = getCurrentBrand();

  const buildFullAccessPermissions = () => ({
    configuration: 'edit' as AccessLevel,
    plots: 'edit' as AccessLevel,
    events: 'edit' as AccessLevel,
    seasons: 'edit' as AccessLevel,
    monthly: 'edit' as AccessLevel,
    chat: 'edit' as AccessLevel
  });

  const activePermissions = React.useMemo<Record<keyof TeamMember['permissions'], AccessLevel>>(() => {
    const fallback = buildFullAccessPermissions();
    if (!currentBrand) {
      return fallback;
    }

    const currentUserId = appState.user?.user_id;
    const currentUserEmail = (appState.user?.email || user.email || '').toLowerCase();

    if (currentBrand.user_id === currentUserId) {
      return fallback;
    }

    const memberMatch = currentBrand.team_members?.find(member =>
      member.email?.toLowerCase() === currentUserEmail
    );

    if (memberMatch) {
      return memberMatch.permissions;
    }

    return fallback;
  }, [currentBrand, appState.user?.user_id, appState.user?.email, user.email]);

  const canViewSection = React.useCallback(
    (area: keyof TeamMember['permissions']) => activePermissions[area] !== 'none',
    [activePermissions]
  );

  const canEditSection = React.useCallback(
    (area: keyof TeamMember['permissions']) => activePermissions[area] === 'edit',
    [activePermissions]
  );

  React.useEffect(() => {
    let isMounted = true;

    const loadPricing = async () => {
      const data = await pricingService.getPublicPricing();
      if (isMounted) {
        setPricingData(data);
      }
    };

    loadPricing();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    if (user && appState.brands.length === 0) {
      const defaultBrandName = `${user.email?.split('@')[0] || 'My'} Brand`;
      createBrand(defaultBrandName, user.user_id);
    }
  };

  const handleCreateBrand = async (name: string) => {
    if (user && !isCreatingBrand) {
      setIsCreatingBrand(true);
      setBrandError(null);

      console.log('🚀 Starting brand creation:', {
        name,
        userId: user.user_id,
        userEmail: user.email
      });

      try {
        await createBrand(name, user.user_id);
        setNewBrandName('');
        console.log('✅ Brand created successfully!');
      } catch (error) {
        console.error('❌ Error in handleCreateBrand:', error);
        const errorMessage = error instanceof Error
          ? error.message
          : 'Failed to create brand. Please try again.';
        setBrandError(errorMessage);

        // Show alert for critical errors
        if (errorMessage.includes('session') || errorMessage.includes('log in')) {
          alert(errorMessage + '\n\nYou will be logged out.');
          onLogout();
        }
      } finally {
        setIsCreatingBrand(false);
      }
    }
  };

  const handleBrandChange = (brandId: string) => {
    updateState({ currentBrandId: brandId });
  };

  const persistPreferences = async (updates: Partial<{ preferred_ai_provider: AIProvider; preferred_ai_model: string }>) => {
    if (!appState.user) return;
    // Optimistic update for snappy UI
    updateState({ user: { ...appState.user, ...updates } });
    try {
      const updatedUser = await apiClient.updatePreferences(updates);
      updateState({
        user: {
          ...appState.user,
          ...updatedUser
        }
      });
    } catch (error) {
      console.error('Failed to update preferences:', error);
    }
  };

  const handleAIProviderChange = (provider: AIProvider) => {
    persistPreferences({ preferred_ai_provider: provider });
  };

  const handleAIModelChange = (modelId: string) => {
    persistPreferences({ preferred_ai_model: modelId });
  };

  const handleTimezoneChange = (timezone: string) => {
    updateState({
      user: { ...appState.user!, timezone }
    });
  };

  const handleBrandUpdate = (updates: Partial<Brand>) => {
    if (currentBrand) {
      updateBrand(currentBrand.brand_id, updates);
    }
  };

  const handleBrandArchive = (brandId: string, updatedBrand: Brand) => {
    // Update the brand in the brands list with the archived version
    updateState({
      brands: appState.brands.map(brand =>
        brand.brand_id === brandId ? updatedBrand : brand
      )
    });
  };

  const handleBrandUnarchive = (brandId: string, updatedBrand: Brand) => {
    // Update the brand in the brands list with the unarchived version
    updateState({
      brands: appState.brands.map(brand =>
        brand.brand_id === brandId ? updatedBrand : brand
      )
    });
  };

  // Skip onboarding - let users explore freely
  if (showOnboarding) {
    setShowOnboarding(false);
  }

  if (!isDataLoaded && appState.user) {
    return (
      <div className="min-h-screen relative floating-particles flex items-center justify-center p-6 bg-gradient-to-br from-primary-100/40 via-white to-accent-100/30">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  const pageProps = currentBrand ? {
    brand: currentBrand,
    events: appState.events.filter(event => event.brand_id === currentBrand.brand_id),
    onBrandUpdate: handleBrandUpdate
  } : {
    brand: null,
    events: [],
    onBrandUpdate: handleBrandUpdate
  };

  const canViewConfig = canViewSection('configuration');
  const canViewPersonnel = canViewSection('plots');
  const canViewEvents = canViewSection('events');
  const canViewSeasons = canViewSection('seasons');
  const canViewMonthly = canViewSection('monthly');
  const canViewChat = canViewSection('chat');
  const canEditSeasons = canEditSection('seasons');
  const canEditMonthly = canEditSection('monthly');

  return (
    <div className="min-h-screen relative bg-gradient-to-br from-primary-100/40 via-white to-accent-100/30 pb-20">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary-500/5 rounded-full blur-3xl animate-drift" />
        <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-drift" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-1/4 left-1/3 w-48 h-48 bg-accent-500/5 rounded-full blur-3xl animate-drift" style={{ animationDelay: '4s' }} />
      </div>

      <NavBar
        onPageChange={(page) => navigate(page)}
        onLogout={onLogout}
        user={user}
        permissions={activePermissions}
        onDebugClick={() => setShowDebugModal(true)}
        hideFooter={isStudioOpen}
        isAdmin={isAdmin}
        brands={appState.brands}
        currentBrandId={appState.currentBrandId}
        onBrandChange={handleBrandChange}
      />

      <AIDebugModal isOpen={showDebugModal} onClose={() => setShowDebugModal(false)} />

      {/* Brand Setup Banner - Non-blocking */}
      {!currentBrand && (
        <div className="relative z-10 mx-auto max-w-6xl px-6 pt-8">
          <div className="glass-effect p-6 rounded-2xl border border-primary-500/30 bg-gradient-to-r from-primary-200/30 to-purple-200/30">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-xl font-bold text-primary-900 mb-2">Welcome to Andora!</h2>
                <p className="text-slate-600">
                  Create your first brand to unlock AI-powered storytelling. I can help you craft compelling narratives once you provide some brand context.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <input
                  type="text"
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isCreatingBrand && newBrandName.trim()) {
                      handleCreateBrand(newBrandName);
                    }
                  }}
                  placeholder="Enter brand name"
                  className="flex-1 bg-white/80 text-primary-900 px-4 py-2 rounded-lg border border-primary-200 focus:border-primary-400 focus:outline-none transition-colors"
                  disabled={isCreatingBrand}
                />
                <button
                  onClick={() => {
                    if (newBrandName.trim()) {
                      handleCreateBrand(newBrandName);
                    }
                  }}
                  disabled={isCreatingBrand || !newBrandName.trim()}
                  className="px-6 py-2 bg-gradient-to-r from-primary-600 to-purple-600 text-white rounded-lg font-medium hover:from-primary-500 hover:to-purple-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {isCreatingBrand ? (
                    <span className="flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Creating...
                    </span>
                  ) : (
                    'Create Brand'
                  )}
                </button>
              </div>
            </div>
            {brandError && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-red-400 text-sm">{brandError}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <main className="py-8 relative z-10">
        <Suspense fallback={<LoadingFallback message="Loading page..." />}>
          <Routes>
            <Route path="/" element={<Navigate to="dashboard" replace />} />
          <Route
            path="dashboard"
            element={<DashboardPage brand={currentBrand} onBrandUpdate={handleBrandUpdate} />}
          />
          <Route
            path="config"
            element={
              canViewConfig ? (
                <ConfigPage {...pageProps} />
              ) : (
                <AccessRestricted title="Brand profile" description="You don't have access to this brand's configuration yet." />
              )
            }
          />
          <Route
            path="personnel"
            element={
              canViewPersonnel ? (
                <PersonnelStudioPage
                  {...pageProps}
                  generateCast={generateCast}
                  prefillNarrative={prefillNarrative}
                  isGenerating={appState.isGenerating}
                  onStudioStateChange={setIsStudioOpen}
                />
              ) : (
                <AccessRestricted title="Personnel & Team" description="Ask your workspace admin to grant access to manage team members." />
              )
            }
          />
          <Route
            path="events"
            element={
              currentBrand ? (
                canViewEvents ? (
                  <EventsPage
                    {...pageProps}
                    brandId={currentBrand.brand_id}
                    userId={appState.user!.user_id}
                    onEventAdd={addEvent}
                    onEventUpdate={updateEvent}
                    onEventDelete={deleteEvent}
                  />
                ) : (
                  <AccessRestricted title="Events & campaigns" description="You don't have access to manage events for this brand." />
                )
              ) : (
                <NoBrandPlaceholder
                  title="Manage Events & Holidays"
                  description="Track important dates, launches, campaigns, and holidays. Events help me create timely and relevant content for your brand."
                />
              )
            }
          />
          <Route
            path="season"
            element={
              currentBrand ? (
                canViewSeasons ? (
                  <SeasonPage
                    {...pageProps}
                    onPageChange={(page) => navigate(page)}
                    preferredModel={appState.user?.preferred_ai_model}
                    canEdit={canEditSeasons}
                  />
                ) : (
                  <AccessRestricted title="Season planning" description="Access to seasonal strategy is restricted for this teammate." />
                )
              ) : (
                <NoBrandPlaceholder
                  title="Seasonal Planning"
                  description="Plan your content strategy across seasons and quarters. Organize themes and campaigns for long-term storytelling success."
                />
              )
            }
          />
          <Route
            path="monthly"
            element={
              currentBrand ? (
                canViewMonthly ? (
                  <MonthlyPage
                    {...pageProps}
                    preferredModel={appState.user?.preferred_ai_model}
                    canEdit={canEditMonthly}
                  />
                ) : (
                  <AccessRestricted title="Monthly calendar" description="Access to the content calendar is restricted for this teammate." />
                )
              ) : (
                <NoBrandPlaceholder
                  title="Monthly Themes"
                  description="Create monthly narrative themes that guide your content creation. Build cohesive stories that engage your audience month after month."
                />
              )
            }
          />
          <Route
            path="chat"
            element={
              currentBrand ? (
                canViewChat ? (
                  <ChatPage brand={currentBrand} />
                ) : (
                  <AccessRestricted title="AI chat" description="Chat access is disabled for your role on this brand." />
                )
              ) : (
                <NoBrandPlaceholder
                  title="AI Chat Assistant"
                  description="Chat with Andora's AI to brainstorm ideas, refine content, and get creative assistance. Available once you create your brand."
                />
              )
            }
          />
          <Route
            path="settings"
            element={
              <SettingsPage
                user={appState.user}
                brands={appState.brands}
                currentBrandId={appState.currentBrandId}
                onBrandChange={handleBrandChange}
                onCreateBrand={handleCreateBrand}
                onAIProviderChange={handleAIProviderChange}
                onAIModelChange={handleAIModelChange}
                onTimezoneChange={handleTimezoneChange}
                availableModels={[
                  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'gemini', enabled: true, description: 'FREE - Google\'s latest flash model with 1M context, fast and efficient for all tasks.' },
                  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'gemini', enabled: true, description: 'FREE - Previous generation Gemini, reliable for general content generation.' },
                  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', enabled: true, description: 'Latest multimodal model from OpenAI with vision and fast performance.' },
                  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', enabled: true, description: 'Fast and cost-effective model for simple tasks.' },
                  { id: 'gpt-5.1', name: 'GPT-5.1', provider: 'openai', enabled: true, description: 'Newest GPT with improved reasoning and creativity.' },
                  { id: 'gpt-5.1-mini', name: 'GPT-5.1 Mini', provider: 'openai', enabled: true, description: 'Lightweight GPT-5.1 for speed and savings.' },
                  { id: 'gpt-5', name: 'GPT-5', provider: 'openai', enabled: true, description: 'Most advanced OpenAI model with superior reasoning, creativity, and long context capabilities.' },
                  { id: 'claude-sonnet-4.5', name: 'Claude Sonnet 4.5', provider: 'claude', enabled: true, description: 'Latest Claude model - Superior for coding, long context, and creative tasks.' },
                  { id: 'claude-opus-4', name: 'Claude Opus 4', provider: 'claude', enabled: true, description: 'Most powerful Claude model for complex creative and analytical work.' },
                  { id: 'claude-sonnet-3.5', name: 'Claude Sonnet 3.5', provider: 'claude', enabled: true, description: 'Previous generation - Great for personas and story structure.' },
                  { id: 'claude-haiku-3.5', name: 'Claude Haiku 3.5', provider: 'claude', enabled: true, description: 'Fastest and most cost-effective Claude model.' },
                  { id: 'deepseek-v3.2', name: 'DeepSeek V3.2', provider: 'deepseek', enabled: true, description: 'DeepSeek\'s most powerful creative model (Dec 2024) for content generation.' },
                ]}
                onLogout={onLogout}
                pricingPlans={pricingData.plans}
                pricingCurrency={pricingData.currency}
                pricingExchangeRate={pricingData.exchange_rate}
                onBrandUpdate={handleBrandUpdate}
                onBrandArchive={handleBrandArchive}
                onBrandUnarchive={handleBrandUnarchive}
              />
            }
          />
          <Route
            path="tokens"
            element={
              <TokensPage
                user={appState.user}
                pricingPlans={pricingData.plans}
                currency={pricingData.currency}
                exchangeRate={pricingData.exchange_rate}
              />
            }
          />
          <Route
            path="admin"
            element={
              isAdmin ? (
                <AdminDashboard onLogout={onLogout} />
              ) : (
                <AccessRestricted title="Admin Dashboard" description="You don't have administrator privileges." />
              )
            }
          />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
};
