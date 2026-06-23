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

// Maps each validated config key back to the environment variable an operator
// actually sets, so startup errors point at the exact name to fix.
const ENV_VAR_NAMES: Record<string, string> = {
  supabaseUrl: "SUPABASE_URL",
  supabaseServiceRoleKey: "SUPABASE_SERVICE_ROLE_KEY",
  supabaseAnonKey: "SUPABASE_ANON_KEY",
  apiKeySecret: "API_KEY_SECRET",
  agentInternalSecret: "AGENT_INTERNAL_SECRET",
  extensionOrigin: "EXTENSION_ORIGIN",
};

// Variables required in every environment — without these the app cannot do
// anything useful, so a missing value is always fatal.
const requiredVars = [
  "supabaseUrl",
  "supabaseServiceRoleKey",
  "supabaseAnonKey",
  "apiKeySecret",
] as const;

// Variables that are only fatal in production. In development they can be left
// blank (the agent secret is sent conditionally, and CORS falls back to a broad
// extension regex), but in production their absence is a security hole that
// fails silently at runtime — so we refuse to boot without them.
const productionRequiredVars = [
  "agentInternalSecret", // X-Internal-Secret shared with the agent (CRIT-01)
  "extensionOrigin", // locks CORS to the AccessAI extension only (HIGH-05)
] as const;

export function validateEnv(): void {
  const required =
    env.nodeEnv === "production"
      ? [...requiredVars, ...productionRequiredVars]
      : requiredVars;

  const missing = required.filter((key) => !env[key]);
  if (missing.length > 0) {
    const names = missing.map((key) => ENV_VAR_NAMES[key] ?? key);
    // Fatal: crash on startup rather than silently serving broken responses
    console.error(
      `❌ Missing required environment variables: ${names.join(", ")}. Aborting.`
    );
    process.exit(1);
  }
}
