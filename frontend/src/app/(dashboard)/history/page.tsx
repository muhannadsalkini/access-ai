"use client";

import { useEffect, useState } from "react";
import ScanHistoryTable from "@/features/history/components/ScanHistoryTable";
import { getScanHistory } from "@/features/history/services/history";
import type { Scan } from "@/shared/types";
import { Clock, AlertCircle } from "lucide-react";

export default function HistoryPage() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await getScanHistory();
        setScans(data);
      } catch (err: any) {
        setError(err.message || "Failed to load scan history");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Clock className="w-5 h-5 text-indigo-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">Scan History</h1>
        </div>
        <p className="text-zinc-400 ml-13">
          Review your past accessibility scans and reports
        </p>
      </div>

      {loading && <HistorySkeleton />}

      {error && (
        <div className="flex items-start gap-3 bg-red-500/10 text-red-400 p-4 rounded-xl border border-red-500/20">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && <ScanHistoryTable scans={scans} />}
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden animate-pulse">
      {/* Table header */}
      <div className="hidden md:grid grid-cols-5 border-b border-white/[0.06] px-6 py-3.5 gap-4">
        {["w-8", "w-12", "w-10", "w-12", "w-10"].map((w, i) => (
          <div key={i} className={`h-3 ${w} bg-white/[0.06] rounded`} />
        ))}
      </div>

      {/* Skeleton rows */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="hidden md:grid grid-cols-5 items-center px-6 py-4 gap-4 border-b border-white/[0.03] last:border-0"
        >
          {/* URL cell */}
          <div className="flex items-center gap-2">
            <div className="w-12 h-4 bg-white/[0.06] rounded-md" />
            <div
              className="h-3 bg-white/[0.06] rounded"
              style={{ width: `${110 + (i % 3) * 40}px` }}
            />
          </div>
          {/* Date */}
          <div className="h-3 w-20 bg-white/[0.06] rounded" />
          {/* Score */}
          <div className="flex justify-center">
            <div className="h-6 w-12 bg-white/[0.06] rounded-lg" />
          </div>
          {/* Status */}
          <div className="flex justify-center">
            <div className="h-6 w-20 bg-white/[0.06] rounded-lg" />
          </div>
          {/* Action */}
          <div className="flex justify-end">
            <div className="h-3 w-20 bg-white/[0.06] rounded" />
          </div>
        </div>
      ))}

      {/* Mobile skeleton rows */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={`m-${i}`}
          className="md:hidden p-4 border-b border-white/[0.03] last:border-0 space-y-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div
              className="h-3 bg-white/[0.06] rounded flex-1"
              style={{ maxWidth: `${140 + (i % 2) * 60}px` }}
            />
            <div className="h-5 w-16 bg-white/[0.06] rounded-lg shrink-0" />
          </div>
          <div className="flex items-center justify-between">
            <div className="h-3 w-20 bg-white/[0.06] rounded" />
            <div className="h-5 w-10 bg-white/[0.06] rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
