import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function createServerClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Supabase URL or anon key is not configured");
  }
  return createClient(url, key);
}

/**
 * Create a Supabase client authenticated with the user's access token.
 * This ensures RLS policies are enforced for the correct user.
 */
export function createAuthenticatedClient(accessToken: string): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Supabase URL or anon key is not configured");
  }
  return createClient(url, key, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}
