import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials from Vite environment or localStorage override
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || (typeof window !== 'undefined' ? localStorage.getItem('da_supabase_url') : '');
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || (typeof window !== 'undefined' ? localStorage.getItem('da_supabase_anon_key') : '');

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined
      }
    })
  : null;

if (typeof window !== 'undefined') {
  window.DA_SUPABASE = supabase;
  window.DA_IS_SUPABASE_CONFIGURED = isSupabaseConfigured;
}

export default supabase;
