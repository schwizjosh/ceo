/**
 * SUBPLOT WRITER AGENT
 *
 * Generates weekly subplots (episodes) within monthly themes
 * Creates the "JUICE" for content calendar
 *
 * This agent specializes in:
 * - Weekly subplots (PHASE 6 from storytelling framework)
 * - RICH, DETAILED episode descriptions (400-600 words)
 * - 5-8 specific content ideas per week
 * - Character spotlight moments
 * - Posting rhythm and hooks
 */

import { BaseAgent, AgentInput, AgentOutput, AIModel } from './base';
import { PromptEngine } from '../services/promptEngine';
import { aiService } from '../services/aiService';
import { NextSceneHook } from '../services/brandContext';

export interface SubplotWriterInput extends AgentInput {
  task: 'generate-weekly-subplot' | 'refine-weekly-subplot';
  context: {
    brandName: string;
    brandVoice?: string;
    monthlyTheme: string;
    monthlyPlot?: string;
    weekNumber: number;
    weekStart: string;
    weekEnd: string;
    weekTheme?: string;
    events?: Array<{ title: string; description?: string; date: string }>;
    characters?: Array<{
      name: string;
      character_name?: string;
      location?: string;  // ✅ Optional - no geographic context needed
      work_mode?: string;
      persona: string;
      role?: string;
    }>;
    refinementInstructions?: string;
  };
  fallbackModels?: AIModel[];
}

/**
 * Subplot Writer Agent
 *
 * Handles weekly episode generation with rich content ideas
 */
export class SubplotWriterAgent extends BaseAgent {
  private promptEngine: PromptEngine;

  constructor(model?: AIModel) {
    super({
      name: 'SubplotWriter',
      model: model || 'gpt-4o',      // Complex creative task requires powerful model
      defaultTokenBudget: 2500,      // Weekly subplots need more tokens
      description: 'Weekly subplot and episode generation',
      capabilities: ['weekly-subplots', 'episode-arcs', 'content-ideas', 'character-moments']
    });

    this.promptEngine = new PromptEngine();
  }

  /**
   * Main execution method
   */
  async execute(input: SubplotWriterInput): Promise<AgentOutput> {
    this.validateInput(input);
    this.startTimer();

    const { task, context } = input;

    this.log(`Executing ${task}`, {
      brand: context.brandName,
      week: context.weekNumber,
      hasCharacters: !!context.characters?.length
    });

    try {
      switch (task) {
        case 'generate-weekly-subplot':
          return await this.generateWeeklySubplot(input);

        case 'refine-weekly-subplot':
          return await this.refineWeeklySubplot(input);

        default:
          throw new Error(`Unknown task: ${task}`);
      }
    } catch (error) {
      this.log('Error in SubplotWriterAgent', error);
      throw error;
    }
  }

  /**
   * Generate Weekly Subplot (PHASE 6)
   *
   * Creates RICH, DETAILED weekly episode (400-600 words)
   * Packed with specific content ideas, character moments, hooks
   */
  private async generateWeeklySubplot(input: SubplotWriterInput): Promise<AgentOutput> {
    const { context, fallbackModels } = input;

    this.log('Generating weekly subplot', {
      week: context.weekNumber,
      weekStart: context.weekStart,
      weekEnd: context.weekEnd,
      characterCount: context.characters?.length || 0,
      eventCount: context.events?.length || 0
    });

    // Build prompts using PromptEngine
    const prompts = this.promptEngine.generateWeeklySubplotPrompt({
      brandName: context.brandName,
      about: context.brandVoice,
      monthlyTheme: context.monthlyTheme,
      monthlyPlot: context.monthlyPlot || '',
      weekTheme: context.weekTheme || '',
      weekNumber: context.weekNumber,
      weekStart: context.weekStart,
      weekEnd: context.weekEnd,
      events: context.events?.map(e => `${e.date}: ${e.title}`) || [],
      // ✅ REMOVED location - no geographic context needed
      characters: context.characters?.map(c => ({
        name: c.character_name || c.name,
        persona: c.persona,
        role: c.role
      })) || []
    });

    this.log('Calling AI service', {
      model: this.config.model,
      systemPromptLength: prompts.system.length,
      userPromptLength: prompts.user.length
    });

    // Call AI service with fallback models
    const aiResult = await aiService.generate({
      model: this.config.model,
      systemPrompt: prompts.system,
      userPrompt: prompts.user,
      temperature: 0.85,  // High creativity for detailed storytelling
      responseFormat: 'json',
      fallbackModels
    });

    // Parse response
    const subplot = JSON.parse(aiResult.content);
    const nextSceneHooks: NextSceneHook[] = Array.isArray(subplot.next_scene_hooks)
      ? subplot.next_scene_hooks
          .map((hook: any, index: number) => {
            if (!hook) return null;
            const dayRaw = (hook.day_of_week || hook.day || hook.dayOfWeek || '').toString().toLowerCase();
            const dayLookup: Record<string, number> = {
              monday: 1,
              tuesday: 2,
              wednesday: 3,
              thursday: 4,
              friday: 5,
              saturday: 6,
              sunday: 7
            };
            const dayOfWeek = dayLookup[dayRaw] || (typeof hook.dayOfWeek === 'number' ? hook.dayOfWeek : undefined);

            const normalizedHook: NextSceneHook = {
              sequence: Number.isFinite(Number(hook.sequence)) ? Number(hook.sequence) : index + 1,
              dayOfWeek,
              hook: hook.hook || hook.prompt || '',
              payoff: hook.payoff || hook.payoff_summary || '',
              setup: hook.setup || hook.context || undefined,
              recommendedNarratorId: hook.recommended_narrator_id || hook.recommended_narrator || undefined,
              notes: hook.notes || undefined
            };

            if (!normalizedHook.hook || !normalizedHook.payoff) {
              return null;
            }

            return normalizedHook;
          })
          .filter((hook: NextSceneHook | null): hook is NextSceneHook => Boolean(hook))
      : [];

    // Validate required fields
    if (!subplot.subplot_title || !subplot.subplot_description) {
      throw new Error('AI response missing required fields: subplot_title, subplot_description');
    }

    // Validate richness (should be 400-600 words)
    const wordCount = subplot.subplot_description.split(/\s+/).length;
    if (wordCount < 300) {
      this.log('Warning: Subplot description may be too brief', { wordCount });
    }

    this.log('Weekly subplot generated successfully', {
      titleLength: subplot.subplot_title.length,
      descriptionLength: subplot.subplot_description.length,
      wordCount,
      hasKeyFocusAreas: !!subplot.key_focus_areas,
      hasContentDirection: !!subplot.content_direction,
      tokensUsed: aiResult.tokensUsed
    });

    return this.createOutput(
      {
        subplot_title: subplot.subplot_title,
        description: subplot.subplot_description,
        key_focus_areas: subplot.key_focus_areas || '',
        content_direction: subplot.content_direction || '',
        editable_content: subplot.editable_content || subplot.subplot_description,
        week_number: context.weekNumber,
        next_scene_hooks: nextSceneHooks,
        metadata: {
          wordCount,
          characterCount: context.characters?.length || 0,
          eventCount: context.events?.length || 0
        }
      },
      aiResult.tokensUsed
    );
  }

  /**
   * Refine Weekly Subplot
   *
   * User wants to adjust/improve existing weekly subplot
   */
  private async refineWeeklySubplot(input: SubplotWriterInput): Promise<AgentOutput> {
    const { context, fallbackModels } = input;

    this.log('Refining weekly subplot', {
      week: context.weekNumber
    });

    // Build refinement prompt
    const systemPrompt = `You are 'Andora', a master storytelling strategist and content director. You refine and enhance weekly subplots to make them more compelling, packed with specific content ideas, and ready for execution.

Your weekly subplots are RICH and DETAILED—packed with specific content angles, character moments, posting ideas, and creative direction that make it easy for creative directors to see multiple pieces of content. This is the JUICE that fuels the content calendar.`;

    const characterContext = context.characters && context.characters.length > 0
      ? `\n\nCharacters Available:\n${context.characters.map(c => `- ${c.character_name || c.name} (${c.work_mode || c.location}): ${c.persona}`).join('\n')}`
      : '';

    const userPrompt = `Refine this weekly subplot for ${context.brandName}:

Monthly Theme: ${context.monthlyTheme}
Week ${context.weekNumber} (${context.weekStart} to ${context.weekEnd})

Current Subplot Title: ${context.weekTheme}
${characterContext}

User Feedback/Instructions: ${context.refinementInstructions}

Create an improved version that is PACKED with:
1. **Specific Content Ideas (5-8 ideas)**: Concrete, ready-to-execute content ideas
2. **Character Spotlight Moments (2-3)**: Specific scenarios where characters shine
3. **Posting Rhythm**: Suggested cadence throughout the week
4. **Emotional Arc**: Map the week's emotional journey
5. **Visual/Format Ideas**: Specific format suggestions
6. **Hook Ideas**: 3-5 attention-grabbing hooks or opening lines
7. **Call-to-Action Angles**: Different CTA approaches for different days

The subplot should be SO DETAILED (400-600 words) that a creative director looks at it and says "I can see 10+ pieces of content here!"

Return JSON with keys:
{
  "subplot_title": "Compelling episode title",
  "subplot_description": "RICH, DETAILED description (400-600 words)",
  "key_focus_areas": "Main story beats with specific examples",
  "content_direction": "Tactical narrative guidance with format suggestions",
  "editable_content": "Additional detailed content with more angles"
}`;

    // Call AI service
    const aiResult = await aiService.generate({
      model: this.config.model,
      systemPrompt,
      userPrompt,
      temperature: 0.85,
      responseFormat: 'json',
      fallbackModels
    });

    const refinedSubplot = JSON.parse(aiResult.content);

    return this.createOutput(
      {
        subplot_title: refinedSubplot.subplot_title,
        description: refinedSubplot.subplot_description,
        key_focus_areas: refinedSubplot.key_focus_areas || '',
        content_direction: refinedSubplot.content_direction || '',
        editable_content: refinedSubplot.editable_content || refinedSubplot.subplot_description
      },
      aiResult.tokensUsed
    );
  }
}

// Export singleton instance with default model
export const subplotWriterAgent = new SubplotWriterAgent();
