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

      {loading && (
        <div className="text-center py-20">
          <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto" />
          <p className="text-zinc-500 mt-4 text-sm">
            Loading scan history...
          </p>
        </div>
      )}

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
