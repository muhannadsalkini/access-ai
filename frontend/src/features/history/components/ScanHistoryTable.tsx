"use client";

import Link from "next/link";
import type { Scan } from "@/shared/types";
import ScoreBadge from "@/shared/components/ScoreBadge";

interface ScanHistoryTableProps {
  scans: Scan[];
}

export default function ScanHistoryTable({ scans }: ScanHistoryTableProps) {
  if (scans.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          No scans yet
        </h3>
        <p className="text-gray-500 mb-4">
          Start by scanning a website for accessibility issues.
        </p>
        <Link
          href="/scan"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
        >
          Run Your First Scan
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
              URL
            </th>
            <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
            <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Score
            </th>
            <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {scans.map((scan) => (
            <tr key={scan.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4">
                <a
                  href={scan.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline truncate block max-w-xs"
                >
                  {scan.url}
                </a>
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {new Date(scan.scan_date).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 text-center">
                {scan.status === "completed" ? (
                  <div className="flex justify-center">
                    <ScoreBadge score={scan.accessibility_score} size="sm" />
                  </div>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
              <td className="px-6 py-4 text-center">
                <StatusBadge status={scan.status} />
              </td>
              <td className="px-6 py-4 text-right">
                {scan.status === "completed" && (
                  <Link
                    href={`/history/${scan.id}`}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View Report →
                  </Link>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: Scan["status"] }) {
  const styles: Record<Scan["status"], string> = {
    pending: "bg-gray-100 text-gray-600",
    scanning: "bg-blue-100 text-blue-600",
    analyzing: "bg-purple-100 text-purple-600",
    completed: "bg-green-100 text-green-600",
    failed: "bg-red-100 text-red-600",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
