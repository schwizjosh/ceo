/**
 * CALENDAR GENERATOR AGENT
 *
 * Generates daily content scenes (PHASE 7)
 * Creates story-driven calendar entries
 *
 * This agent specializes in:
 * - Daily calendar generation (PHASE 7 from storytelling framework)
 * - Multi-channel content planning
 * - Character-location-aware storytelling
 * - Event-tied content generation
 */

import { BaseAgent, AgentInput, AgentOutput, AIModel } from './base';
import { PromptEngine } from '../services/promptEngine';
import { aiService } from '../services/aiService';

export interface CalendarGeneratorInput extends AgentInput {
  task: 'generate-calendar-batch';
  context: {
    brandName: string;
    brandVoice?: string;
    brandPersonality?: string[];
    month: string;
    year: string;
    monthlyTheme: string;
    monthlyPlot?: string;
    weeklySubplot?: string;
    weekNumber?: number;
    startDay: number;
    endDay: number;
    channels: string[];
    characters?: Array<{
      name: string;
      character_name?: string;
      location?: string;  // ✅ Optional - no geographic context needed
      work_mode?: string;
      persona: string;
      role?: string;
    }>;
    events?: Array<{
      date: string;
      title: string;
      description?: string;
    }>;
    distributionPlan?: any;
  };
  fallbackModels?: AIModel[];
}

export interface CalendarEntry {
  Day: string;
  Channel: string;
  'Story Hook & Content Idea': string;
  'Character Focus': string;
  'Emotional Beat': string;
  'Narrative Purpose': string;
  'Media Type': string;
  'Call To Action': string;
}

/**
 * Calendar Generator Agent
 *
 * Handles daily content scene generation with location-aware character selection
 */
export class CalendarGeneratorAgent extends BaseAgent {
  private promptEngine: PromptEngine;

  constructor(model?: AIModel) {
    super({
      name: 'CalendarGenerator',
      model: model || 'gpt-4o',  // Standardize default to GPT-4o
      defaultTokenBudget: 3000,        // Generates multiple days at once
      description: 'Daily calendar scene generation',
      capabilities: ['calendar-generation', 'daily-scenes', 'multi-channel', 'location-aware']
    });

    this.promptEngine = new PromptEngine();
  }

  /**
   * Main execution method
   */
  async execute(input: CalendarGeneratorInput): Promise<AgentOutput> {
    this.validateInput(input);
    this.startTimer();

    const { context } = input;

    this.log('Executing calendar generation', {
      brand: context.brandName,
      startDay: context.startDay,
      endDay: context.endDay,
      channels: context.channels?.length || 0,
      characters: context.characters?.length || 0
    });

    try {
      return await this.generateCalendarBatch(input);
    } catch (error) {
      this.log('Error in CalendarGeneratorAgent', error);
      throw error;
    }
  }

  /**
   * Generate Calendar Batch (PHASE 7)
   *
   * Creates daily content scenes for a range of days
   * Respects character locations and work modes
   */
  private async generateCalendarBatch(input: CalendarGeneratorInput): Promise<AgentOutput> {
    const { context, fallbackModels } = input;

    const dayCount = context.endDay - context.startDay + 1;

    this.log('Generating calendar batch', {
      dayCount,
      startDay: context.startDay,
      endDay: context.endDay,
      channelCount: context.channels?.length || 0,
      characterCount: context.characters?.length || 0,
      eventCount: context.events?.length || 0,
      hasDistribution: Boolean(context.distributionPlan)
    });

    // Validate characters have location/work_mode info
    const validCharacters = context.characters?.filter(c =>
      c.location || c.work_mode
    ) || [];

    if (validCharacters.length === 0 && context.characters && context.characters.length > 0) {
      this.log('Warning: No characters have location/work_mode information');
    }

    // Build prompts using PromptEngine
    const prompts = this.promptEngine.generateCalendarPrompt({
      brandName: context.brandName,
      persona: context.brandVoice,
      month: context.month,
      year: context.year,
      monthlyTheme: context.monthlyTheme,
      weeklySubplot: context.weeklySubplot || context.monthlyPlot || '',
      startDay: context.startDay,
      endDay: context.endDay,
      channels: context.channels || ['LinkedIn', 'Instagram'],
      characters: validCharacters.map(c => ({
        name: c.character_name || c.name,
        location: c.work_mode || c.location,
        persona: c.persona
      })),
      events: context.events || [],
      distributionPlan: context.distributionPlan
    });

    this.log('Calling AI service', {
      model: this.config.model,
      systemPromptLength: prompts.system.length,
      userPromptLength: prompts.user.length,
      expectedEntries: dayCount * (context.channels?.length || 1)
    });

    // Call AI service with fallback models
    const aiResult = await aiService.generate({
      model: this.config.model,
      systemPrompt: prompts.system,
      userPrompt: prompts.user,
      temperature: 0.75,  // Balanced creativity
      responseFormat: 'json',
      fallbackModels
    });

    // Parse response
    const calendarData = JSON.parse(aiResult.content);

    if (!calendarData.calendar || !Array.isArray(calendarData.calendar)) {
      throw new Error('AI response missing required field: calendar array');
    }

    const entries: CalendarEntry[] = calendarData.calendar;

    // Validate entries
    const expectedMinEntries = dayCount;
    if (entries.length < expectedMinEntries) {
      this.log('Warning: Fewer calendar entries than expected', {
        expected: expectedMinEntries,
        received: entries.length
      });
    }

    // Validate each entry has required fields
    const requiredFields = [
      'Day',
      'Channel',
      'Story Hook & Content Idea',
      'Character Focus',
      'Emotional Beat',
      'Narrative Purpose',
      'Media Type',
      'Call To Action'
    ];

    entries.forEach((entry, index) => {
      requiredFields.forEach(field => {
        if (!(field in entry)) {
          this.log('Warning: Calendar entry missing field', {
            index,
            field,
            entry: JSON.stringify(entry).substring(0, 100)
          });
        }
      });
    });

    this.log('Calendar batch generated successfully', {
      entriesGenerated: entries.length,
      uniqueDays: new Set(entries.map(e => e.Day)).size,
      uniqueChannels: new Set(entries.map(e => e.Channel)).size,
      tokensUsed: aiResult.tokensUsed
    });

    return this.createOutput(
      {
        calendar: entries,
        metadata: {
          dayCount,
          entryCount: entries.length,
          startDay: context.startDay,
          endDay: context.endDay,
          channels: context.channels,
          monthlyTheme: context.monthlyTheme
        }
      },
      aiResult.tokensUsed
    );
  }

  /**
   * Validate and filter characters by location compatibility
   *
   * NOTE: Location filtering is now deprecated - returns all characters
   */
  private filterCharactersByLocation(
    characters: Array<{ name: string; location?: string }>,
    requireLocation?: 'onsite' | 'remote' | 'hybrid'
  ): Array<{ name: string; location?: string }> {
    // ✅ Location is no longer used - return all characters
    return characters;
  }
}

// Export singleton instance with default model
export const calendarGeneratorAgent = new CalendarGeneratorAgent();
