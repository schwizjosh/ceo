/**
 * PROMPT ENGINE (ANDORA STORYTELLING FRAMEWORK)
 *
 * Narrative-first prompt generation for brand foundation and content
 * Automatically optimizes prompts based on context and brand story universe
 */

export interface BrandContext {
  brandName: string;
  brandType?: 'individual' | 'organization';
  tagline?: string;
  about?: string;
  vision?: string;
  mission?: string;
  persona?: string;
  buyerProfile?: string;
  targetAudience?: string;
  products?: string;
  voice?: string;
  personality?: string[];
  channels?: string[];
  narrative_problem?: string;
  narrative_solution?: string;
  narrative_cta?: string;
  narrative_failure?: string;
  narrative_success?: string;
  narrative_why?: string;
}

export interface CacheablePrompt {
  system: string;
  user: string;
  cacheableContext?: string[]; // Additional cacheable context blocks
}

export class PromptEngine {
  /**
   * Generate Brand Narrative (Plot) - PHASE 2 from Blueprint
   * Transforms brand foundation into compelling story narrative
   */
  generateBrandNarrativePrompt(context: BrandContext): { system: string; user: string } {
    const brandTypeContext = context.brandType === 'individual'
      ? `This is a personal/individual brand. Write naturally about the person using their name conversationally - avoid dramatic theatrical language like "Enter [Name]" or stage directions. Use their name as you would in a professional bio or story.`
      : `This is an organization/company brand. Write from the company's perspective.`;

    const system = `You are the 'CEO', a visionary leader and project director who transforms brand goals into actionable project directives.

${brandTypeContext}`;

    const user = `Based on this brand foundation, help me craft the core story narrative using compelling, engaging language. Transform the brand information into a captivating story framework that will resonate emotionally with the audience.

Brand Foundation:
Brand Type: ${context.brandType === 'individual' ? 'Personal Brand (Individual)' : 'Organization/Company'}
Brand Name: ${context.brandName}
${context.tagline ? `Tagline: ${context.tagline}` : ''}
${context.about ? `About: ${context.about}` : ''}
${context.vision ? `Vision: ${context.vision}` : ''}
${context.mission ? `Mission: ${context.mission}` : ''}
${context.products ? `Products/Services: ${context.products}` : ''}
${context.buyerProfile ? `Target Audience: ${context.buyerProfile}` : ''}

Create a JSON object with keys: 'why', 'problem', 'solution', 'cta', 'failure', 'success'. Each value should be story-driven, emotionally engaging, and use narrative elements that create connection and intrigue.

The narrative should follow this story structure:
- why: The deeper purpose driving the brand story (The Why)
- problem: Challenges and obstacles the audience faces (Story Conflict)
- solution: How the brand helps overcome challenges (Story Resolution)${context.brandType === 'individual' ? ' - Write naturally about the person using their name conversationally, not theatrically' : ''}
- cta: Primary action that moves the story forward (Story Climax)
- failure: Consequences of not engaging (Story Tension/Stakes)
- success: Triumphant outcome when they embrace the story (Story Victory)

${context.brandType === 'individual' ? '⚠️ CRITICAL FOR INDIVIDUAL BRANDS: Avoid theatrical stage directions like "Enter [Name]" or dramatic introductions. Write naturally and conversationally as if describing a person in a professional bio or authentic story. Use their name the way you would in normal, engaging business writing.' : ''}

Make each element compelling, narrative-driven, and emotionally resonant.`;

    return { system, user };
  }

  /**
   * Generate Vision Statement
   */
  generateVisionPrompt(context: BrandContext): { system: string; user: string } {
    const brandTypeContext = context.brandType === 'individual'
      ? `This is a personal brand - write from the individual's perspective (use "I" or refer to the person by name).`
      : `This is an organization/company brand - write from the company's perspective.`;

    const system = `You are the 'CEO', a visionary leader who crafts inspiring vision statements that drive project success.
Create compelling, future-oriented vision statements that paint a picture of the impact this brand will create in the world.
Keep statements concise (1-2 sentences), aspirational, and emotionally resonant.

${brandTypeContext}`;

    const user = `Based on this brand story universe, generate a powerful vision statement that captures the future this brand is building:

Brand Type: ${context.brandType === 'individual' ? 'Personal Brand (Individual)' : 'Organization/Company'}
Brand Name: ${context.brandName}
${context.tagline ? `Tagline: ${context.tagline}` : ''}
${context.about ? `About: ${context.about}` : ''}
${context.products ? `Products/Services: ${context.products}` : ''}

Generate a vision statement that:
- Paints a vivid picture of the future impact this brand wants to create
- Inspires employees, customers, and stakeholders
- Is memorable, aspirational, and emotionally resonant
- Aligns with the brand's story and purpose

Provide ONLY the vision statement, no explanations.`;

    return { system, user };
  }

  /**
   * Generate Mission Statement
   */
  generateMissionPrompt(context: BrandContext): { system: string; user: string } {
    const brandTypeContext = context.brandType === 'individual'
      ? `This is a personal brand - write from the individual's perspective (use "I" or refer to the person by name).`
      : `This is an organization/company brand - write from the company's perspective.`;

    const system = `You are the 'CEO', a results-oriented leader who defines clear, actionable mission statements that guide project execution.
Create clear, actionable mission statements that tell the story of what the brand does and how it serves its audience.
Keep statements concise (1-2 sentences) and focused on present-day operations and value delivery with emotional resonance.

${brandTypeContext}`;

    const user = `Based on this brand story universe, generate a compelling mission statement that tells what this brand does today:

Brand Type: ${context.brandType === 'individual' ? 'Personal Brand (Individual)' : 'Organization/Company'}
Brand Name: ${context.brandName}
${context.vision ? `Vision: ${context.vision}` : ''}
${context.about ? `About: ${context.about}` : ''}
${context.products ? `Products/Services: ${context.products}` : ''}
${context.buyerProfile ? `Target Audience: ${context.buyerProfile}` : ''}

Generate a mission statement that:
- Clearly states what the brand does and who it serves
- Explains how it delivers value and transforms lives
- Differentiates from competitors through story
- Is specific, actionable, and emotionally resonant

Provide ONLY the mission statement, no explanations.`;

    return { system, user };
  }

  /**
   * Generate Brand Persona
   */
  generatePersonaPrompt(context: BrandContext): { system: string; user: string } {
    const brandTypeContext = context.brandType === 'individual'
      ? `This is a personal brand - describe how this person communicates and their authentic voice.`
      : `This is an organization/company brand - describe the brand's voice and communication style.`;

    const system = `You are the 'CEO', an expert in corporate communications who defines the brand's voice and personality to ensure consistent messaging across all projects.
Create personas that define how a brand communicates - its tone, style, character traits, and storytelling approach.
Focus on creating a consistent, recognizable voice that resonates emotionally with the target audience and drives narrative connection.

${brandTypeContext}`;

    const user = `Based on this brand story universe, define the brand's voice and personality:

Brand Type: ${context.brandType === 'individual' ? 'Personal Brand (Individual)' : 'Organization/Company'}
Brand Name: ${context.brandName}
${context.tagline ? `Tagline: ${context.tagline}` : ''}
${context.about ? `About: ${context.about}` : ''}
${context.vision ? `Vision: ${context.vision}` : ''}
${context.mission ? `Mission: ${context.mission}` : ''}
${context.buyerProfile ? `Target Audience: ${context.buyerProfile}` : ''}

Generate a brand persona that describes:
- Communication tone and storytelling style (e.g., cinematic, conversational, bold, empathetic)
- Key personality traits that drive narrative (e.g., innovative, trustworthy, adventurous, inspiring)
- How the brand should "sound" and "feel" in content
- What makes this voice unique, authentic, and story-driven

Format as a cohesive paragraph (2-3 sentences) that captures the brand's narrative essence. Provide ONLY the persona description, no explanations.`;

    return { system, user };
  }

  /**
   * Generate Buyer Profile
   */
  generateBuyerProfilePrompt(context: BrandContext): { system: string; user: string } {
    const randomSeed = Math.floor(Math.random() * 10000); // Add entropy for variation

    const system = `You are the 'CEO', an expert in market analysis and customer research. Learn from these buyer persona examples:

Example 1:
PRODUCT : Lands & Properties
NAME : Chinedu Godwin
Age : 31
Occupation : Investor
Interests : Forex / Market Trade, Flexing, Cars, VIP Treatments, Investment Diversification, Status, New Treats
Casual Interests : Premium food, Pizza, Women, Telegram, Attention, Watching Football, Movies/Games
Character & Lifestyle : Flamboyant, Works from Home, Luxury, Maintains a clique, Open-minded, committed
Aspirations : Body goals, achieving a social status, probably a dream car, a mansion, another established investment, The Right Partner
Problems : Liquidity risk, inflation, Fear per investment, lack of professional plugs, financial management, security

Example 2:
PRODUCT : Internet Data Subscription
NAME : Paulinus Nworie
Age : 49
Occupation : Trader
Interests : News, Investment, Finance, Profit, Social media, staying up to date
Casual Interests : News browsers, walking and jogging, playing sports, TV watching
Character & Lifestyle : Not always online, Semi-urban lifestyle, News reader, Dedicated to daily trade, Married with kids, extrovert
Aspirations : Maintaining status, hit profit targets, Easier life, Longevity, Family welfare
Problems : government policies, clearing of goods or accessibility, senescence, changes in households, many engagements, data plans and accessibility

Variation: ${randomSeed}`;

    const brandTypeContext = context.brandType === 'individual'
      ? `Brand Type: Personal brand (individual)`
      : `Brand Type: Organization/Company`;

    // Use specific product context if provided (from audience carousel),
    // otherwise fall back to general products field
    const productContext = context.buyerProfile && context.buyerProfile.includes('Product/Service:')
      ? context.buyerProfile
      : (context.products ? `Products/Services: ${context.products}` : '');

    const user = `Create a buyer persona for this brand's ideal customer:

${brandTypeContext}
Brand Name: ${context.brandName}
${context.about ? `About: ${context.about}` : ''}
${productContext}
${context.persona ? `Brand Voice: ${context.persona}` : ''}
${context.vision ? `Vision: ${context.vision}` : ''}

Learn from the examples above and create a buyer persona following EXACTLY the same format:

PRODUCT : [what this brand offers]
NAME : [fictional ideal customer name]
Age : [age]
Occupation : [occupation]
Interests : [professional/career interests]
Casual Interests : [hobbies, entertainment, lifestyle]
Character & Lifestyle : [personality traits, work style, lifestyle choices]
Aspirations : [goals, dreams, what they want to achieve]
Problems : [pain points, challenges, fears this brand can solve]

Provide ONLY the formatted persona. Do not add any explanations or notes.`;

    return { system, user };
  }

  /**
   * Generate Content Strategy (Channels + Frequency)
   */
  generateContentStrategyPrompt(context: BrandContext): { system: string; user: string } {
    const system = `You are the 'CEO', an expert in project management and strategic communications.
Recommend optimal posting schedules and frequencies based on brand characteristics and target audience.
Focus on realistic, achievable strategies that maximize engagement and ROI across all selected channels.`;

    const selectedChannels = context.channels && Array.isArray(context.channels) && context.channels.length > 0
      ? context.channels
      : ['LinkedIn', 'Instagram', 'X'];

    const user = `Based on this brand information, recommend an optimal posting schedule:

Brand Name: ${context.brandName}
${context.about ? `About: ${context.about}` : ''}
${context.products ? `Products/Services: ${context.products}` : ''}
${context.buyerProfile ? `Target Audience: ${context.buyerProfile}` : ''}
${context.persona ? `Brand Voice: ${context.persona}` : ''}

SELECTED CHANNELS: ${selectedChannels.join(', ')}

Recommend:
1. Return ALL selected channels: ${selectedChannels.join(', ')}
2. Suggested posting frequency per week (how many days per week to post: 3-7 days recommended)
3. Brief rationale for the posting frequency

IMPORTANT: Your "channels" array MUST include ALL ${selectedChannels.length} selected channels: ${selectedChannels.join(', ')}

Format as JSON:
{
  "channels": ${JSON.stringify(selectedChannels)},
  "frequency": 5,
  "rationale": "Brief explanation of why posting 5 days per week works well for these channels"
}`;

    return { system, user };
  }

  /**
   * Generate Monthly Plot/Theme (PHASE 5: MONTHLY THEME GENERATION)
   */
  generateMonthlyPlotPrompt(context: BrandContext & { theme: string; month: string; events?: string[]; themePrompt?: string; characters?: Array<{ name: string; role?: string; persona?: string; location?: string }> }): { system: string; user: string } {
    const system = `You are the 'CEO', a visionary project director who creates clear, actionable project roadmaps that motivate teams and drive results. You understand project management, strategic planning, and how to break down large goals into achievable milestones.

Your monthly plots are NOT just brief summaries—they are RICH, DETAILED story frameworks that creative directors can immediately visualize and execute. Think: multiple content angles, character moments, emotional beats, and specific storytelling directions. Every plot you create has INTRIGUE, CONFLICT, and TRANSFORMATION that keeps audiences coming back for more.`;

    const characterLines = context.characters && context.characters.length > 0
      ? `
Brand Cast (Characters available for the monthly plot):
${context.characters.map(c => `- ${c.name}${c.role ? ` (${c.role})` : ''}${c.persona ? `: ${c.persona}` : ''}`).join('\n')}`
      : '';

    const user = `Based on this brand story universe, cast of characters, and event timeline, create a RICH, DETAILED monthly plot for ${context.month || 'the month'} that brings the monthly theme "${context.theme}" to life through compelling narrative tension and story progression.

Brand: ${context.brandName}
${context.about ? `About: ${context.about}` : ''}
${context.persona ? `Brand Voice: ${context.persona}` : ''}
${context.narrative_problem ? `Customer Problem: ${context.narrative_problem}` : ''}
${context.narrative_solution ? `Solution Story: ${context.narrative_solution}` : ''}
${characterLines}
Monthly Theme: ${context.theme}
${context.events && context.events.length > 0 ? `Events Timeline: ${context.events.join(', ')}` : ''}
${context.themePrompt ? `Extra Focus: '${context.themePrompt}'` : ''}

CRITICAL: The monthly plot MUST directly explore and advance the theme "${context.theme}". Every story beat, character moment, and content angle should tie back to this central narrative thread.

REQUIREMENTS FOR THE MONTHLY PLOT:
1. **Theme Integration**: Show how "${context.theme}" unfolds throughout the month - what question does it pose? What tension does it create? How does it resolve?
2. **Narrative Intrigue**: Include conflict, challenges, questions, or mysteries that create suspense and keep audiences engaged (e.g., "What happens when...", "The team discovers...", "A challenge emerges...")
3. **Complete Story Arc**:
   - OPENING (Week 1): Hook that introduces the theme's central tension or question
   - RISING ACTION (Week 2): Complications, discoveries, or challenges that deepen the story
   - CLIMAX (Week 3): Turning point, breakthrough moment, or peak tension
   - RESOLUTION (Week 4): Transformation, insight, or new understanding that emerges
4. **Character-Driven Moments**: Specific scenarios showing brand characters wrestling with the theme, making discoveries, facing challenges, celebrating wins
5. **Emotional Journey**: Map clear emotional progression tied to the theme (curiosity → struggle → breakthrough → transformation)
6. **Content Sparks**: 5-7 specific, visual content ideas that make the theme tangible and shareable
7. **Visual & Tonal Direction**: Concrete guidance on mood, aesthetics, and storytelling style that reflects the theme

The plot should be RICH and DETAILED (400-600 words) - imagine you're pitching a TV series episode to a showrunner. They should read it and immediately see: the central dramatic question, the story beats, the character arcs, the visual moments, and how it all ties back to the theme "${context.theme}".

Give me a JSON object with these keys:
{
  "theme": "The compelling story theme title that captures the intrigue",
  "explanation": "Opening 2-3 sentences that set the stage for the entire month (the hook that appears at the top)",
  "week_1": "RICH narrative for Week 1 (100-150 words) with title format 'WEEK 1 - TITLE: narrative content...'",
  "week_2": "RICH narrative for Week 2 (100-150 words) with title format 'WEEK 2 - TITLE: narrative content...'",
  "week_3": "RICH narrative for Week 3 (100-150 words) with title format 'WEEK 3 - TITLE: narrative content...'",
  "week_4": "RICH narrative for Week 4 (100-150 words) with title format 'WEEK 4 - TITLE: narrative content...'",
  "content_sparks": "List of 5-7 specific content ideas that span the entire month"
}`;

    return { system, user };
  }

  /**
   * Generate Weekly Subplot (PHASE 6: WEEKLY SUBPLOTS)
   */
  generateWeeklySubplotPrompt(
    context: BrandContext & {
      monthlyPlot: string;
      monthlyTheme: string;
      weekTheme?: string;
      weekNumber: number;
      weekStart: string;
      weekEnd: string;
      events?: string[];
      characters?: Array<{
        name: string;
        location?: string;  // ✅ Optional
        role?: string;
        persona?: string;
        character_name?: string;
        about?: string;
      }>;
    }
  ): { system: string; user: string } {
    const system = `You are the 'CEO', a results-driven project manager who creates detailed project plans and tasks. You understand how to define clear objectives, assign responsibilities, and track progress to ensure project success.

Your weekly subplots are RICH and DETAILED—packed with specific content angles, character moments, posting ideas, and creative direction that make it easy for creative directors to see multiple pieces of content. This is the JUICE that fuels the content calendar.

🚨 LANGUAGE CLARITY - NON-NEGOTIABLE:
- Use everyday language like you're talking to a friend over coffee
- NO vague words (e.g., "leverage", "synergy", "paradigm", "revolutionary", "cutting-edge")
- NO big words when simple ones work (e.g., say "use" not "utilize", "help" not "facilitate")
- NO corporate jargon or buzzwords
- Write like real people talk - conversational, relatable, human
- Test: Would you say this out loud to a friend? If not, rewrite it.

🎯 BUYER PROFILE CONNECTION - MANDATORY:
- The buyer profile is YOUR NORTH STAR for every subplot and content idea
- Connect to their casual interests, lifestyle, daily struggles, and real-world experiences
- Make content RELATABLE - they should see themselves in the story
- Reference their actual hobbies, routines, challenges (from buyer profile)
- Speak to where they are RIGHT NOW, not where they want to be
- Find the cool connection points that make them say "that's SO me!"`;

    const characterLines = context.characters && context.characters.length > 0
      ? `Cast on stage this episode:
${context.characters
        .map((character) => {
          const descriptors = [
            character.character_name && character.character_name !== character.name ? `aka ${character.character_name}` : null,
            character.role ? `Role: ${character.role}` : null,
            character.persona ? `Persona: ${character.persona}` : null,
            character.location ? `Location: ${character.location}` : null,
            character.about ? `Backstory: ${character.about}` : null,
          ]
            .filter(Boolean)
            .join(' | ');
          return `- ${character.name}${descriptors ? ` (${descriptors})` : ''}`;
        })
        .join('\n')}
`
      : '';

    const eventsTimeline = context.events && context.events.length > 0
      ? `Event flow this week:
${context.events.map((event) => `- ${event}`).join('\n')}
`
      : '';

    const user = `Based on this brand story universe and character locations, create a RICH, DETAILED weekly subplot for week ${context.weekNumber} (${context.weekStart} to ${context.weekEnd}) that is PACKED with specific content ideas, character moments, and creative direction.

Brand: ${context.brandName}
${context.about ? `About: ${context.about}` : ''}
Monthly Story Theme: '${context.monthlyTheme}'
${context.monthlyPlot ? `Monthly Plot: ${context.monthlyPlot}` : ''}
${context.weekTheme ? `SPECIAL STORY FOCUS for this episode: ${context.weekTheme}` : ''}
${eventsTimeline}
${characterLines}

REQUIREMENTS - THIS IS THE JUICE:
1. **Specific Content Ideas (5-8 ideas)**: Give concrete, ready-to-execute content ideas that a creative director can immediately visualize (e.g., "Behind-the-scenes of Sarah troubleshooting a customer issue at 2am", "Quick tip video showing the 3-step framework", "Customer success story featuring...")
2. **Character Spotlight Moments (2-3)**: Specific scenarios where characters shine and show personality. IMPORTANT: Some days can feature 2 or more characters together (if they're onsite or hybrid), not just one character per day. Think of ensemble moments, collaborations, and character interactions.
3. **Posting Rhythm**: Suggest a cadence (e.g., "Monday: Problem intro, Wednesday: Solution deep-dive, Friday: Victory story")
4. **Emotional Arc**: Map the week's emotional journey (struggle → insight → breakthrough)
5. **Visual/Format Ideas**: Specific format suggestions (carousel, video, infographic, story series)
6. **Hook Ideas**: 3-5 attention-grabbing hooks or opening lines for posts
7. **Call-to-Action Angles**: Different CTA approaches for different days
8. **Named Character Moments**: Reference at least two of the listed characters directly in the narrative beats so the audience follows their arcs. Mix solo character moments with ensemble scenes where multiple characters interact.
9. **Event Integration**: If events are listed, weave them into the episode's tension, stakes, or payoffs so the week feels grounded in the timeline.
10. **Next-Scene Hooks**: Provide a short list (3-5) of cinematic hooks that set up the next daily scene. Each hook should call out the day (or sequence #), the dramatic beat to carry forward, and the promised payoff so the Scene Writer can reference it verbatim.

This subplot should be SO DETAILED (400-600 words) that a creative director looks at it and says "I can see 10+ pieces of content here!" It's the creative fuel for the entire week.

Give me a JSON object with keys:
{
  "week_theme": "Short, punchy weekly theme title (auto-generate if not provided by user)",
  "subplot_title": "Compelling episode title",
  "subplot_description": "RICH, DETAILED story overview (400-600 words) packed with specific content ideas, character moments, posting suggestions, hooks, formats, and creative direction that makes content creation obvious and exciting",
  "key_focus_areas": "Main story beats with specific examples",
  "content_direction": "Tactical narrative guidance with format suggestions",
  "editable_content": "Additional detailed, editable story episode content with even more angles for manual refinement",
  "next_scene_hooks": [
    {
      "sequence": 1,
      "day_of_week": "Monday",
      "hook": "Short cinematic hook that tees up the next scene",
      "setup": "Setup or conflict that the next scene should reference",
      "payoff": "Payoff or reveal the next scene should deliver",
      "recommended_narrator": "Character name best suited to deliver the payoff"
    }
  ]
}`;

    return { system, user };
  }

  /**
   * Generate Character Description (PHASE 3: CAST GENERATION)
   */
  generateCharacterPrompt(
    context: BrandContext & {
      characterCount: number;
      existingCharacters?: string[];
    }
  ): { system: string; user: string } {
    const system = `You are the 'CEO', a strategic leader who assembles high-performing teams to execute on project directives. You understand how to identify key roles, define responsibilities, and build a team that is aligned with the project's goals.`;

    const brandType = context.characterCount === 1 ? 'PERSONAL BRAND' : 'ENSEMBLE BRAND';
    const characterGuidance = context.characterCount === 1
      ? 'Create ONE character that represents the personal brand/alter ego. This is the persona the user embodies - their audience watches them as the hero of the story.'
      : `Create ${context.characterCount} characters that form an ENSEMBLE cast. Each character should connect with a different shade of the buyer profile. Together, they orchestrate to connect with the ideal buyer persona. The customer is the hero who sees these characters as important guides in their journey.`;

    const user = `Based on this brand story universe, create exactly ${context.characterCount} compelling story characters with rich narrative roles. These should be characters that audiences will connect with emotionally and want to follow their journeys.

Brand: ${context.brandName}
${context.about ? `About: ${context.about}` : ''}
${context.persona ? `Brand Voice: ${context.persona}` : ''}
${context.buyerProfile ? `Target Audience: ${context.buyerProfile}` : ''}
${context.existingCharacters && context.existingCharacters.length > 0 ? `Existing Characters: ${context.existingCharacters.join(', ')}` : ''}

BRAND TYPE: ${brandType}
${characterGuidance}

IMPORTANT: Create characters with:
- Deep personality and story role
- Relatable struggles and emotional hooks
- Clear narrative purpose
- Character arcs that drive emotional engagement
- Work arrangement (onsite/remote/hybrid) - Infer intelligently based on their role
${context.characterCount > 1 ? '- Each character should resonate with different aspects of your target audience' : '- This character should be the authentic voice the audience connects with'}

CHARACTER NAME FORMAT: Each character name must follow this format:
**Name (Character Name) - onsite/remote/hybrid**

Example: "Sarah Chen (The Innovator) - remote" or "Michael Scott (The Closer) - onsite"

Intelligently assign work arrangement based on:
- Their role (e.g., developer → "remote", sales → "onsite", manager → "hybrid")
- The brand context and nature of their work
- Modern work trends and what makes sense for their character

Give me a JSON object with one key 'cast', which is an array of exactly ${context.characterCount} objects. Each object has THREE string keys:
- "name": Character name in format: "Name (Character Name) - onsite/remote/hybrid"
- "work_mode": One of: "onsite" | "remote" | "hybrid"
- "persona": Rich character description with personality, story role, emotional depth, and narrative purpose (2-3 sentences)

Format as:
{
  "cast": [
    {
      "name": "Sarah Chen (The Innovator) - remote",
      "work_mode": "remote",
      "persona": "Compelling multi-dimensional character description with personality and story role..."
    }
  ]
}`;

    return { system, user };
  }

  /**
   * Generate Content Brief
   */
  generateContentBriefPrompt(
    context: BrandContext & {
      date: string;
      channel: string;
      subplot?: string;
      event?: string;
      character?: string;
    }
  ): { system: string; user: string } {
    const system = `You are the 'CEO', an expert project manager and communications director.
Create detailed, actionable content briefs that guide content creators to produce engaging, on-brand content.
Focus on clear directives, emotional angles, and specific content types.`;

    const user = `Create a content brief for:

Date: ${context.date}
Channel: ${context.channel}
Brand: ${context.brandName}
${context.character ? `Character: ${context.character}` : ''}
${context.subplot ? `Story Context: ${context.subplot}` : ''}
${context.event ? `Event: ${context.event}` : ''}
${context.persona ? `Brand Voice: ${context.persona}` : ''}

Generate a content brief with:
1. Key Theme (1 sentence)
2. Emotional Angles (2-3 emotions to evoke)
3. Content Type (e.g., Video: Tutorial, Carousel: Tips, Story: Behind-the-scenes)
4. Directives (3-4 specific instructions for the content creator)

Format as JSON:
{
  "keyTheme": "Main message",
  "emotionalAngles": ["emotion1", "emotion2"],
  "contentType": "Format: Type",
  "directives": ["directive1", "directive2", "directive3"]
}`;

    return { system, user };
  }

  /**
   * PHASE 2: AI PREFILL NARRATIVE
   */
  generateNarrativePrefillPrompt(context: BrandContext & { existingNarrative?: any; perfectFields?: Record<string, boolean> }): { system: string; user: string } {
    const brandTypeGuidance = context.brandType === 'individual'
      ? `This is a personal/individual brand. Write naturally about the person - avoid theatrical stage directions like "Enter [Name]". Use their name conversationally, as you would in professional bio or authentic storytelling.`
      : `This is an organization/company brand.`;

    const system = `You are the 'CEO', a visionary leader who transforms brand goals into actionable project directives. You understand the power of clear communication, strategic planning, and effective execution.

${brandTypeGuidance}`;

    const hasExistingContent = context.existingNarrative && Object.values(context.existingNarrative).some((val: any) => val?.trim());
    const perfectFields = context.perfectFields || {};

    // Build perfect fields context (these will be used as context but NOT refined)
    const perfectFieldsContext = [];
    if (perfectFields.narrative_why && context.existingNarrative?.why) {
      perfectFieldsContext.push(`Why (PERFECT - DO NOT CHANGE): ${context.existingNarrative.why}`);
    }
    if (perfectFields.narrative_problem && context.existingNarrative?.problem) {
      perfectFieldsContext.push(`Problem (PERFECT - DO NOT CHANGE): ${context.existingNarrative.problem}`);
    }
    if (perfectFields.narrative_solution && context.existingNarrative?.solution) {
      perfectFieldsContext.push(`Solution (PERFECT - DO NOT CHANGE): ${context.existingNarrative.solution}`);
    }
    if (perfectFields.narrative_cta && context.existingNarrative?.cta) {
      perfectFieldsContext.push(`Call to Action (PERFECT - DO NOT CHANGE): ${context.existingNarrative.cta}`);
    }
    if (perfectFields.narrative_failure && context.existingNarrative?.failure) {
      perfectFieldsContext.push(`Failure Stakes (PERFECT - DO NOT CHANGE): ${context.existingNarrative.failure}`);
    }
    if (perfectFields.narrative_success && context.existingNarrative?.success) {
      perfectFieldsContext.push(`Success Vision (PERFECT - DO NOT CHANGE): ${context.existingNarrative.success}`);
    }

    // Build fields to refine (only imperfect fields)
    const fieldsToRefine = [];
    if (!perfectFields.narrative_why && context.existingNarrative?.why) {
      fieldsToRefine.push(`Why: ${context.existingNarrative.why}`);
    }
    if (!perfectFields.narrative_problem && context.existingNarrative?.problem) {
      fieldsToRefine.push(`Problem: ${context.existingNarrative.problem}`);
    }
    if (!perfectFields.narrative_solution && context.existingNarrative?.solution) {
      fieldsToRefine.push(`Solution: ${context.existingNarrative.solution}`);
    }
    if (!perfectFields.narrative_cta && context.existingNarrative?.cta) {
      fieldsToRefine.push(`Call to Action: ${context.existingNarrative.cta}`);
    }
    if (!perfectFields.narrative_failure && context.existingNarrative?.failure) {
      fieldsToRefine.push(`Failure Stakes: ${context.existingNarrative.failure}`);
    }
    if (!perfectFields.narrative_success && context.existingNarrative?.success) {
      fieldsToRefine.push(`Success Vision: ${context.existingNarrative.success}`);
    }

    const user = hasExistingContent
      ? `The user has started crafting their brand narrative but wants your help refining it. Review what they have and enhance it with more compelling, emotionally engaging language while preserving their core intent and message.

Brand Type: ${context.brandType === 'individual' ? 'Personal Brand (Individual)' : 'Organization/Company'}
Brand: ${context.brandName}
${context.tagline ? `Tagline: ${context.tagline}` : ''}
${context.about ? `About: ${context.about}` : ''}
${context.vision ? `Vision: ${context.vision}` : ''}
${context.mission ? `Mission: ${context.mission}` : ''}
${context.products ? `Products/Services: ${context.products}` : ''}
${context.buyerProfile ? `Target Audience: ${context.buyerProfile}` : ''}
${context.voice ? `Brand Voice: ${context.voice}` : ''}

${perfectFieldsContext.length > 0 ? `PERFECT FIELDS (Use as context, DO NOT modify or include in output):
${perfectFieldsContext.join('\n')}

` : ''}${fieldsToRefine.length > 0 ? `FIELDS TO REFINE (Only refine these):
${fieldsToRefine.join('\n')}

` : ''}${perfectFieldsContext.length > 0 ? `⚠️ CRITICAL INSTRUCTIONS:
1. DO NOT include perfect fields in your JSON response
2. Use perfect fields as CONTEXT to inform your refinements of imperfect fields
3. Ensure refined fields are coherent with and complement the perfect fields
4. Only return JSON keys for fields that are NOT marked perfect

` : ''}Refine and enhance ONLY the imperfect fields. Keep their core message but make it more story-driven and emotionally resonant. ${context.brandType === 'individual' ? 'For individual brands: Use their name naturally and conversationally - avoid theatrical language like "Enter [Name]".' : ''} Return a JSON object with ONLY the keys for fields that need refinement:
{
${!perfectFields.narrative_why ? '  "why": "Enhanced version of their \'why\' - the deeper purpose",\n' : ''}${!perfectFields.narrative_problem ? '  "problem": "Enhanced version of their \'problem\' - the story conflict",\n' : ''}${!perfectFields.narrative_solution ? `  "solution": "Enhanced version of their 'solution' - the story resolution${context.brandType === 'individual' ? ' (use their name naturally, not theatrically)' : ''}",\n` : ''}${!perfectFields.narrative_cta ? '  "cta": "Up to 5 signature words, slang, or endings (5-8 words each), comma-separated. Consistent phrases that amplify the brand.",\n' : ''}${!perfectFields.narrative_failure ? '  "failure": "Enhanced version of their \'failure\' - the story tension",\n' : ''}${!perfectFields.narrative_success ? '  "success": "Enhanced version of their \'success\' - the story victory"\n' : ''}}

IMPORTANT: For the CTA field, provide up to 5 signature words, slang, or ending phrases (5-8 words each), comma-separated. These are consistent phrases that amplify brand recognition - could be unique words, casual slang, or natural sign-offs.`
      : `Based on this brand foundation, help me craft the core story narrative using compelling, engaging language. Transform the brand information into a captivating story framework that will resonate emotionally with the audience.

Brand Type: ${context.brandType === 'individual' ? 'Personal Brand (Individual)' : 'Organization/Company'}
Brand: ${context.brandName}
${context.tagline ? `Tagline: ${context.tagline}` : ''}
${context.about ? `About: ${context.about}` : ''}
${context.vision ? `Vision: ${context.vision}` : ''}
${context.mission ? `Mission: ${context.mission}` : ''}
${context.products ? `Products/Services: ${context.products}` : ''}
${context.buyerProfile ? `Target Audience: ${context.buyerProfile}` : ''}
${context.voice ? `Brand Voice: ${context.voice}` : ''}

Create a JSON object with keys:
{
  "why": "The deeper purpose driving the brand story - why does this brand exist?",
  "problem": "Challenges and obstacles the audience faces - the story conflict",
  "solution": "How the brand helps overcome challenges - the story resolution${context.brandType === 'individual' ? ' (write naturally about the person, not theatrically)' : ''}",
  "cta": "Up to 5 signature words, slang, or ending phrases (5-8 words each), comma-separated. Consistent phrases that amplify brand recognition.",
  "failure": "Consequences of not engaging - the story tension",
  "success": "Triumphant outcome when they embrace the story - the story victory"
}

Each value should be story-driven, emotionally engaging, and use narrative elements that create connection and intrigue.

${context.brandType === 'individual' ? '⚠️ CRITICAL FOR INDIVIDUAL BRANDS: In the "solution" field, write naturally about the person using their name conversationally - avoid theatrical stage directions like "Enter [Name]". Write as you would in a professional bio or authentic story.' : ''}

IMPORTANT: For the CTA field, provide up to 5 signature words, slang, or ending phrases (5-8 words each), comma-separated. These could be unique brand words, casual slang terms, or natural sign-offs that create consistency and amplify the brand through repetition.`;

    return { system, user };
  }

  /**
   * PHASE 4: CAST REGENERATION (NOT Harmonize - Just Regenerate)
   * Takes user's character input and regenerates with storytelling depth
   */
  generateCastResolutionPrompt(
    context: BrandContext & {
      userCharacters: Array<{
        name: string;
        character_name?: string;
        role?: string;
        location?: string;
        about?: string;
        personality?: string;
        age_range?: string;
        work_mode?: string;
        perfect_fields?: {
          name?: boolean;
          character_name?: boolean;
          role?: boolean;
          location?: boolean;
          about?: boolean;
          personality?: boolean;
          age_range?: boolean;
          work_mode?: boolean;
          persona?: boolean;
        };
      }>;
    }
  ): { system: string; user: string } {
    const isIndividualBrand = context.brandType === 'individual' || context.userCharacters.length === 1;

    const brandPersonaGuidance = context.persona
      ? `The brand voice is: "${context.persona}". The character persona should align with and authentically expand on this voice.`
      : 'Make sure the character persona feels authentic and relatable to their audience.';

    const developmentContext = isIndividualBrand
      ? 'You specialize in creating authentic personal brand personas for influencers, creators, and thought leaders.'
      : 'You think like a screenwriter creating an ensemble cast for a compelling series. Always consider character locations - never pair remote characters with onsite ones unless they are hybrid.';

    const brandTypeDescription = isIndividualBrand
      ? 'INDIVIDUAL/PERSONAL BRAND: This is ONE character - the brand owner/creator themselves (NOT an employee). Think: influencer, content creator, coach, consultant, thought leader. NO corporate language. NO business jargon. Write as if describing an authentic person sharing their journey. ' + brandPersonaGuidance
      : 'ENSEMBLE/ORGANIZATION BRAND: Multiple characters (employees/team) orchestrate together to connect with different shades of the buyer profile, each resonating with a different audience segment';

    const missionStatement = isIndividualBrand
      ? 'This character IS the brand persona - an authentic person the audience watches and follows. Make them relatable and human.'
      : 'Each character should connect with a different aspect of the buyer profile - an ensemble that collectively leads the ideal buyer on a journey.';

    const workModeGuidance = isIndividualBrand
      ? '- For personal brands: work_mode should be "remote" or "flexible" (they are digital creators)'
      : '- For organization brands: infer work_mode based on role (developer to remote, sales to onsite)';

    const authenticityRule = isIndividualBrand
      ? '\n6. PERSONAL BRAND AUTHENTICITY: Write as if describing a real influencer/creator - authentic, human, relatable. NO corporate speak.'
      : '';

    const system = `You are the 'CEO', a strategic leader and team builder.

You understand character development, story arcs, and emotional beats. ${developmentContext}

BRAND TYPE UNDERSTANDING:
- ${brandTypeDescription}

YOUR MISSION:
Create characters with depth, personality, relatable struggles, and clear story roles. Think about character arcs and how they drive emotional engagement. ${missionStatement}

CRITICAL INTELLIGENCE RULES:
1. READ MEANING, DON'T EXPOSE DATA: If user says "INFJ", understand it means introverted, intuitive, empathetic, values-driven - DON'T mention "INFJ" in output
2. AGE IS CONTEXT ONLY: Never mention age ranges explicitly. Use it to inform character depth and experience level
3. FILL MISSING DETAILS: If user didn't provide work_mode, role, etc., intelligently infer them based on context
   ${workModeGuidance}
4. TRANSFORM, DON'T PARROT: Take raw input and transform it into compelling narrative without exposing the raw data
5. CREATE STORY POTENTIAL: Give each character emotional hooks, relatable struggles, and growth potential${authenticityRule}

You create rich character personas that audiences emotionally connect with and want to follow.`;

    const characterList = context.userCharacters
      .map((char, i) => {
        const parts = [];
        const perfectFields = char.perfect_fields || {};
        const charId = (char as any).id || `new-${i}`;

        parts.push(`${i + 1}. ID: ${charId}`);
        parts.push(`Name: ${char.name}${perfectFields.name ? ' [PERFECT - DO NOT CHANGE]' : ''}`);
        if (char.character_name) parts.push(`Character Name: ${char.character_name}${perfectFields.character_name ? ' [PERFECT]' : ''}`);
        if (char.role) parts.push(`Role: ${char.role}${perfectFields.role ? ' [PERFECT]' : ''}`);
        if (char.location) parts.push(`Location: ${char.location}${perfectFields.location ? ' [PERFECT]' : ''}`);
        if (char.about) parts.push(`About: ${char.about}${perfectFields.about ? ' [PERFECT]' : ''}`);
        if (char.personality) parts.push(`Personality: ${char.personality}${perfectFields.personality ? ' [PERFECT]' : ''}`);
        if (char.age_range) parts.push(`Age Context: ${char.age_range}${perfectFields.age_range ? ' [PERFECT]' : ''} (DO NOT mention age in persona)`);
        if (char.work_mode) parts.push(`Work Mode: ${char.work_mode}${perfectFields.work_mode ? ' [PERFECT]' : ''}`);

        // Add perfect fields note
        const perfectFieldsList = Object.entries(perfectFields)
          .filter(([_, isPerfect]) => isPerfect)
          .map(([field]) => field);
        if (perfectFieldsList.length > 0) {
          parts.push(`\n   ⚠️ PERFECT FIELDS (DO NOT CHANGE): ${perfectFieldsList.join(', ')}`);
        }

        return parts.join('\n   ');
      })
      .join('\n\n');

    const detailsFillGuidance = isIndividualBrand
      ? 'Ensure this character has depth and authenticity as a real person.'
      : 'Harmonize characters so the ensemble feels like a blockbuster team where each complements the others.';

    const workModeInstruction = isIndividualBrand
      ? '- No work_mode? Use "remote" or "flexible" (they are digital creators, not office workers)'
      : '- No work_mode? Infer it based on role (developer to remote, sales to onsite, manager to hybrid)';

    const roleInstruction = isIndividualBrand
      ? '- No role? Use creator-appropriate roles like "Content Creator", "Coach", "Consultant", "Thought Leader"'
      : '- No role? Infer from their description and brand context';

    const personaAlignmentRule = isIndividualBrand
      ? '- ALIGNMENT WITH BRAND VOICE: ' + brandPersonaGuidance
      : '- Location awareness - ensure work_mode aligns with their role and personality';

    const brandDynamicsRule = isIndividualBrand
      ? '   - PERSONAL/INDIVIDUAL BRAND: This character IS the brand owner themselves - an authentic person the audience watches and follows. Write as if describing a real influencer/creator, NOT an employee. Make them human and relatable.'
      : '   - ENSEMBLE DYNAMICS: Each character should connect with different shades of the buyer profile. Together, they orchestrate to guide the ideal buyer. Multiple characters means each segment of the audience will connect with one character or another.';

    const user = `Based on this brand story universe, refine these characters while preserving their essence and vision. Add storytelling depth, emotional hooks, and make each character someone the audience will care about and want to follow.

Brand Universe: ${context.brandName}
${context.about ? `About: ${context.about}` : ''}
${context.persona ? `Brand Voice: ${context.persona}` : ''}
${context.buyerProfile ? `Buyer Profile (Your Audience): ${context.buyerProfile}` : ''}

USER'S CHARACTER IDEAS:
${characterList}

CRITICAL INSTRUCTIONS - PERFECT FIELDS:
⚠️ RESPECT PERFECT FIELDS: Any field marked [PERFECT] MUST be returned EXACTLY as provided. DO NOT change, enhance, or modify perfect fields in any way.

YOUR STORYTELLING INSTRUCTIONS:
1. **PERFECT FIELDS FIRST**: If a field is marked [PERFECT], return it unchanged. Only enhance/fill non-perfect fields while preserving the user's vision.
2. READ & TRANSFORM personality traits (e.g., "INFJ" to write as thoughtful, empathetic, values-driven WITHOUT saying "INFJ")
3. Use age_range as CONTEXT only (early-30s = experienced but still energetic) - NEVER mention age explicitly
4. FILL MISSING DETAILS intelligently for NON-PERFECT fields. ${detailsFillGuidance}
   ${workModeInstruction}
   - No character_name? Create one that captures their essence
   ${roleInstruction}
5. PERSONALITY FIELD RULE: If personality is NOT marked perfect, provide an optimal MBTI-style code in the format XXXX-X (e.g., ENFJ-A). Use uppercase letters only.
6. Create RICH personas (only for non-perfect persona fields) with:
   - Deep personality and story potential - give them dimension beyond surface traits
   - Relatable struggles and emotional hooks - what challenges do they face? What drives them?
   - Clear narrative purpose - what role do they play in the brand story?
   ${personaAlignmentRule}
${brandDynamicsRule}

Keep names user provided. Transform raw data into compelling narrative WITHOUT exposing the original data format. Make them feel like real people with stories worth following.

REMINDER: Fields marked [PERFECT] are locked by the user. Return them EXACTLY as provided.

**CRITICAL REQUIREMENT**: You MUST return exactly ${context.userCharacters.length} character objects in the JSON response - one for each character provided above. DO NOT skip any characters. DO NOT return fewer than ${context.userCharacters.length} objects.

Return a JSON object with one key 'cast', which is an array of EXACTLY ${context.userCharacters.length} objects IN THE SAME ORDER as provided above.

Each object MUST have these keys:
- "id": The character's ID (REQUIRED - preserve from input, or create "new-{index}" if missing)
- "name": The person's actual name
- "character_name": Their character persona (create if missing)
- "role": Their business role (create/infer if missing)
- "about": Brief backstory or notes (preserve if provided)
- "personality": MBTI-style personality type in XXXX-X format (e.g., ENFJ-A)
- "age_range": Age context (preserve if provided, infer if missing)
- "work_mode": One of "onsite" | "remote" | "hybrid" (infer if missing)
- "persona": 2-3 sentence rich character description that TRANSFORMS personality/age context into compelling narrative

CRITICAL: Include the "id" field for EVERY character. If the user provided an ID, use it EXACTLY. If no ID, create one as "new-{index}".

${context.userCharacters.length === 2 ? `
EXAMPLE FORMAT FOR 2 CHARACTERS:
{
  "cast": [
    {
      "id": "04d99fce-334a-42b9-b925-3ec76434f4d5",
      "name": "Josh Schwarz",
      "character_name": "The Lighthouse Keeper",
      "role": "CTO & Founder",
      "about": "Founder with tech background",
      "personality": "INFJ-T",
      "age_range": "early-30s",
      "work_mode": "hybrid",
      "persona": "A thoughtful innovator who sees patterns others miss..."
    },
    {
      "id": "5ce00c5b-257f-47a2-b7be-d03eb3900b95",
      "name": "Sarah Chen",
      "character_name": "The Strategic Catalyst",
      "role": "COO",
      "about": "Operations leader",
      "personality": "ENTJ-A",
      "age_range": "mid-30s",
      "work_mode": "remote",
      "persona": "Sarah combines analytical precision with empathetic leadership..."
    }
  ]
}
` : `
EXAMPLE FORMAT:
{
  "cast": [
    {
      "id": "character-uuid-or-new-0",
      "name": "Josh Schwarz",
      "character_name": "The Lighthouse Keeper",
      "role": "CTO & Founder",
      "about": "Founder with tech background",
      "personality": "INFJ-T",
      "age_range": "early-30s",
      "work_mode": "hybrid",
      "persona": "A thoughtful innovator who sees patterns others miss, Josh channels quiet intensity into groundbreaking solutions. His empathetic leadership style creates psychological safety, allowing teams to take creative risks while staying anchored to clear vision."
    }
  ]
}
`}

REMINDER: Your response MUST contain exactly ${context.userCharacters.length} character objects. Verify your JSON has ${context.userCharacters.length} items in the cast array before responding.`;

    return { system, user };
  }

  /**
   * PHASE 7: CALENDAR GENERATION (Story Scenes)
   */
  generateCalendarPrompt(
    context: BrandContext & {
      month: string;
      year: string;
      monthlyTheme: string;
      weeklySubplot: string;
      startDay: number;
      endDay: number;
      channels: string[];
      characters: Array<{ name: string; location?: string; persona: string }>;
      events?: Array<{ date: string; title: string; description?: string }>;
      distributionPlan?: {
        summary?: string;
        ratios?: Array<{ channel: string; character_driven: number; faceless: number }>;
        daily_plan?: Array<{
          day: string;
          channel: string;
          emphasis: string;
          content_type: string;
          character_focus: string;
          continuity_cue: string;
          hook_to_carry?: string;
        }>;
      };
    }
  ): { system: string; user: string } {
    const system = `You are the 'CEO', a project director who creates clear and actionable project plans. Each task is a step in an ongoing project that builds momentum and drives results. Your plans have clear milestones, dependencies, and timelines that keep the team on track and motivated.

LOCATION-AWARE STORYTELLING RULES:
- A day/scene can have MULTIPLE characters (like TV show scenes)
- Onsite content → Only onsite/hybrid characters (HQ brings team together, 2+ characters allowed)
- Remote content → Only remote/hybrid characters (max 1 remote character per scene)
- Hybrid characters can appear in any content
- NEVER combine pure remote and pure onsite characters in the same content brief`;

    const characterInfo = context.characters.map(c => `${c.name} (${c.location}): ${c.persona}`).join('\n');
    const eventInfo = context.events && context.events.length > 0
      ? `Events: ${context.events.map(e => `${e.date} - ${e.title}`).join(', ')}`
      : '';

    const flowGuideEntries = context.distributionPlan?.daily_plan || [];
    const flowGuide = flowGuideEntries.length
      ? flowGuideEntries
          .map((plan, index) => {
            const previousPlan = index > 0 ? flowGuideEntries[index - 1] : null;
            const previousHook = previousPlan?.hook_to_carry?.trim();
            const reinforceHook = previousHook
              ? `Reinforce yesterday's hook "${previousHook}" before evolving the story.`
              : 'Set the weekly hook with cinematic clarity.';
            const hookCarryForward = plan.hook_to_carry?.trim()
              ? `Hook to carry forward: "${plan.hook_to_carry.trim()}"`
              : 'Close the loop boldly (no carry-over hook provided).';

            return `- ${plan.day}: ${plan.channel} → ${plan.emphasis} (${plan.content_type}). Character focus: ${plan.character_focus}. ${reinforceHook} Continuity cue: ${plan.continuity_cue}. ${hookCarryForward}`;
          })
          .join('\n')
      : '';

    const distributionSummary = context.distributionPlan?.summary
      ? `Weekly Distribution Intent:\n${context.distributionPlan.summary}\n\n`
      : '';

    const user = `${distributionSummary}Create story-driven content for days ${context.startDay}-${context.endDay} of ${context.month} ${context.year} that flows like compelling story episodes. Each day should feel like a scene in an ongoing brand narrative with emotional hooks, character development, and story progression.

Brand: ${context.brandName}
Monthly Theme: ${context.monthlyTheme}
Weekly Subplot: ${context.weeklySubplot}
Channels: ${context.channels.join(', ')}
${eventInfo}

CHARACTERS:
${characterInfo}

${flowGuide ? `WEEKLY FLOW GUIDE:\n${flowGuide}\n\n` : ''}Continuity Directives:
- Treat the weekly flow guide as the definitive plan for character-driven vs faceless storytelling.
- Day N must reference or pay off Day N-1's hook using the provided "Next-day setup" cue.
- Explicitly echo yesterday's "Hook to carry forward" before launching today's new idea—remix, don't repeat, and evolve the tension.
- Hooks must evolve daily—no repeated language or recycled concepts.

Vary character focus - some days spotlight individual characters, others feature character interactions (respecting location constraints). Create narrative tension, emotional arcs, and story cliffhangers that make audiences eager for the next 'episode'.

Generate content for up to ${context.channels.length} channels per day.

STORY RULES:
- Never combine remote and onsite characters unless they're hybrid
- Only pair characters who can realistically interact
- Create authentic character moments and genuine story progression

NARRATIVE FLOW: Each day should advance the overall brand story with emotional beats, character growth, conflicts, resolutions, or cliffhangers that build audience investment.

Create a JSON object with one key 'calendar', which is an array of content objects. Each object must have these string keys:
{
  "calendar": [
    {
      "Day": "YYYY-MM-DD",
      "Channel": "Platform name",
      "Story Hook & Content Idea": "Compelling story-driven content idea",
      "Character Focus": "Character name(s) - ensure location compatibility",
      "Emotional Beat": "Emotion this scene evokes",
      "Narrative Purpose": "How this advances the story",
      "Media Type": "Content format",
      "Suggested Posting Time": "Optimal time to post on this channel (e.g., '9:00 AM', '2:30 PM')",
      "Call To Action": "Clear next step for audience"
    }
  ]
}`;

    return { system, user };
  }

  /**
   * Weekly distribution planner
   */
  generateWeeklyDistributionPrompt(context: {
    brandName: string;
    brandVoice?: string;
    monthlyTheme: string;
    weeklySubplot?: string | null;
    weekNumber: number;
    weekStart: string;
    weekEnd: string;
    channels: string[];
    events: Array<{ date: string; title: string; description?: string }>;
    characters: Array<{
      name: string;
      character_name?: string;
      persona?: string;
      location?: string;
      work_mode?: string;
      role?: string;
    }>;
  }): { system: string; user: string } {
    const system = `You are the 'CEO', a strategic planner who designs weekly work plans. Your job is to balance team-member-specific tasks with general project tasks to ensure the project moves forward efficiently.`;

    const characterLines = context.characters.map(character => {
      const persona = character.persona ? ` – ${character.persona}` : '';
      const location = character.location || character.work_mode || 'hybrid';
      return `${character.character_name || character.name} (${location})${persona}`;
    }).join('\n');

    const eventLines = context.events.length
      ? context.events.map(event => `${event.date}: ${event.title}${event.description ? ` – ${event.description}` : ''}`).join('\n')
      : 'None';

    const user = `Design the perfect content mix for Week ${context.weekNumber} (${context.weekStart} → ${context.weekEnd}).

Brand: ${context.brandName}
Voice: ${context.brandVoice || 'Use documented brand voice'}
Monthly Theme: ${context.monthlyTheme}
Weekly Subplot: ${context.weeklySubplot || 'Carry monthly theme forward'}
Publishing Channels: ${context.channels.join(', ')}

Key Characters:
${characterLines}

Relevant Events:
${eventLines}

Output rich JSON with:
- "summary": 3-4 sentences on how character-driven vs faceless content will flow.
- "ratios": array per channel summarizing % character-driven vs faceless moments (0-100 totals 100).
- "daily_plan": ordered array for each day (YYYY-MM-DD) with keys:
  * "day": ISO date
  * "channel": primary channel focus for that day
  * "emphasis": either "Character-driven" or "Faceless/Format-led" with nuance
  * "content_type": best-fit format (carousel, blog, WhatsApp drop, single design, podcast, faceless video, etc.)
  * "character_focus": which character(s) or "Faceless" if none
  * "continuity_cue": 1-2 sentences that set up the next day's hook so the narrative flows
  * "hook_to_carry": succinct wording of the hook that tomorrow must reference

Rules:
- Guarantee variety—no back-to-back identical formats unless narrative demands it.
- Protect emotional pacing: alternate intimate character beats with scalable faceless pieces.
- Continuity cues must be specific so the next scene can intentionally build on it.
- Respect character logistics (location/work_mode) when assigning on-camera roles.
- Cover every day in the range (even if some are lighter touch).`;

    return { system, user };
  }

  /**
   * PHASE 8: CONTENT REFINEMENT
   */
  generateContentRefinementPrompt(
    context: BrandContext & {
      originalContent: string;
      refinePrompt: string;
      itemDate: string;
      characters?: Array<{ name: string; location?: string }>;
    }
  ): { system: string; user: string } {
    const system = `You are the 'CEO', a project director and editor. You transform project updates into clear, concise, and actionable reports. You add clarity, focus, and a strategic perspective to all communications.`;

    const user = `Using this brand story universe and character cast with locations, transform this content idea into something significantly more compelling, emotionally engaging, and story-driven. Add narrative depth, character insights, dramatic elements, and emotional hooks that will captivate the audience.

Brand: ${context.brandName}
${context.persona ? `Brand Voice: ${context.persona}` : ''}
Content Date: ${context.itemDate}

Original Content Idea:
${context.originalContent}

Refinement Focus:
${context.refinePrompt}

IMPORTANT: Feature appropriate brand characters based on their locations and create authentic story moments.

Transform this into compelling, story-driven content that feels like a scene from an ongoing brand narrative. Use appropriate characters, add emotional depth, create intrigue, and make the audience care about what happens next.

Return the refined content.`;

    return { system, user };
  }

  /**
   * PHASE 9: BRIEF EXPANSION
   */
  /**
   * OPTIMIZED: Generate Brief Expansion Prompt
   * Only includes relevant media type examples to reduce prompt size by 70-80%
   */
  generateBriefExpansionPrompt(
    context: BrandContext & {
      contentIdea: string;
      channel: string;
      date: string;
      character?: string;
      mediaType?: string;
      hook?: string;
      directives?: string;
      characterFocus?: string;
      cta?: string;
      weekFocus?: string;
    }
  ): { system: string; user: string } {
    const system = `You are the 'CEO', an expert in project management and execution.

Your mission: Transform content briefs into READY-TO-USE CONTENT that can be published immediately.

CRITICAL INSTRUCTIONS:
- For TEXT content (posts, articles, emails, threads) → Write the FULL, COMPLETE CONTENT ready to publish
- For VISUAL content (carousels, infographics) → Write the exact COPY for each slide/section
- For VIDEO content → Write the complete SCREENPLAY with scene descriptions and dialogue
- NO analysis, NO explanations, NO concepts - JUST the actual content
- Format in clean HTML for rich text display`;

    // OPTIMIZATION: Determine media type category to send only relevant instructions
    const normalizedMediaType = context.mediaType?.toUpperCase() || 'GENERAL';
    let mediaTypeCategory = 'GENERAL';

    if (['VIDEO', 'REEL', 'TIKTOK', 'YOUTUBE SHORT', 'SHORT'].includes(normalizedMediaType)) {
      mediaTypeCategory = 'VIDEO';
    } else if (['POST', 'LINKEDIN POST', 'INSTAGRAM POST', 'INSTAGRAM CAPTION', 'FACEBOOK POST'].includes(normalizedMediaType)) {
      mediaTypeCategory = 'POST';
    } else if (['CAROUSEL', 'SLIDES', 'INSTAGRAM CAROUSEL'].includes(normalizedMediaType)) {
      mediaTypeCategory = 'CAROUSEL';
    } else if (['THREAD', 'X THREAD'].includes(normalizedMediaType)) {
      mediaTypeCategory = 'THREAD';
    } else if (['EMAIL', 'NEWSLETTER'].includes(normalizedMediaType)) {
      mediaTypeCategory = 'EMAIL';
    }

    const user = `Create ${context.mediaType || 'content'} for ${context.date}.

**BRIEF:**
${context.contentIdea}

**CONTEXT:**
${context.hook ? `Hook: ${context.hook}` : ''}
${context.directives ? `Directions: ${context.directives}` : ''}
${context.characterFocus ? `Voice: ${context.characterFocus}` : ''}
${context.mediaType ? `Format: ${context.mediaType}` : ''}
${context.weekFocus ? `Theme: ${context.weekFocus}` : ''}
${context.cta ? `CTA: ${context.cta}` : ''}

**BRAND:**
${context.brandName} | ${context.channel}
${context.buyerProfile ? `Audience: ${context.buyerProfile}` : ''}

---

${mediaTypeCategory === 'VIDEO' ? `
**WRITE THE COMPLETE VIDEO SCREENPLAY:**

<h2>VIDEO SCREENPLAY</h2>

<h3>OPENING (0-3 seconds)</h3>
<p>[Write exactly what we see and hear to hook attention]</p>

<h3>SETUP (3-15 seconds)</h3>
<p>[Write the situation, setting, and what's happening]</p>

<h3>MAIN CONTENT (15-45 seconds)</h3>
<p>[Write beat-by-beat what unfolds, with specific visuals and dialogue]</p>

<h3>PAYOFF (45-60 seconds)</h3>
<p>[Write how it lands and concludes]</p>

<h3>PRODUCTION NOTES</h3>
<ul>
<li>Sound/Music: [Specify]</li>
<li>Text Overlays: [Specify any on-screen text]</li>
<li>Key Visual Moments: [List 3-5 specific shots]</li>
</ul>
` : ''}

${mediaTypeCategory === 'POST' ? `
**WRITE THE COMPLETE POST:**

<h2>${context.channel.toUpperCase()} POST</h2>

<p>[Write the complete, ready-to-publish post here. Include:</p>
<ul>
<li>Opening hook that stops the scroll</li>
<li>Engaging body with the full story</li>
<li>Clear call-to-action at the end</li>
<li>Use line breaks for readability</li>
<li>Match ${context.channel} style and tone</li>
</ul>

<h3>Optional Visual Suggestion</h3>
<p>[Briefly suggest what image/graphic would pair well]</p>
` : ''}

${mediaTypeCategory === 'CAROUSEL' ? `
**WRITE THE COMPLETE CAROUSEL COPY:**

<h2>CAROUSEL: ${context.channel.toUpperCase()}</h2>

<h3>SLIDE 1 (Hook)</h3>
<p><strong>Text:</strong> [Write the exact hook text]</p>
<p><strong>Visual:</strong> [Describe the visual]</p>

<h3>SLIDE 2</h3>
<p><strong>Text:</strong> [Write the exact text]</p>
<p><strong>Visual:</strong> [Describe the visual]</p>

<h3>SLIDE 3</h3>
<p><strong>Text:</strong> [Write the exact text]</p>
<p><strong>Visual:</strong> [Describe the visual]</p>

<h3>SLIDE 4</h3>
<p><strong>Text:</strong> [Write the exact text]</p>
<p><strong>Visual:</strong> [Describe the visual]</p>

<h3>SLIDE 5</h3>
<p><strong>Text:</strong> [Write the exact text]</p>
<p><strong>Visual:</strong> [Describe the visual]</p>

<h3>SLIDE 6 (if needed)</h3>
<p><strong>Text:</strong> [Write the exact text]</p>
<p><strong>Visual:</strong> [Describe the visual]</p>

<h3>FINAL SLIDE (CTA)</h3>
<p><strong>Text:</strong> [Write the exact CTA text]</p>
<p><strong>Visual:</strong> [Describe the visual]</p>

<h3>Design Direction</h3>
<p>[Color palette, typography, overall style]</p>
` : ''}

${mediaTypeCategory === 'THREAD' ? `
**WRITE THE COMPLETE THREAD:**

<h2>X THREAD</h2>

<h3>Tweet 1 (Hook)</h3>
<p>[Write the exact hook tweet - include thread indicator ↓]</p>

<h3>Tweet 2</h3>
<p>[Write the exact tweet]</p>

<h3>Tweet 3</h3>
<p>[Write the exact tweet]</p>

<h3>Tweet 4</h3>
<p>[Write the exact tweet]</p>

<h3>Tweet 5</h3>
<p>[Write the exact tweet]</p>

<h3>Tweet 6 (if needed)</h3>
<p>[Write the exact tweet]</p>

<h3>Tweet 7 (if needed)</h3>
<p>[Write the exact tweet]</p>

<h3>Final Tweet</h3>
<p>[Write the exact closing tweet with CTA]</p>
` : ''}

${mediaTypeCategory === 'EMAIL' ? `
**WRITE THE COMPLETE EMAIL:**

<h2>EMAIL / NEWSLETTER</h2>

<h3>Subject Line Options</h3>
<ol>
<li>[Write subject line option 1]</li>
<li>[Write subject line option 2]</li>
<li>[Write subject line option 3]</li>
</ol>

<h3>Preview Text</h3>
<p>[Write the preview text - first line they see]</p>

<h3>Email Body</h3>

<p>[Write the complete email with:</p>
<ul>
<li>Hook opening paragraph</li>
<li>Story/content body (3-5 paragraphs)</li>
<li>Clear CTA at the end</li>
<li>Conversational, engaging tone</li>
</ul>
` : ''}

${mediaTypeCategory === 'GENERAL' ? `
**WRITE THE COMPLETE CONTENT:**

<h2>${(context.mediaType || context.channel).toUpperCase()} CONTENT</h2>

<p>[Write the complete, ready-to-use content here based on the format:</p>
<ul>
<li>If it's text-based → Write the full text</li>
<li>If it's visual → Write the exact copy for each section</li>
<li>If it's video/audio → Write the complete script</li>
<li>Make it ready to publish immediately</li>
<li>Match ${context.channel} style and best practices</li>
</ul>

<h3>Format Notes</h3>
<p>[Any specific formatting or production notes needed]</p>
` : ''}

---

**REMEMBER:**
- Write COMPLETE, READY-TO-PUBLISH content
- NO concepts, NO analysis, NO explanations
- JUST the actual content that can be used immediately
- Format properly in HTML for easy copying`;

    return { system, user };
  }

  /**
   * Generate Monthly Theme (just the theme, not the full plot)
   */
  generateMonthlyThemePrompt(context: BrandContext & { month: string; events?: any[] }): { system: string; user: string } {
    const system = `You are the 'CEO', an expert in strategic planning and project management.
Generate compelling monthly themes that guide content creation and maintain narrative cohesion.
Create themes that are memorable, actionable, and resonate with the brand's core values.`;

    const eventsContext = context.events && context.events.length > 0
      ? `\nUpcoming Events:\n${context.events.map((e: any) => `- ${e.title}: ${e.description || ''}`).join('\n')}`
      : '';

    const user = `Based on this brand information, generate a compelling monthly theme for ${context.month}:

Brand: ${context.brandName}
${context.tagline ? `Tagline: ${context.tagline}` : ''}
${context.about ? `About: ${context.about}` : ''}
${context.vision ? `Vision: ${context.vision}` : ''}
${context.mission ? `Mission: ${context.mission}` : ''}
${context.voice ? `Brand Voice: ${context.voice}` : ''}
${eventsContext}

Generate a monthly theme that:
- Aligns with the brand's mission and values
- Creates narrative cohesion for the month's content
- Can be broken down into weekly subplots
- Resonates with the target audience
- Ties into relevant events if applicable

Format as JSON:
{
  "theme": "The theme statement (1-2 sentences)",
  "explanation": "Why this theme works for this brand and month (2-3 sentences)"
}`;

    return { system, user };
  }

  /**
   * Generate Calendar Entry (single day)
   */
  generateCalendarEntryPrompt(context: BrandContext & {
    date: string;
    monthTheme?: string;
    weekFocus?: string;
    character?: any;
    characters?: any[];  // ← ADDED: Accept characters array
    events?: any[];
    channel?: string;
    promptOverride?: string;
    narrativeContext?: {
      brand?: Record<string, any>;
      narrative?: Record<string, any>;
      character?: Record<string, any> | null;
      events?: any[];
      plotBeats?: string[];
    };
    progressionStage?: string;
    previousHooks?: Array<{ date: string; hook: string; channel: string }>;  // ← NEW: Previous hooks for flow
  }): { system: string; user: string } {
    const system = `You are the 'CEO', a project director.

🚨 RULE: Create content that advances the weekly subplot. Stay within the week's story. Choose characters mentioned in the weekly subplot. Make it executable and authentic.`;

    if (context.promptOverride && context.promptOverride.trim().length > 0) {
      return { system, user: context.promptOverride };
    }

    // Character context - show characters available for selection
    let characterContext = '';
    if (context.character) {
      // Single character passed
      const charName = context.character.character_name || context.character.real_name || context.character.name;
      characterContext = `${charName} - ${context.character.role || 'Team member'} (${context.character.voice || context.character.persona || 'authentic voice'})`;
    } else if ((context as any).characters && Array.isArray((context as any).characters)) {
      // Multiple characters passed - let AI choose
      const chars = (context as any).characters;
      characterContext = chars.map((c: any) => {
        const name = c.character_name || c.real_name || c.name;
        return `• ${name} - ${c.role || 'Team member'} (${c.work_mode || 'team'}, ${c.voice || c.persona || 'authentic'})`;
      }).join('\n');
    } else {
      characterContext = 'No cast available - use Brand Voice';
    }

    const eventsContext = context.events && context.events.length > 0
      ? `\n📅 EVENTS TODAY: ${context.events.map((e: any) => `${e.title} - ${e.description || ''}`).join(', ')}`
      : '';

    const progressionStage = context.progressionStage || context.narrativeContext?.narrative?.progressionStage;
    const plotBeats = Array.isArray(context.narrativeContext?.plotBeats) && context.narrativeContext?.plotBeats.length
      ? `\n📖 PLOT BEATS FOR TODAY:\n${context.narrativeContext?.plotBeats.join('\n')}`
      : '';

    // Previous hooks context for flow and avoiding duplicates
    const previousHooksContext = context.previousHooks && context.previousHooks.length > 0
      ? `\n\n🔗 PREVIOUS HOOKS THIS WEEK (DO NOT REPEAT - BUILD ON THESE):\n${context.previousHooks
          .map((h) => `${h.date} [${h.channel}]: "${h.hook}"`)
          .join('\n')}\n\n⚠️ CRITICAL: Today's hook MUST be fresh and different. Build narrative flow but avoid repeating concepts or phrasing.`
      : '';

    const user = `🎬 CREATIVE BRIEF REQUEST

📅 Date: ${context.date}
📢 Channel: ${context.channel || 'Social Media'}
🎯 Monthly Theme: ${context.monthTheme || 'Not set'}
📖 Weekly Subplot: ${context.weekFocus || 'Not set'}${previousHooksContext}

🏢 BRAND
${context.brandName}
${context.buyerProfile ? `Target: ${context.buyerProfile}` : ''}
${context.persona ? `Voice: ${context.persona}` : ''}

🎭 AVAILABLE CAST
${characterContext}

📅 WHAT'S HAPPENING TODAY
${eventsContext || 'Regular day - no special events'}
${plotBeats || ''}

---

🎨 YOUR TASK:

Weekly Subplot: "${context.weekFocus}"

1. **Find today's scene**: What moment from the weekly subplot happens today?
2. **Choose character**: Who from the weekly subplot tells this story?
3. **Format**: ${context.channel} → video/carousel/reel/post
4. **Create**: Specific idea rooted in the weekly subplot

---

📋 OUTPUT (JSON):
{
  "title": "Short internal title (3-5 words)",
  "brief": "The rich creative brief. Describe the ACTUAL content idea. What does the audience see/hear? What's the story? What's the emotional journey? Make this vivid enough that a content creator knows exactly what to produce. 4-6 sentences.",
  "hook": "The opening line/visual that stops the scroll. Make it specific and immediate. (1-2 sentences)",
  "directives": "PRODUCTION EXECUTION GUIDE - Be ultra-specific about WHO does WHAT:

  🚨 MUST INCLUDE:
  - Explicit character names (e.g., 'Josh sits at desk', 'Sarah opens her laptop')
  - Exact content type creation (e.g., 'Josh films a 60-second talking head video', 'Sarah writes a 5-slide carousel')
  - Step-by-step execution (what happens in each scene/section)
  - 🎥 SPECIFY if character APPEARS ON CAMERA vs provides VOICE/NARRATION vs content is ILLUSTRATIVE

  EXAMPLES (CHARACTER-DRIVEN CONTENT):

  VIDEO (ON CAMERA): 'Josh appears on camera in a 90-second talking head video. Opens with Josh at his home office, sitting at desk → Josh turns his screen toward camera showing client dashboard → Josh walks through 3 key metrics while pointing at screen → Josh shares the client's reaction with genuine smile → Josh looks directly at camera for CTA'

  REEL (ON CAMERA): 'Sarah appears on camera for a 30-second Instagram Reel. Opens with Sarah walking into frame holding her phone → Sarah films herself reacting to a notification → Quick cut to Sarah at her laptop showing the dashboard → Sarah does a celebration gesture → Final frame: Sarah pointing at CTA text overlay'

  VIDEO (VOICEOVER): 'Josh provides voiceover narration for a 60-second b-roll video. Josh's voice guides viewers through screen recordings → No talking head, just Josh narrating over visuals → Josh's authentic tone creates connection even without appearing on camera'

  CAROUSEL (WITH CHARACTER): 'Sarah creates a 6-slide Instagram carousel. Slide 1: Photo of Sarah with hook question text overlay → Slides 2-4: Screenshots of transformation with Sarah's photo in corner as commentary → Slide 5: Candid photo of Sarah working on her laptop → Slide 6: Sarah's headshot with CTA'

  BLOG POST: 'Josh writes an 800-word blog post in his authentic voice. Opens with personal story from Josh's early consulting days → Section 1: The problem Josh kept seeing → Section 2: The solution Josh discovered → Section 3: Case study with real client (Josh worked with them directly) → Conclusion: Josh's personal CTA and invitation'

  EXAMPLES (ILLUSTRATIVE/INFOGRAPHIC - NO CHARACTER APPEARANCE):

  INFOGRAPHIC VIDEO: 'Team creates a 45-second animated infographic video. Opens with animated data visualization → Text-driven storytelling with motion graphics → No real people on camera, pure data visualization → Background music only, no voiceover'

  CAROUSEL (GRAPHIC): 'Design team creates a 5-slide data carousel. All slides are illustrated graphics with data visualizations → No photos of team members → Clean, branded design system → Text-based storytelling'

  🎬 HUMANIZE THE BRAND: When possible, show real people (characters) in videos, reels, photos, and candid moments. This builds authentic connection. Reserve illustrative/infographic formats for data-heavy or technical content.

  Make it CONCRETE and CHARACTER-DRIVEN.",
  "cta": "What action do we want? Be specific. (1 sentence)",
  "tone": "Mood/energy of this piece",
  "emotional_angles": ["Primary emotion", "Secondary", "Tertiary"],
  "media_type": "Exact format with specificity:

  CHARACTER-DRIVEN (real people appear):
  - 'VIDEO (ON CAMERA)' - Person appears on camera
  - 'REEL (ON CAMERA)' - Person in Instagram/TikTok short video
  - 'VIDEO (VOICEOVER)' - Person's voice only, b-roll visuals
  - 'CAROUSEL (WITH PHOTOS)' - Includes real photos of team members
  - 'STORY (BEHIND-THE-SCENES)' - Candid moments with real people

  ILLUSTRATIVE (no real people):
  - 'INFOGRAPHIC VIDEO' - Animated data/graphics only
  - 'CAROUSEL (GRAPHIC)' - Designed slides, no photos
  - 'GRAPHIC POST' - Single image design
  - 'ARTICLE' - Long-form text content
  - 'THREAD' - X text thread

  Default to CHARACTER-DRIVEN when possible to humanize the brand.",
  "character_focus": "Who tells this story (use their real name if you picked someone specific, or 'Brand Voice' if it's not character-driven)"
}

🚨 CRITICAL:
- **BRIEF** = The rich creative concept (not a screenplay, not directives - the IDEA)
- **DIRECTIVES** = How to execute it (production notes, shot list, structure)
- Make the CHARACTER choice strategically (who fits THIS story?)
- Be specific about FORMAT and whether it's CHARACTER-DRIVEN or ILLUSTRATIVE
- **MINE THE WEEKLY SUBPLOT**: It contains visual content sparks that tell you which days should have:
  • CHARACTER ON CAMERA (when it mentions "footage," "behind-the-scenes," "moments," "team members")
  • ILLUSTRATIVE (when it mentions "data visualizations," "patterns," "graphics")
- **BLEND THROUGHOUT THE WEEK**: Mix character-driven content (real people appearing) with illustrative content (graphics/data) based on the subplot's storyverse
- **PRIORITIZE CHARACTER-DRIVEN CONTENT**: Show real people (videos, reels, photos, moments) whenever possible to humanize the brand
- Reserve illustrative formats for data-heavy, technical, or when character appearance doesn't serve the story
- Connect to weekly subplot: "${context.weekFocus}"`;

    return { system, user };
  }

  /**
   * Refine Character Field
   */
  refineCharacterFieldPrompt(context: BrandContext & {
    field: string;
    character: any;
    characters: any[];
  }): { system: string; user: string } {
    const system = `You are the 'CEO', an expert in team building and human resources.
Help refine character attributes to create more authentic, distinctive, and strategically valuable brand personas.
Each character should be unique, memorable, and serve a clear purpose in the brand narrative.

🎯 CRITICAL: When generating persona text, ALWAYS use the character's REAL NAME (character_name), not their dramatic role.
Example: Use "Josh" not "The Architect" in the persona narrative itself.`;

    const existingCharacters = context.characters
      .filter((c: any) => c.id !== context.character.id)
      .map((c: any) => {
        const displayName = c.character_name || c.real_name || c.name;
        return `- ${displayName} (${c.name}): ${c.role || 'role not specified'}`;
      })
      .join('\n');

    // Use real name for persona generation
    const characterDisplayName = context.character.character_name || context.character.real_name || context.character.name;
    const dramaticRole = context.character.name;

    const user = `Refine the "${context.field}" field for this character:

Brand: ${context.brandName}
${context.voice ? `Brand Voice: ${context.voice}` : ''}
${context.persona ? `Brand Persona: ${context.persona}` : ''}

Character to Refine:
Real Name: ${characterDisplayName}
Dramatic Role: ${dramaticRole}
Business Role: ${context.character.role || 'not specified'}
Current ${context.field}: ${context.character[context.field] || 'not defined'}

Other Characters (to ensure uniqueness):
${existingCharacters || 'None'}

Provide a refined suggestion that:
- Makes the character more distinctive and memorable
- Aligns with the brand's voice and values
- Differentiates from other characters
- Adds depth and authenticity
- Is practical for content creation
${context.field === 'persona' ? `\n🎯 CRITICAL FOR PERSONA: Write the narrative using "${characterDisplayName}" (their real name), NOT "${dramaticRole}" (their dramatic role). The persona should read naturally with their actual name throughout.` : ''}

Format as JSON:
{
  "suggestion": "The refined ${context.field} value",
  "reasoning": "Why this refinement works (1-2 sentences)"
}`;

    return { system, user };
  }

  /**
   * Chat with Andora
   */
  generateChatPrompt(context: BrandContext & {
    message: string;
    characters?: any[];
    conversationHistory?: Array<{ role: string; content: string }>;
  }): { system: string; user: string } {
    const system = `You are the 'CEO', a business consultant and project management expert.
You help brands develop compelling narratives, authentic characters, and engaging content strategies.
Be conversational, insightful, and actionable. Ask clarifying questions when needed.
Focus on helping the brand tell better stories through character-driven content.`;

    const characterContext = context.characters && context.characters.length > 0
      ? `\n\nBrand Characters:\n${context.characters.map((c: any) => `- ${c.name}: ${c.role || 'Brand persona'}`).join('\n')}`
      : '';

    const historyContext = context.conversationHistory && context.conversationHistory.length > 0
      ? `\n\nConversation History:\n${context.conversationHistory.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n')}`
      : '';

    const user = `Brand Context:
Brand: ${context.brandName}
${context.tagline ? `Tagline: ${context.tagline}` : ''}
${context.vision ? `Vision: ${context.vision}` : ''}
${context.mission ? `Mission: ${context.mission}` : ''}
${context.voice ? `Brand Voice: ${context.voice}` : ''}
${characterContext}
${historyContext}

User Question/Message:
${context.message}

Provide a helpful, actionable response that advances their brand storytelling. Be specific and strategic.`;

    return { system, user };
  }

  /**
   * Build cacheable brand identity context block
   * This is stable context that changes rarely (perfect for caching!)
   *
   * Returns a formatted string suitable for prompt caching
   */
  buildCacheableBrandIdentity(brand: {
    name: string;
    voice: string;
    personality: string[];
    values?: string[];
    archetype?: string;
    buyerProfile?: string;
    narrativeWhy?: string;
    narrativeProblem?: string;
    narrativeSolution?: string;
  }): string {
    const sections: string[] = [];

    // Brand Core Identity
    sections.push(`BRAND IDENTITY:
Brand: ${brand.name}
Voice: ${brand.voice}
Personality: ${brand.personality.join(', ')}
${brand.archetype ? `Archetype: ${brand.archetype}` : ''}
${brand.values && brand.values.length > 0 ? `Values: ${brand.values.join(', ')}` : ''}`);

    // Buyer Profile (The Hero)
    if (brand.buyerProfile) {
      sections.push(`TARGET BUYER PROFILE (The Hero):
${brand.buyerProfile}`);
    }

    // Brand Narrative (Story Foundation)
    if (brand.narrativeWhy || brand.narrativeProblem || brand.narrativeSolution) {
      sections.push(`BRAND STORY FOUNDATION:
${brand.narrativeWhy ? `Why (Story Purpose): ${brand.narrativeWhy}` : ''}
${brand.narrativeProblem ? `Problem (Story Conflict): ${brand.narrativeProblem}` : ''}
${brand.narrativeSolution ? `Solution (Story Resolution): ${brand.narrativeSolution}` : ''}`);
    }

    return sections.join('\n\n');
  }

  /**
   * Build cacheable character context block
   * Character personas are stable and perfect for caching
   */
  buildCacheableCharacterContext(characters: Array<{
    name: string;
    voice: string;
    archetype?: string;
    location?: string;
    workMode?: string;
  }>): string {
    if (!characters || characters.length === 0) {
      return '';
    }

    const characterBlocks = characters.map(char => `
${char.name}:
Voice: ${char.voice}
${char.archetype ? `Archetype: ${char.archetype}` : ''}
${char.location ? `Location: ${char.location}` : ''}
${char.workMode ? `Work Mode: ${char.workMode}` : ''}
    `.trim()).join('\n\n');

    return `BRAND CAST (Characters):\n${characterBlocks}`;
  }

  /**
   * Build cacheable monthly theme context
   * Monthly themes are stable for the entire month
   */
  buildCacheableMonthlyTheme(theme: {
    title: string;
    description: string;
    month?: number;
    year?: number;
  }): string {
    return `MONTHLY THEME (Story Season):
${theme.month && theme.year ? `Month: ${theme.month}/${theme.year}` : ''}
Theme: "${theme.title}"
Description: ${theme.description}`;
  }
}

// Singleton instance
export const promptEngine = new PromptEngine();
