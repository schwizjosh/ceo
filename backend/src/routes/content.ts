import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../middleware/auth';
import { promptEngine } from '../services/promptEngine';
import { aiService } from '../services/aiService';
import { modelRouter } from '../services/modelRouter';
import { brandContextEngine } from '../services/brandContext';
import { AIModel } from '../agents/base';
import pool from '../database/db';

/**
 * Helper to parse streaming JSON field by field
 * Emits fields as they become complete in the JSON stream
 */
function* parseStreamingJSON(content: string) {
  try {
    // Try to parse complete JSON first
    const parsed = JSON.parse(content);
    if (parsed.week && Array.isArray(parsed.week)) {
      for (const entry of parsed.week) {
        yield { type: 'entry', entry };
      }
    }
  } catch (e) {
    // Partial JSON - try to extract complete entries
    const entryMatches = content.match(/\{[^{}]*"date"[^{}]*"channel"[^{}]*\}/g);
    if (entryMatches) {
      for (const match of entryMatches) {
        try {
          const entry = JSON.parse(match);
          yield { type: 'entry', entry };
        } catch {}
      }
    }
  }
}

export default async function contentRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/content/generate-week
   * Generate entire week of content in one AI call
   */
  fastify.post('/generate-week', { preHandler: authenticate as any }, async (req: FastifyRequest, res: FastifyReply) => {
    try {
      const { brandId, dates, channels, existingContent } = req.body as any;

      console.log('📦 Generate week request:', {
        brandId,
        dates: dates?.slice(0, 3), // Show first 3 dates
        datesLength: dates?.length,
        hasChannels: !!channels,
        existingContentCount: existingContent?.length
      });

      if (!brandId) {
        console.error('❌ Missing brandId');
        return res.status(400).send({ error: 'brandId is required' });
      }

      if (!dates || !Array.isArray(dates) || dates.length === 0) {
        console.error('❌ Invalid dates:', { datesType: typeof dates, datesIsArray: Array.isArray(dates), datesLength: dates?.length, dates });
        return res.status(400).send({ error: 'dates array is required and must not be empty' });
      }

      // Parse the first date to get month/year
      const firstDate = new Date(dates[0]);
      const month = firstDate.getMonth() + 1; // JavaScript months are 0-indexed
      const year = firstDate.getFullYear();
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;

      // Get focused context from Brand Context Engine
      const weekStartDate = new Date(Math.min(...dates.map((d: string) => new Date(d).getTime())));
      const weekEndDate = new Date(Math.max(...dates.map((d: string) => new Date(d).getTime())));

      // Fetch minimal, focused context (remove weeklySubplots query as it's in brand.season_plans)
      const [brand, characters, events] = await Promise.all([
        brandContextEngine.getBrandIdentity(brandId),
        brandContextEngine.getCharacters(brandId),
        brandContextEngine.getEventsForDateRange(brandId, weekStartDate, weekEndDate)
      ]);

      // Get full brand data to access season_plans
      const brandResult = await pool.query(
        'SELECT season_plans, monthly_themes FROM brands WHERE id = $1',
        [brandId]
      );
      const fullBrand = brandResult.rows[0];

      // Determine which week number this is (1-5)
      const weekNumber = Math.ceil(firstDate.getDate() / 7);

      // Get weekly subplot from season_plans JSON
      const seasonPlan = fullBrand?.season_plans?.[monthKey];
      const weeklyData = seasonPlan?.weekly?.[weekNumber];
      const weeklySubplot = weeklyData ? {
        title: weeklyData.custom_theme || `Week ${weekNumber}`,
        description: weeklyData.subplot || ''
      } : null;

      // Get monthly theme from season_plans or monthly_themes
      const monthlyThemeData = fullBrand?.monthly_themes?.[monthKey];
      const monthlyTheme = {
        title: typeof monthlyThemeData === 'string' ? monthlyThemeData : (monthlyThemeData?.theme || seasonPlan?.theme || 'Continue brand narrative'),
        description: typeof monthlyThemeData === 'object' ? monthlyThemeData?.description : ''
      };

      // Filter out perfect content hooks for context
      const perfectHooks = existingContent
        ?.filter((item: any) => item.is_perfect && dates.includes(item.date))
        .map((item: any) => ({
          date: item.date,
          channel: item.channel,
          hook: item.story_hook || item.title,
        })) || [];

      // Build system prompt
      const systemPrompt = `You are Andora, the AI creative director and brand storyteller.

Your essence: You craft content like a TV series writer—every piece advances the plot, every character gets their moment, every post deepens the narrative. You transform brands into living stories that audiences follow like their favorite shows.

Core principles:
• Content is NARRATIVE-DRIVEN, not promotional
• Each piece connects to the bigger story arc
• Characters rotate to showcase ensemble dynamics
• Every post has emotional resonance and visual direction
• Media formats are platform-native and strategic`;

      // Build user prompt with focused context
      const userPrompt = `🎬 CONTENT GENERATION BRIEF: Week ${weekNumber} Content Calendar

📅 WEEK SPAN: ${dates[0]} to ${dates[dates.length - 1]}
📢 CHANNELS & SCHEDULE: ${JSON.stringify(channels, null, 2)}

🎭 STORYTELLING CONTEXT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 Monthly Theme: ${monthlyTheme?.title || 'Continue brand narrative'}
${monthlyTheme?.description ? `Theme Context: ${monthlyTheme.description}` : ''}

📖 THIS WEEK'S SUBPLOT: ${weeklySubplot?.title || 'Advance the narrative'}
${weeklySubplot?.description ? `\nPlot Details:\n${weeklySubplot.description}` : ''}

${events.length > 0 ? `\n📆 REAL-WORLD EVENTS THIS WEEK:\n${events.map((e: any) => `• ${new Date(e.date).toLocaleDateString()}: ${e.title} - ${e.description || ''}`).join('\n')}\n` : ''}

🏢 BRAND IDENTITY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: ${brand.name}
${brand.mission ? `Mission: ${brand.mission}` : ''}
${brand.narrativeWhy ? `Why It Matters: ${brand.narrativeWhy}` : ''}
Target Audience: ${brand.targetAudience || brand.buyerProfile || 'General audience'}
Brand Voice: ${brand.voice || 'Professional and engaging'}

🎭 FULL CAST (Use ALL characters, rotate strategically):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${characters.map((c: any) => `• ${c.name} - ${c.title || c.role}
  Persona: ${c.persona || 'Brand representative'}
  ${c.location ? `Location: ${c.location}` : ''}`).join('\n\n')}

${perfectHooks.length > 0 ? `\n🔒 EXISTING PERFECT CONTENT (Context only, DO NOT regenerate):\n${perfectHooks.map((h: any) => `${h.date} [${h.channel}]: "${h.hook}"`).join('\n')}\n` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎨 GENERATION INSTRUCTIONS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. CHARACTER ROTATION 🎭
   - ROTATE through ALL available characters across the week
   - Each character should appear at least once
   - Match character strengths to content type
   - Create ensemble moments (2+ characters collaborating)
   - NO single character dominance

2. NARRATIVE PROGRESSION 📖
   - Monday: Set up the week's story/challenge
   - Mid-week: Development, tension, insights
   - Friday: Breakthrough, resolution, forward momentum
   - Each post builds on previous ones
   - Create episodic feeling—viewers should want to follow along

3. CHANNEL-SPECIFIC MEDIA TYPES 📱
   **Instagram**: Reel, Carousel, Story Series, Photo Post
   **LinkedIn**: Article, Carousel (PDF-style), Video, Text Post, Poll
   **X**: Thread, Single Post, Quote Post, Poll
   **Facebook**: Video, Album, Text Post, Live Video, Story
   **TikTok**: Short Video, Duet, Stitch
   **YouTube**: Video, Short, Community Post
   **WhatsApp**: Broadcast Message, Status Update
   **Email**: Newsletter, Update, Story Email
   **Podcast**: Episode, Clip, Teaser

4. STORYTELLING DEPTH 🎬
   - Every brief should feel cinematic
   - Include emotional beats, visual direction, pacing
   - Reference the subplot and character arcs
   - Create hooks that stop the scroll
   - End with forward momentum (CTA that continues the story)

5. CONTENT VARIETY 🎨
   - Mix formats: personal stories, behind-scenes, insights, celebrations
   - Vary emotional tones: inspiring, vulnerable, triumphant, curious
   - Include different content types: solo spotlight, ensemble, process, outcome
   - NO generic promotional content

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT (JSON):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{
  "week": [
    {
      "date": "YYYY-MM-DD",
      "channel": "Instagram",
      "title": "Compelling 3-5 word title",
      "brief": "Detailed creative brief with narrative context, emotional arc, visual direction, and how this advances the weekly subplot. Be specific and cinematic.",
      "story_hook": "Scroll-stopping hook that creates curiosity and emotional connection",
      "directives": "Production guide: shot types, editing style, pacing, music mood, graphics needs, duration",
      "character_focus": "Character Name (or 'Character Name & Character Name' for ensemble)",
      "media_type": "Platform-specific format (Reel/Carousel/Thread/Video/Article/etc)",
      "call_to_action": "Narrative-driven CTA that continues the story"
    }
  ]
}

Generate content for ALL dates and channels in the schedule, skipping only perfect content. Make it feel like a binge-worthy series! 🎬✨`;

      // Select model
      const task = modelRouter.analyzeTask('content-writing', {
        userComplexity: 'complex',
        contextSize: 5000,
      });
      const model = modelRouter.selectModel(task);

      // Call AI for entire week (needs high token count for full week of content)
      const response = await aiService.generate({
        model,
        systemPrompt,
        userPrompt,
        temperature: 0.85,
        maxTokens: 16000, // Increased for full week with multiple channels
        responseFormat: 'json',
      });

      // Parse response
      let result;
      try {
        const content = response.content.trim();

        // Try multiple extraction methods
        let jsonString = content;

        // Method 1: Extract from markdown code blocks
        const markdownMatch = content.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
        if (markdownMatch) {
          jsonString = markdownMatch[1].trim();
        }

        // Method 2: Find JSON object boundaries
        const jsonStart = jsonString.indexOf('{');
        const jsonEnd = jsonString.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1) {
          jsonString = jsonString.substring(jsonStart, jsonEnd + 1);
        }

        console.log('📝 Parsing JSON, length:', jsonString.length);
        result = JSON.parse(jsonString);
        console.log('✅ Parsed successfully, items:', result.week?.length);
      } catch (error: any) {
        console.error('❌ Failed to parse week JSON:', error.message);
        console.error('📄 Raw response preview:', response.content.substring(0, 500));

        // Try to salvage partial JSON if truncated
        let jsonString = response.content.trim();
        const jsonStart = jsonString.indexOf('{');

        if (jsonStart !== -1) {
          jsonString = jsonString.substring(jsonStart);

          // Try to fix incomplete JSON by closing arrays and objects
          if (error.message.includes('Unexpected end of JSON')) {
            console.log('🔧 Attempting to repair truncated JSON...');

            // Count open brackets
            const openBraces = (jsonString.match(/{/g) || []).length;
            const closeBraces = (jsonString.match(/}/g) || []).length;
            const openBrackets = (jsonString.match(/\[/g) || []).length;
            const closeBrackets = (jsonString.match(/\]/g) || []).length;

            // Add missing closing brackets/braces
            for (let i = 0; i < (openBrackets - closeBrackets); i++) jsonString += ']';
            for (let i = 0; i < (openBraces - closeBraces); i++) jsonString += '}';

            try {
              result = JSON.parse(jsonString);
              console.log('✅ Repaired JSON successfully, items:', result.week?.length);
            } catch (e) {
              return res.status(500).send({
                error: 'AI response was truncated and could not be repaired',
                hint: 'Try using a model with higher token limits or reduce the number of channels'
              });
            }
          } else {
            return res.status(500).send({ error: 'AI returned invalid JSON' });
          }
        } else {
          return res.status(500).send({ error: 'No valid JSON found in AI response' });
        }
      }

      res.send({
        success: true,
        week: result.week || [],
        metadata: {
          model: response.model,
          tokensUsed: response.tokensUsed,
          cost: response.cost,
          duration: response.duration,
        },
      });
    } catch (error) {
      console.error('Generate week error:', error);
      res.status(500).send({ error: 'Failed to generate week' });
    }
  });

  /**
   * POST /api/content/generate-week-stream
   * Generate entire week with Server-Sent Events streaming
   * Shows calendar entries as they're being generated
   */
  fastify.post('/generate-week-stream', { preHandler: authenticate as any }, async (req: FastifyRequest, res: FastifyReply) => {
    try {
      let { brandId, dates, channels, existingContent, model: explicitModel } = req.body as any;

      console.log('📡 Generate week STREAM request:', {
        brandId,
        dates: dates?.slice(0, 3),
        datesLength: dates?.length,
      });

      if (!brandId || !dates || !Array.isArray(dates) || dates.length === 0) {
        return res.status(400).send({ error: 'Invalid request' });
      }

      // Filter out dates with no channels (backend validation)
      if (channels) {
        const validDates = dates.filter((date: string) => {
          const dateChannels = channels[date];
          return dateChannels && Array.isArray(dateChannels) && dateChannels.length > 0;
        });

        if (validDates.length === 0) {
          return res.status(400).send({ error: 'No channels scheduled for any of the provided dates' });
        }

        if (validDates.length !== dates.length) {
          console.log(`⏭️ Filtered ${dates.length - validDates.length} dates with no channels`);
          dates = validDates;
        }
      }

      // Set up SSE headers
      res.raw.setHeader('Content-Type', 'text/event-stream');
      res.raw.setHeader('Cache-Control', 'no-cache');
      res.raw.setHeader('Connection', 'keep-alive');
      res.raw.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

      // Helper to send SSE event
      const sendEvent = (event: string, data: any) => {
        res.raw.write(`event: ${event}\n`);
        res.raw.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      // Parse the first date to get month/year
      const firstDate = new Date(dates[0]);
      const month = firstDate.getMonth() + 1;
      const year = firstDate.getFullYear();
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;

      // Get context
      const weekStartDate = new Date(Math.min(...dates.map((d: string) => new Date(d).getTime())));
      const weekEndDate = new Date(Math.max(...dates.map((d: string) => new Date(d).getTime())));

      sendEvent('status', { message: 'Gathering context...' });

      const [brand, characters, events] = await Promise.all([
        brandContextEngine.getBrandIdentity(brandId),
        brandContextEngine.getCharacters(brandId),
        brandContextEngine.getEventsForDateRange(brandId, weekStartDate, weekEndDate)
      ]);

      const brandResult = await pool.query(
        'SELECT season_plans, monthly_themes FROM brands WHERE id = $1',
        [brandId]
      );
      const fullBrand = brandResult.rows[0];

      const weekNumber = Math.ceil(firstDate.getDate() / 7);
      const seasonPlan = fullBrand?.season_plans?.[monthKey];
      const weeklyData = seasonPlan?.weekly?.[weekNumber];
      const weeklySubplot = weeklyData ? {
        title: weeklyData.custom_theme || `Week ${weekNumber}`,
        description: weeklyData.subplot || ''
      } : null;

      const monthlyThemeData = fullBrand?.monthly_themes?.[monthKey];
      const monthlyTheme = {
        title: typeof monthlyThemeData === 'string' ? monthlyThemeData : (monthlyThemeData?.theme || seasonPlan?.theme || 'Continue brand narrative'),
        description: typeof monthlyThemeData === 'object' ? monthlyThemeData?.description : ''
      };

      const perfectHooks = existingContent
        ?.filter((item: any) => item.is_perfect && dates.includes(item.date))
        .map((item: any) => ({
          date: item.date,
          channel: item.channel,
          hook: item.story_hook || item.title,
        })) || [];

      // Build prompts
      const systemPrompt = `You are Andora, the AI creative director and brand storyteller.

Your essence: You craft content like a TV series writer—every piece advances the plot, every character gets their moment, every post deepens the narrative. You transform brands into living stories that audiences follow like their favorite shows.

Core principles:
• Content is NARRATIVE-DRIVEN, not promotional
• Each piece connects to the bigger story arc
• Characters rotate to showcase ensemble dynamics
• Every post has emotional resonance and visual direction
• Media formats are platform-native and strategic`;

      const userPrompt = `🎬 CONTENT GENERATION BRIEF: Week ${weekNumber} Content Calendar

📅 WEEK SPAN: ${dates[0]} to ${dates[dates.length - 1]}
📢 CHANNELS & SCHEDULE: ${JSON.stringify(channels, null, 2)}

🎭 STORYTELLING CONTEXT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 Monthly Theme: ${monthlyTheme?.title || 'Continue brand narrative'}
${monthlyTheme?.description ? `Theme Context: ${monthlyTheme.description}` : ''}

📖 THIS WEEK'S SUBPLOT: ${weeklySubplot?.title || 'Advance the narrative'}
${weeklySubplot?.description ? `\nPlot Details:\n${weeklySubplot.description}` : ''}

${events.length > 0 ? `\n📆 REAL-WORLD EVENTS THIS WEEK:\n${events.map((e: any) => `• ${new Date(e.date).toLocaleDateString()}: ${e.title} - ${e.description || ''}`).join('\n')}\n` : ''}

🏢 BRAND IDENTITY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: ${brand.name}
${brand.mission ? `Mission: ${brand.mission}` : ''}
${brand.narrativeWhy ? `Why It Matters: ${brand.narrativeWhy}` : ''}
Target Audience: ${brand.targetAudience || brand.buyerProfile || 'General audience'}
Brand Voice: ${brand.voice || 'Professional and engaging'}

🎭 FULL CAST (Use ALL characters, rotate strategically):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${characters.map((c: any) => `• ${c.name} - ${c.title || c.role}
  Persona: ${c.persona || 'Brand representative'}
  ${c.location ? `Location: ${c.location}` : ''}`).join('\n\n')}

${perfectHooks.length > 0 ? `\n🔒 EXISTING PERFECT CONTENT (Context only, DO NOT regenerate):\n${perfectHooks.map((h: any) => `${h.date} [${h.channel}]: "${h.hook}"`).join('\n')}\n` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT (JSON):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{
  "week": [
    {
      "date": "YYYY-MM-DD",
      "channel": "Instagram",
      "title": "Compelling 3-5 word title",
      "brief": "Detailed creative brief with narrative context",
      "story_hook": "Scroll-stopping hook",
      "directives": "Production guide",
      "character_focus": "Character Name",
      "media_type": "Platform-specific format",
      "call_to_action": "Narrative-driven CTA"
    }
  ]
}

Generate content for ALL dates and channels, skipping only perfect content. 🎬✨`;

      // Select model - use explicit model from switcher if provided, otherwise use model router
      let model: AIModel;
      if (explicitModel) {
        model = explicitModel as AIModel;
        console.log(`✅ Using explicit model from switcher: ${model}`);
      } else {
        const task = modelRouter.analyzeTask('content-writing', {
          userComplexity: 'complex',
          contextSize: 5000,
        });
        model = modelRouter.selectModel(task);
        console.log(`🤖 Model router selected: ${model}`);
      }

      sendEvent('status', { message: `Generating with ${model}...`, model });

      // Stream the AI response
      let fullContent = '';
      let lastParsedCount = 0;
      const seenEntries = new Set<string>();

      for await (const chunk of aiService.generateStream({
        model,
        systemPrompt,
        userPrompt,
        temperature: 0.85,
        maxTokens: 16000,
        responseFormat: 'json',
      })) {
        if (chunk.type === 'chunk' && chunk.content) {
          fullContent += chunk.content;

          // Try to parse and emit complete entries as they appear
          for (const result of parseStreamingJSON(fullContent)) {
            if (result.type === 'entry' && result.entry) {
              const entryKey = `${result.entry.date}-${result.entry.channel}`;
              if (!seenEntries.has(entryKey)) {
                seenEntries.add(entryKey);
                sendEvent('entry', { entry: result.entry });
              }
            }
          }
        }

        if (chunk.type === 'done') {
          sendEvent('status', { message: 'Parsing complete response...' });

          // Final parse
          try {
            const parsed = JSON.parse(chunk.content || fullContent);
            const allEntries = parsed.week || [];

            // Send any entries we missed during streaming
            for (const entry of allEntries) {
              const entryKey = `${entry.date}-${entry.channel}`;
              if (!seenEntries.has(entryKey)) {
                sendEvent('entry', { entry });
              }
            }

            sendEvent('done', {
              metadata: chunk.metadata,
              totalEntries: allEntries.length
            });
          } catch (e) {
            sendEvent('error', { message: 'Failed to parse final response' });
          }
        }

        if (chunk.type === 'error') {
          sendEvent('error', { message: chunk.error });
        }
      }

      res.raw.end();
    } catch (error) {
      console.error('Generate week stream error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.raw.write(`event: error\n`);
      res.raw.write(`data: ${JSON.stringify({ message: errorMessage })}\n\n`);
      res.raw.end();
    }
  });
}
