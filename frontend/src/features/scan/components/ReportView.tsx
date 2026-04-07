"use client";

import { useState } from "react";
import type { ScanResult, Issue } from "@/shared/types";
import { severityOrder } from "@/shared/types";
import ScoreBadge from "@/shared/components/ScoreBadge";
import SeverityBadge from "@/shared/components/SeverityBadge";
import { cn } from "@/shared/lib/utils";
import MarkdownRenderer from "@/shared/components/MarkdownRenderer";
import {
  Sparkles,
  ExternalLink,
  Calendar,
  Lightbulb,
  ChevronDown,
  ChevronRight,
  Wrench,
  BookOpen,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

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
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header Card */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-6">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-white mb-2">
              Accessibility Report
            </h2>
            <a
              href={scan.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 transition-colors text-sm font-medium group"
            >
              <span className="truncate max-w-md">{scan.url}</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
            </a>
            <div className="flex items-center gap-2 mt-2 text-xs text-zinc-500">
              <Calendar className="w-3.5 h-3.5" />
              Scanned on {new Date(scan.scan_date).toLocaleString()}
            </div>
          </div>
          <ScoreBadge score={scan.accessibility_score} size="lg" />
        </div>

        {/* Severity summary */}
        <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-white/[0.06]">
          {(["critical", "serious", "moderate", "minor"] as const).map(
            (sev) => (
              <div
                key={sev}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]"
              >
                <SeverityBadge severity={sev} />
                <span className="text-sm font-semibold text-zinc-300">
                  {severityCounts[sev] || 0}
                </span>
              </div>
            )
          )}
        </div>
      </div>

      {/* AI Summary */}
      {report && (
        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.05] p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">AI Summary</h3>
          </div>
          <MarkdownRenderer content={report.summary} />
          {report.priority_recommendations && (
            <div className="mt-5 pt-5 border-t border-indigo-500/10">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-indigo-400" />
                <h4 className="text-sm font-semibold text-zinc-200">
                  Priority Recommendations
                </h4>
              </div>
              <MarkdownRenderer content={report.priority_recommendations} />
            </div>
          )}
        </div>
      )}

      {/* Issues List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-zinc-400" />
            Issues
            <span className="text-sm font-normal text-zinc-500">
              ({issues.length})
            </span>
          </h3>
        </div>

        <div className="space-y-3">
          {sortedIssues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} />
          ))}
          {sortedIssues.length === 0 && (
            <div className="text-center py-16 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05]">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
                <ShieldCheck className="w-7 h-7 text-emerald-400" />
              </div>
              <p className="text-emerald-300 font-semibold text-lg">
                No accessibility issues detected!
              </p>
              <p className="text-emerald-400/60 text-sm mt-1">
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
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.03] transition-all duration-200">
      {/* Header - always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start justify-between gap-4 p-5 text-left"
        aria-expanded={expanded}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              {expanded ? (
                <ChevronDown className="w-4 h-4 text-zinc-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-zinc-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-white text-sm leading-snug">
                {issue.issue_type}
              </h4>
              {!expanded && (
                <p className="text-zinc-500 text-xs mt-1 line-clamp-1">
                  {issue.description}
                </p>
              )}
            </div>
          </div>
        </div>
        <SeverityBadge severity={issue.severity} />
      </button>

      {/* Expandable content */}
      {expanded && (
        <div className="px-5 pb-5 pt-0 ml-7 space-y-4 animate-fade-in">
          <MarkdownRenderer content={issue.description} />

          {issue.recommendation && (
            <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-4">
              <div className="flex items-center gap-2 mb-2">
                <Wrench className="w-3.5 h-3.5 text-indigo-400" />
                <h5 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  Recommended Fix
                </h5>
              </div>
              <MarkdownRenderer content={issue.recommendation} />
            </div>
          )}

          {issue.wcag_reference && (
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <BookOpen className="w-3.5 h-3.5" />
              <span>{issue.wcag_reference}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
