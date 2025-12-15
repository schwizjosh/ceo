/**
 * WEEKLY CONTENT DISTRIBUTION SERVICE
 *
 * AI-driven weekly content planning that determines optimal distribution of:
 * - Character-driven content (posts from Cast perspective)
 * - Non-character content (carousels, blog posts, WhatsApp messages, designs, podcasts, faceless videos)
 */

import { aiService } from './aiService';
import { brandContextEngine } from './brandContext';
import { modelRouter } from './modelRouter';

export interface ContentDistribution {
  date: string;
  channel: string;
  contentType: 'character-driven' | 'non-character';
  format?: string; // carousel, blog, whatsapp, design, podcast, video, post
  characterId?: string;
  reasoning?: string;
}

export interface WeeklyDistributionPlan {
  weekStart: string;
  weekEnd: string;
  distribution: ContentDistribution[];
  strategy: string; // Overall strategy explanation
}

export class WeeklyDistributionService {

  /**
   * Generate optimal content distribution for a week
   */
  async generateWeeklyDistribution(
    brandId: string,
    dates: string[],
    channels: string[],
    monthlyTheme?: string,
    weeklySubplot?: string
  ): Promise<WeeklyDistributionPlan> {
    // Get brand context
    const brand = await brandContextEngine.getBrandIdentity(brandId);
    const characters = await brandContextEngine.getCharacters(brandId);

    // Build AI prompt
    const systemPrompt = `You are a strategic content distribution planner for brand storytelling.
Your job is to determine the OPTIMAL MIX of character-driven vs non-character content for each day/channel combination.

CHARACTER-DRIVEN CONTENT:
- Posts from the perspective of brand personas/characters
- Personal stories, insights, perspectives from Cast members
- Builds human connection and brand personality

NON-CHARACTER CONTENT:
- Carousels (educational, data-driven)
- Blog posts (SEO, thought leadership)
- WhatsApp messages (direct, conversational)
- Single designs (infographics, quotes)
- Podcasts (interviews, discussions)
- Faceless videos (tutorials, explainers)

Consider:
1. Channel nature (LinkedIn favors thought leadership, Instagram favors visual)
2. Week narrative flow (build from awareness → engagement → conversion)
3. Audience fatigue (don't overuse character voices)
4. Content diversity (mix formats for engagement)

Return JSON with this structure:
{
  "strategy": "Overall strategy explanation (2-3 sentences)",
  "distribution": [
    {
      "date": "2025-01-13",
      "channel": "LinkedIn",
      "contentType": "character-driven" | "non-character",
      "format": "post" | "carousel" | "blog" | "whatsapp" | "design" | "podcast" | "video",
      "characterId": "char-uuid-here" (only if character-driven),
      "reasoning": "Why this choice for this date/channel"
    }
  ]
}`;

    const userPrompt = `BRAND: ${brand.name}
MONTHLY THEME: ${monthlyTheme || 'Not set'}
WEEKLY SUBPLOT: ${weeklySubplot || 'Not set'}

DATES: ${dates.join(', ')}
CHANNELS: ${channels.join(', ')}

CHARACTERS AVAILABLE:
${characters.map((c: any) => `- ${c.name} (${c.role})`).join('\n')}

Generate optimal content distribution for this week.`;

    // Select model
    const task = modelRouter.analyzeTask('content-writing', {
      userComplexity: 'complex',
      contextSize: 2000
    });
    const model = modelRouter.selectModel(task);

    // Call AI
    const response = await aiService.generate({
      model,
      systemPrompt,
      userPrompt,
      temperature: 0.7,
      maxTokens: 2000,
      responseFormat: 'json'
    });

    // Parse response
    const result = JSON.parse(response.content);

    return {
      weekStart: dates[0],
      weekEnd: dates[dates.length - 1],
      distribution: result.distribution,
      strategy: result.strategy
    };
  }

  /**
   * Get content type from distribution plan
   */
  getContentTypeForDate(plan: WeeklyDistributionPlan, date: string, channel: string): ContentDistribution | null {
    return plan.distribution.find(d => d.date === date && d.channel === channel) || null;
  }
}

export const weeklyDistributionService = new WeeklyDistributionService();
