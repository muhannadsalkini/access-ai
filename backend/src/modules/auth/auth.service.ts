import { createClient } from "@supabase/supabase-js";
import { env } from "../../config/env";
import { AppError } from "../../middleware/error-handler";
import { logger } from "../../utils/logger";

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  userId: string;
  userEmail: string;
}

export async function loginWithEmail(
  email: string,
  password: string
): Promise<LoginResult> {
  const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    logger.warn(`Login failed for ${email}: ${error.message}`);
    throw new AppError("Invalid email or password.", 401);
  }

  if (!data.session || !data.user) {
    throw new AppError("Login failed. Please try again.", 500);
  }

  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresIn: data.session.expires_in,
    userId: data.user.id,
    userEmail: data.user.email || email,
  };
}
