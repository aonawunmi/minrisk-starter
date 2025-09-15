import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase env vars',
    { url: supabaseUrl, keyLen: supabaseAnonKey?.length ?? 0 });
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
