/**
 * TASK DETAIL WRITER AGENT
 *
 * The main task detail generator - creates individual project tasks/updates
 * This is the "heavyweight" agent that uses premium AI models
 */

import { BaseAgent, AgentInput, AgentOutput, AIModel } from './base';
import {
  TASK_DETAIL_WRITER_SYSTEM_PROMPT,
  buildTaskDetailPrompt,
  REFINEMENT_PROMPT, // This prompt will also be updated in sceneWriter.prompts
  DETAILED_BRIEF_PROMPT
} from '../utils/prompts/sceneWriter.prompts'; // Will be renamed to taskDetailWriter.prompts later
import { aiService, AIResponse } from '../services/aiService';
import { PerfectTaskMemory } from '../services/brandContext'; // Renamed from PerfectContentMemory

interface TaskDetailWriterInput extends AgentInput {
  context: {
    companyVoice: string;
    companyPersonality: string[];
    companyArchetype?: string;
    clientProfile?: string;
    teamMemberName: string;
    teamMemberVoice: string;
    teamMemberArchetype?: string;
    secondaryTeamMemberName?: string;
    secondaryTeamMemberVoice?: string;
    relationshipType?: string;
    relationshipSummary?: string;
    date: string;
    channel: string; // e.g., 'Email', 'Slack', 'Meeting Minutes'
    format: string; // e.g., 'Executive Summary', 'Action Item List', 'Detailed Report'
    taskPlanTitle?: string;
    taskPlanDescription?: string;
    taskPlanSetup?: string;
    taskPlanNextHook?: string;
    taskPlanPayoff?: string;
    eventTitle?: string;
    eventDescription?: string;
    recentPerfectTask?: PerfectTaskMemory[];
    knowledgeSnippets?: Array<{ 
      id: string;
      summary: string;
      content: string;
      type: string;
      score: number;
      sourceId?: string;
    }>;
    channelContext?: {
      medium: 'report' | 'email' | 'meeting' | 'document';
      audienceFocus: string;
      successSignals: string[];
      toneGuidelines: string[];
      recommendedCadence?: string;
    };
  }
}

interface TaskDetailOutput {
  objective: string;
  description: string;
  actionItems: string[];
  tags: string[];
  reportingStyle: string;
  priority: string;
  dueDate: string;
}

/**
 * Task Detail Writer Agent
 *
 * Uses GPT-4o by default for high-quality task detail generation
 */
export class TaskDetailWriterAgent extends BaseAgent {
  constructor(model?: AIModel) {
    super({
      name: 'TaskDetailWriter',
      model: model || 'gpt-4o', // Standardize default to GPT-4o
      defaultTokenBudget: 1200,
      description: 'Generates high-quality project task details and updates',
      capabilities: ['task-detail-writing', 'refinement', 'detailed-brief']
    });
  }

  /**
   * Main execution: Generate a task detail piece
   */
  async execute(input: TaskDetailWriterInput): Promise<AgentOutput<TaskDetailOutput>> {
    this.validateInput(input);
    this.startTimer();

    const { context } = input;

    this.log('Generating task details', {
      channel: context.channel,
      format: context.format,
      teamMember: context.teamMemberName
    });

    try {
      // Build the prompts
      const { system, user } = this.buildPrompt(
        TASK_DETAIL_WRITER_SYSTEM_PROMPT,
        buildTaskDetailPrompt({
          date: context.date,
          channel: context.channel,
          companyVoice: context.companyVoice,
          companyPersonality: context.companyPersonality,
          companyArchetype: context.companyArchetype,
          clientProfile: context.clientProfile,
          teamMemberName: context.teamMemberName,
          teamMemberVoice: context.teamMemberVoice,
          teamMemberArchetype: context.teamMemberArchetype,
          secondaryTeamMemberName: context.secondaryTeamMemberName,
          secondaryTeamMemberVoice: context.secondaryTeamMemberVoice,
          relationshipType: context.relationshipType,
          relationshipSummary: context.relationshipSummary,
          taskPlanTitle: context.taskPlanTitle,
          taskPlanDescription: context.taskPlanDescription,
          taskPlanSetup: context.taskPlanSetup,
          taskPlanNextHook: context.taskPlanNextHook,
          taskPlanPayoff: context.taskPlanPayoff,
          eventTitle: context.eventTitle,
          eventDescription: context.eventDescription,
          format: context.format,
          recentPerfectTask: context.recentPerfectTask || [],
          knowledgeSnippets: context.knowledgeSnippets || [],
          channelContext: context.channelContext || {
            medium: 'report',
            audienceFocus: 'general',
            successSignals: [],
            toneGuidelines: []
          }
        }),
        {
          companyVoice: context.companyVoice,
          companyPersonality: context.companyPersonality.join(', '),
          teamMemberName: context.teamMemberName,
          teamMemberVoice: context.teamMemberVoice,
          companyArchetype: context.companyArchetype || '',
          taskPlanTitle: context.taskPlanTitle || 'None',
          taskPlanDescription: context.taskPlanDescription || '',
          clientProfile: context.clientProfile || '',
          secondaryTeamMember: context.secondaryTeamMemberName || '',
          secondaryTeamMemberVoice: context.secondaryTeamMemberVoice || '',
          relationshipType: context.relationshipType || '',
          relationshipSummary: context.relationshipSummary || ''
        }
      );

      // Build cacheable context for prompt caching (company identity + team member)
      // This context is stable and perfect for caching!
      const cacheableContext: string[] = [];

      // Cache block 1: Company identity (rarely changes)
      if (context.companyVoice && context.companyPersonality) {
        const companyIdentity = `COMPANY IDENTITY:
Voice: ${context.companyVoice}
Personality: ${context.companyPersonality.join(', ')}
${context.companyArchetype ? `Archetype: ${context.companyArchetype}` : ''}
${context.clientProfile ? `Client Profile: ${context.clientProfile}` : ''}`;
        cacheableContext.push(companyIdentity);
      }

      // Cache block 2: Team member context (stable for the day)
      if (context.teamMemberName && context.teamMemberVoice) {
        const teamMemberContext = `TEAM MEMBER FOCUS:
Name: ${context.teamMemberName}
Voice: ${context.teamMemberVoice}
${context.teamMemberArchetype ? `Archetype: ${context.teamMemberArchetype}` : ''}
${context.secondaryTeamMemberName ? `\nSupporting Team Member: ${context.secondaryTeamMemberName}
Voice: ${context.secondaryTeamMemberVoice}` : ''}`;
        cacheableContext.push(teamMemberContext);
      }

      // Call AI with fallbacks (passed from orchestrator or empty array)
      this.log('Calling AI model', {
        model: this.config.model,
        cacheBlocks: cacheableContext.length
      });
      const fallbackModels = (input as any).fallbackModels || [];
      const aiResult = await this.callAI(system, user, fallbackModels, cacheableContext);

      // Parse and validate result
      const taskDetails = this.parseTaskDetailOutput(aiResult.content);

      this.log('Task details generated successfully', {
        objective: taskDetails.objective.substring(0, 50) + '...', 
        priority: taskDetails.priority
      });

      return this.createOutput(
        taskDetails,
        aiResult.tokensUsed,
        1.0,
        {
          model: aiResult.model,
          duration: aiResult.duration,
          cost: aiResult.cost,
          inputTokens: aiResult.inputTokens,
          outputTokens: aiResult.outputTokens
        }
      );

    } catch (error) {
      this.log('Error generating task details', error);
      throw error;
    }
  }

  /**
   * Generate a detailed project brief
   */
  async generateDetailedProjectBrief(input: {
    objective: string;
    summary: string;
    format: string;
    channel: string;
    fallbackModels?: AIModel[];
  }): Promise<AgentOutput<any>> {
    this.startTimer();

    const prompt = DETAILED_BRIEF_PROMPT // This prompt will be updated in sceneWriter.prompts
      .replace('{{hook}}', input.objective)
      .replace('{{summary}}', input.summary)
      .replace('{{format}}', input.format)
      .replace('{{channel}}', input.channel);

    try {
      const aiResult = await this.callAI('You are a strategic project manager.', prompt, input.fallbackModels);
      const brief = JSON.parse(aiResult.content);

      return this.createOutput(
        brief,
        aiResult.tokensUsed,
        1.0,
        {
          model: aiResult.model,
          duration: aiResult.duration,
          cost: aiResult.cost,
          inputTokens: aiResult.inputTokens,
          outputTokens: aiResult.outputTokens
        }
      );
    } catch (error) {
      this.log('Error generating detailed project brief', error);
      throw error;
    }
  }

  /**
   * Refine existing task details based on user feedback
   */
  async refineContent(input: {
    originalContent: TaskDetailOutput;
    userInstructions: string;
    context: TaskDetailWriterInput['context'];
    fallbackModels?: AIModel[];
  }): Promise<AgentOutput<TaskDetailOutput>> {
    this.startTimer();

    const prompt = REFINEMENT_PROMPT // This prompt will be updated in sceneWriter.prompts
      .replace('{{originalContent}}', JSON.stringify(input.originalContent, null, 2))
      .replace('{{userInstructions}}', input.userInstructions)
      .replace('{{brandVoice}}', input.context.companyVoice) // Renamed from brandVoice
      .replace('{{characterName}}', input.context.teamMemberName) // Renamed from characterName
      .replace('{{characterVoice}}', input.context.teamMemberVoice) // Renamed from characterVoice
      .replace('{{channel}}', input.context.channel)
      .replace('{{format}}', input.context.format)
      .replace('{{subplotTitle}}', input.context.taskPlanTitle || 'None') // Renamed from subplotTitle
      .replace('{{eventTitle}}', input.context.eventTitle || 'None');

    try {
      const aiResult = await this.callAI(TASK_DETAIL_WRITER_SYSTEM_PROMPT, prompt, input.fallbackModels);
      const refinedTaskDetails = this.parseTaskDetailOutput(aiResult.content);

      this.log('Task details refined successfully');

      return this.createOutput(
        refinedTaskDetails,
        aiResult.tokensUsed,
        1.0,
        {
          model: aiResult.model,
          duration: aiResult.duration,
          cost: aiResult.cost,
          inputTokens: aiResult.inputTokens,
          outputTokens: aiResult.outputTokens
        }
      );
    } catch (error) {
      this.log('Error refining task details', error);
      throw error;
    }
  }

  /**
   * Call AI model with actual API integration (with smart fallbacks)
   */
  private async callAI(
    systemPrompt: string,
    userPrompt: string,
    fallbackModels?: AIModel[],
    cacheableContext?: string[]
  ): Promise<AIResponse> {
    try {
      // Use specified model with fallbacks for resilience
      const response = await aiService.generate({
        model: this.config.model,
        systemPrompt,
        userPrompt,
        maxTokens: this.config.defaultTokenBudget,
        temperature: 0.8, // High creativity for task detail generation
        retries: 2, // 2 retries per model
        fallbackModels: fallbackModels || [], // Fallback models if primary fails
        cacheableContext, // Enable prompt caching for Claude models
        enablePromptCaching: true // Enable by default for cost savings
      });

      this.log('AI call successful', {
        model: response.model,
        tokensUsed: response.tokensUsed,
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        duration: response.duration,
        cost: response.cost
      });

      return response;
    } catch (error) {
      this.log('Error calling AI API', error);
      throw new Error(`AI API call failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse and validate AI output
   */
  private parseTaskDetailOutput(response: string): TaskDetailOutput {
    try {
      const parsed = JSON.parse(response);

      // Validate required fields
      if (!parsed.objective || !parsed.description || !parsed.actionItems) {
        throw new Error('Missing required fields in AI response');
      }

      return {
        objective: parsed.objective,
        description: parsed.description,
        actionItems: parsed.actionItems || [],
        tags: parsed.tags || [],
        reportingStyle: parsed.reportingStyle,
        priority: parsed.priority,
        dueDate: parsed.dueDate
      };
    } catch (error) {
      this.log('Error parsing AI response', error);
      throw new Error('Failed to parse AI response as valid JSON');
    }
  }
}
