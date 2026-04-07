"use client";

import { cn } from "@/shared/lib/utils";

interface ScoreBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
}

export default function ScoreBadge({ score, size = "md" }: ScoreBadgeProps) {
  const getColor = () => {
    if (score >= 90)
      return {
        text: "text-emerald-400",
        ring: "stroke-emerald-500",
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/20",
      };
    if (score >= 70)
      return {
        text: "text-yellow-400",
        ring: "stroke-yellow-500",
        bg: "bg-yellow-500/10",
        border: "border-yellow-500/20",
      };
    if (score >= 50)
      return {
        text: "text-orange-400",
        ring: "stroke-orange-500",
        bg: "bg-orange-500/10",
        border: "border-orange-500/20",
      };
    return {
      text: "text-red-400",
      ring: "stroke-red-500",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
    };
  };

  const colors = getColor();
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (score / 100) * circumference;

  const sizeConfig = {
    sm: { wrapper: "w-11 h-11", text: "text-xs font-bold", svg: 28 },
    md: { wrapper: "w-18 h-18", text: "text-lg font-bold", svg: 56 },
    lg: { wrapper: "w-26 h-26", text: "text-2xl font-bold", svg: 88 },
  };

  const config = sizeConfig[size];

  if (size === "sm") {
    return (
      <div
        className={cn(
          "rounded-lg border flex items-center justify-center font-bold",
          config.wrapper,
          config.text,
          colors.text,
          colors.bg,
          colors.border
        )}
      >
        {score}
      </div>
    );
  }

  return (
    <div className={cn("relative flex items-center justify-center", config.wrapper)}>
      <svg
        className="absolute inset-0 -rotate-90"
        viewBox="0 0 100 100"
        width={config.svg}
        height={config.svg}
      >
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-white/[0.06]"
        />
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(colors.ring, "transition-all duration-700 ease-out")}
        />
      </svg>
      <span className={cn(config.text, colors.text)}>{score}</span>
    </div>
  );
}
