import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('🔑 Supabase env check:', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  url: supabaseUrl?.substring(0, 30) + '...'
});

const createSupabaseClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ Supabase environment variables are not set');
    return null;
  }
  try {
    console.log('✅ Supabase client created with URL:', supabaseUrl);
    return createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false
      }
    });
  } catch (error) {
    console.error('❌ Error creating Supabase client:', error);
    return null;
  }
};

export const supabase = createSupabaseClient();

// Auth helpers (Note: App now uses API backend, these are legacy)
export const signUp = async (email: string, password: string) => {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') };
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  return { data, error };
};

export const signIn = async (email: string, password: string) => {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') };
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signOut = async () => {
  if (!supabase) return { error: new Error('Supabase not configured') };
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// Database helpers (Note: App now uses API backend, these are legacy)
export const getUserProfile = async (userId: string) => {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') };
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  return { data, error };
};

export const createUserProfile = async (userId: string, email: string) => {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') };
  const { data, error } = await supabase
    .from('users')
    .insert({
      id: userId,
      email,
      plan: 'free',
      tokens: 50,
      preferred_ai_provider: 'openai'
    })
    .select()
    .single();
  return { data, error };
};

export const updateUserProfile = async (userId: string, updates: any) => {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') };
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  return { data, error };
};

export const getUserBrands = async (userId: string) => {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') };
  const { data, error } = await supabase
    .from('brands')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return { data, error };
};

export const createBrand = async (brandData: any) => {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') };
  const { data, error } = await supabase
    .from('brands')
    .insert([brandData])
    .select()
    .single();
  return { data, error };
};

export const createBrandViaFunction = async (brandName: string, timezone: string = 'UTC') => {
  const { data, error } = await supabase
    .rpc('create_user_brand', {
      p_brand_name: brandName,
      p_timezone: timezone
    });

  if (error) {
    return { data: null, error };
  }

  const brandId = data;
  const { data: brand, error: fetchError } = await supabase
    .from('brands')
    .select('*')
    .eq('id', brandId)
    .single();

  return { data: brand, error: fetchError };
};

export const updateBrand = async (brandId: string, updates: any) => {
  const { data, error } = await supabase
    .from('brands')
    .update(updates)
    .eq('id', brandId)
    .select()
    .single();
  return { data, error };
};

export const getBrandEvents = async (brandId: string) => {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('brand_id', brandId)
    .order('event_date', { ascending: true });
  return { data, error };
};

export const createEvent = async (eventData: any) => {
  const { data, error } = await supabase
    .from('events')
    .insert([eventData])
    .select()
    .single();
  return { data, error };
};

export const updateEvent = async (eventId: string, updates: any) => {
  const { data, error } = await supabase
    .from('events')
    .update(updates)
    .eq('id', eventId)
    .select()
    .single();
  return { data, error };
};

export const deleteEvent = async (eventId: string) => {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId);
  return { error };
};

export const getContentItems = async (brandId: string, month?: string) => {
  let query = supabase
    .from('content_items')
    .select('*')
    .eq('brand_id', brandId);
  
  if (month) {
    const startDate = `${month}-01`;
    const endDate = `${month}-31`;
    query = query.gte('content_date', startDate).lte('content_date', endDate);
  }
  
  const { data, error } = await query.order('content_date', { ascending: true });
  return { data, error };
};

export const createContentItem = async (contentData: any) => {
  const { data, error } = await supabase
    .from('content_items')
    .insert([contentData])
    .select()
    .single();
  return { data, error };
};

export const updateContentItem = async (contentId: string, updates: any) => {
  const { data, error } = await supabase
    .from('content_items')
    .update(updates)
    .eq('id', contentId)
    .select()
    .single();
  return { data, error };
};

// Token management
export const deductTokens = async (userId: string, amount: number) => {
  const { data, error } = await supabase.rpc('deduct_tokens', {
    user_id: userId,
    token_amount: amount
  });
  return { data, error };
};

export const addTokens = async (userId: string, amount: number) => {
  const { data, error } = await supabase.rpc('add_tokens', {
    user_id: userId,
    token_amount: amount
  });
  return { data, error };
};

export const updateUserPlan = async (
  userId: string,
  plan: string,
  tokens: number,
  expiryDate?: string
) => {
  const { data, error } = await supabase.rpc('update_user_plan', {
    user_id: userId,
    new_plan: plan,
    new_tokens: tokens,
    expiry_date: expiryDate
  });
  return { data, error };
};

// Admin functions
export const getUserStats = async () => {
  const { data, error } = await supabase.rpc('get_user_stats');
  return { data, error };
};

export const getAllUsers = async () => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });
  return { data, error };
};

export const getAllBrands = async () => {
  const { data, error } = await supabase
    .from('brands')
    .select(`
      *,
      users (
        email,
        plan
      )
    `)
    .order('created_at', { ascending: false });
  return { data, error };
};