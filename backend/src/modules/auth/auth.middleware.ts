import { Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";
import { env } from "../../config/env";
import { AppError } from "../../middleware/error-handler";
import { AuthenticatedRequest } from "./auth.types";
import { logger } from "../../utils/logger";

export async function requireAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError("Missing or invalid authorization header.", 401);
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      throw new AppError("Missing access token.", 401);
    }

    // Verify the token with Supabase
    const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      logger.warn("Auth token verification failed:", error?.message);
      throw new AppError("Invalid or expired access token.", 401);
    }

    // Attach user info to request
    req.userId = user.id;
    req.userEmail = user.email || "";
    req.accessToken = token;

    next();
  } catch (err) {
    next(err);
  }
}
