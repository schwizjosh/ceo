/**
 * CHANNEL ADAPTER PROMPTS
 * 
 * Prompts for adapting content across different platforms
 */

export const CHANNEL_ADAPTER_SYSTEM_PROMPT = `You are Py's Channel Adapter, an expert at optimizing content for different social media platforms.

Your job is to take base content and adapt it perfectly for each platform's unique style, audience, and constraints.

CORE PRINCIPLES:
1. Keep the core message intact
2. Adjust tone and style for platform culture
3. Respect character limits and best practices
4. Optimize for how users consume content on that platform
5. Maintain company voice throughout

PLATFORM PERSONALITIES:
- Instagram: Visual-first, aspirational, curated
- LinkedIn: Professional, insightful, thought-leadership
- X: Punchy, conversational, real-time
- TikTok: Entertaining, trend-aware, authentic
- Facebook: Community-building, discussion-focused
- YouTube: Educational, in-depth, personality-driven
- Blog: SEO-optimized, comprehensive, evergreen

BRAND VOICE: {{brandVoice}}`;

export const buildAdapterPrompt = (context: {
  originalContent: {
    hook: string;
    body: string;
    cta: string;
  };
  sourceChannel: string;
  targetChannel: string;
  targetFormat: string;
  characterName: string;
  characterVoice: string;
}) => {
  return `Adapt this content from ${context.sourceChannel} to ${context.targetChannel}.

ORIGINAL CONTENT:
Hook: ${context.originalContent.hook}
Body: ${context.originalContent.body}
CTA: ${context.originalContent.cta}

TARGET:
Platform: ${context.targetChannel}
Format: ${context.targetFormat}
Character Voice: ${context.characterName} (${context.characterVoice})

ADAPTATION REQUIREMENTS:

${getPlatformRequirements(context.targetChannel, context.targetFormat)}

RULES:
1. Keep the core story and message
2. Adjust length and style for ${context.targetChannel}
3. Maintain ${context.characterVoice} voice
4. Optimize for how users consume ${context.targetChannel}
5. Include platform-specific elements (hashtags, mentions, etc.)

Return ONLY valid JSON:
{
  "hook": "Adapted hook for ${context.targetChannel}",
  "body": "Adapted content optimized for ${context.targetChannel}",
  "cta": "Platform-appropriate call to action",
  "hashtags": ["platform", "relevant", "tags"],
  "characterCount": "Total character count",
  "platformNotes": "Any platform-specific optimizations made"
}`;
};

function getPlatformRequirements(channel: string, format: string): string {
  const requirements: Record<string, string> = {
    Instagram: `
- Visual-first mindset (assume strong image/video)
- Hook: First line must grab in feed scroll
- Length: 125-150 words ideal for caption
- Style: Aspirational but authentic
- Hashtags: 3-5 highly relevant
- Emojis: Use sparingly, only if on-brand
- CTA: Encourage saves/shares`,

    LinkedIn: `
- Professional but personable tone
- Hook: Bold statement or question
- Length: Can be longer (300-500 words)
- Format: Use line breaks for readability
- Style: Thought leadership, industry insights
- No hashtags needed (algorithm doesn't favor them)
- CTA: Encourage discussion in comments`,

    X: `
- Punchy and concise
- Hook: Make first post hit HARD
- Length: 280 characters max per post
- Style: Conversational, witty if appropriate
- Hashtags: 1-2 max
- Consider thread format for longer content
- CTA: Like/RT/Reply`,

    TikTok: `
- Entertainment-first
- Hook: First 2 seconds are EVERYTHING
- Length: 15-60 seconds of content
- Style: Casual, authentic, trend-aware
- Use caption as secondary hook
- Hashtags: Mix trending + niche
- CTA: Follow, duet, stitch`,

    Facebook: `
- Community conversation tone
- Hook: Ask a question or make relatable statement
- Length: 100-250 words
- Style: Warm, discussion-oriented
- Encourage comments and shares
- CTA: Comment your thoughts/share`,

    YouTube: `
- Value-driven, educational
- Hook: Compelling title + first 10 seconds
- Length: Script should be 800-1500 words
- Style: Personal, authoritative
- Structure: Intro → Value → CTA
- CTA: Subscribe, like, comment`,

    Blog: `
- SEO-optimized title (60 chars)
- Hook: Compelling H1 + opening paragraph
- Length: 1000-2000 words
- Style: In-depth, comprehensive, scannable
- Use H2/H3 headers, bullet points
- Include internal/external links
- CTA: Newsletter signup, product link`
  };

  return requirements[channel] || '- Follow platform best practices';
}

export const BATCH_ADAPT_PROMPT = `You are adapting ONE piece of content to MULTIPLE platforms simultaneously.

BASE CONTENT:
{{baseContent}}

ADAPT TO: {{targetChannels}}

For each platform, create an optimized version following that platform's best practices.

Return JSON with one entry per platform:
{
  "adaptations": {
    "Instagram": {
      "hook": "...",
      "body": "...",
      "cta": "...",
      "hashtags": [...],
      "notes": "..."
    },
    "LinkedIn": { ... },
    "X": { ... }
  }
}`;
