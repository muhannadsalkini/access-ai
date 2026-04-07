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
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const sizeStyles = {
    sm: { px: 44, fontSize: "text-xs font-bold" },
    md: { px: 72, fontSize: "text-lg font-bold" },
    lg: { px: 96, fontSize: "text-2xl font-bold" },
  };

  const config = sizeStyles[size];

  if (size === "sm") {
    return (
      <div
        className={cn(
          "rounded-lg border flex items-center justify-center font-bold",
          "text-xs",
          colors.text,
          colors.bg,
          colors.border
        )}
        style={{ width: config.px, height: config.px }}
      >
        {score}
      </div>
    );
  }

  return (
    <div
      className="relative flex items-center justify-center shrink-0"
      style={{ width: config.px, height: config.px }}
    >
      <svg
        className="absolute inset-0 -rotate-90"
        width={config.px}
        height={config.px}
        viewBox="0 0 100 100"
      >
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-white/[0.06]"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(colors.ring, "transition-all duration-700 ease-out")}
        />
      </svg>
      <span className={cn(config.fontSize, colors.text)}>{score}</span>
    </div>
  );
}
