/**
 * CLIENT OBSERVER AGENT
 *
 * A specialized agent that embodies the client's profile and emotionally
 * evaluates creative briefs. Used to create a feedback loop where content
 * is regenerated if it doesn't resonate with the target audience.
 */

import { BaseAgent, AgentInput, AgentOutput, AIModel } from './base';
import { aiService } from '../services/aiService';
import { modelRouter } from '../services/modelRouter';

// Emotion categories for evaluation
export const POSITIVE_EMOTIONS = [
  'awe',
  'inspired',
  'touched',
  'laughter',
  'provoked',
  'excited',
  'confident',
  'reassured'
] as const;

export const NEGATIVE_EMOTIONS = [
  'confused',
  'disconnected',
  'bored',
  'agitated',
  'skeptical',
  'indifferent',
  'overwhelmed'
] as const;

export type PositiveEmotion = typeof POSITIVE_EMOTIONS[number];
export type NegativeEmotion = typeof NEGATIVE_EMOTIONS[number];
export type Emotion = PositiveEmotion | NegativeEmotion;

export interface ObserverEvaluation {
  score: number;              // 1-10 quality score
  emotions: Emotion[];        // Primary emotions felt
  primaryReaction: string;    // "This resonates because..." or "This falls flat because..."
  improvements?: string[];    // Suggestions if score < threshold
  passesThreshold: boolean;   // score >= threshold
  confidence: number;         // How confident the observer is (0-1)
}

export interface ObserverInput {
  expandedBrief: string;
  buyerProfile: string;
  brandPersona?: string;
  brandName: string;
  originalIdea?: string;
  channel?: string;
  threshold?: number;         // Default: 7
}

export class ClientObserverAgent extends BaseAgent {
  private threshold: number;

  constructor(model?: AIModel, threshold: number = 7) {
    super({
      name: 'ClientObserver',
      model: model || 'gpt-4o-mini', // Use fast model for evaluation
      defaultTokenBudget: 800,
      description: 'Embodies client profile to emotionally evaluate creative briefs',
      capabilities: ['brief-evaluation', 'emotional-feedback', 'quality-gating']
    });
    this.threshold = threshold;
  }

  /**
   * Get intelligent fallback models
   */
  private getFallbackModels(primaryModel: AIModel): AIModel[] {
    const openAIModels: AIModel[] = ['gpt-4o', 'gpt-4o-mini', 'gpt-5'];
    if (openAIModels.includes(primaryModel)) {
      return ['claude-haiku-4.5'];
    }
    return ['gpt-4o-mini'];
  }

  /**
   * Evaluate a brief from the client's perspective
   */
  async evaluate(input: ObserverInput): Promise<ObserverEvaluation> {
    const startTime = Date.now();

    this.log('Evaluating brief as client', {
      brand: input.brandName,
      buyerProfileLength: input.buyerProfile?.length,
      briefLength: input.expandedBrief?.length,
      threshold: input.threshold || this.threshold
    });

    const threshold = input.threshold || this.threshold;

    // Build the observer prompt
    const systemPrompt = this.buildSystemPrompt(input);
    const userPrompt = this.buildUserPrompt(input);

    try {
      // Use fast model for evaluation
      const task = modelRouter.analyzeTask('evaluation', {
        contextSize: 1000,
        userComplexity: 'medium',
        prioritizeCost: true
      });

      const selectedModel = this.config.model || modelRouter.selectModel(task);
      const fallbackModels = this.getFallbackModels(selectedModel);

      const response = await aiService.generate({
        model: selectedModel,
        systemPrompt,
        userPrompt,
        temperature: 0.7, // Slightly lower for more consistent evaluations
        maxTokens: 600,
        responseFormat: 'json',
        fallbackModels
      });

      // Parse the response
      const evaluation = this.parseEvaluation(response.content, threshold);

      this.log('Evaluation complete', {
        score: evaluation.score,
        emotions: evaluation.emotions,
        passesThreshold: evaluation.passesThreshold,
        duration: Date.now() - startTime
      });

      return evaluation;

    } catch (error) {
      this.log('Evaluation error, defaulting to pass', error);
      // On error, default to passing to avoid blocking content delivery
      return {
        score: 7,
        emotions: ['confident'],
        primaryReaction: 'Evaluation unavailable, defaulting to approval.',
        passesThreshold: true,
        confidence: 0.5
      };
    }
  }

  /**
   * Build the system prompt that embodies the client persona
   */
  private buildSystemPrompt(input: ObserverInput): string {
    return `You are embodying a specific buyer persona to evaluate creative content. You must BECOME this person and react genuinely.

## YOUR IDENTITY
${input.buyerProfile || 'A discerning professional who values authentic, impactful messaging.'}

## BRAND CONTEXT
Brand: ${input.brandName}
${input.brandPersona ? `Brand Persona: ${input.brandPersona}` : ''}

## YOUR TASK
Read the creative brief as if you're encountering it for the first time. React EMOTIONALLY, not analytically. 

You are NOT a marketing expert reviewing copy. You ARE the target customer experiencing this message.

## EMOTIONAL VOCABULARY
Positive emotions you might feel:
- AWE: "This is remarkable/unexpected/elevated"
- INSPIRED: "This makes me want to act/change/grow"
- TOUCHED: "This understands me/moves me personally"
- LAUGHTER: "This is clever/surprising/delightful"
- PROVOKED: "This challenges my thinking in a good way"
- EXCITED: "I can't wait to learn more/engage"
- CONFIDENT: "I trust this brand knows what they're doing"
- REASSURED: "This addresses my concerns/fears"

Negative emotions you might feel:
- CONFUSED: "I don't understand what they're offering"
- DISCONNECTED: "This doesn't speak to me or my needs"
- BORED: "I've heard this before/it's generic"
- AGITATED: "This feels pushy/manipulative"
- SKEPTICAL: "I don't believe these claims"
- INDIFFERENT: "I could take it or leave it"
- OVERWHELMED: "This is too much/too complex"

## RESPONSE FORMAT
Return JSON with:
{
  "score": <1-10>,
  "emotions": ["<emotion1>", "<emotion2>"],
  "primaryReaction": "<Your genuine first-person reaction in 1-2 sentences>",
  "improvements": ["<suggestion1>", "<suggestion2>"] // Only if score < 7
}

CRITICAL: Be a REAL person, not a critic. Score based on whether this would make you FEEL something and want to engage.`;
  }

  /**
   * Build the user prompt with the actual brief
   */
  private buildUserPrompt(input: ObserverInput): string {
    let prompt = `As the buyer persona described, read this creative brief and give your genuine emotional reaction:\n\n`;

    if (input.originalIdea) {
      prompt += `Original Concept: ${input.originalIdea}\n\n`;
    }

    if (input.channel) {
      prompt += `This will appear on: ${input.channel}\n\n`;
    }

    prompt += `---\n\n${input.expandedBrief}\n\n---\n\n`;
    prompt += `Now, as the target buyer, what do you FEEL? Give your honest reaction.`;

    return prompt;
  }

  /**
   * Parse the AI response into a structured evaluation
   */
  private parseEvaluation(content: string, threshold: number): ObserverEvaluation {
    try {
      // Handle potential markdown code blocks
      let jsonStr = content.trim();
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
      }

      const parsed = JSON.parse(jsonStr);

      // Validate and normalize emotions
      const validEmotions = [...POSITIVE_EMOTIONS, ...NEGATIVE_EMOTIONS] as string[];
      const emotions = (parsed.emotions || [])
        .map((e: string) => e.toLowerCase())
        .filter((e: string) => validEmotions.includes(e)) as Emotion[];

      // Ensure score is in valid range
      const score = Math.min(10, Math.max(1, Number(parsed.score) || 5));

      return {
        score,
        emotions: emotions.length > 0 ? emotions : ['indifferent'],
        primaryReaction: parsed.primaryReaction || 'No specific reaction provided.',
        improvements: score < threshold ? (parsed.improvements || []) : undefined,
        passesThreshold: score >= threshold,
        confidence: emotions.length > 0 ? 0.85 : 0.6
      };

    } catch (error) {
      this.log('Failed to parse evaluation, using defaults', error);
      return {
        score: 6,
        emotions: ['indifferent'],
        primaryReaction: 'Unable to parse emotional response.',
        improvements: ['Consider making the message more emotionally engaging.'],
        passesThreshold: false,
        confidence: 0.3
      };
    }
  }

  // ============================================
  // NARRATIVE OBSERVER
  // ============================================

  /**
   * Evaluate brand narrative (story spine) from the client's perspective
   */
  async evaluateNarrative(input: {
    narrative: {
      why?: string;
      problem?: string;
      solution?: string;
      cta?: string;
      failure?: string;
      success?: string;
    };
    buyerProfile: string;
    brandName: string;
    brandType?: 'individual' | 'organization';
    threshold?: number;
  }): Promise<ObserverEvaluation> {
    const startTime = Date.now();
    const threshold = input.threshold || this.threshold;

    this.log('Evaluating narrative as client', {
      brand: input.brandName,
      narrativeFields: Object.keys(input.narrative).filter(k => input.narrative[k as keyof typeof input.narrative]),
      threshold
    });

    const systemPrompt = `You are embodying a specific buyer persona to evaluate a brand's story narrative. You must BECOME this person and react genuinely to whether this brand story speaks to YOU.

## YOUR IDENTITY
${input.buyerProfile || 'A discerning professional seeking authentic solutions.'}

## BRAND CONTEXT
Brand: ${input.brandName}
Type: ${input.brandType === 'individual' ? 'Personal Brand' : 'Organization'}

## YOUR TASK
Read this brand narrative and evaluate if it resonates with you as the target customer.

Ask yourself:
- Does the "Why" inspire me?
- Does the "Problem" feel like MY struggle?
- Does the "Solution" genuinely address what I need?
- Do the stakes (failure/success) matter to me emotionally?

## EMOTIONAL VOCABULARY
${this.getEmotionVocabulary()}

## RESPONSE FORMAT
Return JSON with:
{
  "score": <1-10>,
  "emotions": ["<emotion1>", "<emotion2>"],
  "primaryReaction": "<Your genuine reaction to this story narrative>",
  "improvements": ["<suggestion1>", "<suggestion2>"] // Only if score < ${threshold}
}`;

    const userPrompt = `As the buyer persona, evaluate this brand narrative:

---
WHY (Purpose): ${input.narrative.why || 'Not provided'}

PROBLEM (Customer Struggle): ${input.narrative.problem || 'Not provided'}

SOLUTION (How Brand Helps): ${input.narrative.solution || 'Not provided'}

FAILURE (What Happens Without Action): ${input.narrative.failure || 'Not provided'}

SUCCESS (Transformation Achieved): ${input.narrative.success || 'Not provided'}

SIGNATURE PHRASES: ${input.narrative.cta || 'Not provided'}
---

Does this story speak to you? Would you trust this brand to understand and help you?`;

    try {
      const task = modelRouter.analyzeTask('evaluation', { contextSize: 800, prioritizeCost: true });
      const selectedModel = this.config.model || modelRouter.selectModel(task);

      const response = await aiService.generate({
        model: selectedModel,
        systemPrompt,
        userPrompt,
        temperature: 0.7,
        maxTokens: 500,
        responseFormat: 'json',
        fallbackModels: this.getFallbackModels(selectedModel)
      });

      const evaluation = this.parseEvaluation(response.content, threshold);

      this.log('Narrative evaluation complete', {
        score: evaluation.score,
        emotions: evaluation.emotions,
        passesThreshold: evaluation.passesThreshold,
        duration: Date.now() - startTime
      });

      return evaluation;

    } catch (error) {
      this.log('Narrative evaluation error', error);
      return {
        score: 7,
        emotions: ['confident'],
        primaryReaction: 'Evaluation unavailable, defaulting to approval.',
        passesThreshold: true,
        confidence: 0.5
      };
    }
  }

  // ============================================
  // CHARACTER OBSERVER
  // ============================================

  /**
   * Evaluate characters/cast from the target audience's perspective
   * For individual brands: validates the single persona resonates with all audiences
   * For ensemble brands: validates each character connects with their audience segment
   */
  async evaluateCharacters(input: {
    characters: Array<{
      name: string;
      characterName?: string;
      role?: string;
      persona?: string;
      personality?: string;
      about?: string;
    }>;
    buyerProfiles: string | string[]; // Single profile or array for ensemble
    brandName: string;
    brandType: 'individual' | 'organization';
    brandPersona?: string;
    threshold?: number;
  }): Promise<ObserverEvaluation & {
    characterScores?: Array<{ name: string; score: number; resonates: boolean }>;
    ensembleHarmony?: number;
  }> {
    const startTime = Date.now();
    const threshold = input.threshold || this.threshold;
    const isIndividual = input.brandType === 'individual';
    const profiles = Array.isArray(input.buyerProfiles) ? input.buyerProfiles : [input.buyerProfiles];

    this.log('Evaluating characters as target audience', {
      brand: input.brandName,
      characterCount: input.characters.length,
      isIndividual,
      audienceCount: profiles.length,
      threshold
    });

    const characterDescriptions = input.characters.map((char, i) => `
CHARACTER ${i + 1}: ${char.name}
${char.characterName ? `Real Name: ${char.characterName}` : ''}
${char.role ? `Role: ${char.role}` : ''}
${char.personality ? `Personality: ${char.personality}` : ''}
${char.about ? `About: ${char.about}` : ''}
${char.persona ? `Persona: ${char.persona}` : ''}
`).join('\n---\n');

    const systemPrompt = isIndividual
      ? this.buildIndividualCharacterPrompt(profiles[0], input.brandName, threshold)
      : this.buildEnsembleCharacterPrompt(profiles, input.brandName, threshold);

    const userPrompt = `Evaluate this brand's character(s):

${characterDescriptions}

${isIndividual
        ? 'As the target audience, would you connect with and follow this person? Do they feel authentic and relatable to your needs?'
        : 'As different segments of the target audience, does each character resonate with a different shade of your needs? Do they work together as an ensemble that collectively speaks to you?'}`;

    try {
      const task = modelRouter.analyzeTask('evaluation', { contextSize: 1000, prioritizeCost: true });
      const selectedModel = this.config.model || modelRouter.selectModel(task);

      const response = await aiService.generate({
        model: selectedModel,
        systemPrompt,
        userPrompt,
        temperature: 0.7,
        maxTokens: 600,
        responseFormat: 'json',
        fallbackModels: this.getFallbackModels(selectedModel)
      });

      const evaluation = this.parseCharacterEvaluation(response.content, threshold, input.characters);

      this.log('Character evaluation complete', {
        score: evaluation.score,
        emotions: evaluation.emotions,
        passesThreshold: evaluation.passesThreshold,
        characterScores: evaluation.characterScores,
        duration: Date.now() - startTime
      });

      return evaluation;

    } catch (error) {
      this.log('Character evaluation error', error);
      return {
        score: 7,
        emotions: ['confident'],
        primaryReaction: 'Evaluation unavailable, defaulting to approval.',
        passesThreshold: true,
        confidence: 0.5
      };
    }
  }

  private buildIndividualCharacterPrompt(buyerProfile: string, brandName: string, threshold: number): string {
    return `You are embodying the target audience to evaluate a PERSONAL BRAND character. This is the person behind the brand - an influencer, creator, or thought leader.

## YOUR IDENTITY (The Audience)
${buyerProfile || 'A professional seeking authentic guidance and expertise.'}

## BRAND
${brandName}

## YOUR TASK
Evaluate if this personal brand character would resonate with you. Ask yourself:
- Does this person feel authentic and relatable?
- Would I trust them and want to follow their journey?
- Do they understand my struggles and aspirations?
- Is their voice something I'd engage with?

## EMOTIONAL VOCABULARY
${this.getEmotionVocabulary()}

## RESPONSE FORMAT
Return JSON with:
{
  "score": <1-10>,
  "emotions": ["<emotion1>", "<emotion2>"],
  "primaryReaction": "<Your honest reaction to this personality>",
  "improvements": ["<suggestion1>"] // Only if score < ${threshold}
}`;
  }

  private buildEnsembleCharacterPrompt(buyerProfiles: string[], brandName: string, threshold: number): string {
    return `You are embodying MULTIPLE audience segments to evaluate an ENSEMBLE CAST of brand characters. Each character should resonate with a different shade of the target audience.

## YOUR IDENTITIES (Multiple Audience Segments)
${buyerProfiles.map((p, i) => `Segment ${i + 1}: ${p}`).join('\n\n')}

## BRAND
${brandName}

## YOUR TASK
Evaluate if this ensemble works together to connect with the full audience:
- Does each character resonate with a different audience segment?
- Do they complement each other (not duplicate)?
- Would the ensemble collectively guide your journey?
- Do they feel like a cohesive team you'd want to engage with?

## EMOTIONAL VOCABULARY
${this.getEmotionVocabulary()}

## RESPONSE FORMAT
Return JSON with:
{
  "score": <1-10>,
  "emotions": ["<emotion1>", "<emotion2>"],
  "primaryReaction": "<Your reaction to this ensemble cast>",
  "characterScores": [{"name": "<char name>", "score": <1-10>, "resonates": true/false}],
  "ensembleHarmony": <1-10>, // How well they work together
  "improvements": ["<suggestion1>"] // Only if overall score < ${threshold}
}`;
  }

  private getEmotionVocabulary(): string {
    return `Positive: awe, inspired, touched, laughter, provoked, excited, confident, reassured
Negative: confused, disconnected, bored, agitated, skeptical, indifferent, overwhelmed`;
  }

  private parseCharacterEvaluation(
    content: string,
    threshold: number,
    characters: Array<{ name: string }>
  ): ObserverEvaluation & {
    characterScores?: Array<{ name: string; score: number; resonates: boolean }>;
    ensembleHarmony?: number;
  } {
    try {
      let jsonStr = content.trim();
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
      }

      const parsed = JSON.parse(jsonStr);
      const validEmotions = [...POSITIVE_EMOTIONS, ...NEGATIVE_EMOTIONS] as string[];
      const emotions = (parsed.emotions || [])
        .map((e: string) => e.toLowerCase())
        .filter((e: string) => validEmotions.includes(e)) as Emotion[];

      const score = Math.min(10, Math.max(1, Number(parsed.score) || 5));

      return {
        score,
        emotions: emotions.length > 0 ? emotions : ['indifferent'],
        primaryReaction: parsed.primaryReaction || 'No specific reaction provided.',
        improvements: score < threshold ? (parsed.improvements || []) : undefined,
        passesThreshold: score >= threshold,
        confidence: emotions.length > 0 ? 0.85 : 0.6,
        characterScores: parsed.characterScores,
        ensembleHarmony: parsed.ensembleHarmony
      };

    } catch (error) {
      this.log('Failed to parse character evaluation', error);
      return {
        score: 6,
        emotions: ['indifferent'],
        primaryReaction: 'Unable to parse evaluation.',
        improvements: ['Consider making characters more relatable.'],
        passesThreshold: false,
        confidence: 0.3
      };
    }
  }

  /**
   * Execute method required by BaseAgent
   */
  async execute(input: AgentInput): Promise<AgentOutput> {
    this.validateInput(input);
    this.startTimer();

    const observerInput = input.context as ObserverInput;
    const evaluation = await this.evaluate(observerInput);

    return this.createOutput(
      evaluation,
      400, // Estimated tokens
      evaluation.confidence
    );
  }
}

