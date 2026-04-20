"use client";

import { useEffect, useState } from "react";
import { cn } from "@/shared/lib/utils";
import { Radar, Sparkles, Check } from "lucide-react";

const stages = [
  {
    key: "scanning",
    label: "Scanning website",
    description: "Loading pages and running accessibility checks...",
    icon: Radar,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10 border-blue-500/20",
  },
  {
    key: "analyzing",
    label: "AI Analysis",
    description: "Classifying issues and generating recommendations...",
    icon: Sparkles,
    color: "text-violet-400",
    bgColor: "bg-violet-500/10 border-violet-500/20",
  },
] as const;

interface ScanProgressProps {
  /**
   * Current pipeline stage.  When omitted the component falls back to its
   * pre-streaming behavior (auto-advances "scanning" → "analyzing" after 8s).
   */
  stage?: "scanning" | "analyzing" | "idle";
  /** Free-form progress message to display under the stage title. */
  message?: string;
  /** Progress for sitemap scans (how many of N pages done). */
  pages?: { scanned: number; total: number } | null;
  /** Number of enriched issues streamed so far. */
  issueCount?: number;
}

export default function ScanProgress({
  stage,
  message,
  pages,
  issueCount,
}: ScanProgressProps = {}) {
  const [currentStage, setCurrentStage] = useState(0);
  const [dots, setDots] = useState("");
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const dotsInterval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);

    const elapsedInterval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    // Fallback timer — only used when the caller does NOT drive `stage`.
    const timer1 = setTimeout(() => {
      if (stage === undefined) setCurrentStage(1);
    }, 8000);

    return () => {
      clearInterval(dotsInterval);
      clearInterval(elapsedInterval);
      clearTimeout(timer1);
    };
  }, [stage]);

  // When the parent tells us the stage, follow it.
  useEffect(() => {
    if (stage === "scanning") setCurrentStage(0);
    else if (stage === "analyzing") setCurrentStage(1);
  }, [stage]);

  const formatElapsed = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const CurrentIcon = stages[currentStage].icon;

  const description = message || stages[currentStage].description;

  return (
    <div className="w-full max-w-md mx-auto py-12 animate-fade-in">
      {/* Central spinner area */}
      <div className="text-center mb-10">
        <div className="relative inline-flex items-center justify-center w-20 h-20 mb-6">
          {/* Spinning ring */}
          <div
            className={cn(
              "absolute inset-0 rounded-full border-2 border-transparent animate-spin",
              currentStage === 0 && "border-t-blue-500 border-r-blue-500/30",
              currentStage === 1 && "border-t-violet-500 border-r-violet-500/30"
            )}
            style={{ animationDuration: "1.5s" }}
          />
          {/* Background circle */}
          <div
            className={cn(
              "w-16 h-16 rounded-full border flex items-center justify-center",
              stages[currentStage].bgColor
            )}
          >
            <CurrentIcon
              className={cn("w-7 h-7", stages[currentStage].color)}
            />
          </div>
        </div>

        <h3 className="text-xl font-semibold text-white">
          {stages[currentStage].label}
          <span className="text-zinc-500">{dots}</span>
        </h3>
        <p className="text-sm text-zinc-400 mt-2 min-h-[1.25rem]">
          {description}
        </p>

        {/* Sitemap page progress */}
        {pages && pages.total > 0 && (
          <div className="mt-4 max-w-[240px] mx-auto">
            <div className="flex items-center justify-between text-xs text-zinc-500 mb-1.5">
              <span>
                Pages: {pages.scanned}/{pages.total}
              </span>
              <span>
                {Math.round((pages.scanned / pages.total) * 100)}%
              </span>
            </div>
            <div className="h-1 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full bg-blue-500/70 transition-all duration-300"
                style={{
                  width: `${(pages.scanned / pages.total) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Live issue counter (during AI streaming) */}
        {typeof issueCount === "number" && issueCount > 0 && (
          <p className="text-xs text-violet-300 mt-3">
            {issueCount} issue{issueCount === 1 ? "" : "s"} enriched so far…
          </p>
        )}

        <p className="text-xs text-zinc-600 mt-3">
          Elapsed: {formatElapsed(elapsed)}
        </p>
      </div>

      {/* Progress steps */}
      <div className="space-y-3">
        {stages.map((s, index) => {
          const StageIcon = s.icon;
          const isCompleted = index < currentStage;
          const isActive = index === currentStage;
          const isPending = index > currentStage;

          return (
            <div
              key={s.key}
              className={cn(
                "flex items-center gap-4 px-4 py-3 rounded-xl border transition-all duration-500",
                isCompleted && "bg-emerald-500/5 border-emerald-500/10",
                isActive && "bg-white/[0.03] border-white/10 shadow-lg",
                isPending && "bg-transparent border-white/[0.04] opacity-40"
              )}
            >
              <div
                className={cn(
                  "w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 transition-all duration-500",
                  isCompleted && "bg-emerald-500/10 border-emerald-500/20",
                  isActive && s.bgColor,
                  isPending && "bg-white/5 border-white/10"
                )}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <StageIcon
                    className={cn(
                      "w-4 h-4",
                      isActive ? s.color : "text-zinc-600"
                    )}
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span
                  className={cn(
                    "text-sm font-medium block",
                    isCompleted && "text-emerald-400",
                    isActive && "text-white",
                    isPending && "text-zinc-600"
                  )}
                >
                  {s.label}
                </span>
              </div>
              {isActive && (
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              )}
            </div>
          );
        })}
      </div>

      {/* Reassurance text */}
      {elapsed > 15 && (
        <p className="text-xs text-zinc-600 text-center mt-6 animate-fade-in">
          This may take a moment. Please do not close this page.
        </p>
      )}
    </div>
  );
}
