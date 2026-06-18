import crypto from "crypto";
import { supabaseAdmin } from "../../services/supabase/client";
import { AppError } from "../../middleware/error-handler";
import { logger } from "../../utils/logger";
import { env } from "../../config/env";
import type {
  ApiKeyPublic,
  CreateApiKeyResponse,
} from "./api-keys.types";

/**
 * Generate a random API key with the format: ak_live_<32 random hex chars>
 */
function generateRawKey(): string {
  const random = crypto.randomBytes(24).toString("hex");
  return `ak_live_${random}`;
}

/**
 * Hash an API key using HMAC-SHA256 with a server-side secret.
 *
 * Using a server-side secret (rather than plain SHA-256) means that even a
 * full database dump cannot be used to reconstruct API keys via rainbow tables
 * or brute-force, because the attacker would also need the API_KEY_SECRET.
 *
 * NOTE: Changing API_KEY_SECRET in production invalidates all existing keys —
 * users will need to regenerate them.  Rotate the secret only intentionally.
 */
function hashKey(rawKey: string): string {
  return crypto
    .createHmac("sha256", env.apiKeySecret)
    .update(rawKey)
    .digest("hex");
}

/**
 * Create a new API key for a user.
 * Returns the full key (shown only once) and metadata.
 */
const MAX_API_KEYS_PER_USER = 10;

export async function createApiKey(
  userId: string,
  name: string = "Default"
): Promise<CreateApiKeyResponse> {
  // Check key limit
  const { count, error: countError } = await supabaseAdmin
    .from("api_keys")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (countError) {
    logger.error("Failed to count API keys:", countError);
    throw new AppError("Failed to create API key.", 500);
  }

  if ((count ?? 0) >= MAX_API_KEYS_PER_USER) {
    throw new AppError(
      `Maximum of ${MAX_API_KEYS_PER_USER} API keys allowed. Delete an existing key to create a new one.`,
      400
    );
  }

  const rawKey = generateRawKey();
  const keyHash = hashKey(rawKey);
  const keyPrefix = rawKey.substring(0, 12); // "ak_live_xxxx"

  const { data, error } = await supabaseAdmin
    .from("api_keys")
    .insert({
      user_id: userId,
      name,
      key_hash: keyHash,
      key_prefix: keyPrefix,
    })
    .select("id, name, key_prefix, created_at")
    .single();

  if (error) {
    logger.error("Failed to create API key:", error);
    throw new AppError("Failed to create API key.", 500);
  }

  return {
    id: data.id,
    name: data.name,
    key: rawKey, // Only time the full key is returned
    key_prefix: data.key_prefix,
    created_at: data.created_at,
  };
}

/**
 * List all API keys for a user (without the actual key values).
 */
export async function getApiKeys(userId: string): Promise<ApiKeyPublic[]> {
  const { data, error } = await supabaseAdmin
    .from("api_keys")
    .select("id, name, key_prefix, last_used_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("Failed to fetch API keys:", error);
    throw new AppError("Failed to fetch API keys.", 500);
  }

  return data || [];
}

/**
 * Delete an API key.
 */
export async function deleteApiKey(
  keyId: string,
  userId: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("api_keys")
    .delete()
    .eq("id", keyId)
    .eq("user_id", userId);

  if (error) {
    logger.error("Failed to delete API key:", error);
    throw new AppError("Failed to delete API key.", 500);
  }
}

/**
 * Verify an API key and return the associated user ID.
 * Updates `last_used_at` on successful verification.
 */
export async function verifyApiKey(
  rawKey: string
): Promise<{ userId: string } | null> {
  const keyHash = hashKey(rawKey);

  const { data, error } = await supabaseAdmin
    .from("api_keys")
    .select("id, user_id")
    .eq("key_hash", keyHash)
    .single();

  if (error || !data) {
    return null;
  }

  // Update last_used_at (fire and forget — don't block the request)
  void (async () => {
    try {
      await supabaseAdmin
        .from("api_keys")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", data.id);
    } catch (err: unknown) {
      logger.warn("Failed to update last_used_at:", err);
    }
  })();

  return { userId: data.user_id };
}
