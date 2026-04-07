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
