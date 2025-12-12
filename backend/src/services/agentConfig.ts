/**
 * Agent Configuration Service
 * Manages runtime configuration for all AI agents
 */

import pool from '../database/db';
import { PoolClient } from 'pg';

export interface AgentConfiguration {
  id: string;
  agentName: string;
  displayName: string;
  description?: string;
  isActive: boolean;
  defaultModel: string;
  fallbackModel?: string;
  maxTokens: number;
  temperature: number;
  capabilities: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentPrompt {
  id: string;
  agentName: string;
  promptType: string;
  promptKey: string;
  promptTemplate: string;
  variables: string[];
  version: number;
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentPerformanceMetric {
  id: string;
  agentName: string;
  modelUsed: string;
  taskType?: string;
  tokensUsed: number;
  executionTimeMs: number;
  success: boolean;
  errorMessage?: string;
  qualityScore?: number;
  costEstimate?: number;
  createdAt: Date;
}

export interface EventCacheEntry {
  id: string;
  brandId: string;
  cacheKey: string;
  eventsData: any;
  subplotSuggestions?: any[];
  generatedBy?: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

class AgentConfigService {
  private configCache: Map<string, AgentConfiguration> = new Map();
  private promptCache: Map<string, Map<string, AgentPrompt>> = new Map();
  private cacheExpiry: number = 5 * 60 * 1000; // 5 minutes

  /**
   * Get configuration for a specific agent
   */
  async getAgentConfig(agentName: string, useCache = true): Promise<AgentConfiguration | null> {
    // Check cache first
    if (useCache && this.configCache.has(agentName)) {
      return this.configCache.get(agentName) || null;
    }

    const result = await pool.query(
      `SELECT
        id, agent_name as "agentName", display_name as "displayName",
        description, is_active as "isActive", default_model as "defaultModel",
        fallback_model as "fallbackModel", max_tokens as "maxTokens",
        temperature, capabilities, metadata, created_at as "createdAt",
        updated_at as "updatedAt"
      FROM agent_configurations
      WHERE agent_name = $1`,
      [agentName]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const config = result.rows[0] as AgentConfiguration;
    this.configCache.set(agentName, config);

    // Auto-expire cache
    setTimeout(() => this.configCache.delete(agentName), this.cacheExpiry);

    return config;
  }

  /**
   * Get all agent configurations
   */
  async getAllAgentConfigs(): Promise<AgentConfiguration[]> {
    const result = await pool.query(
      `SELECT
        id, agent_name as "agentName", display_name as "displayName",
        description, is_active as "isActive", default_model as "defaultModel",
        fallback_model as "fallbackModel", max_tokens as "maxTokens",
        temperature, capabilities, metadata, created_at as "createdAt",
        updated_at as "updatedAt"
      FROM agent_configurations
      ORDER BY agent_name`
    );

    return result.rows as AgentConfiguration[];
  }

  /**
   * Update agent configuration
   */
  async updateAgentConfig(
    agentName: string,
    updates: Partial<Omit<AgentConfiguration, 'id' | 'agentName' | 'createdAt' | 'updatedAt'>>
  ): Promise<AgentConfiguration> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.displayName !== undefined) {
      fields.push(`display_name = $${paramIndex++}`);
      values.push(updates.displayName);
    }
    if (updates.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(updates.description);
    }
    if (updates.isActive !== undefined) {
      fields.push(`is_active = $${paramIndex++}`);
      values.push(updates.isActive);
    }
    if (updates.defaultModel !== undefined) {
      fields.push(`default_model = $${paramIndex++}`);
      values.push(updates.defaultModel);
    }
    if (updates.fallbackModel !== undefined) {
      fields.push(`fallback_model = $${paramIndex++}`);
      values.push(updates.fallbackModel);
    }
    if (updates.maxTokens !== undefined) {
      fields.push(`max_tokens = $${paramIndex++}`);
      values.push(updates.maxTokens);
    }
    if (updates.temperature !== undefined) {
      fields.push(`temperature = $${paramIndex++}`);
      values.push(updates.temperature);
    }
    if (updates.capabilities !== undefined) {
      fields.push(`capabilities = $${paramIndex++}`);
      values.push(JSON.stringify(updates.capabilities));
    }
    if (updates.metadata !== undefined) {
      fields.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(updates.metadata));
    }

    values.push(agentName);

    const result = await pool.query(
      `UPDATE agent_configurations
       SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE agent_name = $${paramIndex}
       RETURNING
        id, agent_name as "agentName", display_name as "displayName",
        description, is_active as "isActive", default_model as "defaultModel",
        fallback_model as "fallbackModel", max_tokens as "maxTokens",
        temperature, capabilities, metadata, created_at as "createdAt",
        updated_at as "updatedAt"`,
      values
    );

    const config = result.rows[0] as AgentConfiguration;

    // Invalidate cache
    this.configCache.delete(agentName);

    return config;
  }

  /**
   * Get prompts for a specific agent
   */
  async getAgentPrompts(agentName: string, activeOnly = true): Promise<AgentPrompt[]> {
    const query = activeOnly
      ? `SELECT
          id, agent_name as "agentName", prompt_type as "promptType",
          prompt_key as "promptKey", prompt_template as "promptTemplate",
          variables, version, is_active as "isActive", notes,
          created_at as "createdAt", updated_at as "updatedAt"
        FROM agent_prompts
        WHERE agent_name = $1 AND is_active = true
        ORDER BY prompt_key, version DESC`
      : `SELECT
          id, agent_name as "agentName", prompt_type as "promptType",
          prompt_key as "promptKey", prompt_template as "promptTemplate",
          variables, version, is_active as "isActive", notes,
          created_at as "createdAt", updated_at as "updatedAt"
        FROM agent_prompts
        WHERE agent_name = $1
        ORDER BY prompt_key, version DESC`;

    const result = await pool.query(query, [agentName]);
    return result.rows as AgentPrompt[];
  }

  /**
   * Get specific prompt by key
   */
  async getPrompt(agentName: string, promptKey: string): Promise<AgentPrompt | null> {
    // Check cache
    const agentCache = this.promptCache.get(agentName);
    if (agentCache?.has(promptKey)) {
      return agentCache.get(promptKey) || null;
    }

    const result = await pool.query(
      `SELECT
        id, agent_name as "agentName", prompt_type as "promptType",
        prompt_key as "promptKey", prompt_template as "promptTemplate",
        variables, version, is_active as "isActive", notes,
        created_at as "createdAt", updated_at as "updatedAt"
      FROM agent_prompts
      WHERE agent_name = $1 AND prompt_key = $2 AND is_active = true
      ORDER BY version DESC
      LIMIT 1`,
      [agentName, promptKey]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const prompt = result.rows[0] as AgentPrompt;

    // Cache it
    if (!this.promptCache.has(agentName)) {
      this.promptCache.set(agentName, new Map());
    }
    this.promptCache.get(agentName)!.set(promptKey, prompt);

    return prompt;
  }

  /**
   * Render prompt template with variables
   */
  renderPrompt(template: string, variables: Record<string, any>): string {
    let rendered = template;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      rendered = rendered.replace(placeholder, String(value));
    }

    return rendered;
  }

  /**
   * Create or update a prompt
   */
  async upsertPrompt(
    agentName: string,
    promptKey: string,
    promptTemplate: string,
    options: {
      promptType?: string;
      variables?: string[];
      notes?: string;
      createNewVersion?: boolean;
    } = {}
  ): Promise<AgentPrompt> {
    const { promptType = 'custom', variables = [], notes, createNewVersion = false } = options;

    if (createNewVersion) {
      // Get latest version
      const latestVersion = await pool.query(
        `SELECT MAX(version) as max_version
         FROM agent_prompts
         WHERE agent_name = $1 AND prompt_key = $2`,
        [agentName, promptKey]
      );

      const newVersion = (latestVersion.rows[0]?.max_version || 0) + 1;

      // Deactivate old versions
      await pool.query(
        `UPDATE agent_prompts
         SET is_active = false
         WHERE agent_name = $1 AND prompt_key = $2`,
        [agentName, promptKey]
      );

      // Insert new version
      const result = await pool.query(
        `INSERT INTO agent_prompts
         (agent_name, prompt_type, prompt_key, prompt_template, variables, version, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING
          id, agent_name as "agentName", prompt_type as "promptType",
          prompt_key as "promptKey", prompt_template as "promptTemplate",
          variables, version, is_active as "isActive", notes,
          created_at as "createdAt", updated_at as "updatedAt"`,
        [agentName, promptType, promptKey, promptTemplate, JSON.stringify(variables), newVersion, notes]
      );

      return result.rows[0] as AgentPrompt;
    } else {
      // Update existing or insert
      const result = await pool.query(
        `INSERT INTO agent_prompts
         (agent_name, prompt_type, prompt_key, prompt_template, variables, notes)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (agent_name, prompt_key, version)
         DO UPDATE SET
           prompt_template = EXCLUDED.prompt_template,
           variables = EXCLUDED.variables,
           notes = EXCLUDED.notes,
           updated_at = CURRENT_TIMESTAMP
         RETURNING
          id, agent_name as "agentName", prompt_type as "promptType",
          prompt_key as "promptKey", prompt_template as "promptTemplate",
          variables, version, is_active as "isActive", notes,
          created_at as "createdAt", updated_at as "updatedAt"`,
        [agentName, promptType, promptKey, promptTemplate, JSON.stringify(variables), notes]
      );

      // Clear cache
      this.promptCache.get(agentName)?.delete(promptKey);

      return result.rows[0] as AgentPrompt;
    }
  }

  /**
   * Track agent performance
   */
  async trackPerformance(metrics: {
    agentName: string;
    modelUsed: string;
    taskType?: string;
    tokensUsed: number;
    executionTimeMs: number;
    success: boolean;
    errorMessage?: string;
    qualityScore?: number;
    costEstimate?: number;
  }): Promise<void> {
    await pool.query(
      `INSERT INTO agent_performance_metrics
       (agent_name, model_used, task_type, tokens_used, execution_time_ms,
        success, error_message, quality_score, cost_estimate)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        metrics.agentName,
        metrics.modelUsed,
        metrics.taskType,
        metrics.tokensUsed,
        metrics.executionTimeMs,
        metrics.success,
        metrics.errorMessage,
        metrics.qualityScore,
        metrics.costEstimate
      ]
    );
  }

  /**
   * Get performance analytics for an agent
   */
  async getPerformanceAnalytics(
    agentName: string,
    daysBack = 7
  ): Promise<{
    totalCalls: number;
    successRate: number;
    avgExecutionTime: number;
    avgTokensUsed: number;
    totalCost: number;
    modelBreakdown: Record<string, number>;
  }> {
    const result = await pool.query(
      `SELECT
        COUNT(*) as total_calls,
        AVG(CASE WHEN success THEN 1 ELSE 0 END) as success_rate,
        AVG(execution_time_ms) as avg_execution_time,
        AVG(tokens_used) as avg_tokens_used,
        SUM(COALESCE(cost_estimate, 0)) as total_cost,
        model_used,
        COUNT(*) as model_count
      FROM agent_performance_metrics
      WHERE agent_name = $1
        AND created_at > NOW() - INTERVAL '1 day' * $2
      GROUP BY model_used`,
      [agentName, daysBack]
    );

    const modelBreakdown: Record<string, number> = {};
    let totalCalls = 0;
    let successRate = 0;
    let avgExecutionTime = 0;
    let avgTokensUsed = 0;
    let totalCost = 0;

    for (const row of result.rows) {
      modelBreakdown[row.model_used] = parseInt(row.model_count);
      totalCalls += parseInt(row.model_count);
      successRate += parseFloat(row.success_rate) * parseInt(row.model_count);
      avgExecutionTime += parseFloat(row.avg_execution_time) * parseInt(row.model_count);
      avgTokensUsed += parseFloat(row.avg_tokens_used) * parseInt(row.model_count);
      totalCost += parseFloat(row.total_cost);
    }

    if (totalCalls > 0) {
      successRate /= totalCalls;
      avgExecutionTime /= totalCalls;
      avgTokensUsed /= totalCalls;
    }

    return {
      totalCalls,
      successRate,
      avgExecutionTime,
      avgTokensUsed,
      totalCost,
      modelBreakdown
    };
  }

  /**
   * Cache event calendar data with subplot suggestions
   */
  async cacheEventCalendar(
    brandId: string,
    cacheKey: string,
    eventsData: any,
    subplotSuggestions?: any[],
    generatedBy?: string,
    ttlHours = 24
  ): Promise<EventCacheEntry> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + ttlHours);

    const result = await pool.query(
      `INSERT INTO event_calendar_cache
       (brand_id, cache_key, events_data, subplot_suggestions, generated_by, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (brand_id, cache_key)
       DO UPDATE SET
         events_data = EXCLUDED.events_data,
         subplot_suggestions = EXCLUDED.subplot_suggestions,
         generated_by = EXCLUDED.generated_by,
         expires_at = EXCLUDED.expires_at,
         updated_at = CURRENT_TIMESTAMP
       RETURNING
        id, brand_id as "brandId", cache_key as "cacheKey",
        events_data as "eventsData", subplot_suggestions as "subplotSuggestions",
        generated_by as "generatedBy", expires_at as "expiresAt",
        created_at as "createdAt", updated_at as "updatedAt"`,
      [brandId, cacheKey, JSON.stringify(eventsData), JSON.stringify(subplotSuggestions), generatedBy, expiresAt]
    );

    return result.rows[0] as EventCacheEntry;
  }

  /**
   * Get cached event calendar data
   */
  async getCachedEventCalendar(brandId: string, cacheKey: string): Promise<EventCacheEntry | null> {
    const result = await pool.query(
      `SELECT
        id, brand_id as "brandId", cache_key as "cacheKey",
        events_data as "eventsData", subplot_suggestions as "subplotSuggestions",
        generated_by as "generatedBy", expires_at as "expiresAt",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM event_calendar_cache
      WHERE brand_id = $1 AND cache_key = $2 AND (expires_at IS NULL OR expires_at > NOW())`,
      [brandId, cacheKey]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as EventCacheEntry;
  }

  /**
   * Clear expired cache entries
   */
  async clearExpiredCache(): Promise<number> {
    const result = await pool.query(
      `DELETE FROM event_calendar_cache
       WHERE expires_at IS NOT NULL AND expires_at < NOW()`
    );

    return result.rowCount || 0;
  }

  /**
   * Clear all caches (config and event)
   */
  clearAllCaches(): void {
    this.configCache.clear();
    this.promptCache.clear();
  }
}

export const agentConfigService = new AgentConfigService();
