"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ReportView from "@/features/scan/components/ReportView";
import { getScanDetail } from "@/features/history/services/history";
import type { ScanResult } from "@/shared/types";

export default function ScanDetailPage() {
  const params = useParams();
  const scanId = params.id as string;
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const data = await getScanDetail(scanId);
        setResult(data);
      } catch (err: any) {
        setError(err.message || "Failed to load scan details");
      } finally {
        setLoading(false);
      }
    };

    if (scanId) {
      fetchDetail();
    }
  }, [scanId]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <Link
          href="/history"
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          ← Back to History
        </Link>
      </div>

      {loading && (
        <div className="text-center py-16">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 mt-4">Loading report...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200">
          {error}
        </div>
      )}

      {result && <ReportView result={result} />}
    </div>
  );
}
