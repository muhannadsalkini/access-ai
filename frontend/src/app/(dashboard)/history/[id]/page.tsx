"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ReportView from "@/features/scan/components/ReportView";
import { getScanDetail } from "@/features/history/services/history";
import type { ScanResult } from "@/shared/types";
import { ArrowLeft, AlertCircle } from "lucide-react";

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
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to History
        </Link>
      </div>

      {loading && (
        <div className="text-center py-20">
          <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto" />
          <p className="text-zinc-500 mt-4 text-sm">Loading report...</p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 bg-red-500/10 text-red-400 p-4 rounded-xl border border-red-500/20">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {result && <ReportView result={result} />}
    </div>
  );
}
