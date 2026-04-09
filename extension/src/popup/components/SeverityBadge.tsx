import type { Issue } from "@/types";

interface SeverityBadgeProps {
  severity: Issue["severity"];
}

const styles: Record<Issue["severity"], string> = {
  critical: "bg-red-500/10 text-red-400 border-red-500/20",
  serious: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  moderate: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  minor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

export default function SeverityBadge({ severity }: SeverityBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide border ${styles[severity]}`}
    >
      {severity}
    </span>
  );
}
