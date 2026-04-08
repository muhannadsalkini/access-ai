import { env } from "../../config/env";
import { logger } from "../../utils/logger";
import { AxeViolation } from "../accessibility/axe-scanner";

// ---------------------------------------------------------------------------
// Retry helper — handles agent cold-start on Render free tier
// 3 retries with delays: 15s, 20s, 25s → max ~60s total wait time
// ---------------------------------------------------------------------------

const AGENT_RETRY_DELAYS_MS = [15_000, 20_000, 25_000];

function isTransientAgentError(status?: number, err?: any): boolean {
  if (status && [502, 503, 504].includes(status)) return true;
  // Network-level errors (ECONNREFUSED, ETIMEDOUT, etc.)
  if (err && (err.code === "ECONNREFUSED" || err.code === "ECONNRESET")) return true;
  if (err instanceof TypeError && err.message.toLowerCase().includes("fetch")) return true;
  return false;
}

async function withAgentRetry<T>(
  label: string,
  fn: () => Promise<{ status?: number; result: T }>
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt <= AGENT_RETRY_DELAYS_MS.length; attempt++) {
    try {
      const { result } = await fn();
      return result;
    } catch (err: any) {
      lastError = err;

      // If no more retries left, throw immediately
      if (attempt === AGENT_RETRY_DELAYS_MS.length) break;

      // Only retry on transient/service-unavailable errors
      if (!isTransientAgentError(err.status, err)) throw err;

      const delay = AGENT_RETRY_DELAYS_MS[attempt];
      logger.warn(
        `[${label}] Agent unavailable (attempt ${attempt + 1}/${AGENT_RETRY_DELAYS_MS.length}). ` +
          `Retrying in ${delay / 1000}s — server may be waking up...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentRequest {
  url: string;
  scanId: string;
  violations: AxeViolation[];
}

export interface AgentIssue {
  issueType: string;
  severity: string;
  description: string;
  recommendation: string;
  wcagReference: string;
}

export interface AgentResponse {
  summary: string;
  priorityRecommendations: string;
  issues: AgentIssue[];
  accessibilityScore: number;
}

export async function callAgent(request: AgentRequest): Promise<AgentResponse> {
  const agentUrl = `${env.agentServiceUrl}/agent/analyze`;

  logger.info(`Calling AI agent at ${agentUrl} for scan ${request.scanId}...`);

  return withAgentRetry("callAgent", async () => {
    const response = await fetch(agentUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: request.url,
        scan_id: request.scanId,
        violations: request.violations,
      }),
      // Generous timeout — 90s gives cold-start + Gemini processing time
      signal: AbortSignal.timeout(90_000),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      logger.error(`Agent returned ${response.status}: ${errorBody}`);
      const err: any = new Error(`Agent service returned ${response.status}`);
      err.status = response.status;
      throw err;
    }

    const data = (await response.json()) as any;

    const result: AgentResponse = {
      summary: data.summary || "",
      priorityRecommendations: data.priority_recommendations || "",
      issues: (data.issues || []).map((issue: any) => ({
        issueType: issue.issue_type || "",
        severity: issue.severity || "",
        description: issue.description || "",
        recommendation: issue.recommendation || "",
        wcagReference: issue.wcag_reference || "",
      })),
      accessibilityScore: data.accessibility_score || 0,
    };

    return { status: response.status, result };
  });
}

// ---------------------------------------------------------------------------

export interface AgentChatRequest {
  url: string;
  score: number;
  summary: string;
  issuesText: string;
  message: string;
  conversationHistory: { role: string; content: string }[];
}

export interface AgentChatResponse {
  response: string;
}

export async function callAgentChat(
  request: AgentChatRequest
): Promise<AgentChatResponse> {
  const agentUrl = `${env.agentServiceUrl}/agent/chat`;

  logger.info(`Calling AI agent chat at ${agentUrl}...`);

  return withAgentRetry("callAgentChat", async () => {
    const response = await fetch(agentUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: request.url,
        score: request.score,
        summary: request.summary,
        issues_text: request.issuesText,
        message: request.message,
        conversation_history: request.conversationHistory,
      }),
      signal: AbortSignal.timeout(90_000),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      logger.error(`Agent chat returned ${response.status}: ${errorBody}`);
      const err: any = new Error(`Agent chat service returned ${response.status}`);
      err.status = response.status;
      throw err;
    }

    const data = (await response.json()) as any;
    return { status: response.status, result: { response: data.response || "" } };
  });
}
