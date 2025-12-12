/**
 * SEASON PLOT AGENT
 *
 * Generates quarterly and monthly narrative themes
 * Ensures story cohesion across 3-month arcs
 *
 * This agent specializes in:
 * - Quarterly season themes (3-month narrative arcs)
 * - Monthly plots (PHASE 5 from storytelling framework)
 * - RICH, DETAILED narrative descriptions (400-600 words)
 */

import { BaseAgent, AgentInput, AgentOutput, AIModel } from './base';
import { PromptEngine } from '../services/promptEngine';
import { aiService } from '../services/aiService';

export interface SeasonPlotInput extends AgentInput {
  task: 'generate-season-theme' | 'generate-monthly-plot' | 'refine-monthly-plot';
  context: {
    brandName: string;
    brandVoice?: string;
    brandPersonality?: string[];
    narrative_problem?: string;
    narrative_solution?: string;
    narrative_why?: string;
    month?: number;
    year?: number;
    quarter?: number;
    theme?: string;
    themePrompt?: string;
    events?: Array<{ title: string; description?: string; date: string }>;
    characters?: Array<{ name: string; role?: string; persona?: string; location?: string }>;
    previousTheme?: { theme: string; description: string };
  };
  fallbackModels?: AIModel[];
}

/**
 * Season Plot Agent
 *
 * Handles high-level narrative arc generation
 */
export class SeasonPlotAgent extends BaseAgent {
  private promptEngine: PromptEngine;

  constructor(model?: AIModel) {
    super({
      name: 'SeasonPlot',
      model: model || 'gpt-4o',      // Complex creative task requires powerful model
      defaultTokenBudget: 2000,
      description: 'Quarterly and monthly narrative theme generation',
      capabilities: ['quarterly-themes', 'monthly-plots', 'narrative-arcs', 'season-planning']
    });

    this.promptEngine = new PromptEngine();
  }

  /**
   * Strip markdown code blocks from JSON response
   */
  private stripMarkdown(content: string): string {
    let cleaned = content.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*\n?/, '').replace(/\n?```\s*$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*\n?/, '').replace(/\n?```\s*$/, '');
    }
    return cleaned;
  }

  /**
   * Main execution method
   */
  async execute(input: SeasonPlotInput): Promise<AgentOutput> {
    this.validateInput(input);
    this.startTimer();

    const { task, context } = input;

    this.log(`Executing ${task}`, {
      brand: context.brandName,
      month: context.month,
      quarter: context.quarter
    });

    try {
      switch (task) {
        case 'generate-season-theme':
          return await this.generateSeasonTheme(input);

        case 'generate-monthly-plot':
          return await this.generateMonthlyPlot(input);

        case 'refine-monthly-plot':
          return await this.refineMonthlyPlot(input);

        default:
          throw new Error(`Unknown task: ${task}`);
      }
    } catch (error) {
      this.log('Error in SeasonPlotAgent', error);
      throw error;
    }
  }

  /**
   * Generate Quarterly Season Theme
   *
   * Creates overarching narrative for 3-month period
   */
  private async generateSeasonTheme(input: SeasonPlotInput): Promise<AgentOutput> {
    const { context, fallbackModels } = input;

    this.log('Generating season theme', {
      quarter: context.quarter,
      year: context.year
    });

    // Build prompts using PromptEngine
    const prompts = this.promptEngine.generateMonthlyPlotPrompt({
      brandName: context.brandName,
      about: context.narrative_why,
      persona: context.brandVoice,
      narrative_problem: context.narrative_problem,
      narrative_solution: context.narrative_solution,
      theme: context.themePrompt || 'Quarterly growth and transformation',
      month: `Q${context.quarter} ${context.year}`,
      events: context.events?.map(e => `${e.date}: ${e.title}`) || [],
      themePrompt: context.themePrompt
    });

    // Call AI service
    const aiResult = await aiService.generate({
      model: this.config.model,
      systemPrompt: prompts.system,
      userPrompt: prompts.user,
      temperature: 0.8,
      responseFormat: 'json',
      fallbackModels
    });

    // Parse response (strip markdown if present)
    const seasonTheme = JSON.parse(this.stripMarkdown(aiResult.content));

    if (!seasonTheme.theme || !seasonTheme.explanation) {
      throw new Error('AI response missing required fields: theme, explanation');
    }

    this.log('Season theme generated successfully', {
      themeLength: seasonTheme.explanation.length,
      tokensUsed: aiResult.tokensUsed
    });

    return this.createOutput(
      {
        theme: seasonTheme.theme,
        description: seasonTheme.explanation
      },
      aiResult.tokensUsed
    );
  }

  /**
   * Generate Monthly Plot (PHASE 5)
   *
   * Creates RICH, DETAILED monthly narrative (400-600 words)
   * This is the cornerstone of the storytelling system
   */
  private async generateMonthlyPlot(input: SeasonPlotInput): Promise<AgentOutput> {
    const { context, fallbackModels } = input;

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const monthName = context.month ? monthNames[context.month - 1] : 'Unknown';

    this.log('Generating monthly plot', {
      month: monthName,
      year: context.year,
      hasEvents: !!context.events?.length
    });

    // Build prompts using PromptEngine
    // IMPORTANT: themePrompt is the user's input - this is the MAIN theme they want
    const prompts = this.promptEngine.generateMonthlyPlotPrompt({
      brandName: context.brandName,
      about: context.narrative_why,
      persona: context.brandVoice,
      narrative_problem: context.narrative_problem,
      narrative_solution: context.narrative_solution,
      theme: context.themePrompt || `${monthName} ${context.year}`, // User's theme is PRIMARY
      month: monthName,
      events: context.events?.map(e => `${e.date}: ${e.title}`) || [],
      characters: context.characters || [],
      themePrompt: context.themePrompt // Extra context/focus
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
      temperature: 0.85,  // Higher creativity for storytelling
      responseFormat: 'json',
      fallbackModels
    });

    // Parse response (strip markdown if present)
    console.log('🤖 RAW AI RESPONSE:', aiResult.content.substring(0, 500));
    console.log('🧹 AFTER STRIP MARKDOWN:', this.stripMarkdown(aiResult.content).substring(0, 500));

    let monthlyPlot;
    try {
      monthlyPlot = JSON.parse(this.stripMarkdown(aiResult.content));
    } catch (parseError: any) {
      console.error('❌ JSON PARSE ERROR:', parseError.message);
      console.error('📄 FULL AI RESPONSE:', aiResult.content);
      throw new Error(`AI returned invalid JSON: ${parseError.message}. Check logs for full response.`);
    }

    if (!monthlyPlot.theme || !monthlyPlot.explanation) {
      throw new Error('AI response missing required fields: theme, explanation');
    }

    // Validate that we have week breakdowns
    if (!monthlyPlot.week_1 || !monthlyPlot.week_2 || !monthlyPlot.week_3 || !monthlyPlot.week_4) {
      this.log('Warning: Missing weekly breakdowns', {
        hasWeek1: !!monthlyPlot.week_1,
        hasWeek2: !!monthlyPlot.week_2,
        hasWeek3: !!monthlyPlot.week_3,
        hasWeek4: !!monthlyPlot.week_4
      });
    }

    // Validate that explanation is present
    const wordCount = monthlyPlot.explanation.split(/\s+/).length;

    this.log('Monthly plot generated successfully', {
      themeLength: monthlyPlot.theme.length,
      explanationLength: monthlyPlot.explanation.length,
      wordCount,
      hasWeeks: !!(monthlyPlot.week_1 && monthlyPlot.week_2 && monthlyPlot.week_3 && monthlyPlot.week_4),
      week1Length: monthlyPlot.week_1?.length || 0,
      week2Length: monthlyPlot.week_2?.length || 0,
      week3Length: monthlyPlot.week_3?.length || 0,
      week4Length: monthlyPlot.week_4?.length || 0,
      tokensUsed: aiResult.tokensUsed
    });

    console.log('🔍 WEEK CONTENT CHECK:', {
      week_1_preview: monthlyPlot.week_1?.substring(0, 100),
      week_2_preview: monthlyPlot.week_2?.substring(0, 100),
      week_3_preview: monthlyPlot.week_3?.substring(0, 100),
      week_4_preview: monthlyPlot.week_4?.substring(0, 100)
    });

    return this.createOutput(
      {
        theme: monthlyPlot.theme,
        description: monthlyPlot.explanation,
        week_1: monthlyPlot.week_1 || '',
        week_2: monthlyPlot.week_2 || '',
        week_3: monthlyPlot.week_3 || '',
        week_4: monthlyPlot.week_4 || '',
        content_sparks: monthlyPlot.content_sparks || '',
        month: context.month,
        year: context.year,
        metadata: {
          wordCount,
          hasEvents: !!context.events?.length,
          eventCount: context.events?.length || 0
        }
      },
      aiResult.tokensUsed
    );
  }

  /**
   * Refine Monthly Plot
   *
   * User wants to adjust/improve existing monthly plot
   */
  private async refineMonthlyPlot(input: SeasonPlotInput): Promise<AgentOutput> {
    const { context, fallbackModels } = input;

    this.log('Refining monthly plot', {
      theme: context.theme
    });

    // Build refinement prompt
    const systemPrompt = `You are 'Andora', a master storytelling strategist. You refine and enhance monthly narrative plots to make them more compelling, detailed, and emotionally resonant.`;

    const userPrompt = `Refine this monthly plot for ${context.brandName}:

Current Theme: ${context.theme}
Current Description: ${context.narrative_solution}

User Feedback/Instructions: ${context.themePrompt}

Create an improved version that:
- Is RICH and DETAILED (400-600 words)
- Has stronger narrative tension and emotional hooks
- Includes specific story beats and character moments
- Maintains the core theme while enhancing execution

Return JSON with keys: "theme" (refined theme title), "explanation" (enhanced 400-600 word description)`;

    // Call AI service
    const aiResult = await aiService.generate({
      model: this.config.model,
      systemPrompt,
      userPrompt,
      temperature: 0.8,
      responseFormat: 'json',
      fallbackModels
    });

    const refinedPlot = JSON.parse(this.stripMarkdown(aiResult.content));

    return this.createOutput(
      {
        theme: refinedPlot.theme,
        description: refinedPlot.explanation
      },
      aiResult.tokensUsed
    );
  }
}

// Export singleton instance with default model
export const seasonPlotAgent = new SeasonPlotAgent();
