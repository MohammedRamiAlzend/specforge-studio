import type { ReactNode } from "react";

export type ExperienceKind = "business-model" | "presentation";

const businessBlocks = [
  "Partners",
  "Activities",
  "Value",
  "Relationships",
  "Segments",
  "Resources",
  "Channels",
  "Costs",
  "Revenue",
];

function WindowDots() {
  return (
    <div className="flex items-center gap-1.5" aria-hidden="true">
      <span className="h-2 w-2 rounded-full bg-rose-300/60" />
      <span className="h-2 w-2 rounded-full bg-amber-300/60" />
      <span className="h-2 w-2 rounded-full bg-emerald-300/60" />
    </div>
  );
}

function BusinessModelPreview({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950 ${compact ? "p-3" : "p-4 sm:p-5"}`}>
      <div className="absolute -right-16 -top-20 h-44 w-44 rounded-full bg-forge-500/20 blur-3xl" />
      <div className="relative flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">
          <WindowDots />
          Business Model Canvas
        </div>
        <span className="rounded-full bg-forge-400/10 px-2 py-1 text-[9px] font-medium text-forge-300">LIVE</span>
      </div>
      <div className={`relative mt-3 grid grid-cols-3 gap-1.5 ${compact ? "h-28" : "h-44 sm:h-52"}`}>
        {businessBlocks.map((label, index) => (
          <div
            key={label}
            className={`flex flex-col justify-between rounded-lg border p-2 text-[9px] transition-transform ${
              index === 2
                ? "border-forge-400/50 bg-forge-400/15 text-forge-100 shadow-lg shadow-forge-950/30"
                : "border-white/10 bg-white/[0.045] text-slate-400"
            } ${index === 2 ? "scale-[1.02]" : ""}`}
          >
            <span className="font-semibold uppercase tracking-wider">{label}</span>
            <span className="h-1 w-1 rounded-full bg-current opacity-60" />
          </div>
        ))}
      </div>
      <div className="relative mt-3 flex items-center justify-between text-[10px] text-slate-500">
        <span>9 strategic blocks</span>
        <span className="text-forge-300">+ Add insight</span>
      </div>
    </div>
  );
}

function PresentationPreview({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950 ${compact ? "p-3" : "p-4 sm:p-5"}`}>
      <div className="absolute -left-16 -top-20 h-48 w-48 rounded-full bg-violet-500/20 blur-3xl" />
      <div className="relative flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">
          <WindowDots />
          Pitch Presentation
        </div>
        <span className="rounded-full bg-violet-400/10 px-2 py-1 text-[9px] font-medium text-violet-300">01 / 04</span>
      </div>
      <div className={`relative mt-3 flex gap-2 ${compact ? "h-28" : "h-44 sm:h-52"}`}>
        <div className="flex w-10 shrink-0 flex-col gap-1.5">
          {["01", "02", "03", "04"].map((number, index) => (
            <div key={number} className={`flex flex-1 items-center justify-center rounded-md border text-[9px] font-semibold ${index === 0 ? "border-violet-300/50 bg-violet-400/20 text-violet-100" : "border-white/10 bg-white/[0.04] text-slate-600"}`}>
              {number}
            </div>
          ))}
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-between rounded-xl bg-gradient-to-br from-violet-600 via-indigo-600 to-slate-900 p-4 text-white shadow-xl shadow-violet-950/30">
          <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.2em] text-white/60">
            <span>SpecForge / Story</span>
            <span>2026</span>
          </div>
          <div>
            <div className="max-w-[11rem] text-xl font-bold leading-tight sm:text-2xl">From insight to execution.</div>
            <div className="mt-2 h-1 w-12 rounded-full bg-white/70" />
          </div>
          <div className="text-[9px] text-white/60">Generated from your project model</div>
        </div>
      </div>
      <div className="relative mt-3 flex items-center justify-between text-[10px] text-slate-500">
        <span>Live project narrative</span>
        <span className="text-violet-300">Download .pptx</span>
      </div>
    </div>
  );
}

export function ExperiencePreview({ kind, compact = false }: { kind: ExperienceKind; compact?: boolean }) {
  return kind === "business-model" ? <BusinessModelPreview compact={compact} /> : <PresentationPreview compact={compact} />;
}

export function ExperienceIcon({ kind }: { kind: ExperienceKind }) {
  const icon: ReactNode = kind === "business-model" ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <rect x="3" y="4" width="7" height="7" rx="1.5" /><rect x="14" y="4" width="7" height="7" rx="1.5" /><rect x="3" y="13" width="7" height="7" rx="1.5" /><rect x="14" y="13" width="7" height="7" rx="1.5" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" /><path d="m10 9 5 3-5 3V9Z" /><path d="M6 8h.01M6 12h.01M6 16h.01" />
    </svg>
  );
  return <span className="h-5 w-5">{icon}</span>;
}
