"use client";

import { useState } from "react";
import URLInput from "@/features/scan/components/URLInput";
import ScanProgress from "@/features/scan/components/ScanProgress";
import ReportView from "@/features/scan/components/ReportView";
import { createScan } from "@/features/scan/services/scan";
import type { ScanResult } from "@/shared/types";

export default function ScanPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState("");

  const handleScan = async (url: string) => {
    setLoading(true);
    setResult(null);
    setError("");

    try {
      const scanResult = await createScan(url);
      setResult(scanResult);
    } catch (err: any) {
      setError(err.message || "Scan failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError("");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Accessibility Scanner
        </h1>
        <p className="text-gray-600">
          Enter a website URL to scan for WCAG 2.1 accessibility issues
        </p>
      </div>

      {/* URL Input (always visible unless showing results) */}
      {!result && !loading && (
        <URLInput onSubmit={handleScan} loading={loading} />
      )}

      {/* Error */}
      {error && (
        <div className="max-w-2xl mx-auto mt-6">
          <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200">
            <p className="font-medium">Scan failed</p>
            <p className="text-sm mt-1">{error}</p>
            <button
              onClick={handleReset}
              className="text-sm text-red-600 hover:text-red-700 font-medium mt-2 underline"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && <ScanProgress />}

      {/* Results */}
      {result && (
        <div>
          <div className="text-center mb-8">
            <button
              onClick={handleReset}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Scan another website
            </button>
          </div>
          <ReportView result={result} />
        </div>
      )}
    </div>
  );
}
