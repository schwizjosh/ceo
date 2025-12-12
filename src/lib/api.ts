// Direct PostgreSQL API Client (replaces Supabase)

import type { Character, CharacterPerfectFields } from '../types';
import { recordAICall } from './aiDebugStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const normalizeChannels = (value: any): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value as string[];

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn('Failed to parse channels JSON:', error);
      return [];
    }
  }

  return [];
};

const transformBrandResponse = (brand: any) => {
  console.log('🔄 transformBrandResponse: Raw brand from API:', brand);
  console.log('🔄 transformBrandResponse: brand.narrative_perfect_fields:', brand.narrative_perfect_fields);

  const transformed = {
    brand_id: brand.id ?? brand.brand_id,
    id: brand.id ?? brand.brand_id,
    user_id: brand.user_id,
    brand_name: brand.name ?? brand.brand_name ?? '',
    brand_type: brand.brand_type ?? 'organization',
    reverse_positioning: brand.reverse_positioning ?? false,
    taglines: brand.tagline ?? brand.taglines ?? '',
    about: brand.about ?? '',
    vision: brand.vision ?? '',
    mission: brand.mission ?? '',
    products: brand.products ?? '',
    persona: brand.personality ?? brand.persona ?? '',
    buyer_profile: brand.buyer_profile ?? brand.target_audience ?? '',
    colors: brand.colors ?? '',
    brand_hq_location: brand.brand_hq_location ?? brand.location ?? '',
    timezone: brand.timezone ?? 'UTC',
    channels: normalizeChannels(brand.channels),
    channel_schedule: brand.channel_schedule ?? {},
    posting_frequency: brand.posting_frequency ?? 3,
    preferred_posting_days: Array.isArray(brand.preferred_posting_days)
      ? brand.preferred_posting_days
      : [],
    narrative_why: brand.narrative_why ?? brand.why_it_matters ?? '',
    narrative_problem: brand.narrative_problem ?? '',
    narrative_solution: brand.narrative_solution ?? '',
    narrative_cta: brand.narrative_cta ?? '',
    narrative_failure: brand.narrative_failure ?? '',
    narrative_success: brand.narrative_success ?? '',
    narrative_perfect_fields: brand.narrative_perfect_fields ?? {},
    season_plans: brand.season_plans ?? {},
    monthly_themes: brand.monthly_themes ?? {},
    weekly_subplots: brand.weekly_subplots ?? {},
    monthly_calendars: brand.monthly_calendars ?? {},
    cast_management: brand.cast_management ?? [],
    team_members: brand.team_members ?? [],
    archived_at: brand.archived_at ?? null
  };

  console.log('🔄 transformBrandResponse: Transformed narrative_perfect_fields:', transformed.narrative_perfect_fields);
  return transformed;
};

const prepareBrandPayload = (data: any) => {
  const payload: Record<string, any> = {};

  const name = data?.brand_name ?? data?.name;
  if (name !== undefined && name !== null) {
    payload.name = name;
  }

  const tagline = data?.taglines ?? data?.tagline;
  if (tagline !== undefined) {
    payload.tagline = tagline;
  }

  if (data?.industry !== undefined) {
    payload.industry = data.industry;
  }

  const targetAudience = data?.buyer_profile ?? data?.target_audience;
  if (targetAudience !== undefined) {
    payload.target_audience = targetAudience;
    payload.buyer_profile = targetAudience;  // Also save to buyer_profile column
  }

  if (data?.core_message !== undefined) {
    payload.core_message = data.core_message;
  }

  if (data?.what_you_do !== undefined) {
    payload.what_you_do = data.what_you_do;
  }

  if (data?.how_you_do_it !== undefined) {
    payload.how_you_do_it = data.how_you_do_it;
  }

  const whyItMatters = data?.narrative_why ?? data?.why_it_matters;
  if (whyItMatters !== undefined) {
    payload.why_it_matters = whyItMatters;
  }

  const personality = data?.persona ?? data?.personality;
  if (personality !== undefined) {
    payload.personality = personality;
  }

  if (data?.channels !== undefined) {
    payload.channels = data.channels;
  }

  if (data?.brand_type !== undefined) {
    payload.brand_type = data.brand_type;
  }

  if (data?.reverse_positioning !== undefined) {
    payload.reverse_positioning = data.reverse_positioning;
  }

  // New fields added in migration 002
  if (data?.about !== undefined) {
    payload.about = data.about;
  }

  if (data?.vision !== undefined) {
    payload.vision = data.vision;
  }

  if (data?.mission !== undefined) {
    payload.mission = data.mission;
  }

  if (data?.products !== undefined) {
    payload.products = data.products;
  }

  if (data?.colors !== undefined) {
    payload.colors = data.colors;
  }

  if (data?.brand_hq_location !== undefined) {
    payload.brand_hq_location = data.brand_hq_location;
  }

  if (data?.timezone !== undefined) {
    payload.timezone = data.timezone;
  }

  if (data?.posting_frequency !== undefined) {
    payload.posting_frequency = data.posting_frequency;
  }

  if (data?.preferred_posting_days !== undefined) {
    payload.preferred_posting_days = data.preferred_posting_days;
  }

  if (data?.channel_schedule !== undefined) {
    payload.channel_schedule = data.channel_schedule;
  }

  if (data?.narrative_problem !== undefined) {
    payload.narrative_problem = data.narrative_problem;
  }

  if (data?.narrative_solution !== undefined) {
    payload.narrative_solution = data.narrative_solution;
  }

  if (data?.narrative_cta !== undefined) {
    payload.narrative_cta = data.narrative_cta;
  }

  if (data?.narrative_failure !== undefined) {
    payload.narrative_failure = data.narrative_failure;
  }

  if (data?.narrative_success !== undefined) {
    payload.narrative_success = data.narrative_success;
  }

  if (data?.narrative_why !== undefined) {
    payload.narrative_why = data.narrative_why;
  }

  if (data?.narrative_perfect_fields !== undefined) {
    console.log('🔧 prepareBrandPayload: narrative_perfect_fields detected:', data.narrative_perfect_fields);
    payload.narrative_perfect_fields = data.narrative_perfect_fields;
  }

  // Season planning fields
  if (data?.season_plans !== undefined) {
    payload.season_plans = data.season_plans;
  }

  if (data?.monthly_themes !== undefined) {
    payload.monthly_themes = data.monthly_themes;
  }

  if (data?.weekly_subplots !== undefined) {
    payload.weekly_subplots = data.weekly_subplots;
  }

  if (data?.monthly_calendars !== undefined) {
    payload.monthly_calendars = data.monthly_calendars;
  }

  return payload;
};

const prepareEventPayload = (data: any) => {
  const startDate = data?.start_date ?? data?.event_date;

  const payload: Record<string, any> = {
    brand_id: data?.brand_id,
    title: data?.title ?? 'Event',
    event_type: data?.event_type ?? 'custom',
    start_date: startDate,
    end_date: data?.end_date ?? null,
    description: data?.description ?? '',
    relevance_tag: data?.relevance_tag ?? 'custom',
    remind_andora: data?.remind_andora ?? true
  };

  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) {
      delete payload[key];
    }
  });

  return payload;
};

const transformEventResponse = (event: any) => ({
  ...event,
  event_date: event?.event_date ?? event?.start_date ?? null,
});

const normalizeCharactersResponse = (value: any): any[] => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return normalizeCharactersResponse(parsed);
    } catch (error) {
      console.warn('Failed to parse characters payload string:', error);
      return [];
    }
  }

  if (typeof value === 'object') {
    const record = value as Record<string, any>;

    if (Array.isArray(record.characters)) {
      return normalizeCharactersResponse(record.characters);
    }

    if (typeof record.characters === 'string') {
      return normalizeCharactersResponse(record.characters);
    }

    if (Array.isArray(record.cast)) {
      return normalizeCharactersResponse(record.cast);
    }

    if (typeof record.cast === 'string') {
      return normalizeCharactersResponse(record.cast);
    }

    if (record.result !== undefined) {
      return normalizeCharactersResponse(record.result);
    }

    if (record.data !== undefined) {
      return normalizeCharactersResponse(record.data);
    }

    if (Array.isArray(record.items)) {
      return normalizeCharactersResponse(record.items);
    }

    const nestedValues = Object.values(record).filter(item => item && typeof item === 'object');
    for (const nested of nestedValues) {
      const normalized = normalizeCharactersResponse(nested);
      if (normalized.length > 0) {
        return normalized;
      }
    }
  }

  return [];
};

const parseJSONField = <T>(value: any, fallback: T): T => {
  if (value === null || value === undefined) return fallback;

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return (parsed ?? fallback) as T;
    } catch (error) {
      console.warn('Failed to parse JSON field from API:', error);
      return fallback;
    }
  }

  if (typeof value === 'object') {
    return value as T;
  }

  return fallback;
};

const normalizePerfectFields = (value: any): CharacterPerfectFields => {
  return parseJSONField<CharacterPerfectFields>(value, {});
};

const normalizeCharacterResponse = (character: any): Character => ({
  id: character.id,
  name: character.name ?? '',
  character_name: character.character_name ?? '',
  role: character.role ?? '',
  about: character.about ?? '',
  personality: character.personality ?? '',
  age_range: character.age_range ?? undefined,
  work_mode: character.work_mode ?? undefined,
  persona: character.persona ?? '',
  backstory: character.backstory ?? '',
  voice: character.voice ?? '',
  emotional_range: parseJSONField<string[]>(character.emotional_range, []),
  perfect_fields: normalizePerfectFields(character.perfect_fields),
  isPerfect: character.is_perfect ?? false,
  is_muted: character.is_muted ?? false,
  description: character.description ?? '',
  personality_tags: parseJSONField(character.personality_tags, []),
});

class ApiClient {
  private token: string | null = null;

  constructor() {
    // Load token from localStorage
    this.token = localStorage.getItem('auth_token');
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const isAIRoute = endpoint.startsWith('/ai/');
    let requestPayload: unknown = undefined;

    if (options.body && typeof options.body === 'string') {
      try {
        requestPayload = JSON.parse(options.body);
      } catch (error) {
        requestPayload = options.body;
      }
    }

    let response: Response;
    try {
      response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
      });
    } catch (error) {
      if (isAIRoute) {
        recordAICall({
          endpoint,
          status: 0,
          requestBody: requestPayload,
          responseBody: null,
          error: error instanceof Error ? error.message : 'Network error',
        });
      }
      throw error;
    }

    const rawText = await response.text();
    let parsedBody: any = null;

    if (rawText) {
      try {
        parsedBody = JSON.parse(rawText);
      } catch (error) {
        console.warn('API response was not valid JSON', {
          endpoint,
          method: options.method || 'GET',
          error,
        });
      }
    }

    if (isAIRoute) {
      recordAICall({
        endpoint,
        status: response.status,
        requestBody: requestPayload,
        responseBody: parsedBody ?? rawText,
        model: parsedBody?.metadata?.model,
        error: response.ok ? undefined : (parsedBody?.error || parsedBody?.message || rawText || response.statusText),
      });
    }

    if (!response.ok) {
      const message = parsedBody?.error || parsedBody?.message || rawText || response.statusText || 'Request failed';
      throw new Error(message);
    }

    if (parsedBody !== null && parsedBody !== undefined) {
      return parsedBody;
    }

    if (!rawText) {
      return null;
    }

    return rawText;
  }

  // Auth methods
  async register(email: string, password: string, name: string) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        full_name: name,  // Backend expects 'full_name'
        terms: 'true'     // Backend requires terms acceptance
      }),
    });

    this.token = data.token;
    localStorage.setItem('auth_token', data.token);
    return data.user;
  }

  async login(email: string, password: string) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    this.token = data.token;
    localStorage.setItem('auth_token', data.token);
    return data.user;
  }

  async getCurrentUser() {
    if (!this.token) return null;

    try {
      return await this.request('/auth/me');
    } catch (error) {
      this.logout();
      return null;
    }
  }

  async updatePreferences(preferences: {
    preferred_ai_provider?: string;
    preferred_ai_model?: string;
    timezone?: string;
  }) {
    return this.request('/auth/preferences', {
      method: 'PATCH',
      body: JSON.stringify(preferences),
    });
  }

  logout() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  // Generic HTTP methods for convenience
  async get(endpoint: string) {
    return this.request(endpoint, { method: 'GET' });
  }

  async post(endpoint: string, data?: any) {
    return this.request(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put(endpoint: string, data?: any) {
    return this.request(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete(endpoint: string) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // Brands methods
  async getBrands() {
    const data = await this.request('/brands');
    return Array.isArray(data?.brands) ? data.brands.map(transformBrandResponse) : [];
  }

  async createBrand(brandData: any) {
    const payload = prepareBrandPayload(brandData);
    const data = await this.request('/brands', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return transformBrandResponse(data?.brand ?? data);
  }

  async updateBrand(brandId: string, updates: any) {
    console.log('🔧 updateBrand called with updates:', updates);
    const payload = prepareBrandPayload(updates);
    console.log('🔧 updateBrand prepared payload:', payload);

    if (Object.keys(payload).length === 0) {
      console.warn('⚠️  updateBrand: No fields in payload, skipping API call');
      // Nothing to sync with backend for unsupported fields
      return null;
    }

    const data = await this.request(`/brands/${brandId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });

    console.log('🔧 updateBrand API response:', data);
    return transformBrandResponse(data?.brand ?? data);
  }

  async getBrandTokenUsage(brandId: string, month: string) {
    const params = new URLSearchParams();
    if (month) {
      params.set('month', month);
    }

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/brands/${brandId}/token-usage${query}`);
  }

  async archiveBrand(brandId: string) {
    const data = await this.request(`/brands/${brandId}/archive`, {
      method: 'PUT',
    });

    return transformBrandResponse(data?.brand ?? data);
  }

  async unarchiveBrand(brandId: string) {
    const data = await this.request(`/brands/${brandId}/unarchive`, {
      method: 'PUT',
    });

    return transformBrandResponse(data?.brand ?? data);
  }

  // Events methods
  async getEvents(brandId: string) {
    const data = await this.request(`/events/brand/${brandId}`);
    return Array.isArray(data) ? data.map(transformEventResponse) : [];
  }

  async createEvent(eventData: any) {
    const payload = prepareEventPayload(eventData);

    const data = await this.request('/events', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return transformEventResponse(data);
  }

  async updateEvent(eventId: string, updates: any) {
    const payload = prepareEventPayload(updates);

    const data = await this.request(`/events/${eventId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });

    return transformEventResponse(data);
  }

  async deleteEvent(eventId: string) {
    return this.request(`/events/${eventId}`, {
      method: 'DELETE',
    });
  }

  // Content methods
  async getContent(brandId: string, month?: string) {
    const query = month ? `?month=${month}` : '';
    return this.request(`/content/${brandId}${query}`);
  }

  async createContent(contentData: any) {
    return this.request('/content', {
      method: 'POST',
      body: JSON.stringify(contentData),
    });
  }

  async updateContent(contentId: string, updates: any) {
    return this.request(`/content/${contentId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // Tokens
  async deductTokens(amount: number) {
    return this.request('/tokens/deduct', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }

  // AI Generation Methods
  async generateCharacters(brandContext: any, characterCount: number, existingCharacters?: string[], model?: string) {
    return this.request('/ai/generate-characters', {
      method: 'POST',
      body: JSON.stringify({ brandContext, characterCount, existingCharacters, model }),
    });
  }

  async resolveCast(brandContext: any, userCharacters: Array<{ name: string; description: string; location?: string }>, model?: string) {
    return this.request('/ai/resolve-cast', {
      method: 'POST',
      body: JSON.stringify({ brandContext, userCharacters, model }),
    });
  }

  async prefillNarrative(brandContext: any, model?: string) {
    return this.request('/ai/prefill-narrative', {
      method: 'POST',
      body: JSON.stringify({ brandContext, preferredModel: model }),
    });
  }

  async generateMonthlyTheme(brandContext: any, month: string, events?: any[], model?: string, brandId?: string, themePrompt?: string) {
    return this.request('/ai/generate-monthly-theme', {
      method: 'POST',
      body: JSON.stringify({
        brandContext,
        month,
        events,
        model,
        brandId,  // ✅ NOW SENDS brandId for multi-agent orchestrator
        themePrompt  // ✅ User's theme input
      }),
    });
  }

  async generateMonthlyPlot(brandContext: any, theme: string, month: string, events?: string[], themePrompt?: string, model?: string, brandId?: string) {
    return this.request('/ai/generate-monthly-plot', {
      method: 'POST',
      body: JSON.stringify({ brandContext, theme, month, events, themePrompt, model, brandId }),
    });
  }

  async generateWeeklySubplot(payload: {
    brandContext: any;
    monthlyPlot: string;
    monthlyTheme: string;
    weekNumber: number;
    weekStart: string;
    weekEnd: string;
    weekTheme?: string;
    events?: string[];
    characters?: Array<{
      name: string;
      location: string;
      role?: string;
      persona?: string;
      character_name?: string;
      about?: string;
    }>;
    model?: string;
  }) {
    return this.request('/ai/generate-weekly-subplot', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async generateCalendarEntry(brandContext: any, date: string, context: any, model?: string) {
    return this.request('/ai/generate-calendar-entry', {
      method: 'POST',
      body: JSON.stringify({ brandContext, date, context, model }),
    });
  }

  async refineCharacterField(brandContext: any, field: string, character: any, characters: any[], model?: string) {
    return this.request('/ai/refine-character-field', {
      method: 'POST',
      body: JSON.stringify({ brandContext, field, character, characters, model }),
    });
  }

  async expandBriefRequest(payload: {
    brandContext: any;
    brief: string;
    model?: string;
    instructions?: string;
    characters?: any[];
    date?: string;
    channel?: string;
  }) {
    return this.request('/ai/expand-brief', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async refineContentRequest(payload: {
    brandContext: any;
    originalContent: string;
    refinePrompt: string;
    itemDate: string;
    characters?: Array<{ name: string; location: string }>;
    model?: string;
  }) {
    return this.request('/ai/refine-content', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async chatWithAndora(brandContext: any, message: string, characters?: any[], model?: string) {
    return this.request('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ brandContext, message, characters, model }),
    });
  }

  // Character methods
  async createCharacter(characterData: any) {
    const data = await this.request('/characters', {
      method: 'POST',
      body: JSON.stringify(characterData),
    });
    return normalizeCharacterResponse(data.character);
  }

  async updateCharacter(characterId: string, updates: any) {
    console.log('🔍 apiClient.updateCharacter SENDING:', {
      characterId,
      hasCharacterName: 'character_name' in updates,
      characterNameValue: updates.character_name,
      updateKeys: Object.keys(updates)
    });
    const data = await this.request(`/characters/${characterId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    console.log('🔍 apiClient.updateCharacter RECEIVED:', {
      hasCharacterName: 'character_name' in data.character,
      characterNameValue: data.character.character_name
    });
    return normalizeCharacterResponse(data.character);
  }

  async toggleCharacterMute(characterId: string) {
    const data = await this.request(`/characters/${characterId}/mute`, {
      method: 'PUT',
    });
    return data.character;
  }

  async deleteCharacter(characterId: string) {
    return this.request(`/characters/${characterId}`, {
      method: 'DELETE',
    });
  }

  async getCharacters(brandId: string) {
    const data = await this.request(`/characters/brand/${brandId}`);
    const characters = Array.isArray(data?.characters) ? data.characters : [];
    return characters.map(normalizeCharacterResponse);
  }

  async generateCastWithAI(brandContext: any, userCharacters: any[], model?: string) {
    const data = await this.request('/ai/resolve-cast', {
      method: 'POST',
      body: JSON.stringify({ brandContext, userCharacters, model }),
    });
    const characters = normalizeCharactersResponse(data?.characters ?? data?.cast ?? data);

    return {
      ...(typeof data === 'object' ? data : {}),
      characters,
      rawCharacters: data?.characters ?? data?.cast ?? data,
    };
  }

  // Get unembedded events for a month
  async getUnembeddedEvents(brandId: string, year: string, month: string) {
    return this.request(`/events/brand/${brandId}/unembedded/${year}/${month}`);
  }

  // Embed pending events into week subplot
  async embedEventsIntoWeek(brandId: string, year: string, month: string, week: number, forceReflow: boolean = false) {
    return this.request(`/embed-events/${brandId}/${year}/${month}/${week}`, {
      method: 'POST',
      body: JSON.stringify({ forceReflow }),
    });
  }

  async undoEmbedEvents(brandId: string, year: string, month: string, week: number) {
    return this.request(`/undo-embed-events/${brandId}/${year}/${month}/${week}`, {
      method: 'POST',
    });
  }

  // Send content brief via email
  async sendContentBrief(teamMemberEmails: string[], contentData: any, brandName: string) {
    return this.request('/email/send-brief', {
      method: 'POST',
      body: JSON.stringify({
        teamMemberEmails,
        contentData,
        brandName,
      }),
    });
  }

  // ============================================
  // OBSERVER EVALUATION METHODS
  // Quality gating for narrative and characters
  // ============================================

  /**
   * Evaluate brand narrative from the client's perspective
   * Called when user marks all narrative fields as "perfect"
   */
  async observeNarrative(payload: {
    brandId: string;
    brandName: string;
    brandType?: 'individual' | 'organization';
    buyerProfile: string;
    narrative: {
      why?: string;
      problem?: string;
      solution?: string;
      cta?: string;
      failure?: string;
      success?: string;
    };
  }) {
    return this.request('/ai/observe-narrative', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Evaluate characters/cast from the target audience's perspective
   * Called when user clicks "Characters Are Done"
   */
  async observeCharacters(payload: {
    brandId: string;
    brandName: string;
    brandType: 'individual' | 'organization';
    brandPersona?: string;
    buyerProfiles: string | string[];
    characters: Array<{
      name: string;
      characterName?: string;
      role?: string;
      persona?: string;
      personality?: string;
      about?: string;
    }>;
  }) {
    return this.request('/ai/observe-characters', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}

export const apiClient = new ApiClient();

