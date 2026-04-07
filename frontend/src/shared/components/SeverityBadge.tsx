"use client";

import { cn } from "@/shared/lib/utils";
import { AlertTriangle, AlertCircle, Info, MinusCircle } from "lucide-react";
import type { Issue } from "@/shared/types";

interface SeverityBadgeProps {
  severity: Issue["severity"];
}

const config: Record<
  Issue["severity"],
  { icon: typeof AlertCircle; className: string; dotColor: string }
> = {
  critical: {
    icon: AlertCircle,
    className: "bg-red-500/10 text-red-400 border-red-500/20",
    dotColor: "bg-red-400",
  },
  serious: {
    icon: AlertTriangle,
    className: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    dotColor: "bg-orange-400",
  },
  moderate: {
    icon: MinusCircle,
    className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    dotColor: "bg-yellow-400",
  },
  minor: {
    icon: Info,
    className: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    dotColor: "bg-blue-400",
  },
};

export default function SeverityBadge({ severity }: SeverityBadgeProps) {
  const { className, dotColor } = config[severity];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border",
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", dotColor)} />
      {severity.charAt(0).toUpperCase() + severity.slice(1)}
    </span>
  );
}
