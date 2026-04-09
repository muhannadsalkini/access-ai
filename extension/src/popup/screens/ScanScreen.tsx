import { useState, useEffect } from "react";
import {
  Scan,
  Globe,
  AlertCircle,
  LogOut,
  ExternalLink,
  History,
} from "lucide-react";
import Logo from "../components/Logo";

const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL as string;

interface ScanScreenProps {
  userEmail: string;
  onStartScan: (url: string) => void;
  onSignOut: () => void;
  error?: string;
}

export default function ScanScreen({
  userEmail,
  onStartScan,
  onSignOut,
  error,
}: ScanScreenProps) {
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");

  // Auto-detect current tab URL on mount
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabUrl = tabs[0]?.url;
      if (tabUrl && (tabUrl.startsWith("http://") || tabUrl.startsWith("https://"))) {
        setUrl(tabUrl);
      }
    });
  }, []);

  const handleScanCurrentTab = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabUrl = tabs[0]?.url;
      if (tabUrl && (tabUrl.startsWith("http://") || tabUrl.startsWith("https://"))) {
        setUrl(tabUrl);
        submitScan(tabUrl);
      } else {
        setUrlError("Cannot scan this type of page.");
      }
    });
  };

  const submitScan = (scanUrl: string) => {
    setUrlError("");
    const trimmed = scanUrl.trim();
    if (!trimmed) {
      setUrlError("Please enter a URL");
      return;
    }
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
      setUrlError("URL must start with http:// or https://");
      return;
    }
    onStartScan(trimmed);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitScan(url);
  };

  const initials = userEmail
    ? userEmail[0].toUpperCase()
    : "?";

  return (
    <div className="flex-1 flex flex-col bg-[#09090b]">
      {/* Navbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Logo size={28} />
          <span className="text-sm font-semibold text-white">AccessAI</span>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`${FRONTEND_URL}/history`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
            title="View scan history"
          >
            <History className="w-3.5 h-3.5" />
            History
          </a>

          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-[10px] font-bold">
              {initials}
            </div>
            <button
              onClick={onSignOut}
              className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 rounded-lg hover:bg-white/5"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col px-5 py-6">
        <div className="mb-6">
          <h1 className="text-lg font-bold text-white mb-1">
            Accessibility Scanner
          </h1>
          <p className="text-xs text-zinc-500">
            Scan any website for WCAG 2.1 issues
          </p>
        </div>

        {/* Scan error from previous attempt */}
        {error && (
          <div className="flex items-start gap-2.5 bg-red-500/10 text-red-400 p-3 rounded-xl text-xs border border-red-500/20 mb-4">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* URL input */}
          <div>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
              <input
                type="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setUrlError("");
                }}
                className="w-full pl-9 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-zinc-500 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50 outline-none transition-all"
                placeholder="https://example.com"
              />
            </div>
            {urlError && (
              <p className="mt-1.5 text-xs text-red-400">{urlError}</p>
            )}
          </div>

          {/* Scan URL button */}
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-violet-600 text-white py-2.5 rounded-xl text-sm font-medium transition-all duration-200 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:from-indigo-400 hover:to-violet-500"
          >
            <Scan className="w-4 h-4" />
            Scan URL
          </button>

          {/* Divider */}
          <div className="relative flex items-center gap-3">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-[10px] text-zinc-600 uppercase tracking-widest">
              or
            </span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          {/* Scan current tab button */}
          <button
            type="button"
            onClick={handleScanCurrentTab}
            className="w-full flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-zinc-300 py-2.5 rounded-xl text-sm font-medium hover:bg-white/10 hover:text-white transition-all duration-200"
          >
            <ExternalLink className="w-4 h-4" />
            Scan Current Tab
          </button>
        </form>

        {/* Footer link */}
        <div className="mt-auto pt-6">
          <a
            href={`${FRONTEND_URL}/history`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            View history, reports and AI chat on AccessAI
          </a>
        </div>
      </div>
    </div>
  );
}
