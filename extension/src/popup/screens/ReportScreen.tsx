import { Shield, RefreshCw, LogOut, ExternalLink } from "lucide-react";
import Logo from "../components/Logo";
import type { ScanResult, Issue } from "@/types";
import ScoreBadge from "../components/ScoreBadge";
import IssueCard from "../components/IssueCard";
import { severityOrder } from "@/types";

const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL as string;

interface ReportScreenProps {
  result: ScanResult;
  onScanAnother: () => void;
  onSignOut: () => void;
}

const SEVERITY_LABELS: Record<Issue["severity"], string> = {
  critical: "Critical",
  serious: "Serious",
  moderate: "Moderate",
  minor: "Minor",
};

const SEVERITY_COLORS: Record<Issue["severity"], string> = {
  critical: "text-red-400",
  serious: "text-orange-400",
  moderate: "text-yellow-400",
  minor: "text-blue-400",
};

export default function ReportScreen({
  result,
  onScanAnother,
  onSignOut,
}: ReportScreenProps) {
  const { scan, issues } = result;

  const sortedIssues = [...issues].sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
  );

  const counts = {
    critical: issues.filter((i) => i.severity === "critical").length,
    serious: issues.filter((i) => i.severity === "serious").length,
    moderate: issues.filter((i) => i.severity === "moderate").length,
    minor: issues.filter((i) => i.severity === "minor").length,
  };

  const displayUrl =
    scan.url.length > 38 ? scan.url.slice(0, 35) + "…" : scan.url;

  return (
    <div className="flex-1 flex flex-col bg-[#09090b] min-h-0">
      {/* Navbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2">
          <Logo size={28} />
          <span className="text-sm font-semibold text-white">AccessAI</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onScanAnother}
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded-lg hover:bg-white/5 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            New scan
          </button>
          <button
            onClick={onSignOut}
            className="text-zinc-500 hover:text-zinc-300 transition-colors p-1.5 rounded-lg hover:bg-white/5"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Score summary */}
      <div className="shrink-0 px-4 py-4 border-b border-white/[0.04]">
        <div className="flex items-center gap-4">
          <ScoreBadge score={scan.accessibility_score} size="lg" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-zinc-500 truncate mb-1" title={scan.url}>
              {displayUrl}
            </p>
            <p className="text-sm font-semibold text-white mb-1">
              {issues.length === 0
                ? "No issues found"
                : `${issues.length} issue${issues.length === 1 ? "" : "s"} found`}
            </p>
            {/* Severity counts */}
            <div className="flex items-center gap-2 flex-wrap">
              {(["critical", "serious", "moderate", "minor"] as const).map(
                (sev) =>
                  counts[sev] > 0 ? (
                    <span
                      key={sev}
                      className={`text-[10px] font-medium ${SEVERITY_COLORS[sev]}`}
                    >
                      {counts[sev]} {SEVERITY_LABELS[sev]}
                    </span>
                  ) : null
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Issue list */}
      <div className="flex-1 overflow-y-auto min-h-0 px-3 py-3">
        {issues.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-sm font-medium text-white mb-1">
              Looks accessible!
            </p>
            <p className="text-xs text-zinc-500">
              No WCAG violations were detected on this page.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedIssues.map((issue) => (
              <IssueCard key={issue.id} issue={issue} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 px-4 py-3 border-t border-white/[0.06]">
        <a
          href={`${FRONTEND_URL}/history/${scan.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-zinc-300 py-2 rounded-xl text-xs font-medium hover:bg-white/10 hover:text-white transition-all"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          View full report + AI chat on AccessAI
        </a>
      </div>
    </div>
  );
}
