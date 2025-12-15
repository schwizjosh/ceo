import { useState, useCallback, useEffect } from 'react';
import { AppState, Brand, Event, User, Page, CastGenerationOptions } from '../types';
import { apiClient } from '../lib/api';
import { aiService } from '../services/aiService';

// Demo data for demo accounts
const DEMO_BRANDS: Brand[] = [
  {
    brand_id: 'demo-brand-1',
    user_id: 'demo-user-123',
    brand_name: 'TechFlow Solutions',
    taglines: 'Streamlining business through intelligent technology',
    about: 'We help mid-market businesses transform their operations with cutting-edge technology solutions that actually work.',
    vision: 'A world where technology empowers every business to reach its full potential',
    mission: 'To provide intuitive, powerful technology solutions with exceptional support',
    products: 'Cloud infrastructure, business automation tools, custom software development',
    persona: 'Professional yet approachable, innovative but practical, expert without being condescending',
    buyer_profile: 'Mid-market business owners and CTOs looking for reliable technology partners',
    colors: '#2563eb, #7c3aed, #dc2626',
    brand_hq_location: 'Austin, Texas',
    timezone: 'America/Chicago',
    channels: ['LinkedIn', 'X', 'Blog', 'Email'],
    posting_frequency: 4,
    preferred_posting_days: ['monday', 'tuesday', 'thursday', 'friday'],
    narrative_why: 'TechFlow exists because businesses deserve technology that works for them, not against them.',
    narrative_problem: 'Many businesses struggle with outdated systems and complex technology that slows them down.',
    narrative_solution: 'We provide streamlined, user-friendly technology solutions with dedicated support.',
    narrative_cta: 'Transform your business operations with technology that actually works.',
    narrative_failure: 'Without proper technology support, businesses waste time and fall behind competitors.',
    narrative_success: 'With our solutions, businesses achieve greater efficiency and focus on growth.',
    cast_management: [
      {
        id: 'char-1',
        name: 'Alex Chen',
        persona: 'The Visionary CEO',
        description: 'Forward-thinking leader who sees the big picture and inspires innovation',
        location: 'Austin, TX',
        role: 'Visionary CEO',
        work_mode: 'on-site',
        brand_connection: 'Co-founder and face of the brand who steers the mission.',
        isPerfect: true
      },
      {
        id: 'char-2',
        name: 'Sarah Martinez',
        persona: 'The Problem Solver',
        description: 'Head of Customer Success who turns challenges into opportunities',
        location: 'Austin, TX',
        role: 'Customer Success Lead',
        work_mode: 'remote',
        brand_connection: 'Frontline expert ensuring customers feel the transformation.',
        isPerfect: false
      }
    ],
    monthly_themes: {
      '2024-09': 'Innovation in Action - Showcasing real-world transformations'
    },
    weekly_subplots: {
      '2024-09_week_1': 'Client Spotlight Week - Real results from real clients'
    },
    monthly_calendars: {},
    season_plans: {
      '2024-09': {
        month: '2024-09',
        theme: 'Innovation in Action - Showcasing real-world transformations',
        themePerfect: true,
        monthlyPlot: 'The TechFlow team pulls back the curtain to reveal how innovation becomes tangible for real businesses.',
        plotPerfect: false,
        weekly: {
          1: {
            week: 1,
            subplot: 'Client Spotlight Week - Real results from real clients',
            subplotPerfect: true,
            custom_theme: 'Celebrating wins'
          },
          2: { week: 2, subplot: '', subplotPerfect: false },
          3: { week: 3, subplot: '', subplotPerfect: false },
          4: { week: 4, subplot: '', subplotPerfect: false }
        }
      }
    },
    team_members: [
      {
        id: 'team-1',
        name: 'Alex Chen',
        email: 'alex@techflow.ai',
        role: 'Founder',
        permissions: {
          configuration: 'edit',
          plots: 'edit',
          events: 'edit',
          seasons: 'edit',
          monthly: 'edit',
          chat: 'edit'
        }
      },
      {
        id: 'team-2',
        name: 'Bianca Rivers',
        email: 'bianca@techflow.ai',
        role: 'Content Strategist',
        permissions: {
          configuration: 'view',
          plots: 'edit',
          events: 'view',
          seasons: 'edit',
          monthly: 'edit',
          chat: 'view'
        }
      }
    ]
  }
];

const DEMO_EVENTS: Event[] = [
  {
    event_id: 'demo-event-1',
    brand_id: 'demo-brand-1',
    user_id: 'demo-user-123',
    title: 'Product Launch',
    description: 'Launch of our new automation platform',
    event_date: '2024-09-15'
  },
  {
    event_id: 'demo-event-2',
    brand_id: 'demo-brand-1',
    user_id: 'demo-user-123',
    title: 'Tech Conference',
    description: 'Speaking at Austin Tech Summit',
    event_date: '2024-09-22'
  }
];

export const useAppState = (user: User | null) => {
  // Helper functions for brand selection persistence
  const getBrandStorageKey = (userId: string) => `andora_currentBrand_${userId}`;

  const getStoredBrandId = (userId: string): string | null => {
    try {
      return localStorage.getItem(getBrandStorageKey(userId));
    } catch (error) {
      console.error('Error reading stored brand ID:', error);
      return null;
    }
  };

  const storeBrandId = (userId: string, brandId: string | null) => {
    try {
      if (brandId) {
        localStorage.setItem(getBrandStorageKey(userId), brandId);
      } else {
        localStorage.removeItem(getBrandStorageKey(userId));
      }
    } catch (error) {
      console.error('Error storing brand ID:', error);
    }
  };

  const [appState, setAppState] = useState<AppState>({
    currentBrandId: null,
    user,
    brands: [],
    events: [],
    isSettingsOpen: false,
    isGenerating: false,
    generationStatus: ''
  });
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const isDemoUser = (userId: string) => {
    return userId === 'demo-user-123' || userId === 'admin-user-123';
  };

  // Persist brand selection to localStorage whenever it changes
  useEffect(() => {
    if (user && appState.currentBrandId) {
      storeBrandId(user.user_id, appState.currentBrandId);
      console.log('💾 Saved brand selection to localStorage:', appState.currentBrandId);
    }
  }, [appState.currentBrandId, user]);

  // Load user data when user changes
  useEffect(() => {
    if (user) {
      setAppState(prev => ({ ...prev, user }));
      if (isDemoUser(user.user_id)) {
        loadDemoData();
        setShowOnboarding(false); // Demo users skip onboarding
      } else {
        loadUserData(user.user_id);
      }
    } else {
      setAppState({
        currentBrandId: null,
        user: null,
        brands: [],
        events: [],
        isSettingsOpen: false,
        isGenerating: false,
        generationStatus: ''
      });
      setIsDataLoaded(false);
      setShowOnboarding(false);
    }
  }, [user]);

  const loadDemoData = () => {
    if (!user) return;

    // Try to restore demo user's brand selection from localStorage
    const storedBrandId = getStoredBrandId(user.user_id);
    const selectedBrandId = (storedBrandId && DEMO_BRANDS.some(b => b.brand_id === storedBrandId))
      ? storedBrandId
      : DEMO_BRANDS[0].brand_id;

    setAppState(prev => ({
      ...prev,
      brands: DEMO_BRANDS,
      events: DEMO_EVENTS,
      currentBrandId: selectedBrandId
    }));
    setIsDataLoaded(true);

    console.log('✅ Demo data loaded with brand:', selectedBrandId);
  };

  const loadUserData = async (userId: string) => {
    try {
      console.log('📊 Loading user data for:', userId);
      
      // Load brands
      const brandsData = await apiClient.getBrands();
      console.log('✅ Brands loaded:', brandsData.length);

      // Load characters for each brand from the brand_characters table
      const brandsWithCharacters = await Promise.all(brandsData.map(async (brand) => {
        // Fetch characters from the separate brand_characters table
        const characters = await apiClient.getCharacters(brand.id);

        return {
          brand_id: brand.id,
          user_id: brand.user_id,
          brand_name: brand.brand_name,
          brand_type: brand.brand_type || 'organization',
          reverse_positioning: brand.reverse_positioning || false,
          taglines: brand.taglines || '',
          about: brand.about || '',
          vision: brand.vision || '',
          mission: brand.mission || '',
          products: brand.products || '',
          persona: brand.persona || '',
          buyer_profile: brand.buyer_profile || '',
          colors: brand.colors || '',
          brand_hq_location: brand.brand_hq_location || '',
          timezone: brand.timezone || 'UTC',
          channels: brand.channels || [],
          channel_schedule: brand.channel_schedule || {},
          narrative_why: brand.narrative_why || '',
          narrative_problem: brand.narrative_problem || '',
          narrative_solution: brand.narrative_solution || '',
          narrative_cta: brand.narrative_cta || '',
          narrative_failure: brand.narrative_failure || '',
          narrative_success: brand.narrative_success || '',
          narrative_perfect_fields: brand.narrative_perfect_fields || {},
          cast_management: characters, // Use fresh characters from brand_characters table with is_muted field
          monthly_themes: (brand.monthly_themes as any) || {},
          weekly_subplots: (brand.weekly_subplots as any) || {},
          monthly_calendars: (brand.monthly_calendars as any) || {},
          season_plans: (brand.season_plans as any) || {},
          team_members: (brand.team_members as any) || []
        };
      }));

      const transformedBrands: Brand[] = brandsWithCharacters;

      // Load events for all brands
      let allEvents: Event[] = [];
      for (const brand of transformedBrands) {
        const eventsData = await apiClient.getEvents(brand.brand_id);
        
        const transformedEvents: Event[] = eventsData.map(event => ({
          event_id: event.id,
          brand_id: event.brand_id,
          user_id: event.user_id,
          title: event.title,
          description: event.description || '',
          event_date: event.event_date
        }));
        allEvents = [...allEvents, ...transformedEvents];
      }

      setAppState(prev => {
        // Try to restore brand from localStorage first, then preserve current selection, then default to first
        const storedBrandId = getStoredBrandId(userId);
        let selectedBrandId: string | null = null;

        // Priority 1: Check if stored brand exists in loaded brands
        if (storedBrandId && transformedBrands.some(b => b.brand_id === storedBrandId)) {
          selectedBrandId = storedBrandId;
          console.log('✅ Restored brand from localStorage:', storedBrandId);
        }
        // Priority 2: Keep current selection if it exists
        else if (prev.currentBrandId && transformedBrands.some(b => b.brand_id === prev.currentBrandId)) {
          selectedBrandId = prev.currentBrandId;
          console.log('✅ Preserved current brand selection:', prev.currentBrandId);
        }
        // Priority 3: Default to first brand
        else if (transformedBrands.length > 0) {
          selectedBrandId = transformedBrands[0].brand_id;
          console.log('✅ Defaulting to first brand:', selectedBrandId);
        }

        // Store the selected brand for next time
        if (selectedBrandId) {
          storeBrandId(userId, selectedBrandId);
        }

        return {
          ...prev,
          brands: transformedBrands,
          events: allEvents,
          currentBrandId: selectedBrandId
        };
      });
      
      // For new users (no brands), we just show the create brand screen, so no special logic needed here.
      setIsDataLoaded(true);
    } catch (error) {
      console.error('❌ Error loading user data:', error);
      // If there's an error (e.g., network), we'll still mark data as loaded
      // to avoid an infinite loading spinner. The dashboard will show an error state.
      setIsDataLoaded(true);
    }
  };

  const updateState = useCallback((updates: Partial<AppState>) => {
    setAppState(prev => ({ ...prev, ...updates }));
  }, []);

  const getCurrentBrand = useCallback(() => {
    return appState.brands.find(brand => brand.brand_id === appState.currentBrandId);
  }, [appState.brands, appState.currentBrandId]);

  const generateCast = useCallback(async (brandId: string, options: CastGenerationOptions) => {
    if (!appState.user) return [];
    const brand = appState.brands.find(b => b.brand_id === brandId);
    if (!brand) return [];

    updateState({ isGenerating: true, generationStatus: 'Generating cast...' });
    try {
      const newCast = await aiService.generateCast(brand, options, appState.user.preferred_ai_model);
      return newCast;
    } catch (error) {
      console.error('Error generating cast:', error);
      return [];
    } finally {
      updateState({ isGenerating: false, generationStatus: '' });
    }
  }, [appState.user, appState.brands, updateState]);

  const updateBrand = useCallback(async (brandId: string, updates: Partial<Brand>) => {
    // For demo users, just update local state
    if (appState.user && isDemoUser(appState.user.user_id)) {
      setAppState(prev => ({
        ...prev,
        brands: prev.brands.map(brand => 
          brand.brand_id === brandId ? { ...brand, ...updates } : brand
        )
      }));
      return;
    }

    try {
      // Update via API
      await apiClient.updateBrand(brandId, updates);

      // Update local state
      setAppState(prev => ({
        ...prev,
        brands: prev.brands.map(brand => 
          brand.brand_id === brandId ? { ...brand, ...updates } : brand
        )
      }));
    } catch (error) {
      console.error('Error updating brand:', error);
    }
  }, [appState.user]);

  const addEvent = useCallback(async (event: Omit<Event, 'event_id'>) => {
    console.log('🎯 addEvent called with:', event);

    // For demo users, just update local state
    if (appState.user && isDemoUser(appState.user.user_id)) {
      console.log('👤 Demo user - adding event to local state');
      const newEvent: Event = {
        ...event,
        event_id: `demo-event-${Date.now()}`
      };
      setAppState(prev => ({
        ...prev,
        events: [...prev.events, newEvent]
      }));
      console.log('✅ Demo event added to state');
      return;
    }

    try {
      console.log('📡 Calling API to create event...');
      const data = await apiClient.createEvent(event);
      console.log('✅ API response:', data);

      const newEvent: Event = {
        event_id: data.id,
        brand_id: data.brand_id,
        user_id: data.user_id,
        title: data.title,
        description: data.description || '',
        event_date: data.event_date
      };

      setAppState(prev => ({
        ...prev,
        events: [...prev.events, newEvent]
      }));
      console.log('✅ Event added to state:', newEvent);
    } catch (error) {
      console.error('❌ Error adding event:', error);
    }
  }, [appState.user]);

  const updateEvent = useCallback(async (eventId: string, updates: Partial<Event>) => {
    // For demo users, just update local state
    if (appState.user && isDemoUser(appState.user.user_id)) {
      setAppState(prev => ({
        ...prev,
        events: prev.events.map(event =>
          event.event_id === eventId ? { ...event, ...updates } : event
        )
      }));
      return;
    }

    try {
      await apiClient.updateEvent(eventId, updates);

      setAppState(prev => ({
        ...prev,
        events: prev.events.map(event =>
          event.event_id === eventId ? { ...event, ...updates } : event
        )
      }));
    } catch (error) {
      console.error('Error updating event:', error);
    }
  }, [appState.user]);

  const deleteEvent = useCallback(async (eventId: string) => {
    // For demo users, just update local state
    if (appState.user && isDemoUser(appState.user.user_id)) {
      setAppState(prev => ({
        ...prev,
        events: prev.events.filter(event => event.event_id !== eventId)
      }));
      return;
    }

    try {
      await apiClient.deleteEvent(eventId);

      setAppState(prev => ({
        ...prev,
        events: prev.events.filter(event => event.event_id !== eventId)
      }));
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  }, [appState.user]);

  const createBrand = useCallback(async (name: string, userId: string) => {
    console.log('🏢 Creating brand:', { name, userId, isDemoUser: isDemoUser(userId) });

    // For demo users, just update local state
    if (isDemoUser(userId)) {
      const newBrand: Brand = {
        brand_id: `demo-brand-${Date.now()}`,
        user_id: userId,
        brand_name: name,
        brand_type: 'organization',
        reverse_positioning: false,
        taglines: '',
        about: '',
        vision: '',
        mission: '',
        products: '',
        persona: '',
        buyer_profile: '',
        colors: '',
        brand_hq_location: '',
        timezone: appState.user?.timezone || 'UTC',
        channels: [],
        channel_schedule: {},
        narrative_why: '',
        narrative_problem: '',
        narrative_solution: '',
        narrative_cta: '',
        narrative_failure: '',
        narrative_success: '',
        monthly_themes: {},
        weekly_subplots: {},
        monthly_calendars: {},
        cast_management: [],
        season_plans: {},
        team_members: []
      };

      console.log('✅ Demo brand created locally');
      setAppState(prev => ({
        ...prev,
        brands: [...prev.brands, newBrand],
        currentBrandId: newBrand.brand_id
      }));
      return;
    }

    try {
      console.log('📡 Creating brand via API...');
      const brandData = await apiClient.createBrand({
        brand_name: name,
        timezone: appState.user?.timezone || 'Africa/Lagos'
      });

      console.log('✅ API response:', brandData);

      const newBrand: Brand = {
        brand_id: brandData.id,
        user_id: brandData.user_id,
        brand_name: brandData.brand_name,
        brand_type: brandData.brand_type || 'organization',
        reverse_positioning: brandData.reverse_positioning || false,
        taglines: brandData.taglines || '',
        about: brandData.about || '',
        vision: brandData.vision || '',
        mission: brandData.mission || '',
        products: brandData.products || '',
        persona: brandData.persona || '',
        buyer_profile: brandData.buyer_profile || '',
        colors: brandData.colors || '',
        brand_hq_location: brandData.brand_hq_location || '',
        timezone: brandData.timezone || 'UTC',
        channels: brandData.channels || [],
        channel_schedule: brandData.channel_schedule || {},
        narrative_why: brandData.narrative_why || '',
        narrative_problem: brandData.narrative_problem || '',
        narrative_solution: brandData.narrative_solution || '',
        narrative_cta: brandData.narrative_cta || '',
        narrative_failure: brandData.narrative_failure || '',
        narrative_success: brandData.narrative_success || '',
        monthly_themes: brandData.monthly_themes || {},
        weekly_subplots: brandData.weekly_subplots || {},
        monthly_calendars: brandData.monthly_calendars || {},
        cast_management: brandData.cast_management || [],
        season_plans: brandData.season_plans || {},
        team_members: brandData.team_members || []
      };

      setAppState(prev => ({
        ...prev,
        brands: [...prev.brands, newBrand],
        currentBrandId: newBrand.brand_id
      }));

      console.log('✅ Brand creation complete!');
    } catch (error) {
      console.error('❌ Error creating brand:', error);
      throw error; // Re-throw so the calling function can handle it
    }
  }, [appState.user]);

  const prefillNarrative = useCallback(async (brandId: string) => {
    if (!appState.user) return;
    const brand = appState.brands.find(b => b.brand_id === brandId);
    if (!brand) return;

    updateState({ isGenerating: true, generationStatus: 'Prefilling narrative...' });
    try {
      const narrative = await aiService.prefillNarrative(brand, appState.user.preferred_ai_model);
      updateBrand(brandId, narrative);
    } catch (error) {
      console.error('Error prefilling narrative:', error);
    } finally {
      updateState({ isGenerating: false, generationStatus: '' });
    }
  }, [appState.user, appState.brands, updateBrand]);

  const generateTheme = useCallback(async (brandId: string, month: string) => {
    if (!appState.user) return;
    const brand = appState.brands.find(b => b.brand_id === brandId);
    if (!brand) return;

    updateState({ isGenerating: true, generationStatus: 'Generating theme...' });
    try {
      const { theme, explanation } = await aiService.generateTheme(
        brand,
        month,
        appState.events,
        appState.user.preferred_ai_model
      );
      const updates = {
        monthly_themes: {
          ...brand.monthly_themes,
          [month]: explanation?.trim()
            ? { theme, explanation, description: explanation }
            : theme,
        },
      };
      updateBrand(brandId, updates);
    } catch (error) {
      console.error('Error generating theme:', error);
    } finally {
      updateState({ isGenerating: false, generationStatus: '' });
    }
  }, [appState.user, appState.brands, appState.events, updateBrand]);

  const generateWeeklySubplot = useCallback(async (brandId: string, month: string, week: number, theme: string, previousSubplot?: string) => {
    if (!appState.user) return;
    const brand = appState.brands.find(b => b.brand_id === brandId);
    if (!brand) return;

    updateState({ isGenerating: true, generationStatus: 'Generating subplot...' });
    try {
      const subplot = await aiService.generateWeeklySubplot(brand, month, week, theme, appState.events, previousSubplot, appState.user.preferred_ai_model);
      const updates = {
        weekly_subplots: {
          ...brand.weekly_subplots,
          [`${month}_week_${week}`]: subplot,
        },
      };
      updateBrand(brandId, updates);
    } catch (error) {
      console.error('Error generating subplot:', error);
    } finally {
      updateState({ isGenerating: false, generationStatus: '' });
    }
  }, [appState.user, appState.brands, appState.events, updateBrand]);

  const expandBrief = useCallback(async (brandId: string, contentItem: any, instructions?: string) => {
    if (!appState.user) return;
    const brand = appState.brands.find(b => b.brand_id === brandId);
    if (!brand) return;

    updateState({ isGenerating: true, generationStatus: 'Expanding brief...' });
    try {
      const expandedBrief = await aiService.expandBrief(
        contentItem,
        brand,
        appState.user.preferred_ai_model,
        instructions,
        brand.cast_management ?? []
      );
      // Here you would update the content item in your state
    } catch (error) {
      console.error('Error expanding brief:', error);
    } finally {
      updateState({ isGenerating: false, generationStatus: '' });
    }
  }, [appState.user, appState.brands]);

  const refineContent = useCallback(async (brandId: string, brief: string, instructions: string, itemDate: string) => {
    if (!appState.user) return;
    const brand = appState.brands.find(b => b.brand_id === brandId);
    if (!brand) return;

    updateState({ isGenerating: true, generationStatus: 'Refining content...' });
    try {
      const refinedContent = await aiService.refineContent(
        brand,
        brief,
        instructions,
        itemDate,
        brand.cast_management ?? [],
        appState.user.preferred_ai_model
      );
      // Here you would update the content item in your state
    } catch (error) {
      console.error('Error refining content:', error);
    } finally {
      updateState({ isGenerating: false, generationStatus: '' });
    }
  }, [appState.user, appState.brands]);

  return {
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
    prefillNarrative,
    generateTheme,
    generateWeeklySubplot,
    expandBrief,
    refineContent,
  };
};
