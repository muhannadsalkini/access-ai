import { createClient } from "@supabase/supabase-js";
import { env } from "../../config/env";

// Service role client — full database access (for backend operations)
export const supabaseAdmin = createClient(
  env.supabaseUrl,
  env.supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Anon client — respects RLS (for user-scoped queries)
export function createSupabaseClient(accessToken?: string) {
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    global: {
      headers: accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : {},
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
