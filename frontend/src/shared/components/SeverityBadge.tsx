"use client";

import { severityColors, type Issue } from "@/shared/types";

interface SeverityBadgeProps {
  severity: Issue["severity"];
}

export default function SeverityBadge({ severity }: SeverityBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${severityColors[severity]}`}
    >
      {severity.charAt(0).toUpperCase() + severity.slice(1)}
    </span>
  );
}
