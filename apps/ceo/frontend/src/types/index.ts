export type UserPlan = 'free' | 'starter' | 'basic' | 'pro' | 'standard' | 'premium' | 'ultimate' | 'enterprise';
export type AIProvider = 'openai' | 'claude' | 'deepseek' | 'gemini';

export interface User {
  user_id: string;
  email?: string;
  plan: UserPlan;
  tokens: number;
  plan_expiry?: Date | null;
  last_token_reset?: Date;
  preferred_ai_provider: AIProvider;
  preferred_ai_model: string;
  timezone?: string;
}

export type AccessLevel = 'none' | 'view' | 'edit';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar_color?: string;
  is_admin?: boolean; // Admins can use user's tokens and add other team members
  permissions: Record<'configuration' | 'plots' | 'events' | 'seasons' | 'monthly' | 'chat', AccessLevel>;
  last_active?: string;
  invite_token?: string; // Unique token for invite link
  invite_accepted?: boolean; // Whether invite has been accepted
}

export interface SeasonWeekPlan {
  week: number;
  subplot: string;
  subplotPerfect: boolean;
  custom_theme?: string;
  last_generated_at?: string;
}

export interface SeasonPlan {
  month: string;
  theme: string;
  themePerfect: boolean;
  themeNarrative?: string;
  monthlyPlot?: string;
  plotPerfect: boolean;
  plotLastGeneratedAt?: string;
  weekly: Record<number, SeasonWeekPlan>;
}

export interface CastGenerationOptions {
  totalCharacters: number;
  userCharacterList?: string;
  userCharacterDetails?: string;
  lockedCharacters?: Character[];
  regenerateCharacters?: Character[];
}

export interface MonthlyThemeNarrative {
  theme: string;
  explanation?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export type MonthlyThemeRecord = string | MonthlyThemeNarrative;

export type BrandType = 'individual' | 'organization';

export interface Brand {
  brand_id: string;
  id?: string;
  user_id: string;
  brand_name: string;
  brand_type?: BrandType; // Individual (personal brand) or Organization
  reverse_positioning?: boolean; // Audience-first approach - buyer profile comes before brand positioning

  // Configuration Fields
  taglines?: string;
  about?: string;
  vision?: string;
  mission?: string;
  products?: string;
  persona?: string;
  buyer_profile?: string;
  colors?: string;
  brand_hq_location?: string;
  timezone?: string;
  channels: string[];
  channel_schedule?: Record<string, string[]>; // e.g., { "monday": ["LinkedIn", "X"], "tuesday": ["Instagram"] }
  content_types?: string[]; // e.g., ["Graphic Design", "Blog Post", "Reel (Interview)"]

  // Narrative Fields
  narrative_why?: string;
  narrative_problem?: string;
  narrative_solution?: string;
  narrative_cta?: string;
  narrative_failure?: string;
  narrative_success?: string;
  narrative_perfect_fields?: {
    narrative_why?: boolean;
    narrative_problem?: boolean;
    narrative_solution?: boolean;
    narrative_cta?: boolean;
    narrative_failure?: boolean;
    narrative_success?: boolean;
  };

  // Cast & Content Strategy
  cast_management?: Character[];
  monthly_themes: Record<string, MonthlyThemeRecord>;
  weekly_subplots: Record<string, string>;
  monthly_calendars: Record<string, ContentCalendar>;
  season_plans: Record<string, SeasonPlan>;
  team_members?: TeamMember[];

  // Archiving
  archived_at?: Date | string | null;
}

export type AgeRange = 'teen' | 'early-20s' | 'mid-20s' | 'late-20s' | 'early-30s' | 'mid-30s' | 'late-30s' | 'early-40s' | 'mid-40s' | 'late-40s' | '50s' | '60s+';

export interface CharacterPerfectFields {
  name?: boolean;           // Character name (Queen Mother, Billionaire Mechanic, etc.)
  character_name?: boolean; // Real name (Josh, Starr, etc.)
  role?: boolean;
  gender?: boolean;
  age_range?: boolean;
  work_mode?: boolean;
  about?: boolean;
  personality?: boolean;
  persona?: boolean;        // Cinematic Persona - AI-generated
}

export interface Character {
  id: string;
  name: string;                  // Character name (Queen Mother, Billionaire Mechanic, The Mogul, etc.)
  character_name?: string;       // Real name (Josh, Starr, Oma, etc.)
  role: string;                  // Business role (CEO, Marketing Lead, etc.)
  gender?: 'Male' | 'Female' | 'Non-binary' | 'Prefer not to say';  // Gender (helps Andora use correct pronouns)
  about?: string;                // Highlights and perks about this person
  personality?: string;          // One-line personality (e.g., "Strategic visionary (INTJ) who leads with data and empathy")
  age_range?: AgeRange;          // Age range (helps Andora understand the person better)
  work_mode?: 'onsite' | 'remote' | 'hybrid';  // Work arrangement
  persona?: string;              // Andora-generated persona that brings this character to life
  backstory?: string;            // Optional: Additional backstory notes
  voice?: string;                // Optional: Voice and tone notes
  perfect_fields?: CharacterPerfectFields;  // Fields you've marked as perfect (Andora won't change these)
  isPerfect?: boolean;           // Legacy - kept for backward compatibility
  is_muted?: boolean;            // When true, character is hidden from Andora's storytelling

  // Legacy fields for backward compatibility
  real_name?: string;            // Deprecated - use character_name instead
  business_role?: string;
  description?: string;
  brand_connection?: string;
  emotional_range?: string[];    // Deprecated
  personality_tags?: string[];   // Deprecated
}

export interface Event {
  event_id: string;
  brand_id: string;
  user_id: string;
  title: string;
  description: string;
  event_date: string; // YYYY-MM-DD format
  event_type?: string;
  start_date?: string;
  end_date?: string;
  relevance_tag?: string;
  remind_andora?: boolean;
  embedded_in_subplot?: boolean;
  last_embedded_at?: string;
}

export interface ContentItem {
  id: string;
  date: string;
  channel: string;
  title: string;
  brief?: string;
  expanded_brief?: string;
  suggested_posting_time?: string; // AI-suggested optimal posting time (e.g., "9:00 AM", "2:30 PM")
  user_notes?: string;
  user_revision?: string;
  final_brief?: string;
  key_theme?: string;
  emotional_angles?: string[];
  content_type?: string;
  directives?: string;
  is_perfect: boolean;
  comments?: string; // Team collaboration comments (only visible when team members exist)

  // Story-driven content fields (Phase 7-9)
  story_hook?: string; // Story Hook & Content Idea
  character_focus?: string; // Character(s) featured in this scene
  emotional_beat?: string; // Emotional journey/beat

  // Streaming state
  _streaming?: boolean; // True while fields are being populated via SSE
  narrative_purpose?: string; // How this advances the brand story
  media_type?: string; // VIDEO/GRAPHIC/INFOGRAPHIC/CAROUSEL/BLOGPOST/EMAIL
  call_to_action?: string; // CTA for this scene
  tokens_used?: number;
}

export interface ContentCalendar {
  month: string; // YYYY-MM format
  items: ContentItem[];
}

export type BlogStatus = 'draft' | 'published' | 'archived';

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featured_image?: string;
  author_id: string;
  author_name?: string;
  status: BlogStatus;
  published_at?: Date | string;
  created_at: Date | string;
  updated_at: Date | string;
  tags?: string[];
  meta_title?: string;
  meta_description?: string;
  view_count?: number;
}

export type NewsletterStatus = 'draft' | 'scheduled' | 'sent';

export interface Newsletter {
  id: string;
  subject: string;
  preview_text?: string;
  content: string;
  html_content?: string;
  from_name: string;
  from_email: string;
  reply_to?: string;
  status: NewsletterStatus;
  scheduled_at?: Date | string;
  sent_at?: Date | string;
  created_at: Date | string;
  updated_at: Date | string;
  recipient_count?: number;
  open_rate?: number;
  click_rate?: number;
  tags?: string[];
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  name?: string;
  subscribed_at: Date | string;
  unsubscribed_at?: Date | string;
  is_active: boolean;
  tags?: string[];
}

export type Page = 'dashboard' | 'config' | 'plot' | 'events' | 'season' | 'monthly' | 'chat' | 'settings' | 'tokens';

export interface AppState {
  currentBrandId: string | null;
  user: User | null;
  brands: Brand[];
  events: Event[];
  isSettingsOpen: boolean;
  isGenerating: boolean;
  generationStatus: string;
}

export type CurrencyCode = 'NGN' | 'USD';

export interface PricingPlan {
  id: UserPlan;
  name: string;
  price_ngn: number;
  price_usd: number;
  tokens: number;
  max_brands: number;
  features: string[];
  is_popular?: boolean;
  sort_order?: number | null;
}

export interface CurrencySettings {
  default_currency: CurrencyCode;
  exchange_rate: number; // NGN per 1 USD
}

export interface AdminConfig {
  available_models: AIModel[];
  system_limits: SystemLimits;
  pricing_plans: PricingPlan[];
  currency_settings: CurrencySettings;
}

export interface AIModel {
  id: string;
  name: string;
  provider: 'openai' | 'claude' | 'deepseek' | 'gemini';
  enabled: boolean;
  description: string;
}

export type SystemLimits = Record<UserPlan, {
  tokens: number;
  max_brands: number;
}>;

export interface UserStats {
  total_users: number;
  free_users: number;
  paid_users: number;
  total_brands: number;
  total_events: number;
  total_content: number;
  tokens_distributed: number;
  tokens_consumed: number;
}