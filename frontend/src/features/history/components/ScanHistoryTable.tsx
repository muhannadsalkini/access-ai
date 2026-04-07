"use client";

import Link from "next/link";
import type { Scan } from "@/shared/types";
import ScoreBadge from "@/shared/components/ScoreBadge";
import { cn } from "@/shared/lib/utils";
import {
  ClipboardList,
  ArrowRight,
  ExternalLink,
  Scan as ScanIcon,
} from "lucide-react";

interface ScanHistoryTableProps {
  scans: Scan[];
}

export default function ScanHistoryTable({ scans }: ScanHistoryTableProps) {
  if (scans.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/5 border border-white/10 mb-5">
          <ClipboardList className="w-8 h-8 text-zinc-500" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">No scans yet</h3>
        <p className="text-zinc-500 mb-6 text-sm">
          Start by scanning a website for accessibility issues.
        </p>
        <Link
          href="/scan"
          className="group inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-xl font-medium text-sm transition-all duration-300 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40"
        >
          <ScanIcon className="w-4 h-4" />
          Run Your First Scan
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-6 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                URL
              </th>
              <th className="text-left px-6 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Date
              </th>
              <th className="text-center px-6 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Score
              </th>
              <th className="text-center px-6 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Status
              </th>
              <th className="text-right px-6 py-3.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {scans.map((scan) => (
              <tr
                key={scan.id}
                className="hover:bg-white/[0.02] transition-colors"
              >
                <td className="px-6 py-4">
                  <a
                    href={scan.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 transition-colors truncate max-w-xs"
                  >
                    <span className="truncate">{scan.url}</span>
                    <ExternalLink className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                </td>
                <td className="px-6 py-4 text-sm text-zinc-500">
                  {new Date(scan.scan_date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  {scan.status === "completed" ? (
                    <div className="flex justify-center">
                      <ScoreBadge score={scan.accessibility_score} size="sm" />
                    </div>
                  ) : (
                    <span className="block text-center text-zinc-600">
                      &mdash;
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  <StatusBadge status={scan.status} />
                </td>
                <td className="px-6 py-4 text-right">
                  {scan.status === "completed" && (
                    <Link
                      href={`/history/${scan.id}`}
                      className="group inline-flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                    >
                      View Report
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden divide-y divide-white/[0.04]">
        {scans.map((scan) => (
          <div key={scan.id} className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <a
                href={scan.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-indigo-400 hover:text-indigo-300 truncate flex-1 font-medium"
              >
                {scan.url}
              </a>
              <StatusBadge status={scan.status} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">
                {new Date(scan.scan_date).toLocaleDateString()}
              </span>
              <div className="flex items-center gap-3">
                {scan.status === "completed" && (
                  <>
                    <ScoreBadge score={scan.accessibility_score} size="sm" />
                    <Link
                      href={`/history/${scan.id}`}
                      className="text-xs text-indigo-400 font-medium"
                    >
                      View
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Scan["status"] }) {
  const styles: Record<Scan["status"], string> = {
    pending: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    scanning: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    analyzing: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    failed: "bg-red-500/10 text-red-400 border-red-500/20",
  };

  const dotColors: Record<Scan["status"], string> = {
    pending: "bg-zinc-400",
    scanning: "bg-blue-400",
    analyzing: "bg-violet-400",
    completed: "bg-emerald-400",
    failed: "bg-red-400",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border",
        styles[status]
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          dotColors[status],
          (status === "scanning" || status === "analyzing") && "animate-pulse"
        )}
      />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
