import { createClient, type SupabaseClient } from '@supabase/supabase-js';
let browser: SupabaseClient | null = null;
export function browserSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (!browser) browser = createClient(url, key);
  return browser;
}
