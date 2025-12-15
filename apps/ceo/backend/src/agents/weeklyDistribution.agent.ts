import { BaseAgent, AgentInput, AgentOutput, AIModel } from './base';
import { PromptEngine } from '../services/promptEngine';
import { aiService } from '../services/aiService';

interface WeeklyDistributionContext {
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
}

export interface WeeklyDistributionInput extends AgentInput {
  task: 'plan-weekly-distribution';
  context: WeeklyDistributionContext;
  fallbackModels?: AIModel[];
}

export class WeeklyDistributionAgent extends BaseAgent {
  private promptEngine: PromptEngine;

  constructor(model?: AIModel) {
    super({
      name: 'WeeklyDistribution',
      model: model || 'gpt-4o',
      defaultTokenBudget: 1600,
      description: 'Plans weekly character vs faceless content balance',
      capabilities: ['weekly-distribution', 'narrative-balance']
    });

    this.promptEngine = new PromptEngine();
  }

  async execute(input: WeeklyDistributionInput): Promise<AgentOutput> {
    this.validateInput(input);
    this.startTimer();

    const { context, fallbackModels } = input;

    this.log('Planning weekly distribution', {
      brand: context.brandName,
      week: context.weekNumber,
      channels: context.channels
    });

    const prompts = this.promptEngine.generateWeeklyDistributionPrompt(context);

    const response = await aiService.generate({
      model: this.config.model,
      systemPrompt: prompts.system,
      userPrompt: prompts.user,
      temperature: 0.65,
      responseFormat: 'json',
      fallbackModels
    });

    const plan = JSON.parse(response.content);

    this.log('Weekly distribution planned', {
      dayCount: Array.isArray(plan.daily_plan) ? plan.daily_plan.length : 0,
      tokensUsed: response.tokensUsed
    });

    return this.createOutput(plan, response.tokensUsed);
  }
}
