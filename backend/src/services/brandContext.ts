/**
 * BRAND CONTEXT ENGINE (RAG System)
 * 
 * Smart context retrieval system that provides agents with
 * only the most relevant information for their tasks.
 * 
 * Phase 1: PostgreSQL-based queries
 * Phase 2: Vector database with embeddings
 */

import pool from '../database/db';
import { brandVectorStore, VectorDocumentInput } from './vectorStore';

export interface BrandIdentity {
  id: string;
  name: string;
  tagline?: string;
  about?: string;
  vision?: string;
  mission?: string;
  products?: string;
  personality: string[];
  voice: string;
  values: string[];
  industry?: string;
  targetAudience?: string;
  buyerProfile?: string;
  archetype?: string;
  coreMessage?: string;
  whatYouDo?: string;
  howYouDoIt?: string;
  whyItMatters?: string;
  brandHqLocation?: string;
  narrativeProblem?: string;
  narrativeSolution?: string;
  narrativeCta?: string;
  narrativeFailure?: string;
  narrativeSuccess?: string;
  narrativeWhy?: string;
}

export interface Character {
  id: string;
  name: string;
  title: string;
  persona: string;
  voice: string;
  expertise: string[];
  location?: string;
  workMode?: 'remote' | 'on-site' | 'hybrid';
  stageName?: string;
  archetype?: string;
  relationshipsSummary?: string;
  isPerfect: boolean;
}

export interface CharacterRelationship {
  id: string;
  brandId: string;
  sourceCharacterId: string;
  targetCharacterId: string;
  relationshipType: 'ally' | 'collaborator' | 'mentor' | 'support' | 'conflict' | 'rival';
  summary?: string;
  tensionLevel?: number;
  collaborationStrength?: number;
}

export interface NextSceneHook {
  sequence: number;
  dayOfWeek?: number;
  hook: string;
  payoff: string;
  setup?: string;
  recommendedNarratorId?: string;
  notes?: string;
}

export interface PerfectContentMemory {
  id: string;
  date: string;
  channel?: string;
  format?: string;
  summary: string;
  emotion?: string;
  cta?: string;
  characterIds?: string[];
  raw?: {
    hook?: string;
    body?: string;
    cta?: string;
  };
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: Date;
  type: 'Launch' | 'Campaign' | 'Holiday' | 'Trend' | 'Custom';
  relevance: 'High' | 'Medium' | 'Low';
}

export interface MonthlyTheme {
  id: string;
  month: number;
  year: number;
  title: string;
  description: string;
  keyMessage: string;
  tone: string;
}

export interface WeeklySubplot {
  id: string;
  weekNumber: number;
  title: string;
  description: string;
  characterIds: string[];
  eventIds: string[];
  nextSceneHooks?: NextSceneHook[];
}

export interface ContextSnippet {
  id: string;
  summary: string;
  content: string;
  type: string;
  sourceId?: string;
  score: number;
}

export interface ChannelContext {
  medium: 'video' | 'copy' | 'visual' | 'audio';
  audienceFocus: string;
  successSignals: string[];
  toneGuidelines: string[];
  recommendedCadence?: string;
}

export interface SceneContext {
  brand: {
    voice: string;
    personality: string[];
    values: string[];
    archetype?: string;
    buyerProfile?: string;
    headquarters?: string;
  };
  character: Character | null;
  secondaryCharacter: Character | null;
  relationshipContext?: {
    relationshipType: CharacterRelationship['relationshipType'];
    summary?: string;
  } | null;
  event: Event | null;
  subplot: (WeeklySubplot & { activeHook?: NextSceneHook | null }) | null;
  recentPerfectContent: PerfectContentMemory[];
  knowledgeSnippets: ContextSnippet[];
  channelContext: ChannelContext;
}

/**
 * Brand Context Engine
 * 
 * Efficiently retrieves and packages brand context for AI agents
 */
export class BrandContextEngine {
  private cache: Map<string, { data: any; timestamp: number; ttl: number }>;
  private cacheHits: number;
  private cacheMisses: number;

  constructor() {
    this.cache = new Map();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    // Clear expired cache entries every 5 minutes
    setInterval(() => this.clearExpiredCache(), 5 * 60 * 1000);
  }

  /**
   * Ingest or update brand knowledge documents into the vector store
   */
  async upsertKnowledgeDocuments(
    brandId: string,
    documents: VectorDocumentInput[]
  ): Promise<void> {
    if (!brandId || !Array.isArray(documents) || documents.length === 0) {
      return;
    }

    await brandVectorStore.upsertDocuments(brandId, documents);
    // Invalidate knowledge-dependent caches (scene contexts rely on knowledge snippets)
    this.cache.forEach((_, key) => {
      if (key.startsWith(`brand:${brandId}:perfectContent`) ||
          key.startsWith(`seasonTimeline:${brandId}:`)) {
        this.cache.delete(key);
      }
    });
  }

  /**
   * Get brand identity (cached for 24 hours)
   */
  async getBrandIdentity(brandId: string): Promise<BrandIdentity> {
    const cacheKey = `brand:${brandId}:identity`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const result = await pool.query(
      `SELECT id, name, tagline, about, vision, mission, products,
              personality, core_message as "coreMessage",
              target_audience as "targetAudience", buyer_profile as "buyerProfile",
              brand_archetype as "archetype",
              industry, brand_hq_location as "brandHqLocation",
              what_you_do as "whatYouDo", how_you_do_it as "howYouDoIt",
              why_it_matters as "whyItMatters",
              narrative_problem as "narrativeProblem",
              narrative_solution as "narrativeSolution",
              narrative_cta as "narrativeCta",
              narrative_failure as "narrativeFailure",
              narrative_success as "narrativeSuccess",
              narrative_why as "narrativeWhy"
       FROM brands
       WHERE id = $1`,
      [brandId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Brand ${brandId} not found`);
    }

    const brand = result.rows[0];
    const personalityArray = typeof brand.personality === 'string'
      ? brand.personality.split(',').map((p: string) => p.trim())
      : Array.isArray(brand.personality) ? brand.personality : [];

    const identity: BrandIdentity = {
      ...brand,
      personality: personalityArray,
      voice: brand.coreMessage || personalityArray.join(', ') || 'Professional and friendly',
      values: [], // Extracted from personality or separate field if added
      archetype: brand.archetype || (personalityArray.length > 0 ? personalityArray[0] : undefined),
      buyerProfile: brand.buyerProfile || brand.targetAudience || undefined
    };

    this.setCache(cacheKey, identity, 24 * 60 * 60 * 1000); // 24 hours
    return identity;
  }

  /**
   * Get all characters for a brand (cached for 6 hours)
   * By default, excludes muted characters from story engine operations
   */
  async getCharacters(brandId: string, includeMuted: boolean = false): Promise<Character[]> {
    const cacheKey = `brand:${brandId}:characters:${includeMuted ? 'all' : 'active'}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const whereClause = includeMuted
      ? 'WHERE brand_id = $1'
      : 'WHERE brand_id = $1 AND (is_muted = false OR is_muted IS NULL)';

    const result = await pool.query(
      `SELECT id,
              name,
              role as title,
              real_name as character_name,
              persona,
              voice,
              location,
              work_mode,
              archetype,
              relationships,
              is_perfect as "isPerfect"
       FROM brand_characters
       ${whereClause}
       ORDER BY is_perfect DESC, created_at ASC`,
      [brandId]
    );

    const characters: Character[] = result.rows.map(row => {
      let relationshipsSummary: string | undefined;
      if (row.relationships) {
        try {
          const parsed = typeof row.relationships === 'string' ? JSON.parse(row.relationships) : row.relationships;
          if (typeof parsed === 'string') {
            relationshipsSummary = parsed;
          } else if (Array.isArray(parsed)) {
            relationshipsSummary = parsed.join(', ');
          } else if (parsed && typeof parsed === 'object') {
            const allies = Array.isArray(parsed.allies) ? parsed.allies : [];
            const conflicts = Array.isArray(parsed.conflicts) ? parsed.conflicts : [];
            const parts: string[] = [];
            if (allies.length) parts.push(`Allies: ${allies.join(', ')}`);
            if (conflicts.length) parts.push(`Conflicts: ${conflicts.join(', ')}`);
            relationshipsSummary = parts.join(' | ') || undefined;
          }
        } catch {
          relationshipsSummary = row.relationships;
        }
      }

      return {
        id: row.id,
        name: row.name,
        title: row.title,
        persona: row.persona,
        voice: row.voice,
        location: row.location || undefined,
        workMode: row.work_mode || undefined,
        stageName: row.character_name || undefined,
        archetype: row.archetype || undefined,
        relationshipsSummary,
        isPerfect: row.isPerfect,
        expertise: [] // Extract from persona or add field
      };
    });

    this.setCache(cacheKey, characters, 6 * 60 * 60 * 1000); // 6 hours
    return characters;
  }

  /**
   * Get character relationship graph (cached for 1 hour)
   * Provides collaboration/conflict insights between characters
   */
  async getCharacterRelationships(brandId: string): Promise<CharacterRelationship[]> {
    const cacheKey = `brand:${brandId}:relationships`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const result = await pool.query(
        `SELECT id,
                brand_id as "brandId",
                source_character_id as "sourceCharacterId",
                target_character_id as "targetCharacterId",
                relationship_type as "relationshipType",
                summary,
                tension_level as "tensionLevel",
                collaboration_strength as "collaborationStrength"
         FROM brand_character_relationships
         WHERE brand_id = $1`,
        [brandId]
      );

      const relationships: CharacterRelationship[] = result.rows.map(row => ({
        id: row.id,
        brandId: row.brandId,
        sourceCharacterId: row.sourceCharacterId,
        targetCharacterId: row.targetCharacterId,
        relationshipType: row.relationshipType,
        summary: row.summary || undefined,
        tensionLevel: row.tensionLevel !== null ? Number(row.tensionLevel) : undefined,
        collaborationStrength: row.collaborationStrength !== null ? Number(row.collaborationStrength) : undefined
      }));

      this.setCache(cacheKey, relationships, 60 * 60 * 1000); // 1 hour
      return relationships;
    } catch (error: any) {
      if (error?.code === '42P01') {
        // Relationship table not deployed yet - fall back gracefully
        console.warn('BrandContextEngine: relationship table missing, using fallback relationships');
        this.setCache(cacheKey, [], 30 * 60 * 1000);
        return [];
      }
      throw error;
    }
  }

  /**
   * Get the most relevant character for a specific date/topic
   */
  async getRelevantCharacter(
    brandId: string,
    options?: { date?: Date; topic?: string }
  ): Promise<Character | null> {
    const characters = await this.getCharacters(brandId);
    
    if (characters.length === 0) return null;

    // Prioritize "perfect" characters
    const perfectCharacters = characters.filter(c => c.isPerfect);
    if (perfectCharacters.length > 0) {
      // Rotate through perfect characters for variety
      const index = options?.date 
        ? Math.floor(options.date.getTime() / (24 * 60 * 60 * 1000)) % perfectCharacters.length
        : 0;
      return perfectCharacters[index];
    }

    // Return first character if no perfect ones
    return characters[0];
  }

  /**
   * Get events for a specific date range (cached for 1 hour)
   */
  async getEventsForDateRange(
    brandId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Event[]> {
    const cacheKey = `brand:${brandId}:events:${startDate.toISOString()}:${endDate.toISOString()}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const result = await pool.query(
      `SELECT id, title, description, start_date as date, event_type as type, relevance_tag as relevance
       FROM brand_events
       WHERE brand_id = $1
         AND start_date >= $2
         AND start_date <= $3
       ORDER BY start_date ASC, relevance_tag DESC`,
      [brandId, startDate, endDate]
    );

    const events: Event[] = result.rows;
    this.setCache(cacheKey, events, 60 * 60 * 1000); // 1 hour
    return events;
  }

  /**
   * Get event for a specific date
   */
  async getEventForDate(brandId: string, date: Date): Promise<Event | null> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const events = await this.getEventsForDateRange(brandId, startOfDay, endOfDay);
    
    // Return highest relevance event
    if (events.length === 0) return null;
    return events.sort((a, b) => {
      const relevanceOrder = { High: 3, Medium: 2, Low: 1 };
      return relevanceOrder[b.relevance] - relevanceOrder[a.relevance];
    })[0];
  }

  /**
   * Get monthly theme (cached for 6 hours)
   */
  async getMonthlyTheme(
    brandId: string,
    month: number,
    year: number
  ): Promise<MonthlyTheme | null> {
    const cacheKey = `brand:${brandId}:theme:${year}:${month}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const result = await pool.query(
      `SELECT id, month, year, theme as title, description
       FROM brand_monthly_themes
       WHERE brand_id = $1 AND month = $2 AND year = $3`,
      [brandId, month, year]
    );

    const theme = result.rows[0] || null;
    this.setCache(cacheKey, theme, 6 * 60 * 60 * 1000); // 6 hours
    return theme;
  }

  /**
   * Get weekly subplots for a month (cached for 3 hours)
   */
  async getWeeklySubplots(
    brandId: string,
    month: number,
    year: number
  ): Promise<WeeklySubplot[]> {
    const cacheKey = `brand:${brandId}:subplots:${year}:${month}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const result = await pool.query(
      `SELECT ws.id, ws.week_number as "weekNumber", ws.subplot_title as title, ws.description,
              ws.characters_involved as "characterIds", ws.related_events as "eventIds",
              ws.next_scene_hooks as "nextSceneHooks"
       FROM brand_weekly_subplots ws
       JOIN brand_monthly_themes mt ON ws.monthly_theme_id = mt.id
       WHERE mt.brand_id = $1 AND mt.month = $2 AND mt.year = $3
       ORDER BY ws.week_number ASC`,
      [brandId, month, year]
    );

    const subplots: WeeklySubplot[] = result.rows.map(row => ({
      ...row,
      characterIds: row.characterIds || [],
      eventIds: row.eventIds || [],
      nextSceneHooks: (() => {
        if (!row.nextSceneHooks) return [];
        if (Array.isArray(row.nextSceneHooks)) return row.nextSceneHooks;
        try {
          const parsed = JSON.parse(row.nextSceneHooks);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      })()
    }));

    this.setCache(cacheKey, subplots, 3 * 60 * 60 * 1000); // 3 hours
    return subplots;
  }

  /**
   * Get subplot for a specific date
   */
  async getSubplotForDate(
    brandId: string,
    date: Date
  ): Promise<WeeklySubplot | null> {
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    
    // Calculate week number of month (1-4)
    const firstDay = new Date(year, month - 1, 1);
    const dayOfMonth = date.getDate();
    const weekNumber = Math.ceil((dayOfMonth + firstDay.getDay()) / 7);

    const subplots = await this.getWeeklySubplots(brandId, month, year);
    return subplots.find(s => s.weekNumber === weekNumber) || null;
  }

  /**
   * Pick a primary narrator for the scene (rotates perfect characters first)
   */
  private pickPrimaryCharacter(characters: Character[], date?: Date): Character | null {
    if (!characters.length) return null;

    const perfectCharacters = characters.filter(c => c.isPerfect);
    const pool = perfectCharacters.length > 0 ? perfectCharacters : characters;

    if (!date) {
      return pool[0];
    }

    const dayIndex = Math.floor(date.getTime() / (24 * 60 * 60 * 1000));
    return pool[dayIndex % pool.length];
  }

  /**
   * Select narrator + supporting character based on relationships
   */
  private selectNarrativePair(
    characters: Character[],
    relationships: CharacterRelationship[],
    date?: Date
  ): {
    primary: Character | null;
    secondary: Character | null;
    relationshipContext: SceneContext['relationshipContext'];
  } {
    const primary = this.pickPrimaryCharacter(characters, date);
    if (!primary) {
      return { primary: null, secondary: null, relationshipContext: null };
    }

    const candidateRelationships = relationships.filter(
      rel => rel.sourceCharacterId === primary.id || rel.targetCharacterId === primary.id
    );

    const prioritizedRelationships = candidateRelationships
      .slice()
      .sort((a, b) => {
        const strengthA = (a.collaborationStrength ?? 0) - (a.tensionLevel ?? 0);
        const strengthB = (b.collaborationStrength ?? 0) - (b.tensionLevel ?? 0);
        return strengthB - strengthA;
      });

    let matchedRelationship = prioritizedRelationships.find(
      rel => rel.relationshipType !== 'conflict' && rel.relationshipType !== 'rival'
    ) || prioritizedRelationships[0] || null;

    let secondary: Character | null = null;

    if (matchedRelationship) {
      const secondaryId = matchedRelationship.sourceCharacterId === primary.id
        ? matchedRelationship.targetCharacterId
        : matchedRelationship.sourceCharacterId;
      secondary = characters.find(c => c.id === secondaryId) || null;

      // If the relationship is conflict-only and we have more options, look for collaborative backup
      if (secondary && (matchedRelationship.relationshipType === 'conflict' || matchedRelationship.relationshipType === 'rival')) {
        const collaborativeFallback = prioritizedRelationships.find(
          rel => rel.relationshipType !== 'conflict' && rel.relationshipType !== 'rival'
        );
        if (collaborativeFallback) {
          matchedRelationship = collaborativeFallback;
          const fallbackId = collaborativeFallback.sourceCharacterId === primary.id
            ? collaborativeFallback.targetCharacterId
            : collaborativeFallback.sourceCharacterId;
          secondary = characters.find(c => c.id === fallbackId) || secondary;
        }
      }
    }

    if (!secondary) {
      const fallbackCandidates = characters.filter(c => c.id !== primary.id);
      if (fallbackCandidates.length > 0) {
        const fallback = this.pickPrimaryCharacter(fallbackCandidates, date);
        secondary = fallback || fallbackCandidates[0];
      }
    }

    const relationshipContext = secondary
      ? {
          relationshipType: matchedRelationship?.relationshipType || 'ally',
          summary: matchedRelationship?.summary
            || primary.relationshipsSummary
            || secondary.relationshipsSummary
            || undefined
        }
      : null;

    return { primary, secondary, relationshipContext };
  }

  /**
   * Resolve active hook for a scene based on day-of-week or sequence order
   */
  private resolveActiveHook(subplot: WeeklySubplot | null, date: Date): NextSceneHook | null {
    if (!subplot?.nextSceneHooks || subplot.nextSceneHooks.length === 0) {
      return null;
    }

    const hooks = subplot.nextSceneHooks.filter(Boolean);
    if (hooks.length === 0) return null;

    const dayOfWeek = this.getIsoDay(date);
    const byDay = hooks.find(hook => hook.dayOfWeek === dayOfWeek);
    if (byDay) return byDay;

    const sortedBySequence = hooks
      .slice()
      .sort((a, b) => (a.sequence ?? Number.MAX_SAFE_INTEGER) - (b.sequence ?? Number.MAX_SAFE_INTEGER));

    // Use dayOfWeek index as fallback pointer (Monday=1 -> index 0)
    const index = Math.min(sortedBySequence.length - 1, Math.max(0, dayOfWeek - 1));
    return sortedBySequence[index] || sortedBySequence[0];
  }

  private getIsoDay(date: Date): number {
    const jsDay = date.getDay(); // 0 (Sunday) - 6 (Saturday)
    return jsDay === 0 ? 7 : jsDay;
  }

  private buildChannelContext(channel: string, format?: string): ChannelContext {
    const key = (channel || '').toLowerCase();
    const profiles: Record<string, ChannelContext> = {
      instagram: {
        medium: 'visual',
        audienceFocus: 'Thumb-stopping visuals + emotive micro-stories that earn saves and shares.',
        successSignals: ['Save rate', 'Shares', 'Comment depth'],
        toneGuidelines: ['Intimate', 'Vivid', 'Camera-forward'],
        recommendedCadence: 'Daily scenes with alternating on-camera and faceless posts.'
      },
      tiktok: {
        medium: 'video',
        audienceFocus: 'Fast-paced storytelling with pattern breaks inside the first 3 seconds.',
        successSignals: ['Watch-through rate', 'Replays', 'Sound-on engagement'],
        toneGuidelines: ['Playful', 'Behind-the-scenes', 'High-energy'],
        recommendedCadence: 'Short-form videos 4-5x per week with duet/stitch moments.'
      },
      youtube: {
        medium: 'video',
        audienceFocus: 'Long-form narrative arcs with cinematic pacing and clear teaching moments.',
        successSignals: ['Average view duration', 'Thumbnail CTR', 'Subscriber growth'],
        toneGuidelines: ['Cinematic', 'Educational', 'Confident'],
        recommendedCadence: 'Weekly flagship video supported by Shorts teasers.'
      },
      linkedin: {
        medium: 'copy',
        audienceFocus: 'Thought leadership stories that spark professional dialogue and saves.',
        successSignals: ['Qualified comments', 'Re-shares with commentary', 'Profile visits'],
        toneGuidelines: ['Credible', 'Practical', 'Empathetic'],
        recommendedCadence: '3–4 narrative posts per week with clear takeaways.'
      },
      x: {
        medium: 'copy',
        audienceFocus: 'Fast takes, contrarian POVs, and conversational threads anchored in clarity.',
        successSignals: ['Replies', 'Reposts', 'Bookmark rate'],
        toneGuidelines: ['Punchy', 'Insightful', 'Conversational'],
        recommendedCadence: 'Daily threads with follow-up engagement.'
      },
      email: {
        medium: 'copy',
        audienceFocus: 'Value-packed storytelling that earns trust and prompts immediate action.',
        successSignals: ['Opens', 'Click-through rate', 'Replies'],
        toneGuidelines: ['Warm', 'Personal', 'Helpful'],
        recommendedCadence: '2–3 narrative-driven sends per week plus timely launches.'
      },
      podcast: {
        medium: 'audio',
        audienceFocus: 'Conversational depth and narrative pacing that keeps listeners through the CTA.',
        successSignals: ['Completion rate', 'Shares', 'Reviews'],
        toneGuidelines: ['Conversational', 'Curious', 'Authoritative'],
        recommendedCadence: 'Weekly flagship episode with mid-week teaser clips.'
      }
    };

    const defaultProfile: ChannelContext = {
      medium: 'copy',
      audienceFocus: 'Deliver a tight, buyer-led story that creates emotional stakes and a clear next step.',
      successSignals: ['Engagement depth', 'Share of voice', 'Lead conversions'],
      toneGuidelines: ['Emotive', 'Actionable', 'Authentic'],
      recommendedCadence: 'Maintain a consistent daily presence with varied storytelling angles.'
    };

    const profile = profiles[key] ? { ...profiles[key] } : { ...defaultProfile };

    if (format) {
      const formatKey = format.toLowerCase();
      if (profile.medium === 'video' && formatKey.includes('live')) {
        profile.toneGuidelines = Array.from(new Set([...profile.toneGuidelines, 'Interactive', 'Responsive']));
        profile.successSignals = Array.from(new Set([...profile.successSignals, 'Live retention', 'Chat velocity']));
      }
      if (profile.medium === 'visual' && formatKey.includes('carousel')) {
        profile.toneGuidelines = Array.from(new Set([...profile.toneGuidelines, 'Value-packed', 'Sequenced storytelling']));
        profile.successSignals = Array.from(new Set([...profile.successSignals, 'Slide completion rate', 'Saves']));
      }
      if (profile.medium === 'copy' && formatKey.includes('thread')) {
        profile.toneGuidelines = Array.from(new Set([...profile.toneGuidelines, 'Structured', 'Cliffhanger-friendly']));
        profile.successSignals = Array.from(new Set([...profile.successSignals, 'Thread completion', 'Quote retweets']));
      }
    }

    return profile;
  }

  private async getEventsVersion(brandId: string): Promise<string> {
    const cacheKey = `brand:${brandId}:eventsVersion`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const result = await pool.query(
        `SELECT GREATEST(
            COALESCE(MAX(updated_at), '1970-01-01'::timestamp),
            COALESCE(MAX(created_at), '1970-01-01'::timestamp)
         ) as version
         FROM brand_events
         WHERE brand_id = $1`,
        [brandId]
      );

      const versionDate = result.rows[0]?.version
        ? new Date(result.rows[0].version)
        : new Date(0);

      const version = versionDate.getTime().toString();
      this.setCache(cacheKey, version, 5 * 60 * 1000); // cache version for 5 minutes
      return version;
    } catch (error) {
      console.warn('BrandContextEngine: failed to compute events version, defaulting to 0', error);
      return '0';
    }
  }

  /**
   * Retrieve recent "perfect" content slices with compact memory summaries
   */
  async getRecentPerfectContent(
    brandId: string,
    options?: { limit?: number; channel?: string; format?: string }
  ): Promise<PerfectContentMemory[]> {
    const limit = options?.limit ?? 5;
    const channel = options?.channel?.toLowerCase();
    const format = options?.format?.toLowerCase();

    const cacheKey = `brand:${brandId}:perfectContent:${limit}:${channel || 'all'}:${format || 'all'}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const result = await pool.query(
        `SELECT id,
                platform,
                content_type,
                scheduled_date,
                content_data
         FROM content_calendar
         WHERE brand_id = $1
           AND (
             (content_data ->> 'isPerfect')::boolean = TRUE
             OR lower(content_data ->> 'quality') = 'perfect'
             OR (content_data ->> 'status') = 'perfect'
           )
         ORDER BY scheduled_date DESC
         LIMIT $2`,
        [brandId, limit * 2] // Fetch extra for post-filtering
      );

      const memories: PerfectContentMemory[] = [];

      for (const row of result.rows) {
        let contentData: any = row.content_data;
        if (typeof contentData === 'string') {
          try {
            contentData = JSON.parse(contentData);
          } catch {
            contentData = {};
          }
        }

        const contentChannel = (contentData?.channel || row.platform || '').toLowerCase();
        if (channel && contentChannel && contentChannel !== channel) continue;

        const contentFormat = (contentData?.format || row.content_type || '').toLowerCase();
        if (format && contentFormat && contentFormat !== format) continue;

        const hook = contentData?.hook;
        const body = contentData?.body;
        const cta = contentData?.cta;
        const emotion = contentData?.emotionalTone || contentData?.emotion;

        const summary = contentData?.summary
          || [hook, emotion ? `Emotion: ${emotion}` : null, cta ? `CTA: ${cta}` : null]
            .filter(Boolean)
            .join(' • ')
          || (body ? `${body}`.slice(0, 180) : null)
          || hook;

        if (!summary) continue;

        memories.push({
          id: row.id,
          date: row.scheduled_date
            ? new Date(row.scheduled_date).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0],
          channel: contentData?.channel || row.platform || undefined,
          format: contentData?.format || row.content_type || undefined,
          summary: summary.length > 320 ? `${summary.slice(0, 317)}…` : summary,
          emotion,
          cta,
          characterIds: Array.isArray(contentData?.characterIds) ? contentData.characterIds : undefined,
          raw: {
            hook,
            body,
            cta
          }
        });

        if (memories.length >= limit) break;
      }

      this.setCache(cacheKey, memories, 30 * 60 * 1000); // 30 minutes
      return memories;
    } catch (error: any) {
      if (error?.code === '42P01') {
        // content_calendar table not available yet
        this.setCache(cacheKey, [], 15 * 60 * 1000);
        return [];
      }
      throw error;
    }
  }

  /**
   * Get complete monthly context (single month only)
   */
  async getMonthlyContext(
    brandId: string,
    month: number,
    year: number
  ): Promise<{
    theme: MonthlyTheme | null;
    subplots: WeeklySubplot[];
    events: Event[];
    characters: Character[];
  }> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const [theme, subplots, events, characters] = await Promise.all([
      this.getMonthlyTheme(brandId, month, year),
      this.getWeeklySubplots(brandId, month, year),
      this.getEventsForDateRange(brandId, startDate, endDate),
      this.getCharacters(brandId)
    ]);

    return { theme, subplots, events, characters };
  }

  /**
   * Get intelligent season planning context with timeline awareness
   * Returns events from previous, current, and next month for narrative continuity
   * This embeds Andora in the user's full timeline, not just isolated months
   */
  async getSeasonPlanningContext(
    brandId: string,
    month: number,
    year: number
  ): Promise<{
    theme: MonthlyTheme | null;
    subplots: WeeklySubplot[];
    timelineEvents: {
      previous: Event[];
      current: Event[];
      next: Event[];
      all: Event[];
    };
    characters: Character[];
  }> {
    const eventsVersion = await this.getEventsVersion(brandId);
    const cacheKey = `seasonTimeline:${brandId}:${month}:${year}:${eventsVersion}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    // Calculate previous month
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;

    // Calculate next month
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;

    // Date ranges
    const prevStartDate = new Date(prevYear, prevMonth - 1, 1);
    const prevEndDate = new Date(prevYear, prevMonth, 0);

    const currentStartDate = new Date(year, month - 1, 1);
    const currentEndDate = new Date(year, month, 0);

    const nextStartDate = new Date(nextYear, nextMonth - 1, 1);
    const nextEndDate = new Date(nextYear, nextMonth, 0);

    // Fetch all context in parallel
    const [theme, subplots, previousEvents, currentEvents, nextEvents, characters] = await Promise.all([
      this.getMonthlyTheme(brandId, month, year),
      this.getWeeklySubplots(brandId, month, year),
      this.getEventsForDateRange(brandId, prevStartDate, prevEndDate),
      this.getEventsForDateRange(brandId, currentStartDate, currentEndDate),
      this.getEventsForDateRange(brandId, nextStartDate, nextEndDate),
      this.getCharacters(brandId)
    ]);

    const result = {
      theme,
      subplots,
      timelineEvents: {
        previous: previousEvents,
        current: currentEvents,
        next: nextEvents,
        all: [...previousEvents, ...currentEvents, ...nextEvents]
      },
      characters
    };

    this.setCache(cacheKey, result, 30 * 60 * 1000); // Cache for 30 minutes keyed by event version
    return result;
  }

  /**
   * Build focused context for Scene Writer (THE KEY OPTIMIZATION)
   */
  async getSceneContext(request: {
    brandId: string;
    date: Date;
    channel: string;
    format?: string;
  }): Promise<SceneContext> {
    // Parallel fetch all needed context
    const [brand, characters, relationships, event, subplot, perfectContent] = await Promise.all([
      this.getBrandIdentity(request.brandId),
      this.getCharacters(request.brandId),
      this.getCharacterRelationships(request.brandId),
      this.getEventForDate(request.brandId, request.date),
      this.getSubplotForDate(request.brandId, request.date),
      this.getRecentPerfectContent(request.brandId, {
        channel: request.channel,
        format: request.format,
        limit: 5
      })
    ]);

    const { primary, secondary, relationshipContext } = this.selectNarrativePair(
      characters,
      relationships,
      request.date
    );

    const subplotWithHook = subplot
      ? {
          ...subplot,
          activeHook: this.resolveActiveHook(subplot, request.date)
        }
      : null;

    const knowledgeQueryParts = [
      request.channel,
      request.format,
      brand.buyerProfile,
      brand.archetype,
      subplotWithHook?.title,
      subplotWithHook?.activeHook?.hook,
      event?.title
    ].filter(Boolean) as string[];

    const knowledgeMatches = knowledgeQueryParts.length > 0
      ? await brandVectorStore.query(
          request.brandId,
          knowledgeQueryParts.join(' | '),
          { topK: 5, minScore: 0.2 }
        )
      : [];

    const knowledgeSnippets: ContextSnippet[] = knowledgeMatches.map(match => ({
      id: match.id,
      summary: match.summary || match.content.slice(0, 200),
      content: match.content,
      type: match.sourceType,
      sourceId: match.sourceId,
      score: match.score
    }));

    const channelContext = this.buildChannelContext(request.channel, request.format);

    return {
      brand: {
        voice: brand.voice,
        personality: brand.personality,
        values: brand.values,
        archetype: brand.archetype,
        buyerProfile: brand.buyerProfile,
        headquarters: brand.brandHqLocation
      },
      character: primary,
      secondaryCharacter: secondary,
      relationshipContext,
      event,
      subplot: subplotWithHook,
      recentPerfectContent: perfectContent,
      knowledgeSnippets,
      channelContext
    };
  }

  /**
   * Get Season Plot Context (for monthly plot generation - PHASE 5)
   * Returns focused context for season/monthly theme generation
   */
  async getSeasonPlotContext(params: {
    brandId: string;
    month: number;
    year: number;
  }): Promise<{
    brand: BrandIdentity;
    events: Event[];
    characters: Character[];
    previousTheme: { theme: string; description: string } | null;
    month: number;
    year: number;
  }> {
    const cacheKey = `season:${params.brandId}:${params.month}:${params.year}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    // Get brand identity
    const brand = await this.getBrandIdentity(params.brandId);

    // Get events in this month
    const startDate = new Date(params.year, params.month - 1, 1);
    const endDate = new Date(params.year, params.month, 0);
    const events = await this.getEventsForDateRange(params.brandId, startDate, endDate);

    // Get all brand characters for the monthly plot
    const characters = await this.getCharacters(params.brandId);

    // Get previous month's theme for continuity
    const prevMonth = params.month === 1 ? 12 : params.month - 1;
    const prevYear = params.month === 1 ? params.year - 1 : params.year;
    const previousThemeData = await this.getMonthlyTheme(params.brandId, prevMonth, prevYear);

    const previousTheme = previousThemeData
      ? { theme: previousThemeData.title, description: previousThemeData.description }
      : null;

    const result = {
      brand,
      events,
      characters,
      previousTheme,
      month: params.month,
      year: params.year
    };

    this.setCache(cacheKey, result, 15 * 60 * 1000); // 15 minutes
    return result;
  }

  /**
   * Get Weekly Subplot Context (for weekly subplot generation - PHASE 6)
   * Returns focused context for episode generation
   */
  async getWeeklySubplotContext(params: {
    brandId: string;
    monthlyThemeId: string;
    weekNumber: number;
  }): Promise<{
    brand: BrandIdentity;
    monthlyTheme: { theme: string; description: string };
    characters: Character[];
    events: Event[];
    weekNumber: number;
    weekStartDate: Date;
    weekEndDate: Date;
    month: number;
    year: number;
  }> {
    const cacheKey = `subplot:${params.brandId}:${params.monthlyThemeId}:${params.weekNumber}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    // Get monthly theme
    const monthlyThemeResult = await pool.query(
      `SELECT id, month, year, theme, description
       FROM brand_monthly_themes
       WHERE id = $1`,
      [params.monthlyThemeId]
    );

    if (monthlyThemeResult.rows.length === 0) {
      throw new Error(`Monthly theme ${params.monthlyThemeId} not found`);
    }

    const themeData = monthlyThemeResult.rows[0];
    const monthlyTheme = {
      theme: themeData.theme,
      description: themeData.description
    };

    // Get brand identity
    const brand = await this.getBrandIdentity(params.brandId);

    // Get characters with locations
    const characters = await this.getCharacters(params.brandId);

    // Calculate week's date range
    const month = themeData.month;
    const year = themeData.year;
    const firstDayOfMonth = new Date(year, month - 1, 1);
    const firstDayWeekday = firstDayOfMonth.getDay();

    // Calculate start and end dates for this week
    const weekStartDay = 1 + ((params.weekNumber - 1) * 7) - firstDayWeekday;
    const weekEndDay = weekStartDay + 6;

    const weekStartDate = new Date(year, month - 1, Math.max(1, weekStartDay));
    const weekEndDate = new Date(year, month - 1, Math.min(weekEndDay, new Date(year, month, 0).getDate()));

    // Get events in this week
    const events = await this.getEventsForDateRange(params.brandId, weekStartDate, weekEndDate);

    const result = {
      brand,
      monthlyTheme,
      characters,
      events,
      weekNumber: params.weekNumber,
      weekStartDate,
      weekEndDate,
      month,
      year
    };

    this.setCache(cacheKey, result, 15 * 60 * 1000); // 15 minutes
    return result;
  }

  /**
   * Get Calendar Batch Context (for daily calendar generation - PHASE 7)
   * Returns focused context for calendar scene generation
   */
  async getCalendarBatchContext(params: {
    brandId: string;
    monthlyThemeId: string;
    weeklySubplotId?: string;
    startDay: number;
    endDay: number;
  }): Promise<{
    brand: BrandIdentity;
    monthlyTheme: { theme: string; description: string; month: number; year: number };
    weeklySubplot: { title: string; description: string; nextSceneHooks?: NextSceneHook[] } | null;
    characters: Character[];
    events: Event[];
    channels: string[];
  }> {
    const cacheKey = `calendar:${params.brandId}:${params.monthlyThemeId}:${params.startDay}:${params.endDay}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    // Get monthly theme
    const monthlyThemeResult = await pool.query(
      `SELECT mt.id, mt.month, mt.year, mt.theme, mt.description,
              b.channels
       FROM brand_monthly_themes mt
       JOIN brands b ON mt.brand_id = b.id
       WHERE mt.id = $1`,
      [params.monthlyThemeId]
    );

    if (monthlyThemeResult.rows.length === 0) {
      throw new Error(`Monthly theme ${params.monthlyThemeId} not found`);
    }

    const themeData = monthlyThemeResult.rows[0];
    const monthlyTheme = {
      theme: themeData.theme,
      description: themeData.description,
      month: themeData.month,
      year: themeData.year
    };

    // Get weekly subplot if provided
    let weeklySubplot = null;
    if (params.weeklySubplotId) {
      const subplotResult = await pool.query(
        `SELECT subplot_title, description, next_scene_hooks
         FROM brand_weekly_subplots
         WHERE id = $1`,
        [params.weeklySubplotId]
      );

      if (subplotResult.rows.length > 0) {
        weeklySubplot = {
          title: subplotResult.rows[0].subplot_title,
          description: subplotResult.rows[0].description,
          nextSceneHooks: (() => {
            const hooks = subplotResult.rows[0].next_scene_hooks;
            if (!hooks) return [];
            if (Array.isArray(hooks)) return hooks;
            try {
              const parsed = JSON.parse(hooks);
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              return [];
            }
          })()
        };
      }
    }

    // Get brand identity
    const brand = await this.getBrandIdentity(params.brandId);

    // Get characters with locations
    const characters = await this.getCharacters(params.brandId);

    // Get events in this date range
    const startDate = new Date(themeData.year, themeData.month - 1, params.startDay);
    const endDate = new Date(themeData.year, themeData.month - 1, params.endDay);
    const events = await this.getEventsForDateRange(params.brandId, startDate, endDate);

    // Get channels from brand
    const channels = themeData.channels || ['LinkedIn', 'Instagram'];

    const result = {
      brand,
      monthlyTheme,
      weeklySubplot,
      characters,
      events,
      channels
    };

    this.setCache(cacheKey, result, 15 * 60 * 1000); // 15 minutes
    return result;
  }

  /**
   * Get Events for Month
   * Helper method for season planning
   */
  async getEventsForMonth(
    brandId: string,
    month: number,
    year: number
  ): Promise<Event[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    return this.getEventsForDateRange(brandId, startDate, endDate);
  }

  /**
   * Get Previous Month Theme
   * Helper method for narrative continuity
   */
  async getPreviousMonthTheme(
    brandId: string,
    month: number,
    year: number
  ): Promise<{ theme: string; description: string } | null> {
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;

    const theme = await this.getMonthlyTheme(brandId, prevMonth, prevYear);

    if (!theme) return null;

    return {
      theme: theme.title,
      description: theme.description
    };
  }

  /**
   * Invalidate cache for a brand
   */
  invalidateBrand(brandId: string): void {
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.startsWith(`brand:${brandId}:`) ||
          key.startsWith(`season:${brandId}:`) ||
          key.startsWith(`subplot:${brandId}:`) ||
          key.startsWith(`calendar:${brandId}:`) ||
          key.startsWith(`seasonTimeline:${brandId}:`)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.cache.delete(key));
    console.log(`🗑️ Invalidated ${keysToDelete.length} cache entries for brand ${brandId}`);
  }

  /**
   * Cache management
   */
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) {
      this.cacheMisses++;
      return null;
    }

    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      this.cacheMisses++;
      return null;
    }

    this.cacheHits++;
    return cached.data;
  }

  private setCache(key: string, data: any, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  private clearExpiredCache(): void {
    const now = Date.now();
    let cleared = 0;

    this.cache.forEach((value, key) => {
      if (now - value.timestamp > value.ttl) {
        this.cache.delete(key);
        cleared++;
      }
    });

    if (cleared > 0) {
      console.log(`🧹 Cleared ${cleared} expired cache entries`);
    }
  }

  /**
   * Get focused context for character generation (THE KEY OPTIMIZATION)
   * Returns only essential brand info needed for character creation
   */
  async getCharacterGenerationContext(brandId: string): Promise<{
    brand: BrandIdentity;
    existingCharacters: Character[];
  }> {
    // Parallel fetch minimal needed context
    const [brand, existingCharacters] = await Promise.all([
      this.getBrandIdentity(brandId),
      this.getCharacters(brandId)
    ]);

    return {
      brand,
      existingCharacters
    };
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[]; hits: number; misses: number; hitRate: number } {
    const totalAccesses = this.cacheHits + this.cacheMisses;
    const hitRate = totalAccesses === 0 ? 0 : this.cacheHits / totalAccesses;
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: Number(hitRate.toFixed(3))
    };
  }
}

// Singleton instance
export const brandContextEngine = new BrandContextEngine();
