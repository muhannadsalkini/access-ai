interface ScoreBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
}

function getScoreColor(score: number) {
  if (score >= 80) return { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/25" };
  if (score >= 60) return { bg: "bg-yellow-500/15", text: "text-yellow-400", border: "border-yellow-500/25" };
  if (score >= 40) return { bg: "bg-orange-500/15", text: "text-orange-400", border: "border-orange-500/25" };
  return { bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/25" };
}

function getScoreLabel(score: number) {
  if (score >= 80) return "Good";
  if (score >= 60) return "Fair";
  if (score >= 40) return "Poor";
  return "Critical";
}

export default function ScoreBadge({ score, size = "md" }: ScoreBadgeProps) {
  const { bg, text, border } = getScoreColor(score);

  if (size === "lg") {
    return (
      <div className={`inline-flex flex-col items-center justify-center w-20 h-20 rounded-2xl ${bg} border ${border}`}>
        <span className={`text-3xl font-bold tabular-nums ${text}`}>{score}</span>
        <span className={`text-xs font-medium ${text} opacity-80`}>{getScoreLabel(score)}</span>
      </div>
    );
  }

  if (size === "sm") {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold tabular-nums ${bg} ${text} border ${border}`}>
        {score}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold tabular-nums ${bg} ${text} border ${border}`}>
      {score}
      <span className="font-normal text-xs opacity-70">{getScoreLabel(score)}</span>
    </span>
  );
}
