import dotenv from "dotenv";
import path from "path";

// Load .env from root or backend directory
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

export const env = {
  port: parseInt(process.env.PORT || "3001", 10),
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",
  agentServiceUrl: process.env.AGENT_SERVICE_URL || "http://localhost:8000",
  // Shared secret sent to the agent service in the X-Internal-Secret header.
  // Must match INTERNAL_SECRET in the agent's environment.
  agentInternalSecret: process.env.AGENT_INTERNAL_SECRET || "",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  extensionOrigin: process.env.EXTENSION_ORIGIN || "",
  nodeEnv: process.env.NODE_ENV || "development",
  // HMAC secret used to hash API keys — REQUIRED in production.
  // Generate with: openssl rand -hex 32
  apiKeySecret: process.env.API_KEY_SECRET || "",
} as const;

// Validate required environment variables
const requiredVars = [
  "supabaseUrl",
  "supabaseServiceRoleKey",
  "supabaseAnonKey",
  "apiKeySecret",
] as const;

export function validateEnv(): void {
  const missing = requiredVars.filter((key) => !env[key]);
  if (missing.length > 0) {
    // Fatal: crash on startup rather than silently serving broken responses
    console.error(
      `❌ Missing required environment variables: ${missing.join(", ")}. Aborting.`
    );
    process.exit(1);
  }
}
