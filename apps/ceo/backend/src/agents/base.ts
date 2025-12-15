/**
 * BASE AGENT INTERFACE
 *
 * Foundation for all AI agents in the multi-agent swarm.
 * Every specialist agent extends this base class.
 */

import { agentConfigService } from '../services/agentConfig';

export type AIModel =
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'gpt-5.1-instant'
  | 'gpt-5.1'
  | 'gpt-5.1-mini'
  | 'gpt-5'
  | 'claude-sonnet-4'
  | 'claude-sonnet-4.5'
  | 'claude-haiku-4.5'
  | 'gemini-2.5-flash';

export interface AgentInput {
  task: string;
  context: Record<string, any>;
  constraints?: {
    maxTokens?: number;
    temperature?: number;
    format?: 'json' | 'text' | 'markdown';
    style?: string;
  };
}

export interface AgentOutput<T = any> {
  result: T;
  tokensUsed: number;
  confidence: number;
  metadata: {
    agent: string;
    model: string;
    duration: number;
    cost: number;
    timestamp: Date;
    inputTokens: number;
    outputTokens: number;
  };
}

export interface AgentConfig {
  name: string;
  model: AIModel;
  defaultTokenBudget: number;
  description: string;
  capabilities: string[];
  temperature?: number;
  fallbackModel?: AIModel;
}

/**
 * Abstract Base Agent
 *
 * All specialist agents inherit from this class.
 * Supports runtime configuration from database.
 */
export abstract class BaseAgent {
  protected config: AgentConfig;
  protected startTime: number = 0;
  protected runtimeConfig: any = null; // Loaded from database

  constructor(config: AgentConfig) {
    this.config = config;
  }

  /**
   * Load runtime configuration from database
   * Call this after construction to enable configurable behavior
   */
  async loadRuntimeConfig(): Promise<void> {
    try {
      const dbConfig = await agentConfigService.getAgentConfig(this.config.name);
      if (dbConfig) {
        this.runtimeConfig = dbConfig;
        // Override defaults with database config
        this.config.model = (dbConfig.defaultModel as AIModel) || this.config.model;
        this.config.defaultTokenBudget = dbConfig.maxTokens || this.config.defaultTokenBudget;
        this.config.temperature = dbConfig.temperature || this.config.temperature;
        this.config.fallbackModel = (dbConfig.fallbackModel as AIModel) || this.config.fallbackModel;

        this.log(`Configuration loaded from database`);
      }
    } catch (error) {
      this.log(`Failed to load runtime config, using defaults: ${error}`);
    }
  }

  /**
   * Get prompt from database or fallback to provided default
   */
  async getPrompt(promptKey: string, defaultTemplate?: string): Promise<string> {
    try {
      const prompt = await agentConfigService.getPrompt(this.config.name, promptKey);
      if (prompt) {
        return prompt.promptTemplate;
      }
    } catch (error) {
      this.log(`Failed to load prompt ${promptKey}, using default`);
    }
    return defaultTemplate || '';
  }

  /**
   * Main execution method - must be implemented by each agent
   */
  abstract execute(input: AgentInput): Promise<AgentOutput>;

  /**
   * Validate input before processing
   */
  protected validateInput(input: AgentInput): void {
    if (!input.task) {
      throw new Error(`[${this.config.name}] Task is required`);
    }

    if (!input.context) {
      throw new Error(`[${this.config.name}] Context is required`);
    }
  }

  /**
   * Build the final system prompt with context
   */
  protected buildPrompt(
    systemPrompt: string,
    userPrompt: string,
    context: Record<string, any>
  ): { system: string; user: string } {
    // Use agentConfigService to render the prompt with variables
    const processedSystem = agentConfigService.renderPrompt(systemPrompt, context);

    return {
      system: processedSystem,
      user: userPrompt
    };
  }

  /**
   * Calculate token cost based on model
   */
  protected calculateCost(tokensUsed: number): number {
    const costs: Record<AIModel, { input: number; output: number }> = {
      'gpt-4o': { input: 0.0025, output: 0.01 },              // per 1K tokens
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
      'gpt-5.1-instant': { input: 0.008, output: 0.024 },     // GPT-5.1 Instant pricing
      'gpt-5.1': { input: 0.007, output: 0.021 },             // placeholder pricing
      'gpt-5.1-mini': { input: 0.0007, output: 0.0021 },      // placeholder pricing
      'gpt-5': { input: 0.005, output: 0.015 },               // GPT-5 pricing (estimated)
      'claude-sonnet-4': { input: 0.003, output: 0.015 },     // Claude Sonnet 4
      'claude-sonnet-4.5': { input: 0.003, output: 0.015 },   // Latest Claude Sonnet
      'claude-haiku-4.5': { input: 0.001, output: 0.005 },    // Latest Claude Haiku
      'gemini-2.5-flash': { input: 0, output: 0 }             // FREE tier (15 RPM, 1000 RPD)
    };

    const modelCost = costs[this.config.model];
    // Estimate 50/50 split between input and output
    const avgCost = (modelCost.input + modelCost.output) / 2;
    return (tokensUsed / 1000) * avgCost;
  }

  /**
   * Start performance timer
   */
  protected startTimer(): void {
    this.startTime = Date.now();
  }

  /**
   * Get elapsed time in milliseconds
   */
  protected getElapsedTime(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Log agent activity
   */
  protected log(message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${this.config.name}] ${message}`, data || '');
  }

  /**
   * Create standardized output and track performance
   */
  protected async createOutput<T>(
    result: T,
    tokensUsed: number,
    confidence: number = 1.0,
    metadataOverrides?: Partial<AgentOutput<T>['metadata']>
  ): Promise<AgentOutput<T>> {
    const defaultInputTokens = metadataOverrides?.inputTokens ?? Math.round(tokensUsed / 2);
    const defaultOutputTokens = metadataOverrides?.outputTokens ?? Math.max(tokensUsed - defaultInputTokens, 0);

    const output: AgentOutput<T> = {
      result,
      tokensUsed,
      confidence,
      metadata: {
        agent: metadataOverrides?.agent || this.config.name,
        model: metadataOverrides?.model || this.config.model,
        duration: metadataOverrides?.duration ?? this.getElapsedTime(),
        cost: metadataOverrides?.cost ?? this.calculateCost(defaultInputTokens + defaultOutputTokens),
        timestamp: metadataOverrides?.timestamp || new Date(),
        inputTokens: defaultInputTokens,
        outputTokens: defaultOutputTokens
      }
    };

    // Track performance asynchronously (don't await to avoid blocking)
    agentConfigService.trackPerformance({
      agentName: output.metadata.agent,
      modelUsed: output.metadata.model,
      tokensUsed: output.tokensUsed,
      executionTimeMs: output.metadata.duration,
      success: true,
      costEstimate: output.metadata.cost
    }).catch(err => {
      this.log(`Failed to track performance: ${err}`);
    });

    return output;
  }

  /**
   * Get agent information
   */
  public getInfo(): AgentConfig {
    return { ...this.config };
  }

  /**
   * Check if agent can handle a specific task type
   */
  public canHandle(taskType: string): boolean {
    return this.config.capabilities.includes(taskType);
  }
}

/**
 * Agent Registry
 * 
 * Central registry for all available agents in the swarm
 */
export class AgentRegistry {
  private agents: Map<string, BaseAgent> = new Map();

  register(agent: BaseAgent): void {
    const info = agent.getInfo();
    this.agents.set(info.name, agent);
    console.log(`✅ Registered agent: ${info.name} (${info.model})`);
  }

  get(name: string): BaseAgent | undefined {
    return this.agents.get(name);
  }

  getByCapability(capability: string): BaseAgent[] {
    return Array.from(this.agents.values()).filter(agent =>
      agent.canHandle(capability)
    );
  }

  list(): AgentConfig[] {
    return Array.from(this.agents.values()).map(agent => agent.getInfo());
  }

  clear(): void {
    this.agents.clear();
  }
}

/**
 * Token Counter Utility
 */
export class TokenCounter {
  /**
   * Estimate tokens in text (rough approximation)
   * Real implementation should use tiktoken or similar
   */
  static estimate(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Count tokens in structured data
   */
  static estimateObject(obj: any): number {
    const json = JSON.stringify(obj);
    return this.estimate(json);
  }

  /**
   * Check if within budget
   */
  static withinBudget(text: string, budget: number): boolean {
    return this.estimate(text) <= budget;
  }
}
