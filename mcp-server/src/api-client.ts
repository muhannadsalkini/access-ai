/**
 * HTTP client for the AccessAI backend API.
 */

import type { Config } from "./config.js";
import type { AuthManager } from "./auth.js";

// ---------------------------------------------------------------------------
// Response types (matching the backend's API responses)
// ---------------------------------------------------------------------------

export interface ScanRecord {
  id: string;
  user_id: string;
  url: string;
  scan_date: string;
  accessibility_score: number;
  status: "pending" | "scanning" | "analyzing" | "completed" | "failed";
  scan_type: "url" | "sitemap" | "code";
}

export interface IssueRecord {
  id: string;
  scan_id: string;
  issue_type: string;
  severity: string;
  description: string;
  recommendation: string;
  wcag_reference: string;
}

export interface ReportRecord {
  id: string;
  scan_id: string;
  summary: string;
  priority_recommendations: string;
}

export interface ScanResponse {
  scan: ScanRecord;
  issues: IssueRecord[];
  report: ReportRecord | null;
}

export interface ReportWithIssues {
  id: string;
  scan_id: string;
  summary: string;
  priority_recommendations: string;
  scan: {
    id: string;
    url: string;
    scan_date: string;
    accessibility_score: number;
  };
  issues: {
    id: string;
    issue_type: string;
    severity: string;
    description: string;
    recommendation: string;
    wcag_reference: string;
  }[];
}

export interface ChatMessage {
  id: string;
  scan_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface SendChatResponse {
  message: ChatMessage;
  response: ChatMessage;
}

// ---------------------------------------------------------------------------
// API Client
// ---------------------------------------------------------------------------

export class ApiClient {
  private config: Config;
  private auth: AuthManager;

  constructor(config: Config, auth: AuthManager) {
    this.config = config;
    this.auth = auth;
  }

  /**
   * Make an authenticated request to the backend.
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    timeoutMs: number = 120_000
  ): Promise<T> {
    const token = await this.auth.getAccessToken();
    const url = `${this.config.backendUrl}${path}`;

    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(`API request failed (${response.status}): ${errorBody}`);
    }

    const data = (await response.json()) as { success: boolean; data: T };

    if (!data.success) {
      throw new Error("API request failed: unexpected response format");
    }

    return data.data;
  }

  /**
   * Create a new accessibility scan for a URL.
   */
  async createScan(url: string): Promise<ScanResponse> {
    return this.request<ScanResponse>("POST", "/api/scans", { url }, 600_000);
  }

  /**
   * Create a new accessibility scan from raw HTML code.
   */
  async createCodeScan(html: string, title?: string): Promise<ScanResponse> {
    return this.request<ScanResponse>("POST", "/api/scans/code", { html, title }, 300_000);
  }

  /**
   * Get the user's scan history.
   */
  async getScans(): Promise<ScanRecord[]> {
    return this.request<ScanRecord[]>("GET", "/api/scans");
  }

  /**
   * Get a specific scan by ID with its issues and report.
   */
  async getScanById(scanId: string): Promise<ScanResponse> {
    return this.request<ScanResponse>("GET", `/api/scans/${scanId}`);
  }

  /**
   * Get the full report for a scan.
   */
  async getReport(scanId: string): Promise<ReportWithIssues> {
    return this.request<ReportWithIssues>("GET", `/api/reports/${scanId}`);
  }

  /**
   * Send a chat message about a scan and get an AI response.
   */
  async sendChatMessage(
    scanId: string,
    message: string
  ): Promise<SendChatResponse> {
    return this.request<SendChatResponse>(
      "POST",
      `/api/scans/${scanId}/chat`,
      { message }
    );
  }

  /**
   * Get chat history for a scan.
   */
  async getChatMessages(scanId: string): Promise<ChatMessage[]> {
    return this.request<ChatMessage[]>("GET", `/api/scans/${scanId}/chat`);
  }
}
