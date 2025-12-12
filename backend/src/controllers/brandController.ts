import { FastifyReply, FastifyRequest } from 'fastify';
import { BrandModel } from '../models/Brand';
import { body, validationResult } from 'express-validator';
import { orchestrator } from '../agents/orchestrator.agent';
import { tokenUsageService } from '../services/tokenUsage';

export const brandController = {
  // Create new brand
  create: async (request: FastifyRequest, reply: FastifyReply): Promise<any> => {
    try {
      const { name } = request.body as any;

      // Basic validation
      if (!name || !name.trim()) {
        reply.status(400).send({ error: 'Brand name is required' });
        return;
      }

      const brandData = {
        user_id: (request as any).user!.id,
        ...request.body as any,
      };

      const brand = await BrandModel.create(brandData);

      reply.status(201).send({
        message: 'Brand created successfully',
        brand,
      });
    } catch (error) {
      console.error('Create brand error:', error);
      reply.status(500).send({ error: 'Server error' });
    }
  },

  // Get all brands for current user
  getAll: async (request: FastifyRequest, reply: FastifyReply): Promise<any> => {
    try {
      const brands = await BrandModel.findByUserId((request as any).user!.id);
      reply.send({ brands });
    } catch (error) {
      console.error('Get brands error:', error);
      reply.status(500).send({ error: 'Server error' });
    }
  },

  // Get single brand
  getById: async (request: FastifyRequest, reply: FastifyReply): Promise<any> => {
    try {
      const { id } = request.params as any;
      const brand = await BrandModel.findById(id);

      if (!brand) {
        reply.status(404).send({ error: 'Brand not found' });
        return;
      }

      // Check ownership
      if (brand.user_id !== (request as any).user!.id) {
        reply.status(403).send({ error: 'Access denied' });
        return;
      }

      reply.send({ brand });
    } catch (error) {
      console.error('Get brand error:', error);
      reply.status(500).send({ error: 'Server error' });
    }
  },

  // Update brand
  update: async (request: FastifyRequest, reply: FastifyReply): Promise<any> => {
    try {
      const { id } = request.params as any;
      const brand = await BrandModel.findById(id);

      if (!brand) {
        reply.status(404).send({ error: 'Brand not found' });
        return;
      }

      // Check ownership
      if (brand.user_id !== (request as any).user!.id) {
        reply.status(403).send({ error: 'Access denied' });
        return;
      }

      console.log('📝 Update request body:', JSON.stringify(request.body, null, 2));
      const updatedBrand = await BrandModel.update(id, request.body as any);

      reply.send({
        message: 'Brand updated successfully',
        brand: updatedBrand,
      });
    } catch (error) {
      console.error('Update brand error:', error);
      reply.status(500).send({ error: 'Server error' });
    }
  },

  // Archive brand
  archive: async (request: FastifyRequest, reply: FastifyReply): Promise<any> => {
    try {
      const { id } = request.params as any;
      const brand = await BrandModel.findById(id);

      if (!brand) {
        reply.status(404).send({ error: 'Brand not found' });
        return;
      }

      // Check ownership
      if (brand.user_id !== (request as any).user!.id) {
        reply.status(403).send({ error: 'Access denied' });
        return;
      }

      const updatedBrand = await BrandModel.archive(id);

      reply.send({
        message: 'Brand archived successfully',
        brand: updatedBrand,
      });
    } catch (error) {
      console.error('Archive brand error:', error);
      reply.status(500).send({ error: 'Server error' });
    }
  },

  // Unarchive brand
  unarchive: async (request: FastifyRequest, reply: FastifyReply): Promise<any> => {
    try {
      const { id } = request.params as any;
      const brand = await BrandModel.findById(id);

      if (!brand) {
        reply.status(404).send({ error: 'Brand not found' });
        return;
      }

      // Check ownership
      if (brand.user_id !== (request as any).user!.id) {
        reply.status(403).send({ error: 'Access denied' });
        return;
      }

      const updatedBrand = await BrandModel.unarchive(id);

      reply.send({
        message: 'Brand unarchived successfully',
        brand: updatedBrand,
      });
    } catch (error) {
      console.error('Unarchive brand error:', error);
      reply.status(500).send({ error: 'Server error' });
    }
  },

  // Delete brand
  delete: async (request: FastifyRequest, reply: FastifyReply): Promise<any> => {
    try {
      const { id } = request.params as any;
      const brand = await BrandModel.findById(id);

      if (!brand) {
        reply.status(404).send({ error: 'Brand not found' });
        return;
      }

      // Check ownership
      if (brand.user_id !== (request as any).user!.id) {
        reply.status(403).send({ error: 'Access denied' });
        return;
      }

      await BrandModel.delete(id);

      reply.send({ message: 'Brand deleted successfully' });
    } catch (error) {
      console.error('Delete brand error:', error);
      reply.status(500).send({ error: 'Server error' });
    }
  },

  // Generate Brand Narrative (PHASE 2: AI Prefill Narrative)
  generateNarrative: async (request: FastifyRequest, reply: FastifyReply): Promise<any> => {
    try {
      const { id } = request.params as any;
      const brand = await BrandModel.findById(id);

      if (!brand) {
        reply.status(404).send({ error: 'Brand not found' });
        return;
      }

      // Check ownership
      if (brand.user_id !== (request as any).user!.id) {
        reply.status(403).send({ error: 'Access denied' });
        return;
      }

      console.log('📖 Orchestrating brand narrative generation...', {
        brandId: id,
        brandName: brand.name,
      });

      // Route through orchestrator for optimized narrative generation
      const orchestrationResult = await orchestrator.execute({
        task: 'orchestrate-request',
        context: {
          type: 'generate-brand-narrative',
          brandId: id,
          payload: {
            brandName: brand.name,
            tagline: brand.tagline || '',
            about: brand.about || '',
            vision: brand.vision || '',
            mission: brand.mission || '',
            products: brand.products || '',
            targetAudience: brand.target_audience || '',
            personality: brand.personality || '',
          }
        },
      });

      const narrative = orchestrationResult.result;

      // Validate that all expected fields are present
      if (!narrative.why || !narrative.problem || !narrative.solution ||
          !narrative.cta || !narrative.failure || !narrative.success) {
        throw new Error('AI response missing required narrative fields');
      }

      // Update the brand with the generated narrative
      const updateData: any = {
        narrative_why: narrative.why,
        narrative_problem: narrative.problem,
        narrative_solution: narrative.solution,
        narrative_cta: narrative.cta,
        narrative_failure: narrative.failure,
        narrative_success: narrative.success,
      };
      const updatedBrand = await BrandModel.update(id, updateData);

      reply.send({
        message: 'Brand narrative generated successfully',
        narrative: {
          why: narrative.why,
          problem: narrative.problem,
          solution: narrative.solution,
          cta: narrative.cta,
          failure: narrative.failure,
          success: narrative.success,
        },
        brand: updatedBrand,
        meta: orchestrationResult.metadata,
      });
    } catch (error) {
      console.error('Generate brand narrative error:', error);
      reply.status(500).send({
        error: 'Failed to generate brand narrative',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },

  getTokenUsage: async (request: FastifyRequest, reply: FastifyReply): Promise<any> => {
    try {
      const { id } = request.params as any;
      const monthParam = typeof request.query === 'object' && request.query !== null && 'month' in request.query && typeof (request.query as any).month === 'string' ? (request.query as any).month : undefined;

      const brand = await BrandModel.findById(id);
      if (!brand) {
        reply.status(404).send({ error: 'Brand not found' });
        return;
      }

      if (brand.user_id !== (request as any).user!.id) {
        reply.status(403).send({ error: 'Access denied' });
        return;
      }

      let targetYear: number;
      let targetMonth: number;

      if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
        const [yearStr, monthStr] = monthParam.split('-');
        targetYear = Number(yearStr);
        targetMonth = Number(monthStr);
      } else {
        const now = new Date();
        targetYear = now.getUTCFullYear();
        targetMonth = now.getUTCMonth() + 1;
      }

      const summary = await tokenUsageService.getMonthlySummary(id, targetMonth, targetYear);

      reply.send({
        brand_id: id,
        month: `${targetYear}-${String(targetMonth).padStart(2, '0')}`,
        usage: summary
      });
    } catch (error) {
      console.error('Failed to fetch token usage summary:', error);
      reply.status(500).send({ error: 'Failed to fetch token usage summary' });
    }
  },
};
