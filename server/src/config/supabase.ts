import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env.js';

// Admin client — bypasses RLS, used for all server-side operations
let adminClient: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
  if (!adminClient) {
    adminClient = createClient(env.supabase.url, env.supabase.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return adminClient;
}

// User client — respects RLS, created per-request with user's JWT
export function getUserClient(accessToken: string): SupabaseClient {
  return createClient(env.supabase.url, env.supabase.anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
