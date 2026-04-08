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
];

export default function ScanProgress() {
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

    // Move to "Analyzing" stage after 8 seconds
    const timer1 = setTimeout(() => setCurrentStage(1), 8000);

    return () => {
      clearInterval(dotsInterval);
      clearInterval(elapsedInterval);
      clearTimeout(timer1);
    };
  }, []);

  const formatElapsed = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const CurrentIcon = stages[currentStage].icon;

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
        <p className="text-sm text-zinc-400 mt-2">
          {stages[currentStage].description}
        </p>
        <p className="text-xs text-zinc-600 mt-3">
          Elapsed: {formatElapsed(elapsed)}
        </p>
      </div>

      {/* Progress steps */}
      <div className="space-y-3">
        {stages.map((stage, index) => {
          const StageIcon = stage.icon;
          const isCompleted = index < currentStage;
          const isActive = index === currentStage;
          const isPending = index > currentStage;

          return (
            <div
              key={stage.key}
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
                  isActive && stage.bgColor,
                  isPending && "bg-white/5 border-white/10"
                )}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <StageIcon
                    className={cn(
                      "w-4 h-4",
                      isActive ? stage.color : "text-zinc-600"
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
                  {stage.label}
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
