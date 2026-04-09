import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { Issue } from "@/types";
import SeverityBadge from "./SeverityBadge";
import Markdown from "./Markdown";

interface IssueCardProps {
  issue: Issue;
}

export default function IssueCard({ issue }: IssueCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start gap-2.5 p-3 text-left hover:bg-white/[0.03] transition-colors"
        aria-expanded={expanded}
      >
        <div className="mt-0.5 shrink-0">
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <SeverityBadge severity={issue.severity} />
            <span className="text-[10px] text-zinc-500 font-mono">
              {issue.wcag_reference}
            </span>
          </div>
          <p className="text-xs font-medium text-zinc-200 leading-snug">
            {issue.issue_type}
          </p>
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2.5 border-t border-white/[0.04]">
          <div className="pt-2.5">
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
              Description
            </p>
            <Markdown>{issue.description}</Markdown>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
              Recommendation
            </p>
            <Markdown>{issue.recommendation}</Markdown>
          </div>
        </div>
      )}
    </div>
  );
}
