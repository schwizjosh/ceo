import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Brand, BrandType } from '../../types';
import { Input } from '../common/Input';
import { Textarea } from '../common/Textarea';
import { Button } from '../common/Button';
import { NoBrandPlaceholder } from '../common/NoBrandPlaceholder';
import { BuyerPersonaForm } from '../config/BuyerPersonaForm';
import { ProductCarousel } from '../config/ProductCarousel';
import { AudienceCarousel } from '../config/AudienceCarousel';
import { ANDORA_CHAR_LIMITS, DAYS_OF_WEEK } from '../../utils/constants';
import { COMMON_TIMEZONES, getTimezoneLabel } from '../../utils/timezones';
import { debounce } from '../../utils/debounce';
import { Save, Clock, Sparkles, User, Users, ArrowRight, CheckCircle, Copy, ToggleLeft, ToggleRight, Compass, Activity, Target, Palette, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { NotificationBubble } from '../common/NotificationBubble';

interface ConfigPageProps {
  brand: Brand | null;
  onBrandUpdate: (updates: Partial<Brand>) => void;
}

interface Notification {
  id: string;
  message: string;
  type: 'success' | 'info';
}

interface SectionCardProps {
  id?: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const SectionCard: React.FC<SectionCardProps> = ({ id, title, description, icon, children }) => {
  return (
    <section
      id={id}
      className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur-sm shadow-sm min-w-0"
    >
      <div className="px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 space-y-4 sm:space-y-5">
        <div className="flex items-start gap-2 sm:gap-3 min-w-0">
          {icon && (
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-primary-500/10 text-primary-600 flex items-center justify-center shrink-0">
              {icon}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-slate-900 break-words">{title}</h2>
            {description && <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed break-words">{description}</p>}
          </div>
        </div>
        <div className="space-y-4 sm:space-y-5 min-w-0">{children}</div>
      </div>
    </section>
  );
};

export const ConfigPage: React.FC<ConfigPageProps> = ({ brand, onBrandUpdate }) => {
  if (!brand) {
    return (
      <NoBrandPlaceholder
        title="Create Your Company Profile"
        description="Tell us about your company—your vision, mission, and values. This helps Py understand your unique voice and create authentic content."
      />
    );
  }
  // Local state for immediate UI updates
  const [localBrand, setLocalBrand] = useState<Brand>(brand);
  const [isSaving, setIsSaving] = useState(false);
  const [showTimezoneDropdown, setShowTimezoneDropdown] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState<Record<string, boolean>>({});
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const isUserEditingRef = useRef(false);
  const navigate = useNavigate();
  const { authUser: user, isAdmin } = useAuth();
  const audienceSectionRef = useRef<HTMLDivElement>(null);

  // Check if user can access Copy All feature (admin only)
  const canCopyAll = isAdmin;

  const completionChecklist = useMemo(
    () => [
      { label: 'Brand name', complete: Boolean(localBrand.brand_name?.trim()) },
      { label: 'Tagline', complete: Boolean(localBrand.taglines?.trim()) },
      { label: 'About', complete: Boolean(localBrand.about?.trim()) },
      { label: 'Vision', complete: Boolean(localBrand.vision?.trim()) },
      { label: 'Mission', complete: Boolean(localBrand.mission?.trim()) },
      { label: 'Voice', complete: Boolean(localBrand.persona?.trim()) },
      { label: 'Audience', complete: Boolean(localBrand.buyer_profile?.trim()) },
    ],
    [localBrand]
  );

  const completedCount = completionChecklist.filter(item => item.complete).length;
  const completionPercent = Math.round((completedCount / completionChecklist.length) * 100);

  const journeyMoments = useMemo(
    () => [
      {
        id: 'identity',
        label: 'Identity',
        description: 'Name, type & promise',
        complete: Boolean(localBrand.brand_name?.trim() && localBrand.taglines?.trim()),
      },
      {
        id: 'strategy',
        label: 'Strategy',
        description: 'Vision & mission defined',
        complete: Boolean(localBrand.vision?.trim() && localBrand.mission?.trim()),
      },
      {
        id: 'tone',
        label: 'Tone',
        description: 'Tone of voice defined',
        complete: Boolean(localBrand.persona?.trim()),
      },
      {
        id: 'audience-insights',
        label: 'Audience',
        description: 'Buyer clarity captured',
        complete: Boolean(localBrand.buyer_profile?.trim()),
      },
    ],
    [localBrand]
  );

  const highlightItems = useMemo(
    () => [
      {
        label: 'Vision snapshot',
        value: localBrand.vision || 'Give us your future headline.',
        icon: <Target className="w-4 h-4" />,
      },
      {
        label: 'Tone of Voice',
        value: localBrand.persona || "Describe your company's communication style.",
        icon: <Palette className="w-4 h-4" />,
      },
      {
        label: 'Primary audience',
        value: localBrand.buyer_profile || 'Sketch the humans you serve.',
        icon: <Globe className="w-4 h-4" />,
      },
    ],
    [localBrand.buyer_profile, localBrand.persona, localBrand.vision]
  );

  // Auto-scroll to audience section when reverse positioning is enabled
  useEffect(() => {
    if (localBrand.reverse_positioning && audienceSectionRef.current) {
      setTimeout(() => {
        audienceSectionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }, 300); // Small delay to allow render
    }
  }, [localBrand.reverse_positioning]);

  // Track last edit timestamp to avoid overwriting active edits
  const lastEditTimeRef = useRef<number>(0);

  // Update local state when brand prop changes (from external updates)
  // BUT only if user hasn't edited recently (within 2 seconds)
  useEffect(() => {
    const timeSinceLastEdit = Date.now() - lastEditTimeRef.current;
    const isRecentEdit = timeSinceLastEdit < 2000; // 2 second grace period

    if (!isRecentEdit) {
      setLocalBrand(brand);
    }
  }, [brand]);

  // Reset edit tracking when switching brands
  const prevBrandIdRef = useRef(brand.id);
  useEffect(() => {
    if (prevBrandIdRef.current !== brand.id) {
      lastEditTimeRef.current = 0;
      isUserEditingRef.current = false;
      prevBrandIdRef.current = brand.id;
    }
  }, [brand.id]);

  // Create debounced update function
  const debouncedUpdate = useRef(
    debounce((updates: Partial<Brand>) => {
      console.log('💾 Saving brand updates:', updates);
      onBrandUpdate(updates);
      setIsSaving(false);
      isUserEditingRef.current = false; // User finished editing
    }, 1000) // Save 1 second after user stops typing
  ).current;

  // Handle input changes with optimistic UI updates
  const handleInputChange = useCallback((field: keyof Brand, value: any) => {
    lastEditTimeRef.current = Date.now(); // Track edit timestamp
    isUserEditingRef.current = true; // Mark that user is editing
    setIsSaving(true);
    setLocalBrand(prev => ({ ...prev, [field]: value }));
    debouncedUpdate({ [field]: value });
  }, [debouncedUpdate]);



  // Notification helper
  const showNotification = (message: string, type: 'success' | 'info' = 'success') => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };


  const handleTimezoneChange = (timezone: string) => {
    handleInputChange('timezone' as keyof Brand, timezone);
    setShowTimezoneDropdown(false);
  };

  // Render Audience Section (Who Are You Speaking To?)
  const renderAudienceSection = () => (
    <div
      ref={localBrand.reverse_positioning ? audienceSectionRef : null}
      className="rounded-xl sm:rounded-2xl border border-primary-200/70 bg-white/80 p-3 sm:p-4 lg:p-6 shadow-sm transition-all min-w-0"
    >
      {localBrand.reverse_positioning && (
        <div className="mb-3 rounded-lg sm:rounded-xl border border-primary-200 bg-primary-50/50 px-3 sm:px-4 py-2 sm:py-3">
          <p className="text-xs sm:text-sm text-primary-900 leading-relaxed break-words">
            <strong>Step 2: Describe Your Audience</strong> — Tell me who you're talking to, so I can write like I'm in the room with them.
          </p>
        </div>
      )}
      <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-primary-900 mb-3 sm:mb-4 break-words">
        {localBrand.reverse_positioning ? 'Who needs what you offer?' : 'Target Audiences'}
      </h2>
      <div className="min-w-0">
        <div className="mb-3 p-3 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-slate-700">
            💡 <strong>Multiple Audiences:</strong> Create different audience segments for each product/service. The first is your key audience.
          </p>
        </div>
        <AudienceCarousel
          value={localBrand.buyer_profile || ''}
          products={(() => {
            try {
              return JSON.parse(localBrand.products || '[]');
            } catch {
              return [];
            }
          })()}
          onChange={(value) => handleInputChange('buyer_profile', value)}
          onAISuggest={async (audienceIndex) => {
            // Pass audience index to AI helper for array support
            await handleAISuggest('buyer_profile', audienceIndex);
          }}
          isGeneratingAI={isGeneratingAI['buyer_profile']}
          placeholder="Fill in the simple prompts to outline this audience segment."
        />
      </div>
    </div>
  );

  // Copy all brand configuration fields to clipboard
  const handleCopyAll = async () => {
    if (!canCopyAll) {
      showNotification('This feature is only available for admin accounts', 'info');
      return;
    }

    const exportData = `=== COMPANY PROFILE ===

Company Name: ${localBrand.brand_name || ''}
Company Type: ${localBrand.brand_type || 'organization'}
Tagline: ${localBrand.taglines || ''}

About: ${localBrand.about || ''}

Vision: ${localBrand.vision || ''}

Mission: ${localBrand.mission || ''}

Products/Services: ${localBrand.products || ''}

Tone of Voice: ${localBrand.persona || ''}

=== AUDIENCE ===

Who Are You Speaking To?
${localBrand.buyer_profile || ''}

=== SETTINGS ===

Timezone: ${localBrand.timezone || 'UTC'}
Company HQ Location: ${localBrand.brand_hq_location || ''}
Colors: ${localBrand.colors || ''}

=== ADVANCED OPTIONS ===

Audience-First Approach: ${localBrand.reverse_positioning ? 'Enabled' : 'Disabled'}

Generated by Py Company Profile - ${new Date().toLocaleString()}`;

    try {
      await navigator.clipboard.writeText(exportData);
      showNotification('✨ All fields copied to clipboard!', 'success');
    } catch (error) {
      console.error('Failed to copy:', error);
      showNotification('Failed to copy to clipboard', 'info');
    }
  };

  // Andora Helper - Let me help you with suggestions
  const handleAISuggest = async (field: string, audienceIndex?: number) => {
    setIsGeneratingAI(prev => ({ ...prev, [field]: true }));
    showNotification('I am thinking this through...', 'info');

    try {
      // Get current product for context if generating buyer profile
      let productContext = '';
      if (field === 'buyer_profile' && audienceIndex !== undefined) {
        try {
          const products = JSON.parse(localBrand.products || '[]');
          const product = products[audienceIndex];
          if (product && product.name) {
            productContext = `Product/Service: ${product.name}\nDescription: ${product.description || ''}`;
          }
        } catch {
          // Ignore parse errors
        }
      }

      const brandContext = {
        brandName: localBrand.brand_name,
        brandType: localBrand.brand_type || 'organization',
        tagline: localBrand.taglines,
        about: localBrand.about,
        vision: localBrand.vision,
        mission: localBrand.mission,
        persona: localBrand.persona,
        buyerProfile: productContext || localBrand.buyer_profile, // Use product context if available
        products: localBrand.products,
      };

      const apiEndpoints: Record<string, string> = {
        vision: '/ai/generate-vision',
        mission: '/ai/generate-mission',
        persona: '/ai/generate-persona',
        buyer_profile: '/ai/generate-buyer-profile',
      };

      const endpoint = apiEndpoints[field];
      if (!endpoint) return;

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({ brandContext, preferredModel: user?.preferred_ai_model }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate suggestion');
      }

      const data = await response.json();

      if (data.success) {
        if (field === 'vision' && data.vision) {
          handleInputChange('vision', data.vision);
          showNotification('Here is a vision statement that captures your future!');
        } else if (field === 'mission' && data.mission) {
          handleInputChange('mission', data.mission);
          showNotification('Your mission is clear now!');
        } else if (field === 'persona' && data.persona) {
          handleInputChange('persona', data.persona);
          showNotification('Got it! This is how you sound.', 'success');
        } else if (field === 'buyer_profile' && data.buyerProfile) {
          console.log('✅ Buyer profile received:', data.buyerProfile);

          // Handle array format for audiences
          if (audienceIndex !== undefined) {
            try {
              // Parse existing audiences
              const audiences = JSON.parse(localBrand.buyer_profile || '[]');

              // If not an array yet, convert to array
              if (!Array.isArray(audiences)) {
                const newAudiences = [{
                  name: `Audience ${audienceIndex + 1}`,
                  profile: data.buyerProfile
                }];
                handleInputChange('buyer_profile', JSON.stringify(newAudiences));
              } else {
                // Update specific audience
                const updatedAudiences = [...audiences];
                if (updatedAudiences[audienceIndex]) {
                  updatedAudiences[audienceIndex].profile = data.buyerProfile;
                } else {
                  // Create new audience if doesn't exist
                  updatedAudiences[audienceIndex] = {
                    name: `Audience ${audienceIndex + 1}`,
                    profile: data.buyerProfile
                  };
                }
                handleInputChange('buyer_profile', JSON.stringify(updatedAudiences));
              }
            } catch {
              // If parsing fails, just set as single audience array
              handleInputChange('buyer_profile', JSON.stringify([{
                name: 'Primary Audience',
                profile: data.buyerProfile
              }]));
            }
          } else {
            // Fallback: set as plain string (backward compatibility)
            handleInputChange('buyer_profile', data.buyerProfile);
          }

          showNotification('Perfect! Who you are talking to is clear now.', 'success');
        }
      }
    } catch (error) {
      console.error('Andora suggestion error:', error);
      showNotification('Hmm, that did not work. Mind trying again?', 'info');
    } finally {
      setIsGeneratingAI(prev => ({ ...prev, [field]: false }));
    }
  };

  return (
    <div className="relative min-w-0 overflow-x-hidden">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-6 sm:space-y-8 lg:space-y-10">
        <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-primary-500/20 bg-gradient-to-br from-primary-600 via-purple-600 to-slate-900 text-white shadow-xl">
          <div
            className="absolute inset-0 opacity-40 mix-blend-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.35),transparent_65%)]"
            aria-hidden
          />
          <div className="relative z-10 flex flex-col gap-4 sm:gap-6 lg:flex-row lg:items-center lg:justify-between p-4 sm:p-6 lg:p-8">
            <div className="space-y-3 sm:space-y-5 max-w-2xl min-w-0">
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.4em] text-white/70">
                <Compass className="w-4 h-4" />
                Brand profile
              </span>
              <div className="space-y-2 sm:space-y-3">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold leading-tight break-words">Set Your Company's Strategic Foundation</h1>
                <p className="text-xs sm:text-sm lg:text-base text-white/80 leading-relaxed">
                  Provide the essential details about your company, and Py will generate content, campaigns, and communications that align with your brand voice.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-white/80">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Guided by Py
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1">
                  <Save className="w-3.5 h-3.5" />
                  {isSaving ? 'Saving…' : 'Autosaved'}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1">
                  <Clock className="w-3.5 h-3.5" />
                  {getTimezoneLabel(localBrand.timezone)}
                </span>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 sm:gap-6 lg:gap-8 lg:grid-cols-[minmax(0,1fr),minmax(280px,300px)] items-start">
          <div className="space-y-4 sm:space-y-6 lg:space-y-8 min-w-0">
            <SectionCard
              id="identity"
              title="Core Identity"
              description="Define your company's core identity, promise, and market presence."
              icon={<Compass className="w-5 h-5" />}
            >
              <div className="space-y-5">
                <Input
                  label="Company Name"
                  value={localBrand.brand_name || ''}
                  onChange={(e) => handleInputChange('brand_name', e.target.value)}
                  placeholder="Your Company Name"
                  maxLength={ANDORA_CHAR_LIMITS.brand_name}
                  helperText={`${(localBrand.brand_name || '').length}/${ANDORA_CHAR_LIMITS.brand_name}`}
                />

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-600">Company Type</label>
                  <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleInputChange('brand_type', 'individual')}
                      className={`rounded-xl border-2 px-3 sm:px-4 py-3 sm:py-4 text-left transition-all ${
                        (localBrand.brand_type || 'organization') === 'individual'
                          ? 'border-primary-500 bg-primary-500/10 text-primary-700 shadow-sm'
                          : 'border-slate-200 hover:border-primary-300 text-slate-600'
                      }`}
                    >
                      <User className="w-5 h-5 sm:w-6 sm:h-6 mb-2" />
                      <div className="font-semibold text-sm sm:text-base">Individual</div>
                      <p className="text-xs mt-1 text-slate-500">Personal Brand (1 profile)</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInputChange('brand_type', 'organization')}
                      className={`rounded-xl border-2 px-3 sm:px-4 py-3 sm:py-4 text-left transition-all ${
                        (localBrand.brand_type || 'organization') === 'organization'
                          ? 'border-primary-500 bg-primary-500/10 text-primary-700 shadow-sm'
                          : 'border-slate-200 hover:border-primary-300 text-slate-600'
                      }`}
                    >
                      <Users className="w-5 h-5 sm:w-6 sm:h-6 mb-2" />
                      <div className="font-semibold text-sm sm:text-base">Organization</div>
                      <p className="text-xs mt-1 text-slate-500">Team/Company (Multiple profiles)</p>
                    </button>
                  </div>
                </div>

                <div className="rounded-lg sm:rounded-xl border border-slate-200/80 bg-slate-50/50 px-3 sm:px-4 py-2 sm:py-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleInputChange('reverse_positioning', !localBrand.reverse_positioning)}
                    className="flex w-full items-center justify-between gap-2 sm:gap-3 text-left min-w-0"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      {localBrand.reverse_positioning ? (
                        <ToggleRight className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600 shrink-0" />
                      ) : (
                        <ToggleLeft className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-medium text-slate-700">Audience-first approach</p>
                        <p className="text-[10px] sm:text-xs text-slate-500 break-words">
                          {localBrand.reverse_positioning
                            ? 'Enabled — Market-first: Product → Audience → Vision/Mission'
                            : 'Disabled — Traditional: Vision/Mission → Product → Audience'}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-medium shrink-0 ${
                        localBrand.reverse_positioning ? 'bg-primary-100 text-primary-700' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {localBrand.reverse_positioning ? 'On' : 'Off'}
                    </span>
                  </button>
                </div>

                <Input
                  label="Tagline"
                  value={localBrand.taglines || ''}
                  onChange={(e) => handleInputChange('taglines', e.target.value)}
                  placeholder="Your Brand Tagline"
                  maxLength={ANDORA_CHAR_LIMITS.taglines}
                  helperText={`${(localBrand.taglines || '').length}/${ANDORA_CHAR_LIMITS.taglines}`}
                />

                <Textarea
                  label={(localBrand.brand_type || 'organization') === 'individual' ? 'About You' : 'About Your Brand'}
                  value={localBrand.about || ''}
                  onChange={(e) => handleInputChange('about', e.target.value)}
                  placeholder={
                    (localBrand.brand_type || 'organization') === 'individual'
                      ? 'Tell us about you — your background, expertise, passions, values, what makes you unique.'
                      : 'Tell us about your brand — your story, what you do, your team culture, values, and what makes you unique.'
                  }
                  rows={4}
                  maxLength={ANDORA_CHAR_LIMITS.about}
                  helperText={`${(localBrand.about || '').length}/${ANDORA_CHAR_LIMITS.about}`}
                />

                <div className="relative">
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-600">
                    <Clock className="w-4 h-4" />
                    Timezone
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowTimezoneDropdown(!showTimezoneDropdown)}
                    className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white/80 px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-primary-300"
                  >
                    <span>{getTimezoneLabel(localBrand.timezone)}</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showTimezoneDropdown && (
                    <div className="absolute z-50 mt-2 max-h-64 w-full overflow-y-auto rounded-lg border border-primary-200 bg-white shadow-xl">
                      {COMMON_TIMEZONES.map((tz) => (
                        <button
                          key={tz.value}
                          type="button"
                          onClick={() => handleTimezoneChange(tz.value)}
                          className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm transition-colors ${
                            localBrand.timezone === tz.value ? 'bg-primary-500/10 text-primary-600' : 'hover:bg-primary-500/10'
                          }`}
                        >
                          <span>{tz.label}</span>
                          <span className="text-xs text-slate-500">{tz.offset}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="mt-1 text-xs text-slate-500">Set your local timezone to sync scheduling and campaign launches.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">
                    {(localBrand.brand_type || 'organization') === 'individual' ? 'Product/Offer' : 'Products & Services'}
                  </label>
                  <ProductCarousel
                    value={localBrand.products || ''}
                    onChange={(value) => handleInputChange('products', value)}
                    placeholder={
                      (localBrand.brand_type || 'organization') === 'individual'
                        ? 'Describe your signature offer, service, or expertise.'
                        : 'Outline your core products, services, or solutions.'
                    }
                  />
                </div>

                <Input
                  label="Brand Colors (Optional)"
                  value={localBrand.colors || ''}
                  onChange={(e) => handleInputChange('colors', e.target.value)}
                  placeholder="#2563eb, #7c3aed, #dc2626"
                  maxLength={ANDORA_CHAR_LIMITS.colors}
                  helperText={`${(localBrand.colors || '').length}/${ANDORA_CHAR_LIMITS.colors}`}
                />
              </div>
            </SectionCard>

            {localBrand.reverse_positioning && (
              <SectionCard
                id="audience-insights"
                title="Audience-first lens"
                description="You flipped the script. Map the humans before the hero."
                icon={<Globe className="w-5 h-5" />}
              >
                {renderAudienceSection()}
              </SectionCard>
            )}

            <SectionCard
              id="strategy"
              title="Strategic Foundations"
              description="Define the future you're building, and Py will keep every communication aligned with that vision."
              icon={<Target className="w-5 h-5" />}
            >
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-600">Vision</label>
                    <button
                      onClick={() => handleAISuggest('vision')}
                      disabled={isGeneratingAI['vision']}
                      className="flex items-center gap-2 text-xs font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50"
                    >
                      <Sparkles size={14} />
                      {isGeneratingAI['vision'] ? "I'm thinking…" : 'Ask me'}
                    </button>
                  </div>
                  <Textarea
                    value={localBrand.vision || ''}
                    onChange={(e) => handleInputChange('vision', e.target.value)}
                    placeholder="Your brand's vision..."
                    rows={3}
                    maxLength={ANDORA_CHAR_LIMITS.vision}
                    helperText={`${(localBrand.vision || '').length}/${ANDORA_CHAR_LIMITS.vision}`}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-600">Mission</label>
                    <button
                      onClick={() => handleAISuggest('mission')}
                      disabled={isGeneratingAI['mission']}
                      className="flex items-center gap-2 text-xs font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50"
                    >
                      <Sparkles size={14} />
                      {isGeneratingAI['mission'] ? "I'm thinking…" : 'Ask me'}
                    </button>
                  </div>
                  <Textarea
                    value={localBrand.mission || ''}
                    onChange={(e) => handleInputChange('mission', e.target.value)}
                    placeholder="Your brand's mission..."
                    rows={3}
                    maxLength={ANDORA_CHAR_LIMITS.mission}
                    helperText={`${(localBrand.mission || '').length}/${ANDORA_CHAR_LIMITS.mission}`}
                  />
                </div>
              </div>
            </SectionCard>

            <SectionCard
              id="tone"
              title="Tone of Voice"
              description="Define your company's language, style, and personality to ensure consistent and authentic communication."
              icon={<Palette className="w-5 h-5" />}
            >
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-600">Your company's tone of voice</label>
                    <button
                      onClick={() => handleAISuggest('persona')}
                      disabled={isGeneratingAI['persona']}
                      className="flex items-center gap-2 text-xs font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50"
                    >
                      <Sparkles size={14} />
                      {isGeneratingAI['persona'] ? "I'm thinking…" : 'Ask me'}
                    </button>
                  </div>
                  <Textarea
                    value={localBrand.persona || ''}
                    onChange={(e) => handleInputChange('persona', e.target.value)}
                    placeholder="e.g., Professional yet approachable, innovative, trustworthy"
                    rows={3}
                    maxLength={ANDORA_CHAR_LIMITS.persona}
                    helperText={`${(localBrand.persona || '').length}/${ANDORA_CHAR_LIMITS.persona}`}
                  />
                </div>

                {!localBrand.reverse_positioning && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-slate-600">
                      Target Audiences
                      <span className="block text-xs font-normal text-slate-500 mt-1">
                        Define your audience segments — who they are, what they need, and what they care about.
                      </span>
                    </label>
                    <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
                      <p className="text-xs text-slate-700">
                        💡 <strong>Multiple Audiences:</strong> Create different audience segments for each product/service. The first is your key audience.
                      </p>
                    </div>
                    <AudienceCarousel
                      value={localBrand.buyer_profile || ''}
                      products={(() => {
                        try {
                          return JSON.parse(localBrand.products || '[]');
                        } catch {
                          return [];
                        }
                      })()}
                      onChange={(value) => handleInputChange('buyer_profile', value)}
                      onAISuggest={async (audienceIndex) => {
                        await handleAISuggest('buyer_profile', audienceIndex);
                      }}
                      isGeneratingAI={isGeneratingAI['buyer_profile']}
                      placeholder="Fill in the simple prompts to outline this audience segment."
                    />
                  </div>
                )}
              </div>
            </SectionCard>


          </div>

          <aside className="space-y-4 sm:space-y-6 lg:sticky lg:top-28 min-w-0">
            {/* Profile Completion */}
            <div className="rounded-xl sm:rounded-2xl border border-primary-200/70 bg-gradient-to-br from-primary-50/80 to-white p-3 sm:p-4 lg:p-6 shadow-sm backdrop-blur min-w-0">
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">Profile Completion</p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-primary-900">{completionPercent}%</span>
                    <span className="text-sm text-slate-600">complete</span>
                  </div>
                  <div className="mt-3 h-2 w-full rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary-500 to-purple-500 transition-all duration-500"
                      style={{ width: `${completionPercent}%` }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {completionChecklist.map(item => (
                    <span
                      key={item.label}
                      className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 ${
                        item.complete ? 'bg-emerald-50/80 text-emerald-700' : 'bg-slate-100/80 text-slate-500'
                      }`}
                    >
                      <CheckCircle className={`w-3.5 h-3.5 ${item.complete ? 'text-emerald-500' : 'text-slate-400'}`} />
                      <span className="truncate">{item.label}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-xl sm:rounded-2xl border border-slate-200/70 bg-white/90 p-3 sm:p-4 lg:p-6 shadow-sm backdrop-blur min-w-0">
              <div className="space-y-2 sm:space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Brand snapshot</p>
                <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-slate-900 break-words">
                  {localBrand.brand_name || 'Name your brand'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed break-words">
                  {localBrand.taglines || 'Drop a tagline so your team has a one-line rallying cry.'}
                </p>
              </div>
              <div className="mt-5 space-y-3 text-sm text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Type</span>
                  <span className="rounded-full bg-primary-500/10 px-3 py-1 text-xs font-semibold text-primary-700">
                    {(localBrand.brand_type || 'organization').charAt(0).toUpperCase() + (localBrand.brand_type || 'organization').slice(1)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Timezone</span>
                  <span>{getTimezoneLabel(localBrand.timezone)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Channels</span>
                  <span>{localBrand.channels.length || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Audience-first</span>
                  <span className={`font-medium ${localBrand.reverse_positioning ? 'text-primary-600' : 'text-slate-500'}`}>
                    {localBrand.reverse_positioning ? 'Enabled' : 'Classic'}
                  </span>
                </div>
              </div>
              <div className="mt-6">
                <Button
                  onClick={handleCopyAll}
                  variant="outline"
                  size="sm"
                  disabled={!canCopyAll}
                  className={`w-full ${
                    !canCopyAll ? 'cursor-not-allowed opacity-60' : 'border-primary-300 text-primary-700 hover:bg-primary-50'
                  }`}
                >
                  <Copy size={16} className="mr-2" />
                  Copy profile
                  {!canCopyAll && (
                    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                      Admin
                    </span>
                  )}
                </Button>
              </div>
            </div>

            <div className="rounded-xl sm:rounded-2xl border border-slate-200/70 bg-white/90 p-3 sm:p-4 lg:p-6 shadow-sm backdrop-blur min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Journey</p>
              <div className="mt-4 space-y-4">
                {journeyMoments.map((moment, index) => (
                  <a
                    key={moment.id}
                    href={`#${moment.id}`}
                    className="group flex items-start gap-3 rounded-xl border border-transparent px-3 py-2 transition-colors hover:border-primary-200 hover:bg-primary-50/60"
                  >
                    <div
                      className={`mt-1 flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold ${
                        moment.complete ? 'border-emerald-400 bg-emerald-50 text-emerald-600' : 'border-slate-300 bg-white text-slate-400'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-700 group-hover:text-primary-700">{moment.label}</p>
                      <p className="text-xs text-slate-500">{moment.description}</p>
                    </div>
                    {moment.complete && <CheckCircle className="mt-1 h-4 w-4 text-emerald-500" />}
                  </a>
                ))}
              </div>
            </div>

            <div className="rounded-xl sm:rounded-2xl border border-slate-200/70 bg-white/90 p-3 sm:p-4 lg:p-6 shadow-sm backdrop-blur min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Highlights</p>
              <div className="mt-4 space-y-4">
                {highlightItems.map((item, idx) => (
                  <div key={idx} className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {item.icon}
                      {item.label}
                    </div>
                    <p className="mt-2 text-sm text-slate-700 leading-relaxed">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Ready to define your team? Jump to the personnel studio when your essentials feel sharp.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              onClick={handleCopyAll}
              variant="outline"
              size="lg"
              disabled={!canCopyAll}
              className={`w-full sm:w-auto ${
                !canCopyAll ? 'cursor-not-allowed opacity-60' : 'border-primary-300 text-primary-700 hover:bg-primary-50'
              }`}
            >
              <Copy size={18} className="mr-2" />
              Copy all fields
              {!canCopyAll && (
                <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-700">
                  Admin
                </span>
              )}
            </Button>
            <Button
              onClick={() => navigate('/dashboard/personnel')}
              size="lg"
              className="w-full bg-gradient-to-r from-primary-600 to-purple-600 text-white shadow-lg transition hover:from-primary-700 hover:to-purple-700 sm:w-auto"
            >
              Continue to Team Setup
              <ArrowRight size={20} className="ml-2" />
            </Button>
          </div>
        </div>
      </div>

      {/* Notification Cards */}
      <div className="fixed top-20 right-4 z-50 space-y-3">
        {notifications.map((notification, index) => (
          <div
            key={notification.id}
            className="animate-slide-in-right"
            style={{
              animation: `slideInRight 0.5s ease-out ${index * 0.1}s both`,
            }}
          >
            <NotificationBubble
              message={notification.message}
              type={notification.type}
              onClose={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
            />
          </div>
        ))}
      </div>

      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.5s ease-out both;
        }
      `}</style>
    </div>
  );
};
