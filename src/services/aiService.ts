import { Brand, Character, ContentItem, Event, CastGenerationOptions } from '../types';
import { apiClient } from '../lib/api';
import type { AIModel } from '../components/common/AIModelSwitcher';

const NON_THINKING_MODEL: AIModel = 'claude-haiku-3.5';

const uniqueArray = <T>(values: T[]): T[] => Array.from(new Set(values));

const getWeekOfMonth = (dateString: string) => {
  const date = new Date(dateString + 'T00:00:00');
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const dayOfMonth = date.getDate();
  const adjusted = dayOfMonth + firstDay.getDay() - 1;
  return Math.floor(adjusted / 7) + 1;
};

const getProgressionStage = (weekNumber: number) => {
  if (weekNumber <= 1) return 'opening';
  if (weekNumber === 2) return 'rising';
  if (weekNumber === 3) return 'climax';
  return 'resolution';
};

const formatNarrativeDate = (isoDate: string) => {
  const date = new Date(isoDate + 'T12:00:00Z');
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const generatePlotBeatsForDay = (
  date: string,
  weekNumber: number,
  weekFocus?: string,
  stage?: string,
) => {
  const beats: string[] = [];
  const formattedDate = formatNarrativeDate(date);
  const stageLabel = stage ? stage.charAt(0).toUpperCase() + stage.slice(1) : 'Story';

  if (weekFocus) {
    beats.push(`Advance the weekly subplot: ${weekFocus}`);
  }

  switch (stage) {
    case 'opening':
      beats.push('Establish the stakes for this week and hint at the transformation ahead.');
      beats.push('Introduce a compelling hook that invites the audience into the narrative.');
      break;
    case 'rising':
      beats.push('Escalate tension with a challenge or opportunity the audience can feel.');
      beats.push('Showcase how the brand or character is responding in real time.');
      break;
    case 'climax':
      beats.push('Deliver the emotional peak or breakthrough moment of the subplot.');
      beats.push('Make the audience feel the urgency of acting or engaging right now.');
      break;
    default:
      beats.push('Resolve the subplot with a satisfying payoff or reflective insight.');
      beats.push('Invite the audience to carry the story forward or anticipate what is next.');
      break;
  }

  beats.push(`${stageLabel} beat for ${formattedDate}. Anchor it in the lived experience of this channel's audience.`);

  return beats;
};

const selectCharacterForDay = (
  cast: Character[] = [],
  date: string,
  channel: string,
  context: { weekFocus?: string; monthTheme?: string; events?: Event[] }
) => {
  if (!cast.length) return null;

  const normalizedChannel = channel.toLowerCase();
  const focusText = (context.weekFocus || context.monthTheme || '').toLowerCase();
  const eventKeywords = (context.events || [])
    .map(event => `${event.title || ''} ${event.description || ''}`.toLowerCase())
    .filter(Boolean);
  const dateObj = new Date(date + 'T12:00:00Z');
  const dayIndex = Number.isNaN(dateObj.getTime()) ? 0 : dateObj.getDay();

  const scored = cast.map((character, index) => {
    const personaBlob = [character.persona, character.voice, character.about]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    let score = 0;
    if (personaBlob.includes(normalizedChannel)) score += 3;
    if (focusText && personaBlob.includes(focusText)) score += 3;
    if (character.role && normalizedChannel.includes(character.role.toLowerCase())) score += 2;
    if (eventKeywords.some(keyword => keyword && personaBlob.includes(keyword))) score += 2;
    if (character.work_mode === 'onsite') score += 0.5;

    // Deterministic tie breaker by day and index
    score += ((dayIndex + index) % 3) * 0.1;

    return { character, score };
  });

  const best = scored.sort((a, b) => b.score - a.score)[0];
  return best?.character ?? cast[(dayIndex + cast.length) % cast.length];
};

const toCharacterPromptContext = (character: Character | null | undefined) => {
  if (!character) return null;

  return {
    id: character.id,
    name: character.name,
    realName: character.character_name || character.real_name || '',
    role: character.role,
    voice: character.voice || character.personality || '',
    persona: character.persona || '',
    workMode: character.work_mode || 'remote',
    about: character.about || '',
  };
};

const sanitizeCharacterForRequest = (character: ReturnType<typeof toCharacterPromptContext>) => {
  if (!character) return undefined;
  const { name, realName, role, voice, persona, workMode, about } = character;
  return {
    name,
    real_name: realName,
    role,
    voice,
    persona,
    work_mode: workMode,
    about,
  };
};

const getChannelsForDate = (brand: Brand, date: string, channelsOverride?: string[]) => {
  if (channelsOverride && channelsOverride.length) {
    return uniqueArray(channelsOverride);
  }

  const dateObj = new Date(date + 'T12:00:00Z');
  const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }).toLowerCase() as
    | 'monday'
    | 'tuesday'
    | 'wednesday'
    | 'thursday'
    | 'friday'
    | 'saturday'
    | 'sunday';

  const scheduled = brand.channel_schedule?.[dayOfWeek];
  if (scheduled && scheduled.length) {
    return uniqueArray(scheduled);
  }

  return uniqueArray(brand.channels && brand.channels.length ? brand.channels : ['LinkedIn']);
};

const buildBrandContext = (brand: Brand) => ({
  brandName: brand.brand_name,
  brandType: brand.brand_type || 'organization',
  tagline: brand.taglines,
  about: brand.about,
  vision: brand.vision,
  mission: brand.mission,
  persona: brand.persona,
  buyerProfile: brand.buyer_profile,
  products: brand.products,
  voice: brand.voice,
  narrative_why: brand.narrative_why,
  narrative_problem: brand.narrative_problem,
  narrative_solution: brand.narrative_solution,
  narrative_cta: brand.narrative_cta,
  narrative_failure: brand.narrative_failure,
  narrative_success: brand.narrative_success,
  existingNarrative: {
    why: brand.narrative_why,
    problem: brand.narrative_problem,
    solution: brand.narrative_solution,
    cta: brand.narrative_cta,
    failure: brand.narrative_failure,
    success: brand.narrative_success
  }
});

const mapCharacterForRequest = (character: Character) => ({
  id: character.id,
  name: character.name,
  character_name: character.character_name,
  role: character.role,
  about: character.about,
  personality: character.personality,
  age_range: character.age_range,
  work_mode: character.work_mode,
  persona: character.persona,
  perfect_fields: character.perfect_fields || {},
});

const mapEventsForAI = (events: Event[] = []) =>
  events.map(event => ({
    date: event.event_date || event.start_date || '',
    title: event.title,
    description: event.description,
  }));

const formatEventDate = (isoDate?: string | null) => {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
};

const mapEventsForNarrative = (events: Event[] = []) =>
  events
    .map(event => {
      const parts: string[] = [];
      const formattedDate = formatEventDate(event.event_date || event.start_date);
      if (formattedDate) {
        parts.push(`${formattedDate}`);
      }
      const title = (event.title || '').trim();
      if (title) {
        parts.push(title);
      }
      if (event.description) {
        parts.push(event.description.trim());
      }
      return parts.join(' — ');
    })
    .filter(Boolean);

const mapCharactersForSubplot = (characters: Character[] = []) =>
  characters.map(character => ({
    name: character.name,
    location: character.work_mode || 'remote',
    role: character.role || '',
    persona: character.persona || '',
    character_name: character.character_name || '',
    about: character.about || character.personality || '',
  }));

class AIService {
  async prefillNarrative(brand: Brand, model?: string): Promise<Partial<Brand>> {
    const response = await apiClient.prefillNarrative(buildBrandContext(brand), model);
    const narrative = response?.narrative ?? {};

    // Get perfect fields - don't overwrite them
    const perfectFields = brand.narrative_perfect_fields || {};

    // Only update fields that are NOT marked as perfect
    const updates: Partial<Brand> = {};

    if (!perfectFields.narrative_why && narrative.why) {
      updates.narrative_why = narrative.why;
    }
    if (!perfectFields.narrative_problem && narrative.problem) {
      updates.narrative_problem = narrative.problem;
    }
    if (!perfectFields.narrative_solution && narrative.solution) {
      updates.narrative_solution = narrative.solution;
    }
    if (!perfectFields.narrative_cta && narrative.cta) {
      updates.narrative_cta = narrative.cta;
    }
    if (!perfectFields.narrative_failure && narrative.failure) {
      updates.narrative_failure = narrative.failure;
    }
    if (!perfectFields.narrative_success && narrative.success) {
      updates.narrative_success = narrative.success;
    }

    return updates;
  }

  async generateCast(brand: Brand, options: CastGenerationOptions, model: string): Promise<Character[]> {
    const {
      totalCharacters,
      userCharacterList = '',
      userCharacterDetails = '',
      lockedCharacters = [],
      regenerateCharacters = []
    } = options;

    const brandContext = buildBrandContext(brand);

    try {
      if (userCharacterList.trim()) {
        const userCharacters = userCharacterList
          .split(/\r?\n/)
          .map(line => line.trim())
          .filter(Boolean)
          .map(line => {
            const detailedMatch = line.match(/Name:\s*([^,]+)(?:,\s*Role:\s*([^,]+))?(?:,\s*Character:\s*([^,]+))?(?:,\s*About:\s*(.+))?/i);
            if (detailedMatch) {
              return {
                name: detailedMatch[3] || detailedMatch[1],
                description: detailedMatch[4] || detailedMatch[2] || 'Brand storyteller',
                location: undefined,
              };
            }

            const simpleMatch = line.match(/^(.+?)\s*\((.+?)\)$/);
            if (simpleMatch) {
              return {
                name: simpleMatch[1].trim(),
                description: simpleMatch[2].trim(),
                location: undefined,
              };
            }

            return {
              name: line,
              description: 'Brand storyteller',
              location: undefined,
            };
          });

        const response = await apiClient.resolveCast(brandContext, userCharacters, model);

        if (response?.success && response?.characters?.cast) {
          return response.characters.cast.map((char: any, index: number) => ({
            id: `char-${Date.now()}-${index}`,
            name: char.name,
            persona: char.persona,
            role: char.persona,
            description: char.persona,
            location: brand.brand_hq_location || '',
            work_mode: 'remote',
            brand_connection: char.persona,
            isPerfect: false,
          }));
        }
      }

      const response = await apiClient.generateCharacters(
        brandContext,
        totalCharacters,
        lockedCharacters.map(c => c.name),
        model
      );

      if (response?.success && response?.characters?.cast) {
        return response.characters.cast.map((char: any, index: number) => ({
          id: `char-${Date.now()}-${index}`,
          name: char.name,
          persona: char.persona,
          role: char.persona,
          description: char.persona,
          location: brand.brand_hq_location || '',
          work_mode: 'remote',
          brand_connection: char.persona,
          isPerfect: false,
        }));
      }

      return [];
    } catch (error) {
      console.error('Error generating cast via backend:', error);
      return [];
    }
  }

  async generateTheme(
    brand: Brand,
    month: string,
    events: Event[],
    model?: string,
    themePrompt?: string
  ): Promise<{ theme: string; explanation?: string; weeks?: Record<number, string> }> {
    try {
      const brandId = brand.id || brand.brand_id;
      console.log('🚀 Generating theme with multi-agent system:', {
        brandId,
        month,
        themePrompt,
        model
      });

      const response = await apiClient.generateMonthlyTheme(
        buildBrandContext(brand),
        month,
        mapEventsForAI(events),
        model,
        brandId,  // ✅ Pass brandId (use brand.id or brand.brand_id)
        themePrompt  // ✅ Pass user's theme input
      );

      console.log('✅ Multi-agent response:', {
        theme: response?.theme,
        explanationLength: response?.explanation?.length,
        hasWeeks: !!response?.weeks,
        weekKeys: response?.weeks ? Object.keys(response.weeks) : []
      });

      return {
        theme: (response?.theme || '').trim(),
        explanation: (response?.explanation || '').trim() || undefined,
        weeks: response?.weeks || undefined  // ✅ Pass through weeks from backend
      };
    } catch (error) {
      console.error('Failed to generate monthly theme:', error);
      return { theme: '', explanation: undefined };
    }
  }

  async generateMonthlyPlot(
    brand: Brand,
    month: string,
    theme: string,
    events: Event[],
    _cast: Character[],
    model?: string
  ): Promise<{ theme?: string; plot: string }> {
    try {
      const brandId = brand.id || brand.brand_id;
      console.log('🚀 Generating monthly plot with multi-agent system:', {
        brandId,
        month,
        theme: theme.substring(0, 80) + '...',
        model
      });

      const response = await apiClient.generateMonthlyPlot(
        buildBrandContext(brand),
        theme,
        month,
        mapEventsForNarrative(events),
        theme,  // Pass theme as themePrompt
        model,
        brandId  // ✅ Pass brandId for multi-agent orchestrator
      );

      console.log('✅ Multi-agent monthly plot response:', {
        theme: response?.theme?.substring(0, 80) + '...',
        explanationLength: response?.explanation?.length
      });

      const themeTitle = (response?.theme || '').trim();
      const explanation = (response?.explanation || '').trim();

      // Extract weekly breakdowns from new JSON structure
      const week1 = (response?.week_1 || '').trim();
      const week2 = (response?.week_2 || '').trim();
      const week3 = (response?.week_3 || '').trim();
      const week4 = (response?.week_4 || '').trim();
      const contentSparks = (response?.content_sparks || '').trim();

      console.log('📦 Backend Response:', {
        hasWeek1: !!week1,
        hasWeek2: !!week2,
        hasWeek3: !!week3,
        hasWeek4: !!week4,
        week1Length: week1.length,
        week2Length: week2.length,
        week3Length: week3.length,
        week4Length: week4.length
      });

      // Build full breakdown for preview modal
      const fullBreakdownSections = [
        `MONTHLY THEME: ${themeTitle}`,
        '',
        'MONTHLY PLOT:',
        explanation,
        '',
        'FULL BREAKDOWN:',
        explanation,
        '',
        week1,
        '',
        week2,
        '',
        week3,
        '',
        week4,
        contentSparks ? `\n\nCONTENT SPARKS:\n${contentSparks}` : ''
      ].filter(section => section !== undefined && section !== null);

      const fullBreakdown = fullBreakdownSections.join('\n');

      return {
        theme: themeTitle || undefined,
        plot: explanation,  // Just the opening for monthly plot field
        fullPreview: fullBreakdown,  // Full breakdown for modal
        weeks: {
          1: week1,
          2: week2,
          3: week3,
          4: week4
        }
      };
    } catch (error) {
      console.error('Failed to generate monthly plot:', error);
      return { theme: undefined, plot: '' };
    }
  }

  async generateWeeklySubplot(
    brand: Brand,
    month: string,
    week: number,
    theme: string,
    plot: string,
    events: Event[],
    previousSubplot: string | undefined,
    weeklyTheme: string,
    cast: Character[],
    model?: string,
  ): Promise<{ subplot: string; weekTheme?: string }> {
    try {
      const response = await apiClient.generateWeeklySubplot({
        brandContext: buildBrandContext(brand),
        monthlyPlot: plot,
        monthlyTheme: theme,
        weekNumber: week,
        weekStart: '',
        weekEnd: '',
        weekTheme: weeklyTheme,
        events: mapEventsForNarrative(events),
        characters: mapCharactersForSubplot(cast),
        model,
      });

      return {
        subplot: (response?.subplot?.subplot_description || response?.subplot || '').trim(),
        weekTheme: response?.subplot?.week_theme?.trim() || undefined
      };
    } catch (error) {
      console.error('Failed to generate weekly subplot:', error);
      return { subplot: '', weekTheme: undefined };
    }
  }

  async expandBrief(
    contentItem: ContentItem,
    brand: Brand,
    model?: string,
    instructions?: string,
    characters?: Character[],
    weekFocus?: string,
  ): Promise<{ expandedBrief: string; observerFeedback?: any }> {
    try {
      const charactersList = characters || brand.cast_management || [];
      const castForContext = charactersList.map(mapCharacterForRequest);
      // Enforce strict formatting instructions
      const formattingInstructions = "FORMATTING RULES: Output rich, structured HTML. Use tags like <h3>, <strong>, <p>, <ul>, and <li> for clear, impressive formatting. Do not output plain text.";
      const fullInstructions = instructions
        ? `${instructions}\n\n${formattingInstructions}`
        : formattingInstructions;

      const response = await apiClient.expandBriefRequest({
        brandContext: buildBrandContext(brand),
        brief: contentItem.brief,
        model: model ?? NON_THINKING_MODEL,
        instructions: fullInstructions,
        characters: castForContext,
        date: contentItem.date,
        channel: contentItem.channel,
        // Pass original idea details
        mediaType: contentItem.media_type,
        hook: contentItem.story_hook,
        directives: contentItem.directives,
        characterFocus: contentItem.character_focus,
        cta: contentItem.call_to_action,
        weekFocus,
      });

      // Return both expanded brief and observer feedback (if available)
      return {
        expandedBrief: response?.expandedBrief ?? '',
        observerFeedback: response?.observerFeedback
      };
    } catch (error) {
      console.error('Failed to expand brief:', error);
      throw error;
    }
  }

  async refineContent(
    brand: Brand,
    originalContent: string,
    refinePrompt: string,
    itemDate: string,
    characters: Character[] = [],
    model?: string,
  ): Promise<string> {
    try {
      const response = await apiClient.refineContentRequest({
        brandContext: buildBrandContext(brand),
        originalContent,
        refinePrompt,
        itemDate,
        characters: characters.map(character => ({
          name: character.name,
          character_name: character.character_name,
          persona: character.persona,
          work_mode: character.work_mode,
        })),
        model: model ?? NON_THINKING_MODEL,
      });

      return (response?.refinedContent || '').trim();
    } catch (error) {
      console.error('Failed to refine content:', error);
      throw error;
    }
  }

  async generateContentCalendarEntry(
    brand: Brand,
    date: string,
    context: {
      monthTheme?: string;
      weekFocus?: string;
      preferredChannels?: string[];
      events?: Event[];
    },
    model?: string,
  ): Promise<ContentItem> {
    const preferredChannels = context.preferredChannels && context.preferredChannels.length
      ? context.preferredChannels
      : brand.channels && brand.channels.length > 0
        ? brand.channels
        : ['LinkedIn'];

    const targetChannel = preferredChannels[Math.floor(Math.random() * preferredChannels.length)];

    // Pass all characters so AI can choose the right one for the story
    const cast = brand.cast_management || [];

    const fallbackItem: ContentItem = {
      id: `content-${date}-${Math.random().toString(36).slice(2, 7)}`,
      date,
      channel: targetChannel,
      title: context.weekFocus || context.monthTheme || `${brand.brand_name} Spotlight`,
      brief: `Craft a ${targetChannel} post aligned with "${context.weekFocus || context.monthTheme || 'brand narrative'}". Highlight brand value with a clear CTA.`,
      final_brief: `Craft a ${targetChannel} post aligned with "${context.weekFocus || context.monthTheme || 'brand narrative'}". Highlight brand value with a clear CTA.`,
      key_theme: context.weekFocus || context.monthTheme || 'Brand storytelling moment',
      emotional_angles: ['Inspire', 'Trust'],
      content_type: `${targetChannel} Story`,
      directives: 'Open with a hook, reinforce credibility, close with a CTA.',
      is_perfect: false,
      tokens_used: 0,
    };

    try {
      const response = await apiClient.generateCalendarEntry(
        buildBrandContext(brand),
        date,
        {
          monthTheme: context.monthTheme,
          weekFocus: context.weekFocus,
          preferredChannels,
          events: mapEventsForAI(context.events || []),
          channel: targetChannel,
          // Pass ALL characters so AI can intelligently choose who fits this story
          characters: cast.map(character => ({
            name: character.name,
            character_name: character.character_name || character.real_name,
            persona: character.persona,
            role: character.role,
            work_mode: character.work_mode,
            voice: character.voice,
            about: character.about,
          })),
        },
        model,
      );

      const entry = response?.entry ?? response;

      return {
        id: `content-${date}-${Math.random().toString(36).slice(2, 7)}`,
        date,
        channel: entry?.channel || fallbackItem.channel,
        title: entry?.title || fallbackItem.title!,
        brief: entry?.brief || fallbackItem.brief,
        final_brief: entry?.brief || fallbackItem.final_brief,
        suggested_posting_time: entry?.suggested_posting_time || entry?.['Suggested Posting Time'],
        key_theme: entry?.key_theme || fallbackItem.key_theme,
        emotional_angles: Array.isArray(entry?.emotional_angles) && entry.emotional_angles.length
          ? entry.emotional_angles
          : fallbackItem.emotional_angles,
        content_type: entry?.content_type || fallbackItem.content_type,
        directives: Array.isArray(entry?.directives)
          ? entry.directives.join('\n')
          : entry?.directives || fallbackItem.directives,
        story_hook: entry?.hook || entry?.story_hook,
        character_focus: entry?.character_focus,
        emotional_beat: entry?.emotional_angles?.[0] || entry?.emotional_beat,
        narrative_purpose: entry?.narrative_purpose,
        media_type: entry?.media_type,
        tone: entry?.tone,  // ← ADDED: Map tone from API response
        call_to_action: entry?.cta || entry?.call_to_action,
        is_perfect: false,
        tokens_used: Number(response?.metadata?.tokensUsed) || 0,
      };
    } catch (error) {
      console.warn('Falling back to deterministic content calendar entry', error);
      return fallbackItem;
    }
  }

  /**
   * Generate content briefs for ALL channels on a specific date
   * Respects channel_schedule from brand profile
   */
  async generateDayContent(
    brand: Brand,
    date: string,
    context: {
      monthTheme?: string;
      weekFocus?: string;
      events?: Event[];
      channelsToGenerate?: string[];
    },
    model?: string,
  ): Promise<ContentItem[]> {
    const channelsForDay = getChannelsForDate(brand, date, context.channelsToGenerate);
    if (!channelsForDay.length) {
      return [];
    }

    const weekNumber = getWeekOfMonth(date);
    const stage = getProgressionStage(weekNumber);
    const monthKey = date.slice(0, 7);
    const seasonPlan = brand.season_plans?.[monthKey];
    const weekPlan = seasonPlan?.weekly?.[weekNumber];
    const eventsForDay = (context.events || []).filter(event => event.event_date === date);

    // Generate content brief for each channel
    const contentPromises = channelsForDay.map(async (channel) => {
      const selectedCharacter = selectCharacterForDay(brand.cast_management || [], date, channel, {
        weekFocus: context.weekFocus || weekPlan?.subplot || weekPlan?.custom_theme || seasonPlan?.theme,
        monthTheme: context.monthTheme || seasonPlan?.theme,
        events: context.events,
      });
      const characterContext = toCharacterPromptContext(selectedCharacter);

      const contentContext = {
        brand: {
          name: brand.brand_name,
          tagline: brand.taglines || '',
          persona: brand.persona || '',
          mission: brand.mission || '',
          vision: brand.vision || '',
          about: brand.about || '',
        },
        narrative: {
          seasonTheme: seasonPlan?.theme || '',
          monthlyTheme: context.monthTheme || seasonPlan?.themeNarrative || '',
          weeklySubplot: context.weekFocus || weekPlan?.subplot || weekPlan?.custom_theme || '',
          weekNumber,
          progressionStage: stage,
        },
        character: characterContext,
        events: eventsForDay.map(event => ({
          id: event.event_id,
          title: event.title,
          description: event.description,
          date: event.event_date,
        })),
        plotBeats: generatePlotBeatsForDay(date, weekNumber, context.weekFocus || weekPlan?.subplot, stage),
      };

      const prompt = `You are crafting a ${channel} content brief for ${contentContext.brand.name}.

BRAND DNA:
${JSON.stringify(contentContext.brand, null, 2)}

NARRATIVE CONTEXT:
Season Theme: ${contentContext.narrative.seasonTheme}
Monthly Focus: ${contentContext.narrative.monthlyTheme}
This Week's Subplot (Week ${contentContext.narrative.weekNumber}): ${contentContext.narrative.weeklySubplot || 'Focus the narrative on the brand promise.'}
Story Stage: ${contentContext.narrative.progressionStage}

CHARACTER VOICE (who's telling today's story):
${contentContext.character ? JSON.stringify(contentContext.character, null, 2) : 'Narrate from the brand collective voice while still feeling human.'}

TODAY'S EVENTS:
${contentContext.events.length ? contentContext.events.map(event => `- ${event.title}: ${event.description}`).join('\n') : 'No special events'}

PLOT BEATS TO HIT:
${contentContext.plotBeats.join('\n')}

DATE: ${formatNarrativeDate(date)}
CHANNEL: ${channel}

Create a compelling content brief that:
1. Advances the weekly subplot through this voice
2. Connects to the events happening today
3. Fits the ${contentContext.narrative.progressionStage} stage of this week's story arc
4. Maintains brand consistency while feeling fresh and engaging
5. Speaks authentically as ${contentContext.character?.name || contentContext.brand.name} from their perspective

The brief should feel like a scene in a TV series — part of a larger narrative, not standalone content.`;

      const fallbackBrief = `Craft a ${channel} scene for ${contentContext.brand.name} on ${formatNarrativeDate(date)} that reflects the ${stage} stage of the story. Focus on ${contentContext.narrative.weeklySubplot || contentContext.narrative.monthlyTheme || 'the brand promise'} and speak in the ${contentContext.character?.voice || contentContext.brand.persona || 'brand voice'}.`;

      const fallbackItem: ContentItem = {
        id: `content-${date}-${channel}-${Math.random().toString(36).slice(2, 7)}`,
        date,
        channel,
        title: `${contentContext.narrative.progressionStage.toUpperCase()} beat • ${contentContext.narrative.weeklySubplot || contentContext.narrative.monthlyTheme || channel}`,
        brief: fallbackBrief,
        final_brief: fallbackBrief,
        key_theme: contentContext.narrative.weeklySubplot || contentContext.narrative.monthlyTheme || 'Brand storytelling moment',
        emotional_angles: ['Inspire', 'Trust'],
        content_type: `${channel} Post`,
        directives: 'Open cinematically, deepen the story, close with an emotionally resonant CTA.',
        is_perfect: false,
      };

      try {
        const response = await apiClient.generateCalendarEntry(
          buildBrandContext(brand),
          date,
          {
            monthTheme: context.monthTheme,
            weekFocus: context.weekFocus,
            preferredChannels: [channel],
            events: mapEventsForAI(context.events || []),
            characters: (brand.cast_management || []).map(character => ({
              name: character.name,
              character_name: character.character_name,
              persona: character.persona,
              role: character.role,
              work_mode: character.work_mode,
            })),
            channel,
            character: sanitizeCharacterForRequest(characterContext),
            promptOverride: prompt,
            narrativeContext: contentContext,
          },
          model,
        );

        const entry = response?.entry ?? response;

        return {
          id: `content-${date}-${channel}-${Math.random().toString(36).slice(2, 7)}`,
          date,
          channel: entry?.channel || channel,
          title: entry?.title || fallbackItem.title!,
          brief: entry?.brief || fallbackItem.brief,
          final_brief: entry?.brief || fallbackItem.final_brief,
          suggested_posting_time: entry?.suggested_posting_time || entry?.['Suggested Posting Time'],
          key_theme: entry?.key_theme || fallbackItem.key_theme,
          emotional_angles: Array.isArray(entry?.emotional_angles) && entry.emotional_angles.length
            ? entry.emotional_angles
            : fallbackItem.emotional_angles,
          content_type: entry?.content_type || fallbackItem.content_type,
          directives: Array.isArray(entry?.directives)
            ? entry.directives.join('\n')
            : entry?.directives || fallbackItem.directives,
          is_perfect: false,
        };
      } catch (error) {
        console.warn(`Falling back to deterministic content for ${channel}`, error);
        return fallbackItem;
      }
    });

    return Promise.all(contentPromises);
  }

  async refineCharacterField(
    brand: Brand,
    field: string,
    character: Character,
    characters: Character[],
    model?: string,
  ): Promise<string> {
    const response = await apiClient.refineCharacterField(
      buildBrandContext(brand),
      field,
      mapCharacterForRequest(character),
      characters.map(mapCharacterForRequest),
      model ?? NON_THINKING_MODEL,
    );

    return (response?.suggestion || '').trim();
  }

  async chatResponse(message: string, brand: Brand, characters: Character[] = [], model?: string): Promise<string> {
    const response = await apiClient.chatWithAndora(
      buildBrandContext(brand),
      message,
      characters.map(character => ({
        name: character.name,
        character_name: character.character_name,
        persona: character.persona,
        work_mode: character.work_mode,
      })),
      model ?? 'gpt-4o-mini',
    );

    return (response?.reply || '').trim();
  }
}

export const aiService = new AIService();
