/**
 * MODEL ROUTER
 * 
 * Intelligently routes tasks to the most appropriate AI model
 * based on complexity, cost, and performance requirements.
 */

import { AIModel } from '../agents/base';

export type TaskType =
  | 'narrative_generation'
  | 'theme-generation'
  | 'character-creation'
  | 'character-refinement'
  | 'subplot-planning'
  | 'content-writing'
  | 'channel-adaptation'
  | 'quality-check'
  | 'refinement'
  | 'season-theme'
  | 'monthly-plot'
  | 'weekly-subplot'
  | 'weekly-distribution'
  | 'calendar-batch'
  | 'evaluation';

export type Complexity = 'simple' | 'medium' | 'complex';

export interface TaskAnalysis {
  type: TaskType;
  complexity: Complexity;
  tokensNeeded: number;
  requiresCreativity: boolean;
  requiresNuance: boolean;
  requiresStructure: boolean;
  costSensitive: boolean;
  availableTokens?: number;
  historicalCost?: number;
}

export interface ModelCapabilities {
  model: AIModel;
  cost: 'low' | 'medium' | 'high';
  speed: 'fast' | 'medium' | 'slow';
  creativity: number; // 1-10
  structure: number; // 1-10
  maxTokens: number;
  bestFor: TaskType[];
}

/**
 * Model Router
 * 
 * Selects the optimal AI model for each task to balance
 * quality, speed, and cost.
 */
export class ModelRouter {
  private modelCapabilities: Record<AIModel, ModelCapabilities> = {
    'gemini-2.5-flash': {
      model: 'gemini-2.5-flash',
      cost: 'low', // FREE tier!
      speed: 'fast',
      creativity: 8,
      structure: 9,
      maxTokens: 1000000, // 1M tokens context window
      bestFor: ['content-writing', 'character-creation', 'theme-generation', 'subplot-planning', 'channel-adaptation', 'quality-check', 'refinement']
    },
    'gpt-5.1-instant': {
      model: 'gpt-5.1-instant',
      cost: 'high',
      speed: 'fast',
      creativity: 10,
      structure: 10,
      maxTokens: 200000,
      bestFor: ['content-writing', 'character-creation', 'theme-generation', 'subplot-planning', 'refinement', 'channel-adaptation']
    },
    'gpt-5.1': {
      model: 'gpt-5.1',
      cost: 'high',
      speed: 'medium',
      creativity: 10,
      structure: 10,
      maxTokens: 200000,
      bestFor: ['content-writing', 'character-creation', 'theme-generation', 'subplot-planning', 'refinement']
    },
    'gpt-5.1-mini': {
      model: 'gpt-5.1-mini',
      cost: 'medium',
      speed: 'fast',
      creativity: 9,
      structure: 9,
      maxTokens: 128000,
      bestFor: ['channel-adaptation', 'quality-check', 'theme-generation', 'content-writing']
    },
    'gpt-4o': {
      model: 'gpt-4o',
      cost: 'medium',
      speed: 'medium',
      creativity: 9,
      structure: 9,
      maxTokens: 128000,
      bestFor: ['content-writing', 'character-creation', 'refinement']
    },
    'gpt-4o-mini': {
      model: 'gpt-4o-mini',
      cost: 'low',
      speed: 'fast',
      creativity: 7,
      structure: 8,
      maxTokens: 128000,
      bestFor: ['channel-adaptation', 'quality-check', 'theme-generation']
    },
    'gpt-5': {
      model: 'gpt-5',
      cost: 'high',
      speed: 'medium',
      creativity: 10,
      structure: 10,
      maxTokens: 200000,
      bestFor: ['content-writing', 'character-creation', 'theme-generation', 'subplot-planning', 'refinement']
    },
    'claude-sonnet-4': {
      model: 'claude-sonnet-4',
      cost: 'medium',
      speed: 'fast',
      creativity: 9,
      structure: 9,
      maxTokens: 200000,
      bestFor: ['content-writing', 'character-creation', 'subplot-planning', 'refinement']
    },
    'claude-sonnet-4.5': {
      model: 'claude-sonnet-4.5',
      cost: 'medium',
      speed: 'fast',
      creativity: 10,
      structure: 10,
      maxTokens: 200000,
      bestFor: ['content-writing', 'character-creation', 'subplot-planning', 'refinement']
    },
    'claude-haiku-4.5': {
      model: 'claude-haiku-4.5',
      cost: 'low',
      speed: 'fast',
      creativity: 8,
      structure: 9,
      maxTokens: 200000,
      bestFor: ['channel-adaptation', 'quality-check', 'theme-generation', 'character-refinement']
    }
  };

  private performanceHistory: Map<string, {
    model: AIModel;
    taskType: TaskType;
    avgDuration: number;
    avgCost: number;
    successRate: number;
    sampleSize: number;
  }> = new Map();

  /**
   * Select the best model for a given task
   * DEFAULT: Gemini 2.5 Flash (FREE tier with excellent performance)
   * Fallback to paid models only when explicitly needed
   */
  selectModel(task: TaskAnalysis): AIModel {
    // Rule-based selection with budget-awareness
    const availableTokens = typeof task.availableTokens === 'number' ? task.availableTokens : Infinity;
    const estimatedUsage = task.tokensNeeded || 0;
    const budgetCritical = availableTokens !== Infinity && availableTokens < estimatedUsage * 1.2;
    const budgetTight = availableTokens !== Infinity && availableTokens < estimatedUsage * 1.8;

    // PRIORITY RULE: Default to FREE Gemini 2.5 Flash for all tasks
    // It's free, fast, has 1M token context, and handles all task types well
    // Only use paid models when user explicitly configures them in settings

    // For now, always use Gemini as default (can be overridden by agent config)
    return 'gemini-2.5-flash';

    // Legacy rules preserved for when user overrides default in agent config:
    // RULE 1: High creativity + High complexity = Best creative model unless budget constrained
    // if (task.requiresCreativity && task.complexity === 'complex') {
    //   if (budgetCritical) return 'gemini-2.5-flash';
    //   return 'gpt-4o';
    // }

    // RULE 2: Character creation prefers creative model
    // if (task.type === 'character-creation') {
    //   if (budgetCritical) return 'gemini-2.5-flash';
    //   return 'gpt-4o';
    // }

    // RULE 3: Content writing adapts to budget
    // if (task.type === 'content-writing') {
    //   if (budgetCritical) return 'gemini-2.5-flash';
    //   return 'gpt-4o';
    // }

    // RULE 4: Simple structured tasks use fast cheap models
    // if (task.requiresStructure && !task.requiresCreativity && task.complexity === 'simple') {
    //   return 'gemini-2.5-flash';
    // }

    // RULE 5: QA and adaptation use fast models
    // if (task.type === 'channel-adaptation' || task.type === 'quality-check') {
    //   return 'gemini-2.5-flash';
    // }

    // RULE 6: Theme generation can use mid-tier
    // if (task.type === 'theme-generation') {
    //   return 'gemini-2.5-flash';
    // }

    // RULE 7: Subplot planning needs narrative sense but can downgrade if tight
    // if (task.type === 'subplot-planning') {
    //   return 'gemini-2.5-flash';
    // }

    // RULE 8: Refinement prefers high-quality model with downgrade path
    // if (task.type === 'refinement') {
    //   return 'gemini-2.5-flash';
    // }

    // DEFAULT fallback
    // return 'gemini-2.5-flash';
  }

  /**
   * Analyze a task to determine its characteristics
   */
  analyzeTask(
    taskType: TaskType,
    options?: {
      userComplexity?: Complexity;
      contextSize?: number;
      prioritizeSpeed?: boolean;
      prioritizeCost?: boolean;
      availableTokens?: number;
      historicalCost?: number;
    }
  ): TaskAnalysis {
    const defaults = this.getTaskDefaults(taskType);
    
    return {
      type: taskType,
      complexity: options?.userComplexity || defaults.complexity,
      tokensNeeded: options?.contextSize || defaults.tokensNeeded,
      requiresCreativity: defaults.requiresCreativity,
      requiresNuance: defaults.requiresNuance,
      requiresStructure: defaults.requiresStructure,
      costSensitive: options?.prioritizeCost || false,
      availableTokens: options?.availableTokens,
      historicalCost: options?.historicalCost
    };
  }

  /**
   * Get default characteristics for each task type
   */
  private getTaskDefaults(taskType: TaskType): {
    complexity: Complexity;
    tokensNeeded: number;
    requiresCreativity: boolean;
    requiresNuance: boolean;
    requiresStructure: boolean;
  } {
    const defaults = {
      'narrative_generation': {
        complexity: 'complex' as Complexity,
        tokensNeeded: 1500,
        requiresCreativity: true,
        requiresNuance: true,
        requiresStructure: true
      },
      'theme-generation': {
        complexity: 'medium' as Complexity,
        tokensNeeded: 1000,
        requiresCreativity: true,
        requiresNuance: false,
        requiresStructure: true
      },
      'character-creation': {
        complexity: 'complex' as Complexity,
        tokensNeeded: 2500,
        requiresCreativity: true,
        requiresNuance: true,
        requiresStructure: false
      },
      'character-refinement': {
        complexity: 'medium' as Complexity,
        tokensNeeded: 800,
        requiresCreativity: true,
        requiresNuance: true,
        requiresStructure: false
      },
      'subplot-planning': {
        complexity: 'medium' as Complexity,
        tokensNeeded: 2000,
        requiresCreativity: true,
        requiresNuance: false,
        requiresStructure: true
      },
      'content-writing': {
        complexity: 'complex' as Complexity,
        tokensNeeded: 1200,
        requiresCreativity: true,
        requiresNuance: true,
        requiresStructure: false
      },
      'channel-adaptation': {
        complexity: 'simple' as Complexity,
        tokensNeeded: 500,
        requiresCreativity: false,
        requiresNuance: false,
        requiresStructure: true
      },
      'quality-check': {
        complexity: 'simple' as Complexity,
        tokensNeeded: 400,
        requiresCreativity: false,
        requiresNuance: false,
        requiresStructure: true
      },
      'refinement': {
        complexity: 'medium' as Complexity,
        tokensNeeded: 1000,
        requiresCreativity: true,
        requiresNuance: true,
        requiresStructure: false
      },
      'season-theme': {
        complexity: 'complex' as Complexity,
        tokensNeeded: 1500,
        requiresCreativity: true,
        requiresNuance: true,
        requiresStructure: false
      },
      'monthly-plot': {
        complexity: 'complex' as Complexity,
        tokensNeeded: 2000,
        requiresCreativity: true,
        requiresNuance: true,
        requiresStructure: false
      },
      'weekly-subplot': {
        complexity: 'complex' as Complexity,
        tokensNeeded: 2500,
        requiresCreativity: true,
        requiresNuance: true,
        requiresStructure: false
      },
      'weekly-distribution': {
        complexity: 'medium' as Complexity,
        tokensNeeded: 1500,
        requiresCreativity: true,
        requiresNuance: false,
        requiresStructure: true
      },
      'calendar-batch': {
        complexity: 'medium' as Complexity,
        tokensNeeded: 3000,
        requiresCreativity: true,
        requiresNuance: false,
        requiresStructure: true
      },
      'evaluation': {
        complexity: 'simple' as Complexity,
        tokensNeeded: 800,
        requiresCreativity: false,
        requiresNuance: true,
        requiresStructure: false
      }
    };

    return defaults[taskType];
  }

  /**
   * Record performance metrics for learning
   */
  recordPerformance(
    model: AIModel,
    taskType: TaskType,
    duration: number,
    cost: number,
    success: boolean
  ): void {
    const key = `${model}:${taskType}`;
    const existing = this.performanceHistory.get(key);

    if (existing) {
      // Update running averages
      const newSampleSize = existing.sampleSize + 1;
      const newAvgDuration = 
        (existing.avgDuration * existing.sampleSize + duration) / newSampleSize;
      const newAvgCost = 
        (existing.avgCost * existing.sampleSize + cost) / newSampleSize;
      const newSuccessRate = 
        (existing.successRate * existing.sampleSize + (success ? 1 : 0)) / newSampleSize;

      this.performanceHistory.set(key, {
        model,
        taskType,
        avgDuration: newAvgDuration,
        avgCost: newAvgCost,
        successRate: newSuccessRate,
        sampleSize: newSampleSize
      });
    } else {
      // First record
      this.performanceHistory.set(key, {
        model,
        taskType,
        avgDuration: duration,
        avgCost: cost,
        successRate: success ? 1 : 0,
        sampleSize: 1
      });
    }
  }

  /**
   * Get performance stats for a model/task combination
   */
  getPerformanceStats(model: AIModel, taskType: TaskType) {
    return this.performanceHistory.get(`${model}:${taskType}`) || null;
  }

  /**
   * Get all performance history
   */
  getAllPerformance() {
    return Array.from(this.performanceHistory.values());
  }

  /**
   * Compare models for a specific task type
   */
  compareModels(taskType: TaskType): {
    model: AIModel;
    avgDuration: number;
    avgCost: number;
    successRate: number;
  }[] {
    const stats: any[] = [];

    this.performanceHistory.forEach((value, key) => {
      if (value.taskType === taskType) {
        stats.push({
          model: value.model,
          avgDuration: value.avgDuration,
          avgCost: value.avgCost,
          successRate: value.successRate
        });
      }
    });

    // Sort by success rate, then by cost
    return stats.sort((a, b) => {
      if (b.successRate !== a.successRate) {
        return b.successRate - a.successRate;
      }
      return a.avgCost - b.avgCost;
    });
  }

  /**
   * Get model capabilities
   */
  getModelCapabilities(model: AIModel): ModelCapabilities {
    return this.modelCapabilities[model];
  }

  /**
   * Get cost estimate for a task
   */
  estimateCost(task: TaskAnalysis): number {
    const model = this.selectModel(task);
    const capabilities = this.modelCapabilities[model];

    // Gemini is FREE!
    if (model === 'gemini-2.5-flash') {
      return 0;
    }

    // Rough cost estimation for paid models
    const costPerToken = {
      'low': 0.0002,
      'medium': 0.001,
      'high': 0.003
    };

    return (task.tokensNeeded / 1000) * costPerToken[capabilities.cost];
  }

  /**
   * Get recommended model with explanation and fallbacks
   */
  getRecommendation(task: TaskAnalysis): {
    model: AIModel;
    reason: string;
    alternatives: AIModel[];
    fallbackModels: AIModel[]; // Smart fallbacks in priority order
  } {
    const model = this.selectModel(task);
    const capabilities = this.modelCapabilities[model];

    let reason = '';
    const budgetNote = typeof task.availableTokens === 'number'
      ? (() => {
          const estimatedUsage = task.tokensNeeded || 0;
          if (task.availableTokens < estimatedUsage * 1.2) {
            return 'Selected to protect limited remaining tokens.';
          }
          if (task.availableTokens < estimatedUsage * 1.8) {
            return 'Downgraded to respect tight token budget.';
          }
          return '';
        })()
      : '';

    if (task.requiresCreativity && task.complexity === 'complex') {
      reason = 'Selected for high creativity and complexity requirements';
    } else if (task.type === 'content-writing') {
      reason = 'Optimized for high-quality content generation';
    } else if (task.type === 'channel-adaptation' || task.type === 'quality-check') {
      reason = 'Fast and cost-effective for structured tasks';
    } else {
      reason = 'Balanced selection for quality and cost';
    }

    if (budgetNote) {
      reason = `${reason} ${budgetNote}`.trim();
    }

    // Find alternative models that can handle this task
    const alternatives: AIModel[] = [];
    Object.values(this.modelCapabilities).forEach(cap => {
      if (cap.model !== model && cap.bestFor.includes(task.type)) {
        alternatives.push(cap.model);
      }
    });

    // Build smart fallback list (prioritize different providers for resilience)
    const fallbackModels = this.buildFallbackList(model, task.type);

    return {
      model,
      reason,
      alternatives,
      fallbackModels
    };
  }

  /**
   * Build intelligent fallback model list
   * Strategy: Prefer claude-haiku-4.5 as the universal fallback,
   * then offer cheaper GPT option for budget protection.
   */
  private buildFallbackList(primaryModel: AIModel, taskType: TaskType): AIModel[] {
    const fallbacks: AIModel[] = [];

    if (primaryModel !== 'claude-haiku-4.5') {
      fallbacks.push('claude-haiku-4.5');
    }
    if (primaryModel !== 'gpt-4o-mini') {
      fallbacks.push('gpt-4o-mini');
    }

    // Preserve any other capable models as tertiary options, excluding duplicates
    Object.values(this.modelCapabilities).forEach(cap => {
      if (cap.model !== primaryModel && !fallbacks.includes(cap.model) && cap.bestFor.includes(taskType)) {
        fallbacks.push(cap.model);
      }
    });

    console.log(`🔄 Fallback models for ${primaryModel}: ${fallbacks.join(', ')}`);

    return fallbacks;
  }
}

// Singleton instance
export const modelRouter = new ModelRouter();
