import { FastifyReply, FastifyRequest } from 'fastify';
import { CharacterModel, BrandCharacter } from '../models/Character';
import { BrandModel } from '../models/Brand';
import { body, validationResult } from 'express-validator';
import { orchestrator } from '../agents/orchestrator.agent';
import { formatPersonalityToOneLine, needsFormatting } from '../utils/personalityFormatter';
import { brandContextEngine } from '../services/brandContext';

/**
 * Format character for API response
 */
const parseJSONField = <T>(value: any, fallback: T): T => {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed ?? fallback;
    } catch (error) {
      console.warn('Failed to parse JSON field for character:', error);
      return fallback;
    }
  }

  if (typeof value === 'object') {
    return value as T;
  }

  return fallback;
};

const formatCharacter = (character: BrandCharacter) => {
  return {
    ...character,
    perfect_fields: parseJSONField(character.perfect_fields, {}),
    quirks: parseJSONField(character.quirks, []),
    content_strengths: parseJSONField(character.content_strengths, []),
    sample_quotes: parseJSONField(character.sample_quotes, [])
  };
};

/**
 * Format multiple characters for API response
 */
const formatCharacters = (characters: BrandCharacter[]) => {
  return characters.map(formatCharacter);
};

export const characterController = {
  // Generate characters with AI (placeholder - you'll integrate OpenAI later)
  generate: async (request: FastifyRequest, reply: FastifyReply): Promise<any> => {
    try {
      const { brand_id, count, hints } = request.body as any;

      // Basic validation
      if (!brand_id) {
        reply.status(400).send({ error: 'Brand ID is required' });
        return;
      }

      if (!count || count < 1 || count > 10) {
        reply.status(400).send({ error: 'Count must be between 1 and 10' });
        return;
      }

      // Verify brand ownership
      const brand = await BrandModel.findById(brand_id);
      if (!brand || brand.user_id !== (request as any).user!.id) {
        reply.status(403).send({ error: 'Access denied' });
        return;
      }

      // Use orchestrator for optimized character generation
      console.log('🎭 Orchestrating character generation...', {
        brandId: brand_id,
        count,
        hints
      });

      // Route through orchestrator for context optimization and model selection
      const orchestrationResult = await orchestrator.execute({
        task: 'orchestrate-request',
        context: {
          type: 'generate-characters',
          brandId: brand_id,
          payload: {
            numberOfCharacters: count,
            hints
          }
        }
      });

      const agentResult = orchestrationResult.result;

      console.log('✨ Characters generated via orchestrator:', {
        count: agentResult.characters.length,
        names: agentResult.characters.map((c: any) => c.name),
        model: agentResult.metadata.model,
        tokensUsed: agentResult.metadata.totalTokens,
        cost: agentResult.metadata.cost
      });

      // Get existing characters count for order_index
      const existingCharacters = await CharacterModel.findByBrandId(brand_id);

      // Transform orchestrator output to database format
      const charactersToCreate = agentResult.characters.map((char: any, index: number) => ({
        brand_id,
        name: char.name,
        description: char.description,
        role: char.role,
        location: char.location,
        personality_tags: char.personality_tags,
        voice: char.voice,
        day_of_week: char.day_of_week,
        order_index: existingCharacters.length + index,
        // Store additional rich data as JSON metadata
        metadata: {
          backstory: char.backstory,
          archetype: char.archetype,
          emotional_range: char.emotional_range,
          speaking_style: char.speaking_style,
          quirks: char.quirks,
          relationships: char.relationships,
          growth_arc: char.growth_arc,
          content_strengths: char.content_strengths,
          sample_quotes: char.sample_quotes
        }
      }));

      const characters = await CharacterModel.bulkCreate(charactersToCreate);

      reply.status(201).send({
        message: 'Characters generated successfully',
        characters: formatCharacters(characters),
        brandType: characters.length === 1 ? 'Solo Brand' : 'Ensemble Brand',
      });
    } catch (error) {
      console.error('Generate characters error:', error);
      reply.status(500).send({ error: 'Server error' });
    }
  },

  // Get all characters for a brand
  getByBrand: async (request: FastifyRequest, reply: FastifyReply): Promise<any> => {
    try {
      const { brandId } = request.params as any;

      // Verify brand ownership
      const brand = await BrandModel.findById(brandId);
      if (!brand || brand.user_id !== (request as any).user!.id) {
        reply.status(403).send({ error: 'Access denied' });
        return;
      }

      const characters = await CharacterModel.findByBrandId(brandId);
      const characterCount = await CharacterModel.countByBrandId(brandId);

      reply.send({
        characters: formatCharacters(characters),
        brandType: characterCount === 1 ? 'Solo Brand' : 'Ensemble Brand',
        count: characterCount,
      });
    } catch (error) {
      console.error('Get characters error:', error);
      reply.status(500).send({ error: 'Server error' });
    }
  },

  // Create single character
  create: async (request: FastifyRequest, reply: FastifyReply): Promise<any> => {
    try {
      const { brand_id } = request.body as any;

      // Basic validation
      if (!brand_id) {
        reply.status(400).send({ error: 'Brand ID is required' });
        return;
      }

      // Verify brand ownership
      const brand = await BrandModel.findById(brand_id);
      if (!brand || brand.user_id !== (request as any).user!.id) {
        reply.status(403).send({ error: 'Access denied' });
        return;
      }

      const character = await CharacterModel.create(request.body as any);

      reply.status(201).send({
        message: 'Character created successfully',
        character: formatCharacter(character),
      });
    } catch (error) {
      console.error('Create character error:', error);
      reply.status(500).send({ error: 'Server error' });
    }
  },

  // Update character
  update: async (request: FastifyRequest, reply: FastifyReply): Promise<any> => {
    try {
      const { id } = request.params as any;
      const character = await CharacterModel.findById(id);

      if (!character) {
        reply.status(404).send({ error: 'Character not found' });
        return;
      }

      // Verify brand ownership
      const brand = await BrandModel.findById(character.brand_id);
      if (!brand || brand.user_id !== (request as any).user!.id) {
        reply.status(403).send({ error: 'Access denied' });
        return;
      }

      // Auto-format personality if it's raw MBTI data
      const updates: any = { ...request.body as any };
      if (updates.personality && needsFormatting(updates.personality)) {
        const formatted = formatPersonalityToOneLine(updates.personality);
        if (formatted) {
          console.log('🎭 Auto-formatted personality:', {
            before: updates.personality,
            after: formatted
          });
          updates.personality = formatted;
        }
      }

      const updatedCharacter = await CharacterModel.update(id, updates);

      // Invalidate brand cache to ensure muted characters are filtered in calendar generation
      brandContextEngine.invalidateBrand(character.brand_id);

      reply.send({
        message: 'Character updated successfully',
        character: formatCharacter(updatedCharacter),
      });
    } catch (error) {
      console.error('Update character error:', error);
      reply.status(500).send({ error: 'Server error' });
    }
  },

  // Mark character as perfect
  markPerfect: async (request: FastifyRequest, reply: FastifyReply): Promise<any> => {
    try {
      const { id } = request.params as any;
      const character = await CharacterModel.findById(id);

      if (!character) {
        reply.status(404).send({ error: 'Character not found' });
        return;
      }

      // Verify brand ownership
      const brand = await BrandModel.findById(character.brand_id);
      if (!brand || brand.user_id !== (request as any).user!.id) {
        reply.status(403).send({ error: 'Access denied' });
        return;
      }

      const updatedCharacter = await CharacterModel.markPerfect(id);

      reply.send({
        message: 'Character marked as perfect',
        character: formatCharacter(updatedCharacter),
      });
    } catch (error) {
      console.error('Mark perfect error:', error);
      reply.status(500).send({ error: 'Server error' });
    }
  },

  // Toggle mute status
  toggleMute: async (request: FastifyRequest, reply: FastifyReply): Promise<any> => {
    try {
      const { id } = request.params as any;
      const character = await CharacterModel.findById(id);

      if (!character) {
        reply.status(404).send({ error: 'Character not found' });
        return;
      }

      // Verify brand ownership
      const brand = await BrandModel.findById(character.brand_id);
      if (!brand || brand.user_id !== (request as any).user!.id) {
        reply.status(403).send({ error: 'Access denied' });
        return;
      }

      const updatedCharacter = await CharacterModel.toggleMute(id);

      // Invalidate brand cache to ensure season/monthly contexts refresh with new character state
      brandContextEngine.invalidateBrand(character.brand_id);

      reply.send({
        message: updatedCharacter.is_muted ? 'Character muted' : 'Character unmuted',
        character: formatCharacter(updatedCharacter),
      });
    } catch (error) {
      console.error('Toggle mute error:', error);
      reply.status(500).send({ error: 'Server error' });
    }
  },

  // Delete character
  delete: async (request: FastifyRequest, reply: FastifyReply): Promise<any> => {
    try {
      const { id } = request.params as any;
      const character = await CharacterModel.findById(id);

      if (!character) {
        reply.status(404).send({ error: 'Character not found' });
        return;
      }

      // Verify brand ownership
      const brand = await BrandModel.findById(character.brand_id);
      if (!brand || brand.user_id !== (request as any).user!.id) {
        reply.status(403).send({ error: 'Access denied' });
        return;
      }

      await CharacterModel.delete(id);

      reply.send({ message: 'Character deleted successfully' });
    } catch (error) {
      console.error('Delete character error:', error);
      reply.status(500).send({ error: 'Server error' });
    }
  },

  // Regenerate non-perfect characters
  regenerate: async (request: FastifyRequest, reply: FastifyReply): Promise<any> => {
    try {
      const { brand_id, count, hints } = request.body as any;

      // Basic validation
      if (!brand_id) {
        reply.status(400).send({ error: 'Brand ID is required' });
        return;
      }

      if (!count || count < 1 || count > 10) {
        reply.status(400).send({ error: 'Count must be between 1 and 10' });
        return;
      }

      // Verify brand ownership
      const brand = await BrandModel.findById(brand_id);
      if (!brand || brand.user_id !== (request as any).user!.id) {
        reply.status(403).send({ error: 'Access denied' });
        return;
      }

      // Get existing perfect characters BEFORE deletion (they provide context)
      const perfectCharacters = await CharacterModel.findByBrandId(brand_id);
      const perfectOnes = perfectCharacters.filter(c => c.is_perfect);

      console.log('🔄 Regenerating imperfect characters...', {
        brandId: brand_id,
        count,
        perfectCharactersCount: perfectOnes.length,
        hints
      });

      // Delete non-perfect characters
      await CharacterModel.deleteNonPerfect(brand_id);

      // Use orchestrator for character generation with ALL existing perfect characters as context
      const orchestrationResult = await orchestrator.execute({
        task: 'orchestrate-request',
        context: {
          type: 'generate-characters',
          brandId: brand_id,
          payload: {
            numberOfCharacters: count,
            hints,
            // IMPORTANT: Pass ALL perfect characters so new ones complement the ensemble
            regenerating: true
          }
        }
      });

      const agentResult = orchestrationResult.result;

      console.log('✨ Characters regenerated via orchestrator:', {
        count: agentResult.characters.length,
        names: agentResult.characters.map((c: any) => c.name),
        model: agentResult.metadata.model,
        tokensUsed: agentResult.metadata.totalTokens,
        cost: agentResult.metadata.cost,
        keptPerfect: agentResult.metadata.existingCount
      });

      // Transform orchestrator output to database format
      const charactersToCreate = agentResult.characters.map((char: any, index: number) => ({
        brand_id,
        name: char.name,
        description: char.description,
        role: char.role,
        location: char.location,
        personality_tags: char.personality_tags,
        voice: char.voice,
        day_of_week: char.day_of_week,
        order_index: perfectOnes.length + index, // Continue after perfect characters
        // Store additional rich data as JSON metadata
        metadata: {
          backstory: char.backstory,
          archetype: char.archetype,
          emotional_range: char.emotional_range,
          speaking_style: char.speaking_style,
          quirks: char.quirks,
          relationships: char.relationships,
          growth_arc: char.growth_arc,
          content_strengths: char.content_strengths,
          sample_quotes: char.sample_quotes
        }
      }));

      const newCharacters = await CharacterModel.bulkCreate(charactersToCreate);

      // Get all characters (perfect + new)
      const allCharacters = await CharacterModel.findByBrandId(brand_id);

      reply.send({
        message: 'Characters regenerated successfully',
        characters: formatCharacters(allCharacters),
        brandType: allCharacters.length === 1 ? 'Solo Brand' : 'Ensemble Brand',
      });
    } catch (error) {
      console.error('Regenerate characters error:', error);
      reply.status(500).send({ error: 'Server error' });
    }
  },
};
