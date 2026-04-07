"use client";

import { useEffect, useState } from "react";
import ScanHistoryTable from "@/features/history/components/ScanHistoryTable";
import { getScanHistory } from "@/features/history/services/history";
import type { Scan } from "@/shared/types";

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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Scan History</h1>
        <p className="text-gray-600">
          Review your past accessibility scans and reports
        </p>
      </div>

      {loading && (
        <div className="text-center py-16">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 mt-4">Loading scan history...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200">
          {error}
        </div>
      )}

      {!loading && !error && <ScanHistoryTable scans={scans} />}
    </div>
  );
}
