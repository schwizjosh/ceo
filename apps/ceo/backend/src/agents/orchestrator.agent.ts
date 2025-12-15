/**
 * ORCHESTRATOR AGENT
 * 
 * The central brain of the multi-agent system.
 * Routes tasks, manages context, and coordinates specialist agents.
 */

import { BaseAgent, AgentInput, AgentOutput, AgentRegistry } from './base';
import { brandContextEngine, SceneContext } from '../services/brandContext';
import { modelRouter, TaskType } from '../services/modelRouter';
import { TaskDetailWriterAgent } from './taskDetailWriter.agent';
import { TeamMemberGeneratorAgent } from './teamMemberGenerator.agent';
import { QuarterlyPlanAgent } from './quarterlyPlan.agent';
import { WeeklyTaskPlanAgent } from './weeklyTaskPlan.agent';
import { ProjectScheduleGeneratorAgent } from './projectScheduleGenerator.agent';
import { WeeklyDistributionAgent } from './weeklyDistribution.agent';
import { ExpandBriefAgent } from './expandBrief.agent';
import { tokenUsageService } from '../services/tokenUsage';
import pool from '../database/db';

export interface OrchestrationRequest {
  type:
  | 'generate-task-details'
  | 'refine-task-details'
  | 'generate-project-brief'
  | 'adapt-communication-channel'
  | 'generate-team-members'
  | 'refine-team-member'
  | 'generate-company-strategy'
  | 'generate-quarterly-plan'
  | 'generate-monthly-roadmap'
  | 'generate-weekly-task-plan'
  | 'generate-project-schedule'
  | 'expand-project-brief';
  brandId: string;
  payload: any;
}

export interface TaskDetailGenerationRequest {
  date: Date;
  channel: string;
  format: string;
}

export interface TaskDetailRefinementRequest {
  contentId: string;
  instructions: string;
  originalContent: any;
  context: any;
}

/**
 * Orchestrator Agent
 * 
 * This is the master agent that:
 * 1. Receives user requests
 * 2. Analyzes complexity
 * 3. Queries Brand Context Engine for relevant data
 * 4. Routes to appropriate specialist agents
 * 5. Manages token budgets
 * 6. Returns aggregated results
 */
export class OrchestratorAgent extends BaseAgent {
  private agentRegistry: AgentRegistry;
  private taskDetailWriter: TaskDetailWriterAgent;
  private teamMemberGenerator: TeamMemberGeneratorAgent;
  private quarterlyPlan: QuarterlyPlanAgent;
  private weeklyTaskPlan: WeeklyTaskPlanAgent;
  private projectScheduleGenerator: ProjectScheduleGeneratorAgent;
  private expandBrief: ExpandBriefAgent;

  constructor() {
    super({
      name: 'Orchestrator',
      model: 'gpt-4o-mini', // Uses cheap model for routing decisions
      defaultTokenBudget: 500,
      description: 'Central coordinator for all AI operations',
      capabilities: ['orchestration', 'routing', 'context-management']
    });

    this.agentRegistry = new AgentRegistry();
    this.taskDetailWriter = new TaskDetailWriterAgent();
    this.teamMemberGenerator = new TeamMemberGeneratorAgent();
    this.quarterlyPlan = new QuarterlyPlanAgent();
    this.weeklyTaskPlan = new WeeklyTaskPlanAgent();
    this.projectScheduleGenerator = new ProjectScheduleGeneratorAgent();
    this.expandBrief = new ExpandBriefAgent();

    // Register all agents
    this.registerAgents();
  }

  /**
   * Register all specialist agents
   */
  private registerAgents(): void {
    this.agentRegistry.register(this.taskDetailWriter);
    this.agentRegistry.register(this.teamMemberGenerator);
    this.agentRegistry.register(this.quarterlyPlan);
    this.agentRegistry.register(this.weeklyTaskPlan);
    this.agentRegistry.register(this.projectScheduleGenerator);
    this.agentRegistry.register(this.expandBrief);
    this.log('All agents registered');
  }

  /**
   * Main orchestration method
   */
  async execute(input: AgentInput): Promise<AgentOutput> {
    this.validateInput(input);
    this.startTimer();

    const request = input.context as OrchestrationRequest;

    this.log('Orchestrating request', {
      type: request.type,
      brandId: request.brandId
    });

    try {
      switch (request.type) {
        case 'generate-task-details':
          return await this.orchestrateTaskDetailGeneration(request);

        case 'refine-task-details':
          return await this.orchestrateTaskDetailRefinement(request);

        case 'generate-project-brief':
          return await this.orchestrateProjectBriefGeneration(request);

        case 'adapt-communication-channel':
          return await this.orchestrateCommunicationChannelAdaptation(request);

        case 'generate-team-members':
          return await this.orchestrateTeamMemberGeneration(request);

        case 'refine-team-member':
          return await this.orchestrateTeamMemberRefinement(request);

        case 'generate-company-strategy':
          return await this.orchestrateCompanyStrategyGeneration(request);

        case 'generate-quarterly-plan':
          return await this.orchestrateQuarterlyPlanGeneration(request);

        case 'generate-monthly-roadmap':
          return await this.orchestrateMonthlyRoadmapGeneration(request);

        case 'generate-weekly-task-plan':
          return await this.orchestrateWeeklyTaskPlanGeneration(request);

        case 'generate-project-schedule':
          return await this.orchestrateProjectScheduleGeneration(request);

        case 'expand-project-brief':
          return await this.orchestrateExpandProjectBrief(request);

        default:
          throw new Error(`Unknown request type: ${request.type}`);
      }
    } catch (error) {
      this.log('Orchestration error', error);
      throw error;
    }
  }

    /**
     * Orchestrate task detail generation
     *
     * This is the key optimization: Instead of sending all context,
     * we query for exactly what we need.
     */
    private async orchestrateTaskDetailGeneration(
      request: OrchestrationRequest
    ): Promise<AgentOutput> {
      const { brandId, payload } = request;
      const { date, channel, format } = payload as TaskDetailGenerationRequest;
  
      this.log('Orchestrating task detail generation', {
        date,
        channel,
        format
      });
  
      // STEP 1: Get focused context from Brand Context Engine
      const taskContext = await brandContextEngine.getTaskDetailContext({
        brandId,
        date,
        channel,
        format
      });
  
      this.log('Context retrieved', {
        hasTeamMember: !!taskContext.teamMember,
        hasEvent: !!taskContext.event,
        hasTaskPlan: !!taskContext.taskPlan
      });
  
      // STEP 2: Analyze task complexity
      const estimatedContextTokens = this.estimateContextSize(taskContext);
      const availableTokens = await this.getAvailableTokens(brandId);
      const prioritizeCost = typeof availableTokens === 'number'
        ? availableTokens < estimatedContextTokens * 1.8
        : false;
  
      this.log('Token budget snapshot', {
        availableTokens,
        estimatedContextTokens,
        prioritizeCost
      });
  
      const taskAnalysis = modelRouter.analyzeTask('task-detail-writing', {
        contextSize: estimatedContextTokens,
        userComplexity: 'complex', // Task detail writing is always complex
        prioritizeCost,
        availableTokens: availableTokens ?? undefined
      });
  
      // STEP 3: Get model recommendation with fallbacks
      const recommendation = modelRouter.getRecommendation(taskAnalysis);
      this.log('Model selected', {
        model: recommendation.model,
        reason: recommendation.reason,
        fallbacks: recommendation.fallbackModels
      });
  
      // STEP 4: Route to Task Detail Writer with optimized context and fallbacks
      const taskInput: any = {
        task: 'generate-task-details',
        context: {
          companyVoice: taskContext.brand.voice,
          companyPersonality: taskContext.brand.personality,
          companyArchetype: taskContext.brand.archetype,
          clientProfile: taskContext.brand.buyerProfile,
          teamMemberName: taskContext.teamMember?.name || 'Company Voice',
          teamMemberVoice: taskContext.teamMember?.voice || taskContext.brand.voice,
          teamMemberArchetype: taskContext.teamMember?.archetype,
          secondaryTeamMemberName: taskContext.secondaryTeamMember?.name,
          secondaryTeamMemberVoice: taskContext.secondaryTeamMember?.voice,
          relationshipType: taskContext.relationshipContext?.relationshipType,
          relationshipSummary: taskContext.relationshipContext?.summary,
          date: date.toISOString().split('T')[0],
          channel,
          format,
          taskPlanTitle: taskContext.taskPlan?.title,
          taskPlanDescription: taskContext.taskPlan?.description,
          taskPlanSetup: taskContext.taskPlan?.activeHook?.setup,
          taskPlanNextHook: taskContext.taskPlan?.activeHook?.hook,
          taskPlanPayoff: taskContext.taskPlan?.activeHook?.payoff,
          eventTitle: taskContext.event?.title,
          eventDescription: taskContext.event?.description,
          recentPerfectTask: taskContext.recentPerfectTask,
          knowledgeSnippets: taskContext.knowledgeSnippets,
          channelContext: taskContext.channelContext
        },
        fallbackModels: recommendation.fallbackModels // Pass fallback models for resilience
      };
  
      // STEP 5: Execute via Task Detail Writer with selected model + fallbacks
      const taskDetailAgent = new TaskDetailWriterAgent(recommendation.model);
      const result = await taskDetailAgent.execute(taskInput);
  
      // STEP 6: Record performance for learning
      modelRouter.recordPerformance(
        recommendation.model,
        'task-detail-writing',
        result.metadata.duration,
        result.metadata.cost,
        true // Success
      );
  
      await tokenUsageService.recordUsage({
        brandId,
        tokensUsed: result.tokensUsed,
        taskType: 'task-detail-generation',
        metadata: {
          channel,
          format,
          date: date.toISOString().split('T')[0],
          model: result.metadata.model,
          inputTokens: result.metadata.inputTokens,
          outputTokens: result.metadata.outputTokens
        }
      });
  
      // STEP 7: Return orchestrated result
      return this.createOutput(
        {
          content: result.result,
          context: {
            teamMember: taskContext.teamMember?.name,
            secondaryTeamMember: taskContext.secondaryTeamMember?.name,
            relationship: taskContext.relationshipContext,
            event: taskContext.event?.title,
            taskPlan: taskContext.taskPlan?.title,
            taskPlanHook: taskContext.taskPlan?.activeHook?.hook,
            knowledgeSnippets: taskContext.knowledgeSnippets.map(snippet => ({
              id: snippet.id,
              summary: snippet.summary,
              score: snippet.score
            })),
            channelContext: taskContext.channelContext
          },
          metadata: {
            model: recommendation.model,
            contextTokens: this.estimateContextSize(taskContext),
            totalTokens: result.tokensUsed,
            cost: result.metadata.cost
          }
        },
        result.tokensUsed
      );
    }
  
  /**
   * Orchestrate task detail refinement
   */
  private async orchestrateTaskDetailRefinement(
    request: OrchestrationRequest
  ): Promise<AgentOutput> {
    const { payload } = request;
    const { instructions, originalContent, context } = payload as TaskDetailRefinementRequest;

    this.log('Orchestrating task detail refinement', { instructions });

    // Analyze task and get model recommendation with fallbacks
    const taskAnalysis = modelRouter.analyzeTask('refinement', {
      contextSize: 1000,
      userComplexity: 'medium'
    });

    const recommendation = modelRouter.getRecommendation(taskAnalysis);
    this.log('Model selected', {
      model: recommendation.model,
      fallbacks: recommendation.fallbackModels
    });

    // Route to Task Detail Writer for refinement with fallbacks
    const taskDetailAgent = new TaskDetailWriterAgent(recommendation.model);
    const result = await taskDetailAgent.refineContent({
      originalContent,
      userInstructions: instructions,
      context,
      fallbackModels: recommendation.fallbackModels
    });

    // Record performance
    modelRouter.recordPerformance(
      recommendation.model,
      'refinement',
      result.metadata.duration,
      result.metadata.cost,
      true
    );

    await tokenUsageService.recordUsage({
      brandId: request.brandId,
      tokensUsed: result.tokensUsed,
      taskType: 'task-detail-refinement',
      metadata: { instructions }
    });

    return this.createOutput(result.result, result.tokensUsed);
  }
  /**
   * Orchestrate project brief generation
   */
  private async orchestrateProjectBriefGeneration(
    request: OrchestrationRequest
  ): Promise<AgentOutput> {
    // TODO: Implement with Logline Agent
    throw new Error('Project brief generation not yet implemented');
  }

  /**
   * Orchestrate communication channel adaptation
   */
  private async orchestrateCommunicationChannelAdaptation(
    request: OrchestrationRequest
  ): Promise<AgentOutput> {
    // TODO: Implement with Channel Adapter Agent
    throw new Error('Communication channel adaptation not yet implemented');
  }

  /**
   * Orchestrate team member generation
   *
   * Optimized flow: Get minimal context → Select model → Generate
   */
  private async orchestrateTeamMemberGeneration(
    request: OrchestrationRequest
  ): Promise<AgentOutput> {
    const { brandId, payload } = request;
    const { numberOfCharacters = 3, specificRole, hints } = payload;

    this.log('Orchestrating team member generation', {
      brandId,
      numberOfCharacters
    });

    // STEP 1: Get focused context from Brand Context Engine
    const context = await brandContextEngine.getTeamMemberGenerationContext(brandId);

    this.log('Context retrieved', {
      companyName: context.brand.name,
      existingTeamMembers: context.existingTeamMembers.length
    });

    // STEP 2: Analyze task complexity and get model recommendation
    const taskAnalysis = modelRouter.analyzeTask('team-member-creation', {
      contextSize: this.estimateCharacterContextSize(context),
      userComplexity: 'complex'
    });

    const recommendation = modelRouter.getRecommendation(taskAnalysis);
    this.log('Model selected', {
      model: recommendation.model,
      reason: recommendation.reason,
      fallbacks: recommendation.fallbackModels
    });

    // STEP 3: Create optimized input for Team Member Generator with fallbacks
    const teamMemberInput: any = {
      task: 'generate-team-members',
      context: {
        companyName: context.brand.name,
        companyMission: context.brand.mission,
        companyVoice: context.brand.voice,
        companyPersonality: context.brand.personality,
        companyIndustry: context.brand.industry,
        clientProfile: context.brand.targetAudience,
        companyValues: context.brand.values,
        numberOfTeamMembers: numberOfCharacters,
        existingTeamMembers: context.existingTeamMembers,
        specificRole,
        hints
      },
      fallbackModels: recommendation.fallbackModels // Pass fallback models for resilience
    };

    // STEP 4: Execute via Team Member Generator with selected model + fallbacks
    const teamMemberAgent = new TeamMemberGeneratorAgent(recommendation.model);
    const result = await teamMemberAgent.execute(teamMemberInput);

    // STEP 5: Record performance for learning
    modelRouter.recordPerformance(
      recommendation.model,
      'team-member-creation',
      result.metadata.duration,
      result.metadata.cost,
      true
    );

    // STEP 6: Invalidate team member cache so next request gets fresh data
    brandContextEngine.invalidateBrand(brandId);

    // STEP 7: Return orchestrated result
    return this.createOutput(
      {
        teamMembers: result.result,
        metadata: {
          model: recommendation.model,
          contextTokens: this.estimateCharacterContextSize(context),
          totalTokens: result.tokensUsed,
          cost: result.metadata.cost,
          existingCount: context.existingTeamMembers.length
        }
      },
      result.tokensUsed
    );
  }

  /**
   * Orchestrate team member refinement (for "help me" button)
   *
   * Focused on improving a SINGLE team member based on user feedback
   */
  private async orchestrateTeamMemberRefinement(
    request: OrchestrationRequest
  ): Promise<AgentOutput> {
    const { brandId, payload } = request;
    const { teamMember, userInstructions } = payload;

    this.log('Orchestrating team member refinement', {
      brandId,
      teamMemberName: teamMember.name,
      instructions: userInstructions
    });

    // STEP 1: Get minimal brand context (just brand identity, NOT all team members)
    const brandIdentity = await brandContextEngine.getBrandIdentity(brandId);

    this.log('Context retrieved for refinement', {
      brandName: brandIdentity.name
    });

    // STEP 2: Analyze task complexity (refinement is simpler than generation)
    const taskAnalysis = modelRouter.analyzeTask('team-member-refinement', {
      contextSize: 500, // Smaller context for single team member refinement
      userComplexity: 'medium'
    });

    const recommendation = modelRouter.getRecommendation(taskAnalysis);
    this.log('Model selected', {
      model: recommendation.model,
      reason: recommendation.reason
    });

    // STEP 3: Use Team Member Generator Agent's refine method
    const teamMemberAgent = new TeamMemberGeneratorAgent(recommendation.model);
    const result = await teamMemberAgent.refineTeamMember({
      teamMember,
      userInstructions,
      brandContext: {
        brandName: brandIdentity.name,
        brandVoice: brandIdentity.voice,
        brandPersonality: brandIdentity.personality
      }
    });

    // STEP 4: Record performance
    modelRouter.recordPerformance(
      recommendation.model,
      'team-member-refinement',
      result.metadata.duration,
      result.metadata.cost,
      true
    );

    // STEP 5: Invalidate team member cache
    brandContextEngine.invalidateBrand(brandId);

    // STEP 6: Return refined team member
    return this.createOutput(
      {
        teamMember: result.result,
        metadata: {
          model: recommendation.model,
          tokensUsed: result.tokensUsed,
          cost: result.metadata.cost
        }
      },
      result.tokensUsed
    );
  }

  /**
   * Orchestrate company strategy generation (PHASE 2: AI Prefill Strategy)
   *
   * Transform brand foundation into compelling company strategy
   */
  private async orchestrateCompanyStrategyGeneration(
    request: OrchestrationRequest
  ): Promise<AgentOutput> {
    const { brandId, payload } = request;
    const { brandName, tagline, about, vision, mission, products, targetAudience, personality } = payload;

    this.log('Orchestrating company strategy generation', {
      brandId,
      brandName
    });

    // STEP 1: Analyze task complexity
    const taskAnalysis = modelRouter.analyzeTask('strategy_generation', {
      contextSize: 1500,
      userComplexity: 'complex'
    });

    const recommendation = modelRouter.getRecommendation(taskAnalysis);
    this.log('Model selected', {
      model: recommendation.model,
      reason: recommendation.reason
    });

    // STEP 2: Build the prompts using promptEngine
    const { PromptEngine } = await import('../services/promptEngine');
    const promptEngine = new PromptEngine();

    const prompts = promptEngine.generateCompanyStrategyPrompt({
      brandName,
      tagline,
      about,
      vision,
      mission,
      products,
      buyerProfile: targetAudience,
      personality
    });

    // STEP 3: Call AI with selected model
    const { aiService } = await import('../services/aiService');
    const aiResult = await aiService.generate({
      model: recommendation.model,
      systemPrompt: prompts.system,
      userPrompt: prompts.user,
      temperature: 0.8,
      responseFormat: 'json',
      fallbackModels: recommendation.fallbackModels
    });

    // STEP 4: Parse and validate the response
    const strategy = JSON.parse(aiResult.content);

    if (!strategy.why || !strategy.problem || !strategy.solution ||
      !strategy.cta || !strategy.failure || !strategy.success) {
      throw new Error('AI response missing required strategy fields');
    }

    // STEP 5: Record performance for learning
    modelRouter.recordPerformance(
      recommendation.model,
      'strategy_generation',
      aiResult.duration || 0,
      aiResult.cost || 0,
      true
    );

    // STEP 6: Invalidate brand cache for fresh data
    brandContextEngine.invalidateBrand(brandId);

    // STEP 7: Return orchestrated result
    return this.createOutput(
      strategy,
      aiResult.tokensUsed
    );
  }

  /**
   * Orchestrate Quarterly Plan Generation
   */
  private async orchestrateQuarterlyPlanGeneration(
    request: OrchestrationRequest
  ): Promise<AgentOutput> {
    const { brandId, payload } = request;
    const { quarter, year, themePrompt } = payload;

    this.log('Orchestrating quarterly plan generation', { quarter, year });

    // Get context (simplified - quarters span 3 months)
    const brand = await brandContextEngine.getBrandIdentity(brandId);

    // Analyze task and get model
    const taskAnalysis = modelRouter.analyzeTask('quarterly-plan', {
      contextSize: 1000,
      userComplexity: 'complex'
    });

    const recommendation = modelRouter.getRecommendation(taskAnalysis);
    this.log('Model selected', { model: recommendation.model });

    // Execute via Quarterly Plan Agent
    const quarterlyPlanAgent = new QuarterlyPlanAgent(recommendation.model);
    const result = await quarterlyPlanAgent.execute({
      task: 'generate-quarterly-plan',
      context: {
        companyName: brand.name,
        companyVoice: brand.voice,
        companyPersonality: brand.personality,
        company_challenges: brand.narrativeProblem,
        strategic_solutions: brand.narrativeSolution,
        company_purpose: brand.narrativeWhy,
        quarter,
        year,
        themePrompt
      },
      fallbackModels: recommendation.fallbackModels
    });

    // Record performance
    modelRouter.recordPerformance(
      recommendation.model,
      'quarterly-plan',
      result.metadata.duration,
      result.metadata.cost,
      true
    );

    return this.createOutput(result.result, result.tokensUsed);
  }

  /**
   * Orchestrate Monthly Roadmap Generation
   */
  private async orchestrateMonthlyRoadmapGeneration(
    request: OrchestrationRequest
  ): Promise<AgentOutput> {
    const { brandId, payload } = request;
    const { month, year, themePrompt } = payload;

    this.log('Orchestrating monthly roadmap generation', { month, year });

    // Get focused context from Brand Context Engine
    const context = await brandContextEngine.getMonthlyRoadmapContext({
      brandId,
      month,
      year
    });

    // Analyze task complexity
    const taskAnalysis = modelRouter.analyzeTask('monthly-roadmap', {
      contextSize: 1500,
      userComplexity: 'complex'
    });

    const recommendation = modelRouter.getRecommendation(taskAnalysis);
    this.log('Model selected', { model: recommendation.model });

    // Execute via Quarterly Plan Agent
    const quarterlyPlanAgent = new QuarterlyPlanAgent(recommendation.model);
    const result = await quarterlyPlanAgent.execute({
      task: 'generate-monthly-roadmap',
      context: {
        companyName: context.brand.name,
        companyVoice: context.brand.voice,
        companyPersonality: context.brand.personality,
        company_challenges: context.brand.narrativeProblem,
        strategic_solutions: context.brand.narrativeSolution,
        company_purpose: context.brand.narrativeWhy,
        month,
        year,
        themePrompt,
        events: context.events.map(e => ({
          title: e.title,
          description: e.description,
          date: e.date instanceof Date ? e.date.toISOString().split('T')[0] : String(e.date).split('T')[0]
        })),
        // ✅ STRIP LOCATION ONLY - team members should not have geographic context in strategic planning
        teamMembers: (context.characters || []).map(c => ({
          name: c.name,
          realName: c.stageName,
          professionalPersona: c.persona,
          role: c.title,
          communicationStyle: c.voice
        })),
        previousPlan: context.previousTheme || undefined
      },
      fallbackModels: recommendation.fallbackModels
    });

    // Record performance
    modelRouter.recordPerformance(
      recommendation.model,
      'monthly-roadmap',
      result.metadata.duration,
      result.metadata.cost,
      true
    );

    return this.createOutput(result.result, result.tokensUsed);
  }

  /**
   * Orchestrate Weekly Task Plan Generation
   */
  private async orchestrateWeeklyTaskPlanGeneration(
    request: OrchestrationRequest
  ): Promise<AgentOutput> {
    const { brandId, payload } = request;
    const { monthlyRoadmapId, weekNumber, weekTaskPrompt } = payload;

    this.log('Orchestrating weekly task plan generation', { weekNumber });

    // Get focused context from Brand Context Engine
    const context = await brandContextEngine.getWeeklyTaskPlanContext({
      brandId,
      monthlyRoadmapId,
      weekNumber
    });

    const weekStartIso = context.weekStartDate.toISOString().split('T')[0];
    const weekEndIso = context.weekEndDate.toISOString().split('T')[0];

    // Analyze task complexity
    const taskAnalysis = modelRouter.analyzeTask('weekly-task-plan', {
      contextSize: 2000,
      userComplexity: 'complex'
    });

    const recommendation = modelRouter.getRecommendation(taskAnalysis);
    this.log('Model selected', { model: recommendation.model });

    // Execute via Weekly Task Plan Agent
    const weeklyTaskPlanAgent = new WeeklyTaskPlanAgent(recommendation.model);
    const result = await weeklyTaskPlanAgent.execute({
      task: 'generate-weekly-task-plan',
      context: {
        companyName: context.brand.name,
        companyVoice: context.brand.voice,
        monthlyRoadmap: context.monthlyRoadmap.theme,
        monthlyRoadmapDescription: context.monthlyRoadmap.description,
        weekNumber,
        weekStart: weekStartIso,
        weekEnd: weekEndIso,
        weekTask: weekTaskPrompt || '',
        events: context.events.map(e => ({
          title: e.title,
          description: e.description,
          date: e.date instanceof Date ? e.date.toISOString().split('T')[0] : String(e.date).split('T')[0]
        })),
        // ✅ STRIP LOCATION - no geographic context in AI prompts
        teamMembers: context.teamMembers.map(c => ({
          name: c.name,
          realName: c.stageName || c.name,
          professionalPersona: c.persona,
          role: c.title
        }))
      },
      fallbackModels: recommendation.fallbackModels
    });

    // Record performance
    modelRouter.recordPerformance(
      recommendation.model,
      'weekly-task-plan',
      result.metadata.duration,
      result.metadata.cost,
      true
    );

    await tokenUsageService.recordUsage({
      brandId,
      tokensUsed: result.tokensUsed,
      taskType: 'weekly-task-plan',
      metadata: {
        weekNumber,
        weekStart: weekStartIso,
        weekEnd: weekEndIso
      }
    });

    return this.createOutput(result.result, result.tokensUsed);
  }

  /**
   * Orchestrate Project Schedule Generation
   */
  private async orchestrateProjectScheduleGeneration(
    request: OrchestrationRequest
  ): Promise<AgentOutput> {
    const { brandId, payload } = request;
    const { monthlyRoadmapId, weeklyTaskPlanId, startDay, endDay } = payload;

    this.log('Orchestrating project schedule generation', { startDay, endDay });

    // Get focused context from Brand Context Engine
    const context = await brandContextEngine.getProjectScheduleContext({
      brandId,
      monthlyRoadmapId,
      weeklyTaskPlanId,
      startDay,
      endDay
    });

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    const weekNumber = Math.max(1, Math.ceil(startDay / 7));
    const weekStartDate = new Date(context.monthlyRoadmap.year, context.monthlyRoadmap.month - 1, startDay);
    const weekEndDate = new Date(context.monthlyRoadmap.year, context.monthlyRoadmap.month - 1, endDay);

    const distributionTask = modelRouter.analyzeTask('project-distribution', {
      contextSize: 1200,
      userComplexity: 'medium'
    });

    const distributionRecommendation = modelRouter.getRecommendation(distributionTask);

    const distributionAgent = new WeeklyDistributionAgent(distributionRecommendation.model);
    const distributionResult = await distributionAgent.execute({
      task: 'plan-project-distribution',
      context: {
        companyName: context.brand.name,
        companyVoice: context.brand.voice,
        monthlyRoadmap: context.monthlyRoadmap.theme,
        weeklyTaskPlan: context.weeklyTaskPlan?.description,
        weekNumber,
        weekStart: weekStartDate.toISOString().split('T')[0],
        weekEnd: weekEndDate.toISOString().split('T')[0],
        channels: context.channels,
        events: context.events.map(e => ({
          title: e.title,
          description: e.description,
          date: e.date instanceof Date ? e.date.toISOString().split('T')[0] : String(e.date).split('T')[0]
        })),
        // ✅ STRIP LOCATION - no geographic context in AI prompts
        teamMembers: context.teamMembers.map(c => ({
          name: c.stageName || c.name,
          realName: c.name,
          professionalPersona: c.persona,
          role: c.title
        }))
      },
      fallbackModels: distributionRecommendation.fallbackModels
    });

    modelRouter.recordPerformance(
      distributionRecommendation.model,
      'project-distribution',
      distributionResult.metadata.duration,
      distributionResult.metadata.cost,
      true
    );

    await tokenUsageService.recordUsage({
      brandId,
      tokensUsed: distributionResult.tokensUsed,
      taskType: 'project-distribution',
      metadata: {
        weekNumber,
        range: `${weekStartDate.toISOString().split('T')[0]}:${weekEndDate.toISOString().split('T')[0]}`
      }
    });

    // Analyze task complexity
    const taskAnalysis = modelRouter.analyzeTask('project-schedule', {
      contextSize: 2500,
      userComplexity: 'medium' // More structured than creative
    });

    const recommendation = modelRouter.getRecommendation(taskAnalysis);
    this.log('Model selected', { model: recommendation.model });

    // Execute via Project Schedule Generator Agent
    const projectScheduleAgent = new ProjectScheduleGeneratorAgent(recommendation.model);
    const result = await projectScheduleAgent.execute({
      task: 'generate-project-schedule',
      context: {
        companyName: context.brand.name,
        companyVoice: context.brand.voice,
        companyPersonality: context.brand.personality,
        month: monthNames[context.monthlyRoadmap.month - 1],
        year: context.monthlyRoadmap.year.toString(),
        monthlyRoadmap: context.monthlyRoadmap.theme,
        monthlyRoadmapDescription: context.monthlyRoadmap.description,
        weeklyTaskPlan: context.weeklyTaskPlan?.description,
        startDay,
        endDay,
        channels: context.channels,
        // ✅ STRIP LOCATION - no geographic context in AI prompts
        teamMembers: context.teamMembers.map(c => ({
          name: c.name,
          realName: c.stageName || c.name,
          professionalPersona: c.persona,
          role: c.title
        })),
        events: context.events.map(e => ({
          title: e.title,
          description: e.description,
          date: e.date instanceof Date ? e.date.toISOString().split('T')[0] : String(e.date).split('T')[0]
        })),
        distributionPlan: distributionResult.result
      },
      fallbackModels: recommendation.fallbackModels
    });

    // Record performance
    modelRouter.recordPerformance(
      recommendation.model,
      'project-schedule',
      result.metadata.duration,
      result.metadata.cost,
      true
    );

    await tokenUsageService.recordUsage({
      brandId,
      tokensUsed: result.tokensUsed,
      taskType: 'project-schedule',
      metadata: {
        range: `${startDay}-${endDay}`,
        weekNumber
      }
    });

    return this.createOutput(result.result, result.tokensUsed);
  }

  /**
   * Estimate context size for team member generation
   */
  private estimateTeamMemberContextSize(context: {
    brand: any;
    existingTeamMembers: any[];
  }): number {
    let size = 0;

    // Brand identity (~200 tokens)
    size += context.brand.name.length / 4;
    size += (context.brand.mission?.length || 0) / 4;
    size += context.brand.voice.length / 4;
    size += context.brand.personality.join(', ').length / 4;

    // Existing team members (~50 tokens each)
    size += context.existingTeamMembers.length * 50;

    return Math.ceil(size);
  }

  /**
   * Estimate context size in tokens
   */
  private estimateContextSize(context: TaskDetailContext): number {
    let size = 0;

    // Brand voice
    size += context.brand.voice.length / 4;
    size += context.brand.personality.join(', ').length / 4;

    // Team Member
    if (context.teamMember) {
      size += context.teamMember.name.length / 4;
      size += context.teamMember.voice.length / 4;
    }

    // Event
    if (context.event) {
      size += context.event.title.length / 4;
      size += (context.event.description?.length || 0) / 4;
    }

    // Task Plan
    if (context.taskPlan) {
      size += context.taskPlan.title.length / 4;
      size += (context.taskPlan.description?.length || 0) / 4;
    }

    return Math.ceil(size);
  }

  private async getAvailableTokens(brandId: string): Promise<number | null> {
    try {
      const result = await pool.query(
        `SELECT u.tokens
         FROM brands b
         JOIN users u ON b.user_id = u.id
         WHERE b.id = $1`,
        [brandId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const tokens = result.rows[0].tokens;
      return typeof tokens === 'number' ? tokens : null;
    } catch (error) {
      this.log('Failed to fetch available tokens', error);
      return null;
    }
  }

  /**
   * Get orchestrator stats
   */
  getStats() {
    return {
      registeredAgents: this.agentRegistry.list(),
      modelPerformance: modelRouter.getAllPerformance(),
      cacheStats: brandContextEngine.getCacheStats()
    };
  }

  /**
   * Clear all caches
   */
  clearCaches(brandId?: string) {
    if (brandId) {
      brandContextEngine.invalidateBrand(brandId);
    }
  }

  /**
   * Orchestrate expand project brief (NEW - OPTIMIZED with Client Observer Feedback Loop)
   *
   * Uses ExpandBriefAgent for optimized brief expansion with:
   * - Brand Context Engine for focused context
   * - Model Router for optimal model selection
   * - Optional streaming for progressive UI updates
   * - Client Observer Agent for emotional evaluation and regeneration
   */
  private async orchestrateExpandProjectBrief(
    request: OrchestrationRequest
  ): Promise<AgentOutput> {
    const { brandId, payload } = request;
    const MAX_ATTEMPTS = 3;
    const OBSERVER_THRESHOLD = 7;

    this.log('Orchestrating expand project brief', {
      brand: payload.brandContext?.brandName,
      channel: payload.channel,
      mediaType: payload.mediaType
    });

    // Route to ExpandBriefAgent
    const expandBriefInput: AgentInput = {
      task: 'expand-project-brief',
      context: {
        brandId,
        ...payload
      }
    };

    let result = await this.expandBrief.execute(expandBriefInput);
    let expandedBrief = result.result?.expandedBrief || result.result;
    let attempts = 1;
    let observerFeedback: any = null;

    // Client Observer Feedback Loop (only for non-streaming)
    if (!payload.stream && expandedBrief && payload.brandContext?.buyerProfile) {
      const { ClientObserverAgent } = await import('./clientObserver.agent');
      const observer = new ClientObserverAgent('gpt-4o-mini', OBSERVER_THRESHOLD);

      this.log('Starting Client Observer evaluation loop');

      while (attempts <= MAX_ATTEMPTS) {
        const evaluation = await observer.evaluate({
          expandedBrief: typeof expandedBrief === 'string' ? expandedBrief : JSON.stringify(expandedBrief),
          buyerProfile: payload.brandContext.buyerProfile,
          brandPersona: payload.brandContext.persona,
          brandName: payload.brandContext.brandName,
          originalIdea: payload.brief || payload.projectIdea,
          channel: payload.channel,
          threshold: OBSERVER_THRESHOLD
        });

        this.log(`Observer evaluation attempt ${attempts}`, {
          score: evaluation.score,
          emotions: evaluation.emotions,
          passesThreshold: evaluation.passesThreshold
        });

        observerFeedback = {
          score: evaluation.score,
          emotions: evaluation.emotions,
          reaction: evaluation.primaryReaction,
          attempts
        };

        if (evaluation.passesThreshold) {
          this.log('✅ Brief passed observer threshold', { score: evaluation.score });
          break;
        }

        if (attempts >= MAX_ATTEMPTS) {
          this.log('⚠️ Max attempts reached, delivering best version', {
            finalScore: evaluation.score,
            attempts
          });
          break;
        }

        // Regenerate with feedback
        this.log('🔄 Regenerating brief with observer feedback', {
          improvements: evaluation.improvements,
          attempt: attempts + 1
        });

        const regenerationInput: AgentInput = {
          task: 'expand-project-brief',
          context: {
            brandId,
            ...payload,
            // Add observer feedback to inform regeneration
            directives: [
              payload.directives || '',
              `OBSERVER FEEDBACK (improve these areas): ${evaluation.improvements?.join('; ') || 'Make content more emotionally engaging'}`,
              `TARGET EMOTIONS: ${evaluation.emotions.join(', ')} → should evoke: inspired, awe, touched`
            ].filter(Boolean).join('\n')
          }
        };

        result = await this.expandBrief.execute(regenerationInput);
        expandedBrief = result.result?.expandedBrief || result.result;
        attempts++;
      }
    }

    // Record token usage
    await tokenUsageService.recordUsage({
      brandId,
      tokensUsed: result.tokensUsed,
      taskType: 'expand-project-brief',
      metadata: {
        channel: payload.channel,
        mediaType: payload.mediaType,
        date: payload.date,
        model: result.metadata?.model,
        observerAttempts: attempts,
        observerScore: observerFeedback?.score
      }
    });

    // Enrich result with observer feedback
    if (observerFeedback) {
      result.result = {
        ...result.result,
        expandedBrief: typeof expandedBrief === 'string' ? expandedBrief : result.result?.expandedBrief,
        observerFeedback
      };
    }

    return result;
  }
}

// Singleton instance
export const orchestrator = new OrchestratorAgent();
