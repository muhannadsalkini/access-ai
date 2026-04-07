"use client";

import type { ScanResult, Issue } from "@/shared/types";
import { severityOrder } from "@/shared/types";
import ScoreBadge from "@/shared/components/ScoreBadge";
import SeverityBadge from "@/shared/components/SeverityBadge";

interface ReportViewProps {
  result: ScanResult;
}

export default function ReportView({ result }: ReportViewProps) {
  const { scan, issues, report } = result;

  // Sort issues by severity
  const sortedIssues = [...issues].sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
  );

  // Count by severity
  const severityCounts = issues.reduce(
    (acc, issue) => {
      acc[issue.severity] = (acc[issue.severity] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              Accessibility Report
            </h2>
            <p className="text-gray-500">
              <a
                href={scan.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {scan.url}
              </a>
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Scanned on {new Date(scan.scan_date).toLocaleString()}
            </p>
          </div>
          <ScoreBadge score={scan.accessibility_score} size="lg" />
        </div>

        {/* Severity summary */}
        <div className="flex gap-4 mt-6">
          {(["critical", "serious", "moderate", "minor"] as const).map((sev) => (
            <div
              key={sev}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg"
            >
              <SeverityBadge severity={sev} />
              <span className="text-sm font-medium text-gray-700">
                {severityCounts[sev] || 0}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* AI Summary */}
      {report && (
        <div className="bg-blue-50 rounded-2xl border border-blue-200 p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            🤖 AI Summary
          </h3>
          <p className="text-blue-800 whitespace-pre-line">{report.summary}</p>
          {report.priority_recommendations && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">
                Priority Recommendations
              </h4>
              <p className="text-blue-800 whitespace-pre-line text-sm">
                {report.priority_recommendations}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Issues List */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Issues ({issues.length})
        </h3>
        <div className="space-y-4">
          {sortedIssues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} />
          ))}
          {sortedIssues.length === 0 && (
            <div className="text-center py-12 bg-green-50 rounded-2xl border border-green-200">
              <p className="text-green-700 font-medium text-lg">
                🎉 No accessibility issues detected!
              </p>
              <p className="text-green-600 text-sm mt-1">
                Great job! This page appears to meet WCAG 2.1 guidelines.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function IssueCard({ issue }: { issue: Issue }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-semibold text-gray-900">{issue.issue_type}</h4>
        <SeverityBadge severity={issue.severity} />
      </div>
      <p className="text-gray-600 text-sm mb-3">{issue.description}</p>
      {issue.recommendation && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h5 className="text-xs font-semibold text-gray-500 uppercase mb-1">
            Recommended Fix
          </h5>
          <p className="text-sm text-gray-700 whitespace-pre-line">
            {issue.recommendation}
          </p>
        </div>
      )}
      {issue.wcag_reference && (
        <p className="text-xs text-gray-400 mt-3">📋 {issue.wcag_reference}</p>
      )}
    </div>
  );
}
