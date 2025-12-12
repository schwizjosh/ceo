/**
 * EXPAND BRIEF AGENT
 *
 * Specialized agent for expanding content briefs into rich, detailed creative concepts.
 * Uses Brand Context Engine for optimized context retrieval.
 * Supports streaming for progressive UI updates.
 */

import { BaseAgent, AgentInput, AgentOutput, AIModel } from './base';
import { aiService } from '../services/aiService';
import { modelRouter } from '../services/modelRouter';
import { PromptEngine } from '../services/promptEngine';

const promptEngine = new PromptEngine();

export interface ExpandBriefInput {
  brandId: string;
  brandContext: {
    brandName: string;
    buyerProfile?: string;
    persona?: string;
    voice?: string;
    [key: string]: any;
  };
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
  model?: AIModel; // User-selected model
  stream?: boolean; // Enable streaming
  onChunk?: (chunk: string) => void; // Streaming callback
}

export class ExpandBriefAgent extends BaseAgent {
  constructor(model?: AIModel) {
    super({
      name: 'ExpandBrief',
      model: model || 'gpt-4o', // Default to GPT-4o for quality
      defaultTokenBudget: 2500,
      description: 'Expands content briefs into rich creative concepts',
      capabilities: ['brief-expansion', 'creative-direction', 'content-strategy']
    });
  }

  /**
   * Get intelligent fallback models based on primary model
   * Ensures cross-provider redundancy (OpenAI ↔ Anthropic)
   */
  private getFallbackModels(primaryModel: AIModel): AIModel[] {
    // If primary is OpenAI, fallback to Claude (and vice versa)
    const openAIModels: AIModel[] = ['gpt-4o', 'gpt-4o-mini', 'gpt-5'];
    const claudeModels: AIModel[] = ['claude-haiku-4.5', 'claude-sonnet-4', 'claude-sonnet-4.5'];

    if (openAIModels.includes(primaryModel)) {
      // OpenAI primary → single Claude fallback
      return ['claude-haiku-4.5'];
    } else if (claudeModels.includes(primaryModel)) {
      // Claude primary → fallback to GPT-4o
      return ['gpt-4o'];
    }

    // Default fallback chain
    return ['claude-haiku-4.5'];
  }

  /**
   * Execute brief expansion with optional streaming
   */
  async execute(input: AgentInput): Promise<AgentOutput> {
    this.validateInput(input);
    const startTime = Date.now();

    const context = input.context as ExpandBriefInput;

    this.log('Expanding brief', {
      brand: context.brandContext.brandName,
      channel: context.channel,
      mediaType: context.mediaType,
      streaming: !!context.stream
    });

    try {
      // STEP 1: Check for user-selected model first, then analyze task complexity
      const userSelectedModel = context.model as AIModel | undefined;

      const task = modelRouter.analyzeTask('content-writing', {
        userComplexity: 'complex',
        contextSize: 2500,
        prioritizeCost: true // Prefer cost-effective models
      });

      // Priority: User selection > Constructor model > Model Router selection
      const selectedModel = userSelectedModel || this.config.model || modelRouter.selectModel(task);

      this.log('Model selected', {
        model: selectedModel,
        userSelected: !!userSelectedModel,
        source: userSelectedModel ? 'user' : (this.config.model ? 'constructor' : 'router')
      });

      // STEP 2: Generate optimized prompts (only relevant media type)
      const prompts = promptEngine.generateBriefExpansionPrompt({
        ...context.brandContext,
        contentIdea: context.contentIdea,
        channel: context.channel,
        date: context.date,
        character: context.character,
        mediaType: context.mediaType,
        hook: context.hook,
        directives: context.directives,
        characterFocus: context.characterFocus,
        cta: context.cta,
        weekFocus: context.weekFocus,
      });

      // STEP 3: Generate with optional streaming
      let expandedBrief: string = '';
      let tokensUsed = 0;
      let cost = 0;
      let duration = 0;

      if (context.stream && context.onChunk) {
        // Streaming mode with fallback retry logic
        this.log('Starting streaming generation...');

        const fallbackModels = this.getFallbackModels(selectedModel);
        const modelsToTry = [selectedModel, ...fallbackModels];
        let streamSuccess = false;
        let lastError: Error | null = null;

        // Try streaming with each model until one succeeds
        for (const model of modelsToTry) {
          try {
            this.log(`Trying streaming with model: ${model}`);

            const streamGenerator = aiService.generateStream({
              model,
              systemPrompt: prompts.system,
              userPrompt: prompts.user,
              temperature: 0.8,
              maxTokens: 2500,
            });

            expandedBrief = '';

            for await (const chunk of streamGenerator) {
              if (chunk.type === 'chunk' && chunk.content) {
                // Send chunk to callback for progressive UI update
                context.onChunk(chunk.content);
                expandedBrief += chunk.content;
              } else if (chunk.type === 'done' && chunk.metadata) {
                // Final metadata
                tokensUsed = chunk.metadata.tokensUsed || 0;
                cost = chunk.metadata.cost || 0;
                duration = chunk.metadata.duration || 0;
              } else if (chunk.type === 'error') {
                throw new Error(chunk.error || 'Streaming error');
              }
            }

            expandedBrief = expandedBrief.trim();
            streamSuccess = true;

            if (model !== selectedModel) {
              this.log(`✅ Streaming fallback successful: ${selectedModel} → ${model}`);
            }
            break; // Success, exit retry loop

          } catch (error) {
            lastError = error instanceof Error ? error : new Error('Streaming failed');
            this.log(`❌ Streaming failed with ${model}: ${lastError.message}`);

            // Continue to next model
            if (model !== modelsToTry[modelsToTry.length - 1]) {
              this.log(`Trying next model in fallback chain...`);
            }
          }
        }

        if (!streamSuccess) {
          throw new Error(`Streaming failed with all models: ${lastError?.message || 'Unknown error'}`);
        }
      } else {
        // Standard non-streaming mode with intelligent fallback
        const fallbackModels = this.getFallbackModels(selectedModel);

        this.log('Using fallback chain', {
          primary: selectedModel,
          fallbacks: fallbackModels
        });

        const response = await aiService.generate({
          model: selectedModel,
          systemPrompt: prompts.system,
          userPrompt: prompts.user,
          temperature: 0.8,
          maxTokens: 2500,
          retries: 2, // Try each model 2 times
          fallbackModels, // Automatic fallback on failure
        });

        expandedBrief = response.content.trim();
        tokensUsed = response.tokensUsed;
        cost = response.cost;
        duration = response.duration;
      }

      // STEP 4: Record performance for learning
      const totalDuration = duration || Date.now() - startTime;
      modelRouter.recordPerformance(
        selectedModel,
        'content-writing',
        totalDuration,
        cost,
        true // Success
      );

      // STEP 5: Return orchestrated result
      return this.createOutput(
        {
          expandedBrief,
          metadata: {
            model: selectedModel,
            tokensUsed,
            cost,
            duration,
            cached: false,
            streaming: !!context.stream
          }
        },
        tokensUsed
      );
    } catch (error) {
      this.log('Expand brief error', error);
      throw error;
    }
  }
}
