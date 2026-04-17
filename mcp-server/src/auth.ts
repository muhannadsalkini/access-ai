/**
 * Authentication manager — provides the API key as the Bearer token.
 *
 * With API key auth, there's no login/refresh flow needed.
 * The key is sent directly as the Authorization header.
 *
 * When no API key is configured (guest mode), an empty string is returned
 * so the backend treats the request as unauthenticated and runs the scan
 * without saving results to the database.
 */

import type { Config } from "./config.js";

export class AuthManager {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  /**
   * Get the access token (API key) for authenticated requests.
   * Returns an empty string in guest mode (no API key configured).
   */
  async getAccessToken(): Promise<string> {
    return this.config.apiKey ?? "";
  }

  /**
   * Returns true when no API key is configured (guest / keyless mode).
   */
  isGuestMode(): boolean {
    return !this.config.apiKey;
  }
}
