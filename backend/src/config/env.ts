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
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  nodeEnv: process.env.NODE_ENV || "development",
} as const;

// Validate required environment variables
const requiredVars = [
  "supabaseUrl",
  "supabaseServiceRoleKey",
  "supabaseAnonKey",
] as const;

export function validateEnv(): void {
  const missing = requiredVars.filter((key) => !env[key]);
  if (missing.length > 0) {
    console.warn(
      `⚠️  Missing environment variables: ${missing.join(", ")}. Some features may not work.`
    );
  }
}
