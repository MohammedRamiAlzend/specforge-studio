import { useId } from "react";

interface LogoProps {
  /** Rendered square size in px. */
  size?: number;
  className?: string;
}

/**
 * SpecForge Studio brand mark (2026-08-24): an anvil struck by a spark on a
 * forge-gradient tile. Pure SVG, no text — scales cleanly from favicon to
 * navbar. The gradient id is unique per instance so several logos can
 * coexist on one page.
 */
export function Logo({ size = 32, className = "" }: LogoProps) {
  const gradientId = useId();
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
        <linearGradient id={gradientId} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#e19c4d" />
          <stop offset="0.55" stopColor="#d97f2b" />
          <stop offset="1" stopColor="#a7521e" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill={`url(#${gradientId})`} />
      {/* anvil: top slab, waist, base */}
      <rect x="4.5" y="12" width="23" height="4" rx="1.4" fill="#fff7ed" />
      <path d="M9.5 16h13l-3.4 5h-6.2l-3.4-5Z" fill="#fff7ed" />
      <rect x="14.25" y="20.2" width="3.5" height="3" fill="#fff7ed" />
      <path d="M10.5 22.6h11l1.6 4.4h-14.2l1.6-4.4Z" fill="#fff7ed" />
      {/* spark */}
      <path
        d="M24.6 2.6l1.15 2.35 2.35 1.15-2.35 1.15L24.6 9.6l-1.15-2.35L21.1 6.1l2.35-1.15L24.6 2.6Z"
        fill="#ffedd5"
      />
    </svg>
  );
}
