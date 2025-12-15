import pool from '../database/db';

export interface Brand {
  id: string;
  user_id: string;
  name: string;
  tagline?: string;
  industry?: string;
  target_audience?: string;
  core_message?: string;
  what_you_do?: string;
  how_you_do_it?: string;
  why_it_matters?: string;
  personality?: string;
  buyer_profile?: string;
  brand_type?: 'individual' | 'organization'; // Type of brand: individual (1 character) or organization (multiple characters)
  reverse_positioning?: boolean; // When true, audience research comes first - AI uses perfect buyer profile to inform brand positioning
  channels?: string[];
  channel_schedule?: Record<string, string[]>;
  content_types?: string[]; // Types of content the brand can produce (e.g., ["Graphic Design", "Blog Post", "Reel (Interview)"])
  // New fields from migration 002
  about?: string;
  vision?: string;
  mission?: string;
  products?: string;
  colors?: string;
  brand_hq_location?: string;
  timezone?: string;
  posting_frequency?: number;
  preferred_posting_days?: string[];
  narrative_why?: string;
  narrative_problem?: string;
  narrative_solution?: string;
  narrative_cta?: string;
  narrative_failure?: string;
  narrative_success?: string;
  narrative_perfect_fields?: {
    narrative_why?: boolean;
    narrative_problem?: boolean;
    narrative_solution?: boolean;
    narrative_cta?: boolean;
    narrative_failure?: boolean;
    narrative_success?: boolean;
  };
  season_plans?: any;
  monthly_themes?: any;
  weekly_subplots?: any;
  monthly_calendars?: any;
  created_at: Date;
  updated_at: Date;
  is_active: boolean;
  archived_at?: Date | null;
}

export interface CreateBrandInput {
  user_id: string;
  name: string;
  tagline?: string;
  industry?: string;
  target_audience?: string;
  core_message?: string;
  what_you_do?: string;
  how_you_do_it?: string;
  why_it_matters?: string;
  personality?: string;
  buyer_profile?: string;
  brand_type?: 'individual' | 'organization';
  channels?: string[];
}

export const BrandModel = {
  // Create new brand
  async create(brandData: CreateBrandInput): Promise<Brand> {
    const query = `
      INSERT INTO brands (
        user_id, name, tagline, industry, target_audience,
        core_message, what_you_do, how_you_do_it, why_it_matters,
        personality, buyer_profile, brand_type, channels
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;
    const values = [
      brandData.user_id,
      brandData.name,
      brandData.tagline,
      brandData.industry,
      brandData.target_audience,
      brandData.core_message,
      brandData.what_you_do,
      brandData.how_you_do_it,
      brandData.why_it_matters,
      brandData.personality,
      brandData.buyer_profile,
      brandData.brand_type || 'organization',
      JSON.stringify(brandData.channels || [])
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  // Find brand by ID
  async findById(id: string): Promise<any> {
    const query = 'SELECT * FROM brands WHERE id = $1';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    const brand = result.rows[0];

    // Fetch associated characters
    const charactersQuery = `
      SELECT id, name, real_name as character_name, role, location, work_mode, age_range,
             about, personality, persona, backstory, voice, is_perfect, perfect_fields,
             archetype, day_of_week, speaking_style, quirks, relationships, growth_arc,
             content_strengths, sample_quotes, order_index, created_at, updated_at
      FROM brand_characters
      WHERE brand_id = $1
      ORDER BY order_index ASC, created_at ASC
    `;
    const charactersResult = await pool.query(charactersQuery, [id]);

    // Add characters to brand as cast_management
    brand.cast_management = charactersResult.rows.map((char: any) => ({
      id: char.id,
      name: char.name,
      character_name: char.character_name,
      role: char.role,
      location: char.location,
      work_mode: char.work_mode,
      age_range: char.age_range,
      about: char.about,
      personality: char.personality,
      persona: char.persona,
      backstory: char.backstory,
      voice: char.voice,
      isPerfect: char.is_perfect, // Legacy field
      perfect_fields: char.perfect_fields || {}, // New granular tracking
      archetype: char.archetype,
      day_of_week: char.day_of_week,
      speaking_style: char.speaking_style,
      quirks: char.quirks || [],
      relationships: char.relationships,
      growth_arc: char.growth_arc,
      content_strengths: char.content_strengths || [],
      sample_quotes: char.sample_quotes || [],
      order_index: char.order_index,
      created_at: char.created_at,
      updated_at: char.updated_at
    }));

    return brand;
  },

  // Find brands by user ID (excluding archived by default)
  async findByUserId(userId: string, includeArchived = false): Promise<any[]> {
    const query = includeArchived
      ? 'SELECT * FROM brands WHERE user_id = $1 ORDER BY created_at DESC'
      : 'SELECT * FROM brands WHERE user_id = $1 AND archived_at IS NULL ORDER BY created_at DESC';
    const result = await pool.query(query, [userId]);

    console.log('🔍 Brand query returned:', result.rows.length, 'brands');
    if (result.rows.length > 0) {
      console.log('📦 First brand season_plans type:', typeof result.rows[0].season_plans);
      console.log('📦 First brand season_plans value:', JSON.stringify(result.rows[0].season_plans));
      console.log('📅 First brand channel_schedule type:', typeof result.rows[0].channel_schedule);
      console.log('📅 First brand channel_schedule value:', JSON.stringify(result.rows[0].channel_schedule));
    }

    // Fetch characters for all brands in parallel
    const brandsWithCharacters = await Promise.all(
      result.rows.map(async (brand: any) => {
        const charactersQuery = `
          SELECT id, name, real_name as character_name, role, location, work_mode, age_range,
                 about, personality, persona, backstory, voice, is_perfect, perfect_fields,
                 archetype, day_of_week, speaking_style, quirks, relationships, growth_arc,
                 content_strengths, sample_quotes, order_index, created_at, updated_at
          FROM brand_characters
          WHERE brand_id = $1
          ORDER BY order_index ASC, created_at ASC
        `;
        const charactersResult = await pool.query(charactersQuery, [brand.id]);

        brand.cast_management = charactersResult.rows.map((char: any) => ({
          id: char.id,
          name: char.name,
          character_name: char.character_name,
          role: char.role,
          location: char.location,
          work_mode: char.work_mode,
          age_range: char.age_range,
          about: char.about,
          personality: char.personality,
          persona: char.persona,
          backstory: char.backstory,
          voice: char.voice,
          isPerfect: char.is_perfect,
          perfect_fields: char.perfect_fields || {},
          archetype: char.archetype,
          day_of_week: char.day_of_week,
          speaking_style: char.speaking_style,
          quirks: char.quirks || [],
          relationships: char.relationships,
          growth_arc: char.growth_arc,
          content_strengths: char.content_strengths || [],
          sample_quotes: char.sample_quotes || [],
          order_index: char.order_index,
          created_at: char.created_at,
          updated_at: char.updated_at
        }));

        return brand;
      })
    );

    return brandsWithCharacters;
  },

  // Update brand
  async update(id: string, updates: Partial<Brand>): Promise<Brand> {
    console.log('🔧 Brand.update called with:', { id, updateFields: Object.keys(updates) });

    const fields = Object.keys(updates);
    const values = Object.values(updates).map(val => {
      // Handle arrays and objects (JSONB columns)
      if (Array.isArray(val) || (typeof val === 'object' && val !== null)) {
        return JSON.stringify(val);
      }
      return val;
    });
    const setClause = fields.map((field, i) => `${field} = $${i + 2}`).join(', ');

    const query = `
      UPDATE brands
      SET ${setClause}
      WHERE id = $1
      RETURNING *
    `;

    console.log('📊 Executing query:', { query: query.substring(0, 100), paramCount: values.length + 1 });

    const result = await pool.query(query, [id, ...values]);
    console.log('✅ Brand updated successfully');
    return result.rows[0];
  },

  // Archive brand
  async archive(id: string): Promise<Brand> {
    const query = `
      UPDATE brands
      SET archived_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  },

  // Unarchive brand
  async unarchive(id: string): Promise<Brand> {
    const query = `
      UPDATE brands
      SET archived_at = NULL
      WHERE id = $1
      RETURNING *
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  },

  // Delete brand
  async delete(id: string): Promise<void> {
    const query = 'DELETE FROM brands WHERE id = $1';
    await pool.query(query, [id]);
  }
};
