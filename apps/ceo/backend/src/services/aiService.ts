/**
 * AI SERVICE
 *
 * Central service for all AI API calls (OpenAI, Anthropic & Google Gemini)
 * Handles intelligent model selection, prompt optimization, and error handling
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIModel } from '../agents/base';

// Initialize AI clients
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// Gemini Key Rotation Manager
class GeminiKeyManager {
  private keys: string[] = [];
  private currentKeyIndex = 0;
  private keyUsageCount: Map<number, number> = new Map();
  private keyLastUsed: Map<number, number> = new Map();

  constructor() {
    // Load all 9 Gemini API keys
    for (let i = 1; i <= 9; i++) {
      const key = process.env[`GEMINI_API_KEY_${i}`];
      if (key) {
        this.keys.push(key);
        this.keyUsageCount.set(i - 1, 0);
        this.keyLastUsed.set(i - 1, 0);
      }
    }
    console.log(`🔑 Loaded ${this.keys.length} Gemini API keys for rotation`);
  }

  /**
   * Get the next available API key using round-robin with rate limit awareness
   */
  getNextKey(): string {
    if (this.keys.length === 0) {
      throw new Error('No Gemini API keys available');
    }

    // Round-robin rotation
    const key = this.keys[this.currentKeyIndex];
    const now = Date.now();

    // Track usage
    this.keyUsageCount.set(this.currentKeyIndex, (this.keyUsageCount.get(this.currentKeyIndex) || 0) + 1);
    this.keyLastUsed.set(this.currentKeyIndex, now);

    // Move to next key
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.keys.length;

    console.log(`🔄 Using Gemini key #${this.currentKeyIndex + 1}/${this.keys.length}`);

    return key;
  }

  /**
   * Get usage statistics
   */
  getStats() {
    return {
      totalKeys: this.keys.length,
      currentKeyIndex: this.currentKeyIndex,
      keyUsageCount: Array.from(this.keyUsageCount.entries()),
      keyLastUsed: Array.from(this.keyLastUsed.entries())
    };
  }
}

const geminiKeyManager = new GeminiKeyManager();

export interface AIRequest {
  model: AIModel;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
  retries?: number; // Number of retries (default 2)
  fallbackModels?: AIModel[]; // Fallback models to try on failure
  cacheableContext?: string[]; // Cacheable content blocks (for Anthropic prompt caching)
  enablePromptCaching?: boolean; // Enable prompt caching (default: true for Claude)
}

export interface AIResponse {
  content: string;
  tokensUsed: number;
  inputTokens: number;
  outputTokens: number;
  model: string;
  cost: number;
  duration: number;
}

export interface StreamChunk {
  type: 'chunk' | 'field' | 'entry' | 'done' | 'error';
  content?: string;
  field?: string;
  value?: any;
  entry?: any;
  metadata?: {
    model: string;
    tokensUsed?: number;
    cost?: number;
    duration?: number;
  };
  error?: string;
}

/**
 * Main AI Service Class
 */
export class AIService {
  /**
   * Generate completion using specified model with retry and fallback
   */
  async generate(request: AIRequest): Promise<AIResponse> {
    const maxRetries = request.retries ?? 2;
    const fallbackModels = request.fallbackModels || [];
    const modelsToTry = [request.model, ...fallbackModels];

    let lastError: Error | null = null;

    // Try each model in sequence
    for (let modelIndex = 0; modelIndex < modelsToTry.length; modelIndex++) {
      const currentModel = modelsToTry[modelIndex];
      const isOriginalModel = modelIndex === 0;

      // Try the current model with retries
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const startTime = Date.now();

        try {
          console.log(`🤖 AI Attempt: model=${currentModel}, attempt=${attempt + 1}/${maxRetries + 1}`);

          let response: AIResponse;
          if (this.isGeminiModel(currentModel)) {
            response = await this.generateWithGemini({ ...request, model: currentModel }, startTime);
          } else if (this.isAnthropicModel(currentModel)) {
            response = await this.generateWithAnthropic({ ...request, model: currentModel }, startTime);
          } else {
            response = await this.generateWithOpenAI({ ...request, model: currentModel }, startTime);
          }

          // Success! Log if we used a fallback or retry
          if (!isOriginalModel) {
            console.log(`✅ Fallback successful: switched from ${request.model} to ${currentModel}`);
          } else if (attempt > 0) {
            console.log(`✅ Retry successful: ${currentModel} succeeded on attempt ${attempt + 1}`);
          }

          return response;

        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Unknown error');
          const errorMessage = lastError.message;

          // Classify error type
          const isRateLimitError = errorMessage.includes('429') || errorMessage.includes('rate_limit') || errorMessage.includes('quota');
          const isServerError = errorMessage.includes('500') || errorMessage.includes('502') || errorMessage.includes('503');
          const isNetworkError = errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ETIMEDOUT');

          console.error(`❌ AI Error [${currentModel}, attempt ${attempt + 1}]:`, errorMessage);

          // Don't retry on quota/auth errors, move to fallback immediately
          if (isRateLimitError || errorMessage.includes('401') || errorMessage.includes('invalid_api_key')) {
            console.log(`⚠️  Non-retryable error (${currentModel}), trying fallback...`);
            break; // Move to next model
          }

          // Retry on server/network errors with exponential backoff
          if ((isServerError || isNetworkError) && attempt < maxRetries) {
            const backoffMs = Math.min(1000 * Math.pow(2, attempt), 10000); // Max 10s
            console.log(`⏳ Retrying in ${backoffMs}ms...`);
            await this.sleep(backoffMs);
            continue; // Retry same model
          }

          // Last retry failed, try next model
          break;
        }
      }
    }

    // All models and retries exhausted
    console.error(`❌ All AI models failed. Models tried: ${modelsToTry.join(', ')}`);
    throw new Error(`AI generation failed after trying ${modelsToTry.length} model(s): ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Create embeddings for provided texts using OpenAI or deterministic fallback
   */
  async createEmbeddings(
    texts: string[],
    options?: { model?: string }
  ): Promise<number[][]> {
    if (!Array.isArray(texts) || texts.length === 0) {
      return [];
    }

    const embeddingModel = options?.model || 'text-embedding-3-small';

    if (!openai.apiKey) {
      console.warn('OpenAI API key missing; falling back to deterministic embeddings.');
      return texts.map(text => this.generateDeterministicEmbedding(text));
    }

    try {
      const response = await openai.embeddings.create({
        model: embeddingModel,
        input: texts
      });

      return response.data.map((item, index) => item.embedding ?? this.generateDeterministicEmbedding(texts[index]));
    } catch (error) {
      console.warn('Embedding API failed, using deterministic fallback.', error);
      return texts.map(text => this.generateDeterministicEmbedding(text));
    }
  }

  /**
   * Sleep utility for retry backoff
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate with Anthropic (Claude models)
   * Supports prompt caching for cost optimization
   */
  private async generateWithAnthropic(request: AIRequest, startTime: number): Promise<AIResponse> {
    const modelMap: Record<string, string> = {
      'claude-sonnet-4.5': 'claude-sonnet-4-20250514',
      'claude-sonnet-4': 'claude-sonnet-4-20250514',
      'claude-haiku-4.5': 'claude-haiku-4-5-20251001',
    };

    const anthropicModel = modelMap[request.model] || 'claude-sonnet-4-20250514';
    const enableCaching = request.enablePromptCaching !== false; // Default to true

    // Build system content with optional caching
    let systemContent: any;

    if (enableCaching && request.cacheableContext && request.cacheableContext.length > 0) {
      // Use structured system content with cache control
      systemContent = [
        // Main system prompt (cacheable)
        {
          type: 'text',
          text: request.systemPrompt,
          cache_control: { type: 'ephemeral' }
        },
        // Additional cacheable context blocks
        ...request.cacheableContext.map((contextBlock, index) => ({
          type: 'text',
          text: contextBlock,
          // Only cache the last block (Anthropic requirement)
          ...(index === request.cacheableContext!.length - 1 ? { cache_control: { type: 'ephemeral' } } : {})
        }))
      ];
    } else if (enableCaching) {
      // Cache just the system prompt
      systemContent = [
        {
          type: 'text',
          text: request.systemPrompt,
          cache_control: { type: 'ephemeral' }
        }
      ];
    } else {
      // No caching - simple string
      systemContent = request.systemPrompt;
    }

    const response = await anthropic.messages.create({
      model: anthropicModel,
      max_tokens: request.maxTokens || 4096,
      temperature: request.temperature || 0.7,
      system: systemContent,
      messages: [
        {
          role: 'user',
          content: request.userPrompt,
        },
      ],
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : '';
    const inputTokens = response.usage?.input_tokens || 0;
    const outputTokens = response.usage?.output_tokens || 0;

    // Track cache metrics if available
    const cacheCreationTokens = (response.usage as any)?.cache_creation_input_tokens || 0;
    const cacheReadTokens = (response.usage as any)?.cache_read_input_tokens || 0;

    if (cacheCreationTokens > 0 || cacheReadTokens > 0) {
      console.log(`💾 Prompt Cache: created=${cacheCreationTokens}, read=${cacheReadTokens}, saved=${cacheReadTokens > 0 ? '~90%' : '0%'}`);
    }

    const tokensUsed = inputTokens + outputTokens;
    const duration = Date.now() - startTime;

    return {
      content,
      tokensUsed,
      inputTokens,
      outputTokens,
      model: request.model,
      cost: this.calculateCostWithCache(request.model, inputTokens, outputTokens, cacheCreationTokens, cacheReadTokens),
      duration,
    };
  }

  /**
   * Generate with OpenAI (GPT models)
   */
  private async generateWithOpenAI(request: AIRequest, startTime: number): Promise<AIResponse> {
    const modelMap: Record<string, string> = {
      'gpt-4o': 'gpt-4o',
      'gpt-4o-mini': 'gpt-4o-mini',
      'gpt-5.1-instant': 'chatgpt-5.1-instant',
      'gpt-5.1': 'chatgpt-5.1',
      'gpt-5.1-mini': 'chatgpt-5-mini',
      'gpt-5': 'chatgpt-5',
    };

    const openaiModel = modelMap[request.model] || 'gpt-4o';

    const response = await openai.chat.completions.create({
      model: openaiModel,
      messages: [
        { role: 'system', content: request.systemPrompt },
        { role: 'user', content: request.userPrompt },
      ],
      temperature: request.temperature || 0.7,
      max_tokens: request.maxTokens || 4096,
      response_format: request.responseFormat === 'json' ? { type: 'json_object' } : undefined,
    });

    const content = response.choices[0]?.message?.content || '';
    const inputTokens = response.usage?.prompt_tokens || 0;
    const outputTokens = response.usage?.completion_tokens || 0;
    const tokensUsed = inputTokens + outputTokens;
    const duration = Date.now() - startTime;

    return {
      content,
      tokensUsed,
      inputTokens,
      outputTokens,
      model: request.model,
      cost: this.calculateCost(request.model, inputTokens, outputTokens),
      duration,
    };
  }

  /**
   * Generate with Google Gemini (with key rotation)
   */
  private async generateWithGemini(request: AIRequest, startTime: number): Promise<AIResponse> {
    const modelMap: Record<string, string> = {
      'gemini-2.5-flash': 'gemini-2.0-flash-exp', // Using latest experimental Flash model
    };

    const geminiModelName = modelMap[request.model] || 'gemini-2.0-flash-exp';

    // Get next API key from rotation
    const apiKey = geminiKeyManager.getNextKey();
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: geminiModelName });

    // Combine system and user prompts for Gemini
    const fullPrompt = `${request.systemPrompt}\n\n${request.userPrompt}`;

    const generationConfig = {
      temperature: request.temperature || 0.7,
      maxOutputTokens: request.maxTokens || 4096,
    };

    try {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
        generationConfig,
      });

      const response = result.response;
      const content = response.text();

      // Gemini token usage (if available)
      const inputTokens = response.usageMetadata?.promptTokenCount || 0;
      const outputTokens = response.usageMetadata?.candidatesTokenCount || 0;
      const tokensUsed = inputTokens + outputTokens;
      const duration = Date.now() - startTime;

      console.log(`✨ Gemini: ${tokensUsed} tokens in ${duration}ms (FREE tier)`);

      return {
        content,
        tokensUsed,
        inputTokens,
        outputTokens,
        model: request.model,
        cost: 0, // FREE!
        duration,
      };
    } catch (error: any) {
      // Handle rate limiting specifically
      if (error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED')) {
        console.log(`⚠️  Gemini rate limit hit, rotating to next key...`);
        // Try with next key automatically
        throw new Error('Rate limit reached, will retry with next key');
      }
      throw error;
    }
  }

  /**
   * Generate with streaming support
   * Yields chunks as they arrive from the AI model
   */
  async *generateStream(request: AIRequest): AsyncGenerator<StreamChunk> {
    const startTime = Date.now();

    try {
      if (this.isGeminiModel(request.model)) {
        yield* this.streamWithGemini(request, startTime);
      } else if (this.isAnthropicModel(request.model)) {
        yield* this.streamWithAnthropic(request, startTime);
      } else {
        yield* this.streamWithOpenAI(request, startTime);
      }
    } catch (error) {
      yield {
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Stream with OpenAI
   */
  private async *streamWithOpenAI(request: AIRequest, startTime: number): AsyncGenerator<StreamChunk> {
    const modelMap: Record<string, string> = {
      'gpt-4o': 'gpt-4o',
      'gpt-4o-mini': 'gpt-4o-mini',
      'gpt-5.1-instant': 'chatgpt-5.1-instant',
      'gpt-5.1': 'chatgpt-5.1',
      'gpt-5.1-mini': 'chatgpt-5-mini',
      'gpt-5': 'chatgpt-5',
    };

    const openaiModel = modelMap[request.model] || 'gpt-4o';

    const stream = await openai.chat.completions.create({
      model: openaiModel,
      messages: [
        { role: 'system', content: request.systemPrompt },
        { role: 'user', content: request.userPrompt },
      ],
      temperature: request.temperature || 0.7,
      max_tokens: request.maxTokens || 4096,
      response_format: request.responseFormat === 'json' ? { type: 'json_object' } : undefined,
      stream: true,
    });

    let fullContent = '';
    let inputTokens = 0;
    let outputTokens = 0;

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';

      if (delta) {
        fullContent += delta;
        outputTokens++;

        yield {
          type: 'chunk',
          content: delta
        };
      }
    }

    const duration = Date.now() - startTime;
    const tokensUsed = inputTokens + outputTokens;

    yield {
      type: 'done',
      content: fullContent,
      metadata: {
        model: request.model,
        tokensUsed,
        cost: this.calculateCost(request.model, inputTokens, outputTokens),
        duration
      }
    };
  }

  /**
   * Stream with Anthropic
   */
  private async *streamWithAnthropic(request: AIRequest, startTime: number): AsyncGenerator<StreamChunk> {
    const modelMap: Record<string, string> = {
      'claude-sonnet-4.5': 'claude-sonnet-4-20250514',
      'claude-sonnet-4': 'claude-sonnet-4-20250514',
      'claude-haiku-4.5': 'claude-haiku-4-5-20251001',
    };

    const anthropicModel = modelMap[request.model] || 'claude-sonnet-4-20250514';

    const stream = await anthropic.messages.stream({
      model: anthropicModel,
      max_tokens: request.maxTokens || 4096,
      temperature: request.temperature || 0.7,
      system: request.systemPrompt,
      messages: [
        {
          role: 'user',
          content: request.userPrompt,
        },
      ],
    });

    let fullContent = '';
    let inputTokens = 0;
    let outputTokens = 0;

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        const delta = chunk.delta.text;
        fullContent += delta;
        outputTokens++;

        yield {
          type: 'chunk',
          content: delta
        };
      }

      if (chunk.type === 'message_start') {
        inputTokens = chunk.message.usage?.input_tokens || 0;
      }

      if (chunk.type === 'message_delta') {
        outputTokens = chunk.usage?.output_tokens || outputTokens;
      }
    }

    const duration = Date.now() - startTime;
    const tokensUsed = inputTokens + outputTokens;

    yield {
      type: 'done',
      content: fullContent,
      metadata: {
        model: request.model,
        tokensUsed,
        cost: this.calculateCost(request.model, inputTokens, outputTokens),
        duration
      }
    };
  }

  /**
   * Stream with Gemini
   */
  private async *streamWithGemini(request: AIRequest, startTime: number): AsyncGenerator<StreamChunk> {
    const modelMap: Record<string, string> = {
      'gemini-2.5-flash': 'gemini-2.0-flash-exp',
    };

    const geminiModelName = modelMap[request.model] || 'gemini-2.0-flash-exp';

    // Get next API key from rotation
    const apiKey = geminiKeyManager.getNextKey();
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: geminiModelName });

    const fullPrompt = `${request.systemPrompt}\n\n${request.userPrompt}`;

    const generationConfig = {
      temperature: request.temperature || 0.7,
      maxOutputTokens: request.maxTokens || 4096,
    };

    const result = await model.generateContentStream({
      contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
      generationConfig,
    });

    let fullContent = '';
    let inputTokens = 0;
    let outputTokens = 0;

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        fullContent += chunkText;
        outputTokens++;

        yield {
          type: 'chunk',
          content: chunkText
        };
      }
    }

    const duration = Date.now() - startTime;
    const tokensUsed = inputTokens + outputTokens;

    yield {
      type: 'done',
      content: fullContent,
      metadata: {
        model: request.model,
        tokensUsed,
        cost: 0, // FREE!
        duration
      }
    };
  }

  /**
   * Check if model is Anthropic
   */
  private isAnthropicModel(model: AIModel): boolean {
    return model.includes('claude');
  }

  /**
   * Check if model is Gemini
   */
  private isGeminiModel(model: AIModel): boolean {
    return model.includes('gemini');
  }

  /**
   * Deterministic embedding fallback when API access is unavailable
   */
  private generateDeterministicEmbedding(text: string, dimensions = 64): number[] {
    const vector = new Array(dimensions).fill(0);
    if (!text) {
      return vector;
    }

    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
      const index = Math.abs(hash + i) % dimensions;
      vector[index] += text.charCodeAt(i) / 255;
    }

    const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
    if (norm === 0) return vector;
    return vector.map(value => value / norm);
  }

  /**
   * Calculate cost based on model and token split
   */
  private calculateCost(model: AIModel, inputTokens: number, outputTokens: number): number {
    const costs: Record<AIModel, { input: number; output: number }> = {
      'gpt-4o': { input: 0.0025, output: 0.01 },
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
      'gpt-5.1-instant': { input: 0.008, output: 0.024 },
      'gpt-5.1': { input: 0.007, output: 0.021 },       // placeholder
      'gpt-5.1-mini': { input: 0.0007, output: 0.0021 }, // placeholder
      'gpt-5': { input: 0.005, output: 0.015 },
      'claude-sonnet-4': { input: 0.003, output: 0.015 },
      'claude-sonnet-4.5': { input: 0.003, output: 0.015 },
      'claude-haiku-4.5': { input: 0.001, output: 0.005 },
      'gemini-2.5-flash': { input: 0, output: 0 },      // FREE tier!
    };

    const modelCost = costs[model];
    const inputCost = (inputTokens / 1000) * modelCost.input;
    const outputCost = (outputTokens / 1000) * modelCost.output;
    return inputCost + outputCost;
  }

  /**
   * Calculate cost with prompt caching consideration (Anthropic)
   *
   * Cache pricing:
   * - Cache writes: 1.25x base input price
   * - Cache reads: 0.1x base input price (90% savings!)
   */
  private calculateCostWithCache(
    model: AIModel,
    inputTokens: number,
    outputTokens: number,
    cacheCreationTokens: number = 0,
    cacheReadTokens: number = 0
  ): number {
    const costs: Record<AIModel, { input: number; output: number }> = {
      'gpt-4o': { input: 0.0025, output: 0.01 },
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
      'gpt-5.1-instant': { input: 0.008, output: 0.024 },
      'gpt-5.1': { input: 0.007, output: 0.021 },       // placeholder
      'gpt-5.1-mini': { input: 0.0007, output: 0.0021 }, // placeholder
      'gpt-5': { input: 0.005, output: 0.015 },
      'claude-sonnet-4': { input: 0.003, output: 0.015 },
      'claude-sonnet-4.5': { input: 0.003, output: 0.015 },
      'claude-haiku-4.5': { input: 0.001, output: 0.005 },
      'gemini-2.5-flash': { input: 0, output: 0 },      // FREE tier!
    };

    const modelCost = costs[model];

    // Calculate regular input tokens (not cached)
    const regularInputTokens = inputTokens - cacheCreationTokens - cacheReadTokens;

    // Calculate costs
    const regularInputCost = (regularInputTokens / 1000) * modelCost.input;
    const cacheWriteCost = (cacheCreationTokens / 1000) * modelCost.input * 1.25; // 25% premium
    const cacheReadCost = (cacheReadTokens / 1000) * modelCost.input * 0.1; // 90% discount!
    const outputCost = (outputTokens / 1000) * modelCost.output;

    return regularInputCost + cacheWriteCost + cacheReadCost + outputCost;
  }

  /**
   * Batch generate multiple requests (parallel processing)
   */
  async batchGenerate(requests: AIRequest[]): Promise<AIResponse[]> {
    return Promise.all(requests.map(req => this.generate(req)));
  }

  /**
   * Stream generation (for real-time responses)
   */
  async *streamGenerate(request: AIRequest): AsyncGenerator<string> {
    if (this.isGeminiModel(request.model)) {
      const modelMap: Record<string, string> = {
        'gemini-2.5-flash': 'gemini-2.0-flash-exp',
      };

      const apiKey = geminiKeyManager.getNextKey();
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: modelMap[request.model] || 'gemini-2.0-flash-exp' });

      const fullPrompt = `${request.systemPrompt}\n\n${request.userPrompt}`;

      const result = await model.generateContentStream({
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
        generationConfig: {
          temperature: request.temperature || 0.7,
          maxOutputTokens: request.maxTokens || 4096,
        },
      });

      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          yield text;
        }
      }
    } else if (this.isAnthropicModel(request.model)) {
      const modelMap: Record<string, string> = {
        'claude-sonnet-4.5': 'claude-sonnet-4-20250514',
        'claude-sonnet-4': 'claude-sonnet-4-20250514',
        'claude-haiku-4.5': 'claude-haiku-4-5-20251001',
      };

      const stream = await anthropic.messages.stream({
        model: modelMap[request.model] || 'claude-sonnet-4-20250514',
        max_tokens: request.maxTokens || 4096,
        temperature: request.temperature || 0.7,
        system: request.systemPrompt,
        messages: [{ role: 'user', content: request.userPrompt }],
      });

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          yield chunk.delta.text;
        }
      }
    } else {
      const stream = await openai.chat.completions.create({
        model: request.model === 'gpt-4o' ? 'gpt-4o' : 'gpt-4o-mini',
        messages: [
          { role: 'system', content: request.systemPrompt },
          { role: 'user', content: request.userPrompt },
        ],
        temperature: request.temperature || 0.7,
        max_tokens: request.maxTokens || 4096,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    }
  }
}

// Singleton instance
export const aiService = new AIService();
