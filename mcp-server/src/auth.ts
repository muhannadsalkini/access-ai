/**
 * Authentication manager — provides the API key as the Bearer token.
 *
 * With API key auth, there's no login/refresh flow needed.
 * The key is sent directly as the Authorization header.
 */

import type { Config } from "./config.js";

export class AuthManager {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  /**
   * Get the access token (API key) for authenticated requests.
   */
  async getAccessToken(): Promise<string> {
    return this.config.apiKey;
  }
}
