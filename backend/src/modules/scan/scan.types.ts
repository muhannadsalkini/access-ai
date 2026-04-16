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

export interface CreateScanRequest {
  url: string;
}

export interface CreateCodeScanRequest {
  html: string;
  title?: string;
}

export interface ScanResponse {
  scan: ScanRecord;
  issues: IssueRecord[];
  report: ReportRecord | null;
}
