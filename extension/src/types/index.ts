export interface Scan {
  id: string;
  user_id: string;
  url: string;
  scan_date: string;
  accessibility_score: number;
  status: "pending" | "scanning" | "analyzing" | "completed" | "failed";
  scan_type: "url" | "sitemap";
}

export interface Issue {
  id: string;
  scan_id: string;
  issue_type: string;
  severity: "critical" | "serious" | "moderate" | "minor";
  description: string;
  recommendation: string;
  wcag_reference: string;
}

export interface Report {
  id: string;
  scan_id: string;
  summary: string;
  priority_recommendations: string;
}

export interface ScanResult {
  scan: Scan;
  issues: Issue[];
  report: Report | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export const severityOrder: Record<Issue["severity"], number> = {
  critical: 0,
  serious: 1,
  moderate: 2,
  minor: 3,
};
