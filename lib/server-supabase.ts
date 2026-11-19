import { createClient } from '@supabase/supabase-js';
import { workspaceSchema } from './workspace';
export async function authenticatedClient(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const token = req.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if (!url || !key || !token) return null;
  const client = createClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  return { client, user: data.user };
}
export async function authenticatedWorkspace(req: Request) {
  const auth = await authenticatedClient(req);
  if (!auth) return null;
  const { data, error } = await auth.client.from('groov_workspaces').select('payload').eq('user_id', auth.user.id).maybeSingle();
  if (error) throw new Error('Unable to load your saved workspace. Check the Supabase setup.');
  if (!data) throw new Error('Your workspace has not been saved yet.');
  return {workspace:workspaceSchema.parse(data.payload),userId:auth.user.id};
}
