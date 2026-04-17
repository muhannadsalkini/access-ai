// === Scan Types ===

export interface Scan {
  id: string;
  user_id: string;
  url: string;
  scan_date: string;
  accessibility_score: number;
  status: "pending" | "scanning" | "analyzing" | "completed" | "failed";
  scan_type: "url" | "sitemap" | "code";
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

export interface ChatMessage {
  id: string;
  scan_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

// === API Response Types ===

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface ApiError {
  error: string;
}

// === Severity Helpers ===

export const severityColors: Record<Issue["severity"], string> = {
  critical: "bg-red-100 text-red-800 border-red-200",
  serious: "bg-orange-100 text-orange-800 border-orange-200",
  moderate: "bg-yellow-100 text-yellow-800 border-yellow-200",
  minor: "bg-blue-100 text-blue-800 border-blue-200",
};

export const severityOrder: Record<Issue["severity"], number> = {
  critical: 0,
  serious: 1,
  moderate: 2,
  minor: 3,
};
