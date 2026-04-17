/**
 * Configuration loaded from environment variables.
 *
 * Optional env vars:
 *   ACCESSAI_API_KEY     — Your AccessAI API key (generated from the dashboard).
 *                          Required for: get_scan_history, get_scan_report, chat_about_scan.
 *                          Optional for: scan_url, scan_code (guest mode — results not saved).
 *
 *   ACCESSAI_BACKEND_URL — Base URL of the AccessAI backend (defaults to production).
 */

export interface Config {
  backendUrl: string;
  apiKey: string | undefined;
}

const DEFAULT_BACKEND_URL = "https://access-ai-backend.onrender.com";

export function loadConfig(): Config {
  const apiKey = process.env.ACCESSAI_API_KEY || undefined;
  const backendUrl = process.env.ACCESSAI_BACKEND_URL;

  return {
    backendUrl: (backendUrl || DEFAULT_BACKEND_URL).replace(/\/+$/, ""),
    apiKey,
  };
}
