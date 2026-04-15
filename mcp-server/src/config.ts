/**
 * Configuration loaded from environment variables.
 *
 * Required env vars:
 *   ACCESSAI_API_KEY     — Your AccessAI API key (generated from the dashboard)
 *
 * Optional env vars:
 *   ACCESSAI_BACKEND_URL — Base URL of the AccessAI backend (defaults to production)
 */

export interface Config {
  backendUrl: string;
  apiKey: string;
}

const DEFAULT_BACKEND_URL = "https://accessai-backend.onrender.com";

export function loadConfig(): Config {
  const apiKey = process.env.ACCESSAI_API_KEY;
  const backendUrl = process.env.ACCESSAI_BACKEND_URL;

  if (!apiKey) {
    throw new Error(
      "Missing ACCESSAI_API_KEY environment variable. " +
        "Generate one from your AccessAI dashboard (Settings → API Keys)."
    );
  }

  return {
    backendUrl: (backendUrl || DEFAULT_BACKEND_URL).replace(/\/+$/, ""),
    apiKey,
  };
}
