import { env } from "../../config/env";
import { logger } from "../../utils/logger";
import { AxeViolation } from "../accessibility/axe-scanner";

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

export async function callAgent(
  request: AgentRequest
): Promise<AgentResponse> {
  const agentUrl = `${env.agentServiceUrl}/agent/analyze`;

  logger.info(`Calling AI agent at ${agentUrl} for scan ${request.scanId}...`);

  try {
    const response = await fetch(agentUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: request.url,
        scan_id: request.scanId,
        violations: request.violations,
      }),
      signal: AbortSignal.timeout(60000), // 60 second timeout
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error(`Agent returned ${response.status}: ${errorBody}`);
      throw new Error(`Agent service returned ${response.status}`);
    }

    const data = (await response.json()) as any;

    return {
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
  } catch (error) {
    logger.error("Failed to call agent service:", error);
    throw error;
  }
}
