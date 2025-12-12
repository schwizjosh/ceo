import pool from '../database/db';

export type AgeRange = 'teen' | 'early-20s' | 'mid-20s' | 'late-20s' | 'early-30s' | 'mid-30s' | 'late-30s' | 'early-40s' | 'mid-40s' | 'late-40s' | '50s' | '60s+';

export interface CharacterPerfectFields {
  name?: boolean; // Dramatic role (The Architect, etc.)
  character_name?: boolean; // Real name (Josh, Starr, etc.)
  role?: boolean;
  age_range?: boolean;
  work_mode?: boolean;
  gender?: boolean;
  personality?: boolean;
  persona?: boolean;
}

export interface BrandCharacter {
  id: string;
  brand_id: string;
  name: string; // Dramatic role: The Guardian, The Mother, The Keeper, etc.
  character_name?: string; // Real name: Josh, Starr, Oma, etc. (maps to real_name in DB)
  role?: string;
  about?: string;
  personality?: string; // One-line personality (can reference 16personalities.com)
  age_range?: AgeRange;
  work_mode?: 'onsite' | 'remote' | 'hybrid';
  gender?: string; // Gender for pronoun usage
  persona?: string;
  perfect_fields?: CharacterPerfectFields;
  description?: string;
  is_perfect: boolean;
  is_muted: boolean; // When true, character is hidden from story engine
  order_index: number;
  // AI-generated character fields
  backstory?: string;
  voice?: string; // Character & Voice - captures the person's character and voice (optional user extension)
  day_of_week?: string;
  speaking_style?: string;
  quirks?: string[];
  relationships?: string;
  growth_arc?: string;
  content_strengths?: string[];
  sample_quotes?: string[];
  location?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateCharacterInput {
  brand_id: string;
  name: string; // Dramatic role: The Guardian, The Mother, etc.
  character_name?: string; // Real name: Josh, Starr, Oma, etc.
  role?: string;
  about?: string;
  personality?: string; // One-line personality
  age_range?: AgeRange;
  work_mode?: 'onsite' | 'remote' | 'hybrid';
  gender?: string; // Gender for pronoun usage
  persona?: string;
  perfect_fields?: CharacterPerfectFields;
  description?: string;
  is_perfect?: boolean;
  is_muted?: boolean;
  order_index?: number;
  // AI-generated character fields
  backstory?: string;
  voice?: string; // Character & Voice (optional user extension)
  day_of_week?: string;
  speaking_style?: string;
  quirks?: string[];
  relationships?: string;
  growth_arc?: string;
  content_strengths?: string[];
  sample_quotes?: string[];
  location?: string;
}

export const CharacterModel = {
  // Create new character
  async create(characterData: CreateCharacterInput): Promise<BrandCharacter> {
    const query = `
      INSERT INTO brand_characters (
        brand_id, name, real_name, role, about, personality,
        age_range, work_mode, gender, persona, perfect_fields, description, is_perfect, is_muted, order_index,
        backstory, voice, day_of_week, speaking_style, quirks,
        relationships, growth_arc, content_strengths, sample_quotes, location
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
      RETURNING *, real_name as character_name
    `;
    const values = [
      characterData.brand_id,
      characterData.name,
      characterData.character_name, // Maps to real_name in DB
      characterData.role,
      characterData.about,
      characterData.personality,
      characterData.age_range,
      characterData.work_mode || 'onsite',
      characterData.gender,
      characterData.persona,
      JSON.stringify(characterData.perfect_fields || {}),
      characterData.description,
      characterData.is_perfect || false,
      characterData.is_muted || false,
      characterData.order_index || 0,
      // AI-generated fields
      characterData.backstory,
      characterData.voice,
      characterData.day_of_week,
      characterData.speaking_style,
      JSON.stringify(characterData.quirks || []),
      characterData.relationships,
      characterData.growth_arc,
      JSON.stringify(characterData.content_strengths || []),
      JSON.stringify(characterData.sample_quotes || []),
      characterData.location
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  // Find characters by brand ID
  async findByBrandId(brandId: string): Promise<BrandCharacter[]> {
    const query = `
      SELECT *, real_name as character_name FROM brand_characters
      WHERE brand_id = $1
      ORDER BY order_index ASC, created_at ASC
    `;
    const result = await pool.query(query, [brandId]);
    return result.rows;
  },

  // Find character by ID
  async findById(id: string): Promise<BrandCharacter | null> {
    const query = 'SELECT *, real_name as character_name FROM brand_characters WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  },

  // Update character
  async update(id: string, updates: Partial<BrandCharacter>): Promise<BrandCharacter> {
    // Deprecated fields that have been removed from the database
    const deprecatedFields = ['emotional_range', 'emotionalRange', 'personality_tags', 'personalityTags'];

    // Filter out deprecated fields
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([key]) => !deprecatedFields.includes(key))
    );

    // Map camelCase to snake_case for database columns
    const fieldMapping: Record<string, string> = {
      'isPerfect': 'is_perfect',
      'isMuted': 'is_muted',
      'brandId': 'brand_id',
      'characterName': 'real_name',  // character_name maps to real_name in DB
      'character_name': 'real_name',  // Also handle snake_case from frontend
      'ageRange': 'age_range',
      'workMode': 'work_mode',
      'perfectFields': 'perfect_fields',
      'orderIndex': 'order_index',
      'createdAt': 'created_at',
      'updatedAt': 'updated_at',
      // AI-generated field mappings
      'dayOfWeek': 'day_of_week',
      'speakingStyle': 'speaking_style',
      'growthArc': 'growth_arc',
      'contentStrengths': 'content_strengths',
      'sampleQuotes': 'sample_quotes'
    };

    const entries = Object.entries(filteredUpdates).filter(([, val]) => val !== undefined);

    if (entries.length === 0) {
      const existing = await this.findById(id);
      if (!existing) {
        throw new Error('Character not found');
      }
      return existing;
    }

    const fields = entries.map(([field]) => fieldMapping[field] || field);
    const values = entries.map(([field, val]) => {
      if (val === undefined) return val;

      // Handle array fields - convert to JSONB
      if (Array.isArray(val)) {
        return JSON.stringify(val);
      }

      const dbField = fieldMapping[field] || field;

      // JSONB fields that need stringification
      const jsonbFields = ['perfect_fields', 'perfectFields', 'quirks',
                          'content_strengths', 'contentStrengths', 'sample_quotes', 'sampleQuotes'];

      if (jsonbFields.includes(dbField) || jsonbFields.includes(field)) {
        return val !== null ? JSON.stringify(val) : null;
      }

      return val;
    });
    const setClause = fields.map((field, i) => `${field} = $${i + 2}`).join(', ');

    const query = `
      UPDATE brand_characters
      SET ${setClause}
      WHERE id = $1
      RETURNING *, real_name as character_name
    `;
    const result = await pool.query(query, [id, ...values]);
    return result.rows[0];
  },

  // Delete character
  async delete(id: string): Promise<void> {
    const query = 'DELETE FROM brand_characters WHERE id = $1';
    await pool.query(query, [id]);
  },

  // Delete all non-perfect characters for a brand (for regeneration)
  async deleteNonPerfect(brandId: string): Promise<void> {
    const query = 'DELETE FROM brand_characters WHERE brand_id = $1 AND is_perfect = false';
    await pool.query(query, [brandId]);
  },

  // Mark character as perfect
  async markPerfect(id: string): Promise<BrandCharacter> {
    const query = `
      UPDATE brand_characters
      SET is_perfect = true
      WHERE id = $1
      RETURNING *, real_name as character_name
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  },

  // Toggle mute status
  async toggleMute(id: string): Promise<BrandCharacter> {
    const query = `
      UPDATE brand_characters
      SET is_muted = NOT COALESCE(is_muted, false)
      WHERE id = $1
      RETURNING *, real_name as character_name
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  },

  // Mute character
  async mute(id: string): Promise<BrandCharacter> {
    const query = `
      UPDATE brand_characters
      SET is_muted = true
      WHERE id = $1
      RETURNING *, real_name as character_name
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  },

  // Unmute character
  async unmute(id: string): Promise<BrandCharacter> {
    const query = `
      UPDATE brand_characters
      SET is_muted = false
      WHERE id = $1
      RETURNING *, real_name as character_name
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  },

  // Get character count for a brand
  async countByBrandId(brandId: string): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM brand_characters WHERE brand_id = $1';
    const result = await pool.query(query, [brandId]);
    return parseInt(result.rows[0].count);
  },

  // Bulk create characters
  async bulkCreate(characters: CreateCharacterInput[]): Promise<BrandCharacter[]> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const createdCharacters: BrandCharacter[] = [];

      for (const char of characters) {
        const query = `
          INSERT INTO brand_characters (
            brand_id, name, role, about, personality,
            age_range, work_mode, gender, persona, perfect_fields, description, is_perfect, is_muted, order_index,
            backstory, voice, day_of_week, speaking_style, quirks,
            relationships, growth_arc, content_strengths, sample_quotes, location
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
          RETURNING *
        `;
        const values = [
          char.brand_id,
          char.name,
          char.role,
          char.about,
          char.personality,
          char.age_range,
          char.work_mode || 'onsite',
          char.gender,
          char.persona,
          JSON.stringify(char.perfect_fields || {}),
          char.description,
          char.is_perfect || false,
          char.is_muted || false,
          char.order_index || 0,
          // AI-generated fields
          char.backstory,
          char.voice,
          char.day_of_week,
          char.speaking_style,
          JSON.stringify(char.quirks || []),
          char.relationships,
          char.growth_arc,
          JSON.stringify(char.content_strengths || []),
          JSON.stringify(char.sample_quotes || []),
          char.location
        ];
        const result = await client.query(query, values);
        createdCharacters.push(result.rows[0]);
      }

      await client.query('COMMIT');
      return createdCharacters;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
};
