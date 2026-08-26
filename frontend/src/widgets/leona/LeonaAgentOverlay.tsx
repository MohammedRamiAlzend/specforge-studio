import { useState } from "react";
import { Link } from "react-router-dom";

type ProviderMode = "byok" | "managed";

function LeonaMark({ small = false }: { small?: boolean }) {
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-xl bg-forge-500/15 text-forge-300 ${small ? "h-8 w-8" : "h-10 w-10"}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={small ? "h-4 w-4" : "h-5 w-5"}>
        <path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3Z" />
        <path d="m19 16 .6 2.4L22 19l-2.4.6L19 22l-.6-2.4L16 19l2.4-.6L19 16Z" />
      </svg>
    </span>
  );
}

const steps = [
  { number: "01", title: "Read the project", body: "Leona combines your Business Model, Presentation, Markdown workspace, requirements, roadmap, and architecture." },
  { number: "02", title: "Build a draft", body: "The agent proposes structured artifacts with source references, assumptions, warnings, and confidence signals." },
  { number: "03", title: "Review the diff", body: "You inspect the proposed changes before anything is written. Existing artifacts stay protected by default." },
  { number: "04", title: "Approve and export", body: "After approval, SpecForge materializes the project and regenerates Markdown, JSON, ZIP, and Presentation outputs." },
];

export function LeonaAgentOverlay({ projectName }: { projectName?: string }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ProviderMode>("byok");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open Leona Agent"
        title="Open Leona Agent"
        className="fixed bottom-5 right-5 z-30 flex items-center gap-2 rounded-full border border-forge-400/30 bg-slate-950 px-3 py-2 text-sm font-semibold text-white shadow-xl shadow-slate-950/25 transition-all hover:-translate-y-0.5 hover:border-forge-300/60 hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-forge-400/40"
      >
        <LeonaMark small />
        <span>Leona Agent</span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-end bg-slate-950/50 p-4 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="leona-agent-title">
          <button type="button" aria-label="Close Leona Agent" onClick={() => setOpen(false)} className="absolute inset-0 cursor-default" />
          <section className="relative z-10 max-h-[min(760px,calc(100vh-2rem))] w-full max-w-xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/30">
            <div className="border-b border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-forge-950 px-6 py-6 text-white">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <LeonaMark />
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-forge-300">Project intelligence</p>
                    <h2 id="leona-agent-title" className="mt-1 text-2xl font-bold tracking-tight">Leona Agent</h2>
                    <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-300">Turn your project evidence into a complete, reviewable build brief.</p>
                  </div>
                </div>
                <button type="button" onClick={() => setOpen(false)} aria-label="Close Leona Agent" className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
                </button>
              </div>
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3 text-xs text-slate-300">
                <span className="font-semibold text-white">Active project:</span> {projectName ?? "Choose a project first"}
              </div>
            </div>

            <div className="space-y-6 p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">How Leona works</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {steps.map((step) => (
                    <div key={step.number} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold tracking-[0.18em] text-forge-600">{step.number}</span>
                        <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-slate-500">{step.body}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Choose your provider mode</p>
                    <p className="mt-1 text-xs text-slate-500">Your key never belongs in browser storage or generated exports.</p>
                  </div>
                  <Link to="/settings?tab=Providers" onClick={() => setOpen(false)} className="text-xs font-semibold text-forge-700 hover:text-forge-600">Provider settings</Link>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <button type="button" onClick={() => setMode("byok")} className={`rounded-2xl border p-4 text-left transition-colors ${mode === "byok" ? "border-forge-500 bg-forge-50 ring-2 ring-forge-500/10" : "border-slate-200 hover:border-slate-300"}`}>
                    <p className="text-sm font-semibold text-slate-900">Use my provider</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">Connect an OpenAI-compatible API key. You pay the provider directly.</p>
                    <span className="mt-3 inline-flex rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-forge-700">BYOK</span>
                  </button>
                  <button type="button" onClick={() => setMode("managed")} className={`rounded-2xl border p-4 text-left transition-colors ${mode === "managed" ? "border-forge-500 bg-forge-50 ring-2 ring-forge-500/10" : "border-slate-200 hover:border-slate-300"}`}>
                    <p className="text-sm font-semibold text-slate-900">Use SpecForge AI</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">Use the managed provider through a paid-plan allowance and usage policy.</p>
                    <span className="mt-3 inline-flex rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-forge-700">Premium</span>
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-950">Activation is not connected yet</p>
                <p className="mt-1 text-xs leading-relaxed text-amber-800">{mode === "byok" ? "The BYOK connection screen and provider validation route will be enabled after the provider adapter is approved." : "Managed SpecForge AI requires an approved provider, plan entitlement, quota policy, and production secret configuration."}</p>
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Close</button>
                <button type="button" disabled className="cursor-not-allowed rounded-xl bg-slate-300 px-4 py-2.5 text-sm font-semibold text-white">Generate project draft</button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
