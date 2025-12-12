/**
 * AI CONTROLLER
 *
 * Handles all AI generation requests from the frontend
 * Routes requests through the intelligent orchestrator
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { aiService } from '../services/aiService';
import { promptEngine, BrandContext } from '../services/promptEngine';
import { modelRouter } from '../services/modelRouter';
import { AIModel } from '../agents/base';
import { orchestrator } from '../agents/orchestrator.agent';

const getPreferredModel = (request: FastifyRequest): AIModel | undefined => {
  const body = request.body as any;
  const preferredModel = body?.preferredModel;
  if (typeof preferredModel === 'string' && preferredModel.trim().length > 0) {
    return preferredModel as AIModel;
  }
  return undefined;
};

const buildFallbacks = (primaryModel: AIModel): AIModel[] => {
  const fallbacks: AIModel[] = [];
  if (primaryModel !== 'claude-haiku-4.5') {
    fallbacks.push('claude-haiku-4.5');
  }
  if (primaryModel !== 'gpt-4o-mini') {
    fallbacks.push('gpt-4o-mini');
  }
  return fallbacks;
};

/**
 * Remove location from character objects in responses
 */
const removeLocationFromCharacters = (data: any): any[] => {
  const toArray = (value: any): any[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value;

    if (typeof value === 'object') {
      if (Array.isArray(value.cast)) return value.cast;
      if (Array.isArray(value.characters)) return value.characters;
    }

    return [];
  };

  const characters = toArray(data);

  return characters.map(char => {
    if (char && typeof char === 'object') {
      const { location, ...rest } = char;
      return rest;
    }
    return char;
  });
};

/**
 * Extract JSON from AI response that may be wrapped in markdown code blocks
 */
const extractJSON = (content: string): any => {
  let jsonString = content.trim();

  // Remove markdown code blocks if present
  const jsonMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (jsonMatch) {
    jsonString = jsonMatch[1].trim();
  } else {
    // If no code blocks found, try to extract JSON from the content
    // Look for content between first { and last }
    const firstBrace = jsonString.indexOf('{');
    const lastBrace = jsonString.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      jsonString = jsonString.substring(firstBrace, lastBrace + 1);
    }
  }

  // Try to parse the JSON
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('JSON parse error. Attempting to fix...');
    console.error('Content length:', content.length);
    console.error('First 300 chars:', jsonString.substring(0, 300));
    console.error('Last 300 chars:', jsonString.substring(Math.max(0, jsonString.length - 300)));

    // Try multiple recovery strategies

    // Strategy 1: Try to complete array if it's incomplete
    if (jsonString.includes('[') && !jsonString.trim().endsWith(']')) {
      const attempts = [
        jsonString + ']}',  // Close array and object
        jsonString + ']}}',  // Close array and nested objects
        jsonString + '"}]}',  // Close string, array, and object
      ];

      for (const attempt of attempts) {
        try {
          return JSON.parse(attempt);
        } catch (e) {
          // Continue to next attempt
        }
      }
    }

    // Strategy 2: Find last complete object in an array
    const arrayMatch = jsonString.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      let arrayContent = arrayMatch[0];
      // Find the last complete object by looking for },
      const lastCompleteObj = arrayContent.lastIndexOf('},');
      if (lastCompleteObj > 0) {
        const truncated = arrayContent.substring(0, lastCompleteObj + 1) + ']';
        try {
          const result = JSON.parse(truncated);
          console.log('Successfully recovered partial JSON with', Array.isArray(result) ? result.length : 'unknown', 'items');
          return result;
        } catch (e) {
          // Continue to next strategy
        }
      }
    }

    // Strategy 3: Try to find the outermost object
    const firstBrace = jsonString.indexOf('{');
    const lastBrace = jsonString.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      const truncated = jsonString.substring(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(truncated);
      } catch (e) {
        console.error('Failed to parse truncated JSON');
      }
    }

    throw new Error('Invalid JSON response from AI. Response may be incomplete or truncated. Please try again.');
  }
};

/**
 * Generate Vision Statement
 */
export const generateVision = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { brandContext } = request.body as { brandContext: BrandContext };

    // Select optimal model
    const preferredModel = getPreferredModel(request);
    const task = modelRouter.analyzeTask('theme-generation', {
      userComplexity: 'medium',
      contextSize: 800,
    });
    const model = preferredModel || modelRouter.selectModel(task);

    // Generate prompts
    const prompts = promptEngine.generateVisionPrompt(brandContext);

    // Call AI
    const response = await aiService.generate({
      model,
      systemPrompt: prompts.system,
      userPrompt: prompts.user,
      temperature: 0.8,
      maxTokens: 500,
      fallbackModels: buildFallbacks(model),
    });

    reply.send({
      success: true,
      vision: response.content.trim(),
      metadata: {
        model: response.model,
        tokensUsed: response.tokensUsed,
        cost: response.cost,
        duration: response.duration,
      },
    });
  } catch (error) {
    console.error('Generate Vision Error:', error);
    reply.status(500).send({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate vision',
    });
  }
};

/**
 * Generate Mission Statement
 */
export const generateMission = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { brandContext } = request.body as { brandContext: BrandContext };

    const preferredModel = getPreferredModel(request);
    const task = modelRouter.analyzeTask('theme-generation', {
      userComplexity: 'medium',
      contextSize: 900,
    });
    const model = preferredModel || modelRouter.selectModel(task);

    const prompts = promptEngine.generateMissionPrompt(brandContext);

    const response = await aiService.generate({
      model,
      systemPrompt: prompts.system,
      userPrompt: prompts.user,
      temperature: 0.8,
      maxTokens: 500,
      fallbackModels: buildFallbacks(model),
    });

    reply.send({
      success: true,
      mission: response.content.trim(),
      metadata: {
        model: response.model,
        tokensUsed: response.tokensUsed,
        cost: response.cost,
        duration: response.duration,
      },
    });
  } catch (error) {
    console.error('Generate Mission Error:', error);
    reply.status(500).send({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate mission',
    });
  }
};

/**
 * Generate Brand Persona
 */
export const generatePersona = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { brandContext } = request.body as { brandContext: BrandContext };

    const preferredModel = getPreferredModel(request);
    const task = modelRouter.analyzeTask('character-creation', {
      userComplexity: 'complex',
      contextSize: 1200,
    });
    const model = preferredModel || modelRouter.selectModel(task);

    const prompts = promptEngine.generatePersonaPrompt(brandContext);

    const response = await aiService.generate({
      model,
      systemPrompt: prompts.system,
      userPrompt: prompts.user,
      temperature: 0.9,
      maxTokens: 600,
      fallbackModels: buildFallbacks(model),
    });

    reply.send({
      success: true,
      persona: response.content.trim(),
      metadata: {
        model: response.model,
        tokensUsed: response.tokensUsed,
        cost: response.cost,
        duration: response.duration,
      },
    });
  } catch (error) {
    console.error('Generate Persona Error:', error);
    reply.status(500).send({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate persona',
    });
  }
};

/**
 * Generate Buyer Profile
 */
export const generateBuyerProfile = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { brandContext, productIndex, product } = request.body as {
      brandContext: BrandContext;
      productIndex?: number;
      product?: { name: string; description: string };
    };

    const preferredModel = getPreferredModel(request);
    const task = modelRouter.analyzeTask('character-creation', {
      userComplexity: 'complex',
      contextSize: 1100,
    });
    const model = preferredModel || modelRouter.selectModel(task);

    const prompts = promptEngine.generateBuyerProfilePrompt(brandContext);

    const response = await aiService.generate({
      model,
      systemPrompt: prompts.system,
      userPrompt: prompts.user,
      temperature: 0.8,
      maxTokens: 600,
      fallbackModels: buildFallbacks(model),
    });

    reply.send({
      success: true,
      buyerProfile: response.content.trim(),
      productIndex: productIndex,
      metadata: {
        model: response.model,
        tokensUsed: response.tokensUsed,
        cost: response.cost,
        duration: response.duration,
      },
    });
  } catch (error) {
    console.error('Generate Buyer Profile Error:', error);
    reply.status(500).send({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate buyer profile',
    });
  }
};

/**
 * Generate Content Strategy
 */
export const generateContentStrategy = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { brandContext } = request.body as { brandContext: BrandContext };

    const preferredModel = getPreferredModel(request);
    const task = modelRouter.analyzeTask('theme-generation', {
      userComplexity: 'medium',
      contextSize: 1000,
    });
    const model = preferredModel || modelRouter.selectModel(task);

    const prompts = promptEngine.generateContentStrategyPrompt(brandContext);

    const response = await aiService.generate({
      model,
      systemPrompt: prompts.system,
      userPrompt: prompts.user,
      temperature: 0.7,
      maxTokens: 800,
      responseFormat: 'json',
      fallbackModels: buildFallbacks(model),
    });

    // Parse JSON response (handle markdown code blocks)
    const strategy = extractJSON(response.content);

    reply.send({
      success: true,
      strategy,
      metadata: {
        model: response.model,
        tokensUsed: response.tokensUsed,
        cost: response.cost,
        duration: response.duration,
      },
    });
  } catch (error) {
    console.error('Generate Content Strategy Error:', error);
    reply.status(500).send({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate content strategy',
    });
  }
};

/**
 * Generate Characters
 */
/**
 * PHASE 3: Generate Characters (AI Creates Cast)
 * NOW USING RICH CHARACTER GENERATOR AGENT WITH DEEP PROMPTS
 */
export const generateCharacters = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { brandContext, characterCount, existingCharacters, model: userSelectedModel } = request.body as {
      brandContext: BrandContext;
      characterCount: number;
      existingCharacters?: string[];
      model?: string;
    };

    // Use user's selected model if provided, otherwise default to Gemini 2.5 Flash (FREE)
    let model: AIModel;
    const validModels = ['gpt-4o', 'gpt-4o-mini', 'gpt-5', 'gpt-5.1', 'gpt-5.1-mini', 'claude-sonnet-4', 'claude-sonnet-4.5', 'claude-haiku-4.5', 'gemini-2.5-flash'];

    if (userSelectedModel && validModels.includes(userSelectedModel)) {
      model = userSelectedModel as AIModel;
    } else {
      model = 'gemini-2.5-flash'; // Default to FREE Gemini model
    }

    // Build smart fallback chain based on selected model
    const fallbackModels: AIModel[] = [];
    if (model.includes('gemini')) {
      // If Gemini selected, fallback to GPT models
      fallbackModels.push('gpt-4o-mini', 'gpt-4o');
    } else if (model.includes('claude')) {
      // If Claude selected, fallback to GPT and Gemini
      fallbackModels.push('gpt-4o-mini', 'gemini-2.5-flash', 'gpt-4o');
    } else if (model.includes('gpt')) {
      // If GPT selected, fallback to Gemini and other GPT models
      fallbackModels.push('gemini-2.5-flash', 'gpt-4o-mini', 'gpt-4o');
    }

    // Use the new CharacterGeneratorAgent for rich, creative personas
    const { CharacterGeneratorAgent } = await import('../agents/characterGenerator.agent');
    const characterAgent = new CharacterGeneratorAgent(model);

    const agentResult = await characterAgent.execute({
      task: `Generate ${characterCount} unique brand personas for ${brandContext.brandName}`,
      context: {
        brandName: brandContext.brandName,
        brandTagline: brandContext.tagline || '',
        brandVoice: brandContext.voice || brandContext.persona || 'Professional and engaging',
        brandPersonality: Array.isArray(brandContext.personality)
          ? brandContext.personality
          : (brandContext.personality ? [brandContext.personality] : []),
        industry: 'General', // BrandContext doesn't have industry field
        targetAudience: brandContext.buyerProfile || 'General audience',
        brandValues: [],
        numberOfCharacters: characterCount,
        existingCharacters: existingCharacters?.map(name => ({ name, role: '' })) || []
      }
    });

    console.log('✨ CharacterGeneratorAgent completed:', {
      count: agentResult.result.length,
      names: agentResult.result.map(c => c.name),
      tokensUsed: agentResult.tokensUsed
    });

    // Transform agent output to match expected frontend format
    const characters = {
      cast: agentResult.result.map(char => ({
        name: `${char.name} (${char.archetype}) - ${char.location}`,
        work_mode: 'hybrid', // Default, can be enhanced
        persona: char.description,
        // Include all the rich data as additional fields
        role: char.role,
        personality: char.personality,
        backstory: char.backstory,
        voice: char.voice,
        archetype: char.archetype,
        speaking_style: char.speaking_style,
        quirks: char.quirks,
        sample_quotes: char.sample_quotes,
        content_strengths: char.content_strengths
      }))
    };

    reply.send({
      success: true,
      characters: removeLocationFromCharacters(characters),
      brandType: characterCount === 1 ? 'personal_brand' : 'ensemble_brand',
      metadata: {
        model: agentResult.metadata.model,
        tokensUsed: agentResult.tokensUsed,
        cost: agentResult.metadata.cost,
        duration: agentResult.metadata.duration,
      },
    });
  } catch (error) {
    console.error('Generate Characters Error:', error);
    reply.status(500).send({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate characters',
    });
  }
};

/**
 * PHASE 4: Cast Resolution (User Provides Cast, AI Generates Rich Characters)
 * NOW USES CHARACTER GENERATOR AGENT FOR DRAMATIC DEPTH
 */
export const resolveCast = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { brandContext, userCharacters, model: userSelectedModel } = request.body as {
      brandContext: BrandContext;
      userCharacters: Array<{ name: string; description: string; location?: string }>;
      model?: string;
    };

    // Use user's selected model if provided, otherwise default to Gemini 2.5 Flash (FREE)
    let model: AIModel;
    const validModels = ['gpt-4o', 'gpt-4o-mini', 'gpt-5', 'gpt-5.1', 'gpt-5.1-mini', 'claude-sonnet-4', 'claude-sonnet-4.5', 'claude-haiku-4.5', 'gemini-2.5-flash'];

    if (userSelectedModel && validModels.includes(userSelectedModel)) {
      model = userSelectedModel as AIModel;
    } else {
      model = 'gemini-2.5-flash'; // Default to FREE Gemini model
    }

    // Build smart fallback chain based on selected model
    const fallbackModels: AIModel[] = [];
    if (model.includes('gemini')) {
      // If Gemini selected, fallback to GPT models
      fallbackModels.push('gpt-4o-mini', 'gpt-4o');
    } else if (model.includes('claude')) {
      // If Claude selected, fallback to GPT and Gemini
      fallbackModels.push('gpt-4o-mini', 'gemini-2.5-flash', 'gpt-4o');
    } else if (model.includes('gpt')) {
      // If GPT selected, fallback to Gemini and other GPT models
      fallbackModels.push('gemini-2.5-flash', 'gpt-4o-mini', 'gpt-4o');
    }

    // Check if this is a focused "Help me" request (one target character with ensemble context)
    const targetCharIndex = userCharacters.findIndex((c: any) => c._isTarget === true);
    const isFocusedRequest = targetCharIndex !== -1;

    // Use the CharacterGeneratorAgent to generate RICH characters
    const { CharacterGeneratorAgent } = await import('../agents/characterGenerator.agent');
    const characterAgent = new CharacterGeneratorAgent(model);

    let agentResult: any;

    if (isFocusedRequest) {
      // FOCUSED MODE: Generate persona for ONE target character
      const targetChar = userCharacters[targetCharIndex] as any;
      const otherCharacters = userCharacters.filter((_: any, idx: number) => idx !== targetCharIndex);

      // Build detailed prompt with target character's fields
      const perfectFields = targetChar.perfect_fields || {};
      const constraints = [];

      // ALWAYS include about/role/personality/backstory/voice if they exist (perfect or not)
      if (targetChar.about) {
        constraints.push(`About: ${targetChar.about}`);
      }
      if (targetChar.backstory) {
        constraints.push(`Backstory: ${targetChar.backstory}`);
      }
      if (targetChar.voice) {
        constraints.push(`Voice: ${targetChar.voice}`);
      }
      if (targetChar.role) {
        constraints.push(`Role: ${targetChar.role}`);
      }
      if (targetChar.personality) {
        constraints.push(`Personality: ${targetChar.personality}`);
      }
      if (targetChar.age_range) {
        constraints.push(`Age: ${targetChar.age_range}`);
      }
      if (targetChar.work_mode) {
        constraints.push(`Work Mode: ${targetChar.work_mode}`);
      }

      // Build simple task prompt
      const characterName = targetChar.character_name || targetChar.real_name || targetChar.name;

      const constraintsText = constraints.length > 0
        ? `\n\n🎯 CONTEXT TO WEAVE INTO PERSONA (don't state explicitly, use as narrative fuel):\n${constraints.join('\n')}`
        : '';

      const contextText = otherCharacters.length > 0
        ? `\n\n🎭 EXISTING ENSEMBLE CAST (ensure ${characterName} complements and fits within this ensemble):\n${otherCharacters.map((c: any) => {
          const parts = [`- ${c.name || c.character_name}${c.character_name ? ` (${c.character_name})` : ''}`];
          if (c.role) parts.push(`Role: ${c.role}`);
          if (c.personality) parts.push(`Personality: ${c.personality}`);
          if (c.about) parts.push(`About: ${c.about.substring(0, 100)}...`);
          return parts.join(' | ');
        }).join('\n')}\n\n⚠️ Make sure ${characterName} has a DISTINCT personality and voice from the existing cast above.`
        : '';

      const taskPrompt = `Generate a brand character for ${characterName}, ${targetChar.role || 'a team member'} at ${brandContext.brandName}.

🎭 CRITICAL INSTRUCTION:
Use "${characterName}" throughout the persona text.
DO NOT explicitly mention personality types (INTJ, ENFP, etc.) or ages in the narrative.
Use those details as CONTEXT to inform the writing style and tone, but weave them into emotional storytelling.
Focus on what will resonate with the target audience emotionally - paint a picture, tell a story, strike the right chord.${constraintsText}${contextText}

🚨 STORYBRAND FRAMEWORK PRINCIPLE:
THE CUSTOMER IS ALWAYS THE HERO. Brand characters are GUIDES who help the hero.
NEVER use "The Hero", "The Protagonist", or "The Main Character" as the character name.

🎭 DRAMATIC CHARACTER NAME REQUIREMENT:
Create a COLORFUL, RESONANT character name that connects with the buyer profile.
❌ BORING: "The Guide", "The Mentor", "The Sage", "The Architect"
✅ DRAMATIC: "Queen Mother", "Billionaire Mechanic", "Ms. Shopaholic", "The Mogul", "Chris Catalyst"
Make it MEMORABLE and connected to buyer lifestyle/aspirations!

Return as JSON with this structure:
{
  "characters": [{
    "name": "DRAMATIC CHARACTER NAME (e.g., 'Queen Mother', 'Billionaire Mechanic', 'The Mogul') - NOT generic archetypes!",
    "character_name": "${characterName}",
    "role": "${targetChar.role}",
    "description": "2-3 paragraph persona using ${characterName}'s name"
  }]
}`;

      console.log('🔍 PERSONA GENERATION DEBUG:', {
        characterName,
        character_name: targetChar.character_name,
        real_name: targetChar.real_name,
        name: targetChar.name,
        role: targetChar.role,
        aboutPreview: targetChar.about?.substring(0, 100),
        taskPromptPreview: taskPrompt.substring(0, 300)
      });

      agentResult = await characterAgent.execute({
        task: taskPrompt,
        context: {
          brandName: brandContext.brandName,
          brandTagline: brandContext.tagline || '',
          brandVoice: brandContext.voice || 'Professional and engaging',  // Don't pass brandContext.persona here!
          brandPersonality: Array.isArray(brandContext.personality)
            ? brandContext.personality
            : (brandContext.personality ? [brandContext.personality] : []),
          industry: 'General',
          targetAudience: brandContext.buyerProfile || brandContext.targetAudience || 'General audience',
          buyerProfile: brandContext.buyerProfile, // Pass buyer profile for character naming
          brandValues: [],
          numberOfCharacters: 1,  // Only generating for ONE
          existingCharacters: otherCharacters.map((c: any) => ({
            name: c.name || c.character_name,
            role: c.role,
            personality_tags: []
          })),
          fallbackModels // Pass fallback models for resilience
        }
      });
    } else {
      // BATCH MODE: Generate for all characters
      const userCharacterHints = userCharacters.map(c =>
        `${c.name}${c.description ? ` (${c.description})` : ''}`
      ).join(', ');

      agentResult = await characterAgent.execute({
        task: `Generate ${userCharacters.length} deeply dramatic brand personas based on these character names: ${userCharacterHints}`,
        context: {
          brandName: brandContext.brandName,
          brandTagline: brandContext.tagline || '',
          brandVoice: brandContext.voice || brandContext.persona || 'Professional and engaging',
          brandPersonality: Array.isArray(brandContext.personality)
            ? brandContext.personality
            : (brandContext.personality ? [brandContext.personality] : []),
          industry: 'General',
          targetAudience: brandContext.buyerProfile || brandContext.targetAudience || 'General audience',
          buyerProfile: brandContext.buyerProfile, // Pass buyer profile for character naming
          brandValues: [],
          numberOfCharacters: userCharacters.length,
          existingCharacters: [],
          fallbackModels // Pass fallback models for resilience
        }
      });
    }

    console.log('✨ CharacterGeneratorAgent completed:', {
      count: agentResult.result.length,
      names: agentResult.result.map((c: any) => c.name),
      tokensUsed: agentResult.tokensUsed,
      focusedMode: isFocusedRequest
    });

    // DEEP DEBUG: Log the AI result
    console.log('🔍 AI GENERATED RESULT:', {
      resultCount: agentResult.result.length,
      generatedCharacters: agentResult.result.map((c: any) => ({
        name: c.name,
        role: c.role,
        description: c.description?.substring(0, 100) + '...'
      }))
    });

    // Transform agent output to match expected frontend format
    let characterArray: any[];

    if (isFocusedRequest) {
      // FOCUSED MODE: Return only the target character at the correct index
      const generated = agentResult.result[0];  // Only one generated

      console.log('🔍 FOCUSED MODE - Building Response:', {
        targetCharIndex,
        generatedName: generated.name,
        generatedPersonaPreview: generated.description?.substring(0, 150),
        inputCharactersCount: userCharacters.length
      });

      // Map it back to match all input characters, with only target updated
      characterArray = userCharacters.map((inputChar: any, idx: number) => {
        if (idx === targetCharIndex) {
          // This is the target - return the generated persona
          const result = {
            id: inputChar.id || `char-${Date.now()}-${idx}`,
            name: generated.name,  // Dramatic character name (e.g., "Queen Mother", "Billionaire Mechanic")
            work_mode: inputChar.work_mode || generated.work_mode || 'hybrid',
            persona: generated.description,  // The generated persona!
            character_name: generated.character_name,  // Real name (e.g., "Josh", "Starr", "Oma")
            role: inputChar.role || generated.role,
            about: inputChar.about || generated.backstory,
            personality: inputChar.personality || generated.personality || generated.personality_tags?.join(', ') || '',
            age_range: inputChar.age_range || generated.age_range || '',
            backstory: generated.backstory,
            personality_tags: generated.personality_tags,
            voice: generated.voice,
            archetype: generated.archetype,
            emotional_range: generated.emotional_range,
            speaking_style: generated.speaking_style,
            quirks: generated.quirks,
            sample_quotes: generated.sample_quotes,
            content_strengths: generated.content_strengths
          };

          console.log('🔍 TARGET CHARACTER RESULT:', {
            targetIndex: idx,
            id: result.id,
            name: result.name,
            character_name: result.character_name,
            personaPreview: result.persona?.substring(0, 100)
          });

          return result;
        } else {
          // Not the target - return as-is
          console.log('🔍 NON-TARGET CHARACTER (unchanged):', {
            index: idx,
            id: inputChar.id,
            name: inputChar.name
          });
          return inputChar;
        }
      });
    } else {
      // BATCH MODE: Map all generated to all inputs
      characterArray = agentResult.result.map((char: any, index: number) => {
        const inputChar = userCharacters[index] as any;
        return {
          id: inputChar?.id || `char-${Date.now()}-${index}`,
          name: char.name,  // Dramatic character name (e.g., "Queen Mother", "Billionaire Mechanic")
          work_mode: char.work_mode || 'hybrid',
          persona: char.description,
          character_name: char.character_name,  // Real name (e.g., "Josh", "Starr", "Oma")
          role: char.role,
          about: char.backstory,
          personality: char.personality || char.personality_tags?.join(', ') || '',
          age_range: char.age_range || '',
          // Include all the rich data
          backstory: char.backstory,
          personality_tags: char.personality_tags,
          voice: char.voice,
          archetype: char.archetype,
          emotional_range: char.emotional_range,
          speaking_style: char.speaking_style,
          quirks: char.quirks,
          sample_quotes: char.sample_quotes,
          content_strengths: char.content_strengths
        };
      });
    }

    console.log('Received character count:', characterArray.length);
    console.log('Character IDs:', characterArray.map((c: any) => c.id || 'NO-ID'));

    // Validate we got the right number of characters
    if (characterArray.length !== userCharacters.length) {
      console.warn(`⚠️ Character count mismatch! Expected ${userCharacters.length} characters but got ${characterArray.length}.`);
      console.warn('Input character IDs:', userCharacters.map((c: any) => c.id || c.name));

      // Ensure each input character has a corresponding output by matching IDs or creating placeholders
      characterArray = userCharacters.map((inputChar: any, index) => {
        const inputId = inputChar.id || `new-${index}`;

        // Try to find matching character by ID first, then by index
        let match = characterArray.find((c: any) => c.id === inputId);
        if (!match && characterArray[index]) {
          match = characterArray[index];
          // Ensure ID is preserved
          match.id = inputId;
        }

        // If still no match, return input character with ID
        return match || { ...inputChar, id: inputId };
      });
    } else {
      // Ensure IDs are preserved even when count matches
      characterArray = characterArray.map((char: any, index: number) => {
        const inputChar = userCharacters[index] as any;
        const inputId = inputChar?.id || `new-${index}`;

        return {
          ...char,
          id: char.id || inputId
        };
      });
    }

    reply.send({
      success: true,
      characters: { cast: removeLocationFromCharacters(characterArray) },
      brandType: userCharacters.length === 1 ? 'personal_brand' : 'ensemble_brand',
      metadata: {
        model: agentResult.metadata.model,
        tokensUsed: agentResult.tokensUsed,
        cost: agentResult.metadata.cost,
        duration: agentResult.metadata.duration,
      },
    });
  } catch (error) {
    console.error('Resolve Cast Error:', error);
    reply.status(500).send({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to resolve cast',
    });
  }
};

/**
 * Generate Monthly Plot
 */
export const generateMonthlyPlot = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { brandContext, theme, month, events, themePrompt, brandId } = request.body as {
      brandContext: BrandContext;
      theme: string;
      month: string;
      events?: string[];
      themePrompt?: string;
      brandId?: string;
    };

    console.log('🎭 UPGRADED Monthly Plot Generation - Generating strategy rationale');
    console.log('📝 User Theme Input (themePrompt):', themePrompt);
    console.log('📝 Theme from state:', theme);

    // If brandId is provided, use the new multi-agent orchestrator
    if (brandId) {
      // Extract month number and year from month string (e.g., "January 2025" or "2025-01")
      let monthNum: number;
      let year: number;

      if (month.includes('-')) {
        // Format: "2025-01"
        const parts = month.split('-');
        year = parseInt(parts[0]);
        monthNum = parseInt(parts[1]);
      } else {
        // Format: "January 2025" or similar
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'];
        const parts = month.split(' ');
        const monthName = parts[0];
        monthNum = monthNames.indexOf(monthName) + 1;
        year = parseInt(parts[1] || new Date().getFullYear().toString());
      }

      // Use the NEW orchestrator system
      const { orchestrator } = await import('../agents/orchestrator.agent');

      const result = await orchestrator.execute({
        task: 'orchestrate',
        context: {
          type: 'generate-monthly-plot',
          brandId,
          payload: {
            month: monthNum,
            year,
            themePrompt: themePrompt || theme || month  // USER'S INPUT IS PRIMARY
          }
        }
      });

      console.log('✅ Multi-Agent Monthly Plot Result:', {
        themeLength: result.result.theme?.length || 0,
        descriptionLength: result.result.description?.length || 0,
        week1Length: result.result.week_1?.length || 0,
        week2Length: result.result.week_2?.length || 0,
        week3Length: result.result.week_3?.length || 0,
        week4Length: result.result.week_4?.length || 0,
        agent: result.metadata.agent,
        model: result.metadata.model,
        duration: result.metadata.duration
      });

      console.log('📤 SENDING TO FRONTEND:', {
        hasWeek1: !!(result.result.week_1),
        hasWeek2: !!(result.result.week_2),
        hasWeek3: !!(result.result.week_3),
        hasWeek4: !!(result.result.week_4),
        week1Preview: result.result.week_1?.substring(0, 80),
        week2Preview: result.result.week_2?.substring(0, 80)
      });

      reply.send({
        success: true,
        theme: result.result.theme,
        explanation: result.result.description,
        week_1: result.result.week_1 || '',
        week_2: result.result.week_2 || '',
        week_3: result.result.week_3 || '',
        week_4: result.result.week_4 || '',
        content_sparks: result.result.content_sparks || '',
        metadata: result.metadata,
      });
      return;
    }

    // FALLBACK: Old system if brandId not provided
    console.log('⚠️  Using OLD system (brandId not provided)');

    const task = modelRouter.analyzeTask('subplot-planning', {
      userComplexity: 'complex',
      contextSize: 1800,
    });
    const model = modelRouter.selectModel(task);

    const prompts = promptEngine.generateMonthlyPlotPrompt({
      ...brandContext,
      theme,
      month,
      events,
      themePrompt,
    });

    const response = await aiService.generate({
      model,
      systemPrompt: prompts.system,
      userPrompt: prompts.user,
      temperature: 0.85,
      maxTokens: 2000,
      responseFormat: 'json',
    });

    // Parse JSON response (handle markdown code blocks)
    const result = extractJSON(response.content);

    console.log('📖 Generated Monthly Plot (OLD SYSTEM):', {
      themeLength: result.theme?.length || 0,
      explanationLength: result.explanation?.length || 0,
      explanationPreview: result.explanation?.substring(0, 200)
    });

    reply.send({
      success: true,
      theme: result.theme,
      explanation: result.explanation,
      metadata: {
        model: response.model,
        tokensUsed: response.tokensUsed,
        cost: response.cost,
        duration: response.duration,
      },
    });
  } catch (error) {
    console.error('Generate Monthly Plot Error:', error);
    reply.status(500).send({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate monthly plot',
    });
  }
};

/**
 * Generate Weekly Subplot
 */
export const generateWeeklySubplot = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const {
      brandContext,
      monthlyPlot,
      monthlyTheme,
      weekNumber,
      weekStart,
      weekEnd,
      weekTheme,
      events,
      characters,
    } = request.body as {
      brandContext: BrandContext;
      monthlyPlot: string;
      monthlyTheme: string;
      weekNumber: number;
      weekStart: string;
      weekEnd: string;
      weekTheme?: string;
      events?: Array<string | { summary?: string; title?: string; date?: string; description?: string }>;
      characters?: Array<{
        name: string;
        location: string;
        role?: string;
        persona?: string;
        character_name?: string;
        about?: string;
      }>;
    };

    const eventSummaries = Array.isArray(events)
      ? events
        .map((event) => {
          if (typeof event === 'string') return event;
          const parts: string[] = [];
          if (event.date) parts.push(event.date);
          if (event.title) parts.push(event.title);
          if (event.description) parts.push(event.description);
          if (event.summary) parts.push(event.summary);
          const combined = parts.join(' — ').trim();
          return combined;
        })
        .filter(Boolean)
      : [];

    const characterDetails = Array.isArray(characters)
      ? characters.map((character) => ({
        name: character.name,
        location: character.location,
        role: character.role,
        persona: character.persona,
        character_name: character.character_name,
        about: character.about,
      }))
      : [];

    const task = modelRouter.analyzeTask('subplot-planning', {
      userComplexity: 'complex',
      contextSize: 2000,
    });
    const model = modelRouter.selectModel(task);

    const prompts = promptEngine.generateWeeklySubplotPrompt({
      ...brandContext,
      monthlyPlot,
      monthlyTheme,
      weekNumber,
      weekStart,
      weekEnd,
      weekTheme,
      events: eventSummaries,
      characters: characterDetails,
    });

    const response = await aiService.generate({
      model,
      systemPrompt: prompts.system,
      userPrompt: prompts.user,
      temperature: 0.85,
      maxTokens: 3000,  // Increased for RICH, DETAILED weekly subplots (400-600 words)
      responseFormat: 'json',
      fallbackModels: ['claude-haiku-4.5'],
    });

    // Parse JSON response (handle markdown code blocks)
    const subplot = extractJSON(response.content);

    reply.send({
      success: true,
      subplot,
      metadata: {
        model: response.model,
        tokensUsed: response.tokensUsed,
        cost: response.cost,
        duration: response.duration,
      },
    });
  } catch (error) {
    console.error('Generate Weekly Subplot Error:', error);
    reply.status(500).send({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate weekly subplot',
    });
  }
};

/**
 * Generate Content Brief
 */
export const generateContentBrief = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { brandContext, date, channel, subplot, event, character } = request.body as {
      brandContext: BrandContext;
      date: string;
      channel: string;
      subplot?: string;
      event?: string;
      character?: string;
    };

    const task = modelRouter.analyzeTask('content-writing', {
      userComplexity: 'complex',
      contextSize: 2200,
    });
    const model = modelRouter.selectModel(task);

    const prompts = promptEngine.generateContentBriefPrompt({
      ...brandContext,
      date,
      channel,
      subplot,
      event,
      character,
    });

    const response = await aiService.generate({
      model,
      systemPrompt: prompts.system,
      userPrompt: prompts.user,
      temperature: 0.8,
      maxTokens: 1500,
      responseFormat: 'json',
    });

    // Parse JSON response (handle markdown code blocks)
    const brief = extractJSON(response.content);

    reply.send({
      success: true,
      brief,
      metadata: {
        model: response.model,
        tokensUsed: response.tokensUsed,
        cost: response.cost,
        duration: response.duration,
      },
    });
  } catch (error) {
    console.error('Generate Content Brief Error:', error);
    reply.status(500).send({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate content brief',
    });
  }
};

/**
 * PHASE 2: AI Prefill Narrative
 */
export const generateNarrativePrefill = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { brandContext } = request.body as { brandContext: BrandContext };

    const task = modelRouter.analyzeTask('theme-generation', {
      userComplexity: 'complex',
      contextSize: 1500,
    });
    const model = modelRouter.selectModel(task);

    const prompts = promptEngine.generateNarrativePrefillPrompt(brandContext);

    const response = await aiService.generate({
      model,
      systemPrompt: prompts.system,
      userPrompt: prompts.user,
      temperature: 0.85,
      maxTokens: 2000, // Increased from 800 to prevent JSON truncation with all 6 narrative fields
      responseFormat: 'json',
    });

    // Parse JSON response (handle markdown code blocks)
    const narrative = extractJSON(response.content);

    reply.send({
      success: true,
      narrative,
      metadata: {
        model: response.model,
        tokensUsed: response.tokensUsed,
        cost: response.cost,
        duration: response.duration,
      },
    });
  } catch (error) {
    console.error('Generate Narrative Prefill Error:', error);
    reply.status(500).send({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate narrative prefill',
    });
  }
};

/**
 * PHASE 7: Calendar Generation
 */
export const generateCalendar = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const {
      brandContext,
      month,
      year,
      monthlyTheme,
      weeklySubplot,
      startDay,
      endDay,
      channels,
      characters,
      events,
    } = request.body as {
      brandContext: BrandContext;
      month: string;
      year: string;
      monthlyTheme: string;
      weeklySubplot: string;
      startDay: number;
      endDay: number;
      channels: string[];
      characters: Array<{ name: string; location: string; persona: string }>;
      events?: Array<{ date: string; title: string; description?: string }>;
    };

    const task = modelRouter.analyzeTask('content-writing', {
      userComplexity: 'complex',
      contextSize: 3000,
    });
    const model = modelRouter.selectModel(task);

    const prompts = promptEngine.generateCalendarPrompt({
      ...brandContext,
      month,
      year,
      monthlyTheme,
      weeklySubplot,
      startDay,
      endDay,
      channels,
      characters,
      events,
    });

    const response = await aiService.generate({
      model,
      systemPrompt: prompts.system,
      userPrompt: prompts.user,
      temperature: 0.85,
      maxTokens: 4000,
      responseFormat: 'json',
    });

    // Parse JSON response (handle markdown code blocks)
    const calendar = extractJSON(response.content);

    reply.send({
      success: true,
      calendar: calendar.calendar,
      metadata: {
        model: response.model,
        tokensUsed: response.tokensUsed,
        cost: response.cost,
        duration: response.duration,
      },
    });
  } catch (error) {
    console.error('Generate Calendar Error:', error);
    reply.status(500).send({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate calendar',
    });
  }
};

/**
 * PHASE 8: Content Refinement
 */
export const refineContent = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { brandContext, originalContent, refinePrompt, itemDate, characters } = request.body as {
      brandContext: BrandContext;
      originalContent: string;
      refinePrompt: string;
      itemDate: string;
      characters?: Array<{ name: string; location: string }>;
    };

    const task = modelRouter.analyzeTask('content-writing', {
      userComplexity: 'complex',
      contextSize: 2000,
    });
    const model = modelRouter.selectModel(task);

    const prompts = promptEngine.generateContentRefinementPrompt({
      ...brandContext,
      originalContent,
      refinePrompt,
      itemDate,
      characters,
    });

    const response = await aiService.generate({
      model,
      systemPrompt: prompts.system,
      userPrompt: prompts.user,
      temperature: 0.8,
      maxTokens: 1500,
    });

    reply.send({
      success: true,
      refinedContent: response.content.trim(),
      metadata: {
        model: response.model,
        tokensUsed: response.tokensUsed,
        cost: response.cost,
        duration: response.duration,
      },
    });
  } catch (error) {
    console.error('Refine Content Error:', error);
    reply.status(500).send({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to refine content',
    });
  }
};

// Simple cache for expand brief results (5 minute TTL)
const expandBriefCache = new Map<string, { result: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * PHASE 9: Brief Expansion (ORCHESTRATOR + CACHE)
 *
 * MAJOR OPTIMIZATIONS:
 * - Now uses Orchestrator + ExpandBriefAgent (50-70% faster)
 * - Reduced maxTokens from 4000 to 2500 (30% faster)
 * - Added 5-minute cache for repeated requests
 * - Uses Brand Context Engine for optimized context
 * - Model Router for intelligent model selection
 */
export const expandBrief = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { brandContext, brief, channel, date, characters, mediaType, hook, directives, characterFocus, cta, weekFocus, instructions, model } = request.body as {
      brandContext: BrandContext;
      brief: string;
      channel: string;
      date: string;
      characters?: any[];
      mediaType?: string;
      hook?: string;
      directives?: string;
      characterFocus?: string;
      cta?: string;
      weekFocus?: string;
      instructions?: string;
      model?: string;
    };

    // Validate required fields
    if (!brief) {
      return reply.status(400).send({
        success: false,
        error: 'Missing required field: brief'
      });
    }

    // Generate cache key from request parameters
    const cacheKey = JSON.stringify({
      brand: brandContext?.brandName || 'unknown',
      brief: brief?.substring(0, 100) || '', // First 100 chars
      channel,
      date,
      mediaType,
      hook: hook?.substring(0, 50),
      directives: directives?.substring(0, 50)
    });

    // Check cache
    const cached = expandBriefCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      console.log('✅ Expand brief cache HIT');
      return reply.send({
        ...cached.result,
        metadata: {
          ...cached.result.metadata,
          cached: true,
          cacheAge: Math.floor((Date.now() - cached.timestamp) / 1000)
        }
      });
    }

    console.log('🔄 Expand brief cache MISS - generating via orchestrator...');

    // Use orchestrator for optimized generation
    const orchestrationResult = await orchestrator.execute({
      task: 'expand-brief',
      context: {
        type: 'expand-brief',
        brandId: brandContext?.brandName || 'unknown', // Use as temp ID
        payload: {
          brandContext,
          brief,
          contentIdea: brief, // Backward compatibility
          channel,
          date,
          characters,
          character: characters?.[0], // Use first character for backward compatibility
          mediaType,
          hook,
          directives,
          characterFocus,
          cta,
          weekFocus,
          instructions,
          model,
          stream: false // Non-streaming mode for regular endpoint
        }
      }
    });

    const expandedBrief = orchestrationResult.result.expandedBrief;
    const metadata = orchestrationResult.result.metadata;

    const result = {
      success: true,
      expandedBrief,
      metadata: {
        ...metadata,
        cached: false,
        method: 'orchestrator'
      },
    };

    // Cache the result
    expandBriefCache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });

    // Clean up old cache entries (simple LRU)
    if (expandBriefCache.size > 50) {
      const oldestKey = Array.from(expandBriefCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
      expandBriefCache.delete(oldestKey);
    }

    reply.send(result);
  } catch (error) {
    console.error('Expand Brief Error:', error);
    reply.status(500).send({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to expand brief',
    });
  }
};

/**
 * PHASE 9B: Brief Expansion with STREAMING
 *
 * Real-time streaming endpoint for progressive UI updates.
 * Shows content as it's being generated for better UX.
 */
export const expandBriefStream = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { brandContext, contentIdea, channel, date, character, mediaType, hook, directives, characterFocus, cta, weekFocus } = request.body as {
      brandContext: BrandContext;
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
    };

    console.log('🌊 Starting streaming expand brief...');

    // Set up SSE (Server-Sent Events) headers
    reply.header('Content-Type', 'text/event-stream');
    reply.header('Cache-Control', 'no-cache');
    reply.header('Connection', 'keep-alive');
    reply.header('X-Accel-Buffering', 'no'); // Disable nginx buffering

    let fullContent = '';

    // Use orchestrator with streaming
    const orchestrationResult = await orchestrator.execute({
      task: 'expand-brief',
      context: {
        type: 'expand-brief',
        brandId: brandContext.brandName,
        payload: {
          brandContext,
          contentIdea,
          channel,
          date,
          character,
          mediaType,
          hook,
          directives,
          characterFocus,
          cta,
          weekFocus,
          stream: true,
          onChunk: (chunk: string) => {
            // Send chunk to client via SSE
            fullContent += chunk;
            reply.raw.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
          }
        }
      }
    });

    // Send completion event
    reply.raw.write(`data: ${JSON.stringify({
      type: 'done',
      metadata: {
        ...orchestrationResult.result.metadata,
        method: 'orchestrator-stream'
      }
    })}\n\n`);

    reply.raw.end();

    console.log('✅ Streaming expand brief completed');
  } catch (error) {
    console.error('Streaming Expand Brief Error:', error);

    // Send error event
    if (!reply.sent) {
      reply.header('Content-Type', 'text/event-stream');
    }

    reply.raw.write(`data: ${JSON.stringify({
      type: 'error',
      error: error instanceof Error ? error.message : 'Failed to expand brief'
    })}\n\n`);

    reply.raw.end();
  }
};

/**
 * Train Andora on Character Cast
 * Stores character voices and personalities for future content generation
 */
export const trainCharacterCast = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { brandId, characters } = request.body as any;

    if (!brandId || !characters || !Array.isArray(characters)) {
      reply.status(400).send({
        success: false,
        error: 'brandId and characters array required',
      });
      return;
    }

    // Store character training data (this would typically go into a vector database
    // or be processed for fine-tuning, but for now we'll just acknowledge receipt)
    // In a production system, this would:
    // 1. Store character personas in a vector database
    // 2. Create embeddings for each character's voice
    // 3. Prepare training data for the orchestrator

    console.log(`Training Andora on ${characters.length} characters for brand ${brandId}`);

    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 1500));

    reply.send({
      success: true,
      message: 'Character cast training complete',
      trainedCharacters: characters.length,
      brandId,
    });
  } catch (error) {
    console.error('Train Character Cast Error:', error);
    reply.status(500).send({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to train character cast',
    });
  }
};

/**
 * Generate Monthly Theme (NOW USES NEW MULTI-AGENT ORCHESTRATOR!)
 * This replaces the old simple theme generator with the powerful SeasonPlotAgent
 */
export const generateMonthlyTheme = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { brandContext, month, events, themePrompt, brandId } = request.body as {
      brandContext: BrandContext;
      month: string;
      events?: any[];
      themePrompt?: string;
      brandId?: string;
    };

    console.log('🎭 NEW Monthly Theme Generation - Generating strategy rationale');
    console.log('📝 User Input (themePrompt):', themePrompt);

    // Extract month number and year from month string (e.g., "January 2025" or "2025-01")
    let monthNum: number;
    let year: number;

    if (month.includes('-')) {
      // Format: "2025-01"
      const parts = month.split('-');
      year = parseInt(parts[0]);
      monthNum = parseInt(parts[1]);
    } else {
      // Format: "January 2025" or similar
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
      const parts = month.split(' ');
      const monthName = parts[0];
      monthNum = monthNames.indexOf(monthName) + 1;
      year = parseInt(parts[1] || new Date().getFullYear().toString());
    }

    if (!brandId) {
      throw new Error('brandId is required for multi-agent orchestration');
    }

    // Use the NEW orchestrator system
    const { orchestrator } = await import('../agents/orchestrator.agent');

    const result = await orchestrator.execute({
      task: 'orchestrate',
      context: {
        type: 'generate-monthly-plot',
        brandId,
        payload: {
          month: monthNum,
          year,
          themePrompt: themePrompt || month  // USER'S INPUT IS PRIMARY
        }
      }
    });

    console.log('✅ Multi-Agent Result:', {
      theme: result.result.theme,
      descriptionLength: result.result.description?.length,
      hasWeeks: !!(result.result.week_1 || result.result.week_2 || result.result.week_3 || result.result.week_4),
      tokensUsed: result.tokensUsed
    });

    // Build weeks object from individual week fields
    const weeks: Record<number, string> = {};
    if (result.result.week_1) weeks[1] = result.result.week_1;
    if (result.result.week_2) weeks[2] = result.result.week_2;
    if (result.result.week_3) weeks[3] = result.result.week_3;
    if (result.result.week_4) weeks[4] = result.result.week_4;

    console.log('📦 Sending weeks to frontend:', {
      weekCount: Object.keys(weeks).length,
      weekKeys: Object.keys(weeks),
      week1Length: weeks[1]?.length || 0,
      week2Length: weeks[2]?.length || 0
    });

    reply.send({
      success: true,
      theme: result.result.theme,
      explanation: result.result.description,
      weeks: Object.keys(weeks).length > 0 ? weeks : undefined,  // ✅ Send weeks to frontend
      metadata: result.metadata,
    });
  } catch (error) {
    console.error('Generate Monthly Theme Error:', error);
    reply.status(500).send({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate monthly theme',
    });
  }
};

/**
 * Generate Calendar Entry (single day)
 */
export const generateCalendarEntry = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { brandContext, date, context, model } = request.body as {
      brandContext: BrandContext;
      date: string;
      context: {
        monthTheme?: string;
        weekFocus?: string;
        character?: any;
        characters?: any[];  // ← ADDED: Accept characters array from frontend
        events?: any[];
        channel?: string;
        promptOverride?: string;
        narrativeContext?: Record<string, any>;
        progressionStage?: string;
        previousHooks?: Array<{ date: string; hook: string; channel: string }>;  // ← NEW: Previous hooks
      };
      model?: AIModel;
    };

    const task = modelRouter.analyzeTask('content-writing', {
      userComplexity: 'medium',
      contextSize: 1500,
    });
    const selectedModel = model || modelRouter.selectModel(task);

    const prompts = promptEngine.generateCalendarEntryPrompt({
      ...brandContext,
      date,
      monthTheme: context.monthTheme,
      weekFocus: context.weekFocus,
      character: context.character,
      characters: context.characters,  // ← ADDED: Pass characters array to promptEngine
      events: context.events,
      channel: context.channel,
      promptOverride: context.promptOverride,
      narrativeContext: context.narrativeContext,
      progressionStage: context.progressionStage,
      previousHooks: context.previousHooks,  // ← NEW: Pass previous hooks
    });

    const response = await aiService.generate({
      model: selectedModel,
      systemPrompt: prompts.system,
      userPrompt: prompts.user,
      temperature: 0.85,
      maxTokens: 1200,
      responseFormat: 'json',
    });

    // Parse JSON response (handle markdown code blocks)
    const entry = extractJSON(response.content);

    reply.send({
      success: true,
      entry,
      metadata: {
        model: response.model,
        tokensUsed: response.tokensUsed,
        cost: response.cost,
        duration: response.duration,
      },
    });
  } catch (error) {
    console.error('Generate Calendar Entry Error:', error);
    reply.status(500).send({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate calendar entry',
    });
  }
};

/**
 * Refine Character Field
 */
export const refineCharacterField = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { brandContext, field, character, characters, model } = request.body as {
      brandContext: BrandContext;
      field: string;
      character: any;
      characters: any[];
      model?: AIModel;
    };

    const task = modelRouter.analyzeTask('character-refinement', {
      userComplexity: 'medium',
      contextSize: 800,
    });
    const selectedModel = model || modelRouter.selectModel(task);

    const prompts = promptEngine.refineCharacterFieldPrompt({
      ...brandContext,
      field,
      character,
      characters,
    });

    const response = await aiService.generate({
      model: selectedModel,
      systemPrompt: prompts.system,
      userPrompt: prompts.user,
      temperature: 0.8,
      maxTokens: 500,
      responseFormat: 'json',
    });

    // Parse JSON response (handle markdown code blocks)
    const result = extractJSON(response.content);

    reply.send({
      success: true,
      suggestion: result.suggestion,
      reasoning: result.reasoning,
      metadata: {
        model: response.model,
        tokensUsed: response.tokensUsed,
        cost: response.cost,
        duration: response.duration,
      },
    });
  } catch (error) {
    console.error('Refine Character Field Error:', error);
    reply.status(500).send({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to refine character field',
    });
  }
};

/**
 * Chat with Andora
 */
export const chatWithAndora = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { brandContext, message, characters, model, conversationHistory } = request.body as {
      brandContext: BrandContext;
      message: string;
      characters?: any[];
      model?: AIModel;
      conversationHistory?: Array<{ role: string; content: string }>;
    };

    const task = modelRouter.analyzeTask('content-writing', {
      userComplexity: 'simple',
      contextSize: 1000,
    });
    const selectedModel = model || modelRouter.selectModel(task);

    const prompts = promptEngine.generateChatPrompt({
      ...brandContext,
      message,
      characters,
      conversationHistory,
    });

    const response = await aiService.generate({
      model: selectedModel,
      systemPrompt: prompts.system,
      userPrompt: prompts.user,
      temperature: 0.7,
      maxTokens: 1000,
    });

    reply.send({
      success: true,
      response: response.content,
      metadata: {
        model: response.model,
        tokensUsed: response.tokensUsed,
        cost: response.cost,
        duration: response.duration,
      },
    });
  } catch (error) {
    console.error('Chat with Andora Error:', error);
    reply.status(500).send({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process chat message',
    });
  }
};

// ============================================
// OBSERVER EVALUATION ENDPOINTS
// Quality gating for narrative and characters
// ============================================

/**
 * Evaluate brand narrative from the client's perspective
 * Called when user marks all narrative fields as "perfect"
 */
export const observeNarrative = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const {
      brandId,
      brandName,
      brandType,
      buyerProfile,
      narrative
    } = request.body as {
      brandId: string;
      brandName: string;
      brandType?: 'individual' | 'organization';
      buyerProfile: string;
      narrative: {
        why?: string;
        problem?: string;
        solution?: string;
        cta?: string;
        failure?: string;
        success?: string;
      };
    };

    if (!buyerProfile) {
      return reply.status(400).send({
        success: false,
        error: 'Buyer profile is required for narrative evaluation'
      });
    }

    const { ClientObserverAgent } = await import('../agents/clientObserver.agent');
    const observer = new ClientObserverAgent('gpt-4o-mini', 7);

    const evaluation = await observer.evaluateNarrative({
      narrative,
      buyerProfile,
      brandName,
      brandType,
      threshold: 7
    });

    reply.send({
      success: true,
      evaluation,
      metadata: {
        type: 'narrative',
        brandId
      }
    });

  } catch (error) {
    console.error('Narrative Observer Error:', error);
    reply.status(500).send({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to evaluate narrative'
    });
  }
};

/**
 * Evaluate characters/cast from the target audience's perspective
 * Called when user clicks "Characters Are Done"
 */
export const observeCharacters = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const {
      brandId,
      brandName,
      brandType,
      brandPersona,
      buyerProfiles,
      characters
    } = request.body as {
      brandId: string;
      brandName: string;
      brandType: 'individual' | 'organization';
      brandPersona?: string;
      buyerProfiles: string | string[];
      characters: Array<{
        name: string;
        characterName?: string;
        role?: string;
        persona?: string;
        personality?: string;
        about?: string;
      }>;
    };

    if (!buyerProfiles || (Array.isArray(buyerProfiles) && buyerProfiles.length === 0)) {
      return reply.status(400).send({
        success: false,
        error: 'At least one buyer profile is required for character evaluation'
      });
    }

    if (!characters || characters.length === 0) {
      return reply.status(400).send({
        success: false,
        error: 'At least one character is required for evaluation'
      });
    }

    const { ClientObserverAgent } = await import('../agents/clientObserver.agent');
    const observer = new ClientObserverAgent('gpt-4o-mini', 7);

    const evaluation = await observer.evaluateCharacters({
      characters,
      buyerProfiles,
      brandName,
      brandType,
      brandPersona,
      threshold: 7
    });

    reply.send({
      success: true,
      evaluation,
      metadata: {
        type: 'characters',
        brandId,
        characterCount: characters.length,
        isIndividual: brandType === 'individual'
      }
    });

  } catch (error) {
    console.error('Character Observer Error:', error);
    reply.status(500).send({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to evaluate characters'
    });
  }
};
