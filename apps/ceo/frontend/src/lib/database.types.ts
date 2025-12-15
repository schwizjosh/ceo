export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          plan: 'free' | 'starter' | 'basic' | 'pro' | 'standard' | 'premium' | 'ultimate' | 'enterprise'
          tokens: number
          plan_expiry: string | null
          last_token_reset: string
          preferred_ai_provider: 'openai' | 'claude'
          timezone: string | null
          preferred_ai_model: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          plan?: 'free' | 'starter' | 'basic' | 'pro' | 'standard' | 'premium' | 'ultimate' | 'enterprise'
          tokens?: number
          plan_expiry?: string | null
          last_token_reset?: string
          preferred_ai_provider?: 'openai' | 'claude'
          timezone?: string | null
          preferred_ai_model?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          plan?: 'free' | 'starter' | 'basic' | 'pro' | 'standard' | 'premium' | 'ultimate' | 'enterprise'
          tokens?: number
          plan_expiry?: string | null
          last_token_reset?: string
          preferred_ai_provider?: 'openai' | 'claude'
          timezone?: string | null
          preferred_ai_model?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      brands: {
        Row: {
          id: string
          user_id: string
          brand_name: string
          taglines: string | null
          about: string | null
          vision: string | null
          mission: string | null
          products: string | null
          persona: string | null
          buyer_profile: string | null
          colors: string | null
          brand_hq_location: string | null
          timezone: string | null
          channels: string[]
          posting_frequency: number
          preferred_posting_days: string[]
          narrative_why: string | null
          narrative_problem: string | null
          narrative_solution: string | null
          narrative_cta: string | null
          narrative_failure: string | null
          narrative_success: string | null
          cast_management: Json
          monthly_themes: Json
          weekly_subplots: Json
          monthly_calendars: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          brand_name: string
          taglines?: string | null
          about?: string | null
          vision?: string | null
          mission?: string | null
          products?: string | null
          persona?: string | null
          buyer_profile?: string | null
          colors?: string | null
          brand_hq_location?: string | null
          timezone?: string | null
          channels?: string[]
          posting_frequency?: number
          preferred_posting_days?: string[]
          narrative_why?: string | null
          narrative_problem?: string | null
          narrative_solution?: string | null
          narrative_cta?: string | null
          narrative_failure?: string | null
          narrative_success?: string | null
          cast_management?: Json
          monthly_themes?: Json
          weekly_subplots?: Json
          monthly_calendars?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          brand_name?: string
          taglines?: string | null
          about?: string | null
          vision?: string | null
          mission?: string | null
          products?: string | null
          persona?: string | null
          buyer_profile?: string | null
          colors?: string | null
          brand_hq_location?: string | null
          timezone?: string | null
          channels?: string[]
          posting_frequency?: number
          preferred_posting_days?: string[]
          narrative_why?: string | null
          narrative_problem?: string | null
          narrative_solution?: string | null
          narrative_cta?: string | null
          narrative_failure?: string | null
          narrative_success?: string | null
          cast_management?: Json
          monthly_themes?: Json
          weekly_subplots?: Json
          monthly_calendars?: Json
          created_at?: string
          updated_at?: string
        }
      }
      events: {
        Row: {
          id: string
          brand_id: string
          user_id: string
          title: string
          description: string | null
          event_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          brand_id: string
          user_id: string
          title: string
          description?: string | null
          event_date: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          brand_id?: string
          user_id?: string
          title?: string
          description?: string | null
          event_date?: string
          created_at?: string
          updated_at?: string
        }
      }
      content_items: {
        Row: {
          id: string
          brand_id: string
          user_id: string
          content_date: string
          channel: string
          title: string
          brief: string | null
          expanded_brief: string | null
          user_notes: string | null
          is_perfect: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          brand_id: string
          user_id: string
          content_date: string
          channel: string
          title: string
          brief?: string | null
          expanded_brief?: string | null
          user_notes?: string | null
          is_perfect?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          brand_id?: string
          user_id?: string
          content_date?: string
          channel?: string
          title?: string
          brief?: string | null
          expanded_brief?: string | null
          user_notes?: string | null
          is_perfect?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      deduct_tokens: {
        Args: {
          user_id: string
          token_amount: number
        }
        Returns: boolean
      }
      add_tokens: {
        Args: {
          user_id: string
          token_amount: number
        }
        Returns: boolean
      }
      update_user_plan: {
        Args: {
          user_id: string
          new_plan: string
          new_tokens: number
          expiry_date?: string
        }
        Returns: boolean
      }
      reset_monthly_tokens: {
        Args: {}
        Returns: number
      }
      get_user_stats: {
        Args: {}
        Returns: {
          total_users: number
          free_users: number
          paid_users: number
          total_brands: number
          total_events: number
          total_content: number
          tokens_distributed: number
        }[]
      }
      is_admin: {
        Args: {
          user_email: string
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}