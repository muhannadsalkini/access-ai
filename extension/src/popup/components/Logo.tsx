/**
 * AccessAI logo — inlined SVG from frontend/src/app/favicon.svg.
 * Inlined to avoid chrome-extension:// URL resolution complexities.
 * Uses a unique gradient ID to prevent conflicts when rendered multiple times.
 */

interface LogoProps {
  /** Size in pixels (applied as width + height). Default: 28 */
  size?: number;
  className?: string;
}

export default function Logo({ size = 28, className = "" }: LogoProps) {
  // Unique gradient ID per component instance to avoid SVG namespace collisions
  const gradId = "accessai-logo-grad";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="none"
      width={size}
      height={size}
      className={className}
      aria-label="AccessAI"
      role="img"
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      {/* Rounded square container */}
      <rect width="32" height="32" rx="7" fill={`url(#${gradId})`} />
      {/* Pupil */}
      <circle cx="16" cy="16" r="6" fill="#fafafa" opacity="0.95" />
      {/* A letterform */}
      <text
        x="16"
        y="19.5"
        textAnchor="middle"
        fontFamily="system-ui, sans-serif"
        fontSize="7.5"
        fontWeight="700"
        fill="#6366f1"
      >
        A
      </text>
      {/* Scan arc */}
      <path
        d="M22 9 A9 9 0 0 1 28 15"
        stroke="#fafafa"
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  );
}
