/**
 * Agent Configuration Routes
 * Admin-only endpoints for managing AI agent configurations
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { agentConfigService } from '../services/agentConfig';

export default async function agentConfigRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/agent-config
   * Get all agent configurations
   */
  fastify.get('/', { preHandler: [authenticateToken as any, requireAdmin as any] }, async (req: FastifyRequest, res: FastifyReply) => {
    try {
      const configs = await agentConfigService.getAllAgentConfigs();
      res.send(configs);
    } catch (error) {
      console.error('Error fetching agent configs:', error);
      res.status(500).send({ error: 'Failed to fetch agent configurations' });
    }
  });

  /**
   * GET /api/agent-config/:agentName
   * Get specific agent configuration
   */
  fastify.get('/:agentName', { preHandler: [authenticateToken as any, requireAdmin as any] }, async (req: FastifyRequest, res: FastifyReply) => {
    try {
      const { agentName } = req.params as { agentName: string };
      const config = await agentConfigService.getAgentConfig(agentName, false);

      if (!config) {
        return res.status(404).send({ error: 'Agent configuration not found' });
      }

      res.send(config);
    } catch (error) {
      console.error('Error fetching agent config:', error);
      res.status(500).send({ error: 'Failed to fetch agent configuration' });
    }
  });

  /**
   * PUT /api/agent-config/:agentName
   * Update agent configuration
   */
  fastify.put('/:agentName', { preHandler: [authenticateToken as any, requireAdmin as any] }, async (req: FastifyRequest, res: FastifyReply) => {
    try {
      const { agentName } = req.params as { agentName: string };
      const updates = req.body as any;

      const config = await agentConfigService.updateAgentConfig(agentName, updates);
      res.send(config);
    } catch (error) {
      console.error('Error updating agent config:', error);
      res.status(500).send({ error: 'Failed to update agent configuration' });
    }
  });

  /**
   * GET /api/agent-config/:agentName/prompts
   * Get all prompts for an agent
   */
  fastify.get('/:agentName/prompts', { preHandler: [authenticateToken as any, requireAdmin as any] }, async (req: FastifyRequest, res: FastifyReply) => {
    try {
      const { agentName } = req.params as { agentName: string };
      const { activeOnly } = req.query as { activeOnly?: string };
      const activeOnlyFlag = activeOnly !== 'false';

      const prompts = await agentConfigService.getAgentPrompts(agentName, activeOnlyFlag);
      res.send(prompts);
    } catch (error) {
      console.error('Error fetching prompts:', error);
      res.status(500).send({ error: 'Failed to fetch prompts' });
    }
  });

  /**
   * GET /api/agent-config/:agentName/prompts/:promptKey
   * Get specific prompt
   */
  fastify.get('/:agentName/prompts/:promptKey', { preHandler: [authenticateToken as any, requireAdmin as any] }, async (req: FastifyRequest, res: FastifyReply) => {
    try {
      const { agentName, promptKey } = req.params as { agentName: string; promptKey: string };
      const prompt = await agentConfigService.getPrompt(agentName, promptKey);

      if (!prompt) {
        return res.status(404).send({ error: 'Prompt not found' });
      }

      res.send(prompt);
    } catch (error) {
      console.error('Error fetching prompt:', error);
      res.status(500).send({ error: 'Failed to fetch prompt' });
    }
  });

  /**
   * POST /api/agent-config/:agentName/prompts
   * Create or update a prompt
   */
  fastify.post('/:agentName/prompts', { preHandler: [authenticateToken as any, requireAdmin as any] }, async (req: FastifyRequest, res: FastifyReply) => {
    try {
      const { agentName } = req.params as { agentName: string };
      const { promptKey, promptTemplate, promptType, variables, notes, createNewVersion } = req.body as any;

      if (!promptKey || !promptTemplate) {
        return res.status(400).send({ error: 'promptKey and promptTemplate are required' });
      }

      const prompt = await agentConfigService.upsertPrompt(
        agentName,
        promptKey,
        promptTemplate,
        { promptType, variables, notes, createNewVersion }
      );

      res.send(prompt);
    } catch (error) {
      console.error('Error upserting prompt:', error);
      res.status(500).send({ error: 'Failed to save prompt' });
    }
  });

  /**
   * GET /api/agent-config/:agentName/performance
   * Get performance analytics for an agent
   */
  fastify.get('/:agentName/performance', { preHandler: [authenticateToken as any, requireAdmin as any] }, async (req: FastifyRequest, res: FastifyReply) => {
    try {
      const { agentName } = req.params as { agentName: string };
      const { daysBack } = req.query as { daysBack?: string };
      const daysBackNum = parseInt(daysBack || '7') || 7;

      const analytics = await agentConfigService.getPerformanceAnalytics(agentName, daysBackNum);
      res.send(analytics);
    } catch (error) {
      console.error('Error fetching performance analytics:', error);
      res.status(500).send({ error: 'Failed to fetch performance analytics' });
    }
  });

  /**
   * POST /api/agent-config/cache/clear
   * Clear all configuration caches
   */
  fastify.post('/cache/clear', { preHandler: [authenticateToken as any, requireAdmin as any] }, async (req: FastifyRequest, res: FastifyReply) => {
    try {
      agentConfigService.clearAllCaches();
      res.send({ message: 'Caches cleared successfully' });
    } catch (error) {
      console.error('Error clearing caches:', error);
      res.status(500).send({ error: 'Failed to clear caches' });
    }
  });
}
