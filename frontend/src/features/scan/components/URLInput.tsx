"use client";

import { useState } from "react";
import { Globe, ArrowRight, AlertCircle, FileText } from "lucide-react";

interface URLInputProps {
  onSubmit: (url: string) => void;
  loading: boolean;
}

export default function URLInput({ onSubmit, loading }: URLInputProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  const isSitemap = (() => {
    try {
      const parsed = new URL(url);
      return parsed.pathname.toLowerCase().endsWith(".xml");
    } catch {
      return false;
    }
  })();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Basic validation
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        setError("Only HTTP and HTTPS URLs are allowed");
        return;
      }
    } catch {
      setError("Please enter a valid URL (e.g., https://example.com)");
      return;
    }

    onSubmit(url);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className="flex flex-col gap-3">
        <label htmlFor="url" className="sr-only">
          Website URL
        </label>

        <div className="relative">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                required
                disabled={loading}
                className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 text-base focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="group flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-xl font-medium transition-all duration-300 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:from-indigo-400 hover:to-violet-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-indigo-500/20 whitespace-nowrap"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  Scan
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </div>
        </div>

        {isSitemap && !error && (
          <div className="flex items-center gap-2 text-sm text-indigo-400 animate-fade-in">
            <FileText className="w-4 h-4 shrink-0" />
            <span>
              Sitemap detected — all pages will be scanned (up to 10)
            </span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!isSitemap && !error && (
          <p className="text-xs text-zinc-500 text-center">
            Enter a page URL or an XML sitemap to scan multiple pages at once
          </p>
        )}
      </div>
    </form>
  );
}
