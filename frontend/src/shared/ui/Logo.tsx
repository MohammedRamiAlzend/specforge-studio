import { useId } from "react";

interface LogoProps {
  /** Rendered square size in px. */
  size?: number;
  className?: string;
}

/**
 * SpecForge Studio product mark: a central system node with four blueprint
 * rails. The symbol avoids letterforms so it remains recognizable at small
 * sizes and works consistently across the app shell, landing page, and tab.
 */
export function Logo({ size = 32, className = "" }: LogoProps) {
  const id = useId().replace(/:/g, "");
  const backgroundId = `sf-logo-bg-${id}`;
  const accentId = `sf-logo-accent-${id}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label="SpecForge Studio logo"
      className={`sf-logo shrink-0 ${className}`}
      data-testid="brand-logo"
    >
      <defs>
        <linearGradient id={backgroundId} x1="4" y1="3" x2="29" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#172554" />
          <stop offset="0.55" stopColor="#111827" />
          <stop offset="1" stopColor="#0f172a" />
        </linearGradient>
        <linearGradient id={accentId} x1="8" y1="7" x2="23" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fbbf24" />
          <stop offset="0.45" stopColor="#f97316" />
          <stop offset="1" stopColor="#e14d2a" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${backgroundId})`} />
      <path d="M6 12.5h5.5M20.5 12.5H26M12.5 6v5.5M12.5 19.5V26" stroke="#94a3b8" strokeWidth="1.35" strokeLinecap="round" />
      <circle cx="6" cy="12.5" r="1.45" fill="#f8fafc" />
      <circle cx="26" cy="12.5" r="1.45" fill="#f8fafc" />
      <circle cx="12.5" cy="6" r="1.45" fill="#f8fafc" />
      <circle cx="12.5" cy="26" r="1.45" fill="#f8fafc" />
      <path d="m16 7.5 6 6-6 6-6-6 6-6Z" fill={`url(#${accentId})`} />
      <path d="m16 10.8 2.7 2.7-2.7 2.7-2.7-2.7 2.7-2.7Z" fill="#fff7ed" fillOpacity="0.92" />
      <path d="M10 22.5h12" stroke="#64748b" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
