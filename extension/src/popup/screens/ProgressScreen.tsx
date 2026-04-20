import { useEffect, useState } from "react";
import Logo from "../components/Logo";

interface ProgressScreenProps {
  url: string;
}

const STEPS = [
  { label: "Loading the page..." },
  { label: "Running accessibility checks..." },
  { label: "Analyzing issues with AI..." },
  { label: "Generating report..." },
];

const STEP_DURATION_MS = 10_000; // advance every 10 seconds

export default function ProgressScreen({ url }: ProgressScreenProps) {
  const [stepIndex, setStepIndex] = useState(0);

  // Cycle through steps while waiting for the API response
  useEffect(() => {
    const timer = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
    }, STEP_DURATION_MS);
    return () => clearInterval(timer);
  }, []);

  const displayUrl = url.length > 42 ? url.slice(0, 39) + "…" : url;

  return (
    <div className="flex-1 flex flex-col bg-[#09090b]">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.06]">
        <Logo size={28} />
        <span className="text-sm font-semibold text-white">AccessAI</span>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center">
        {/* Animated rings */}
        <div className="relative mb-7">
          <div className="w-16 h-16 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
          <div
            className="absolute inset-2 rounded-full border-2 border-violet-500/10 border-t-violet-500/50 animate-spin"
            style={{ animationDirection: "reverse", animationDuration: "1.2s" }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-indigo-500/20 border border-indigo-500/40 animate-pulse" />
          </div>
        </div>

        <h2 className="text-base font-semibold text-white mb-1">
          Scanning in progress
        </h2>

        <p className="text-xs text-zinc-500 mb-1 font-mono break-all">
          {displayUrl}
        </p>

        {/* Steps */}
        <div className="mt-5 w-full space-y-2">
          {STEPS.map((step, i) => {
            const isDone = i < stepIndex;
            const isCurrent = i === stepIndex;

            return (
              <div key={step.label} className="flex items-center gap-2.5 text-left">
                {/* Indicator */}
                <div className="shrink-0 w-4 flex items-center justify-center">
                  {isDone && (
                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                  )}
                  {isCurrent && (
                    <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                  )}
                  {!isDone && !isCurrent && (
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                  )}
                </div>

                <span
                  className={`text-xs transition-colors ${
                    isDone
                      ? "text-zinc-600 line-through"
                      : isCurrent
                        ? "text-zinc-200 font-medium"
                        : "text-zinc-600"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
