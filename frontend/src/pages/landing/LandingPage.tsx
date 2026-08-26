import { Link } from "react-router-dom";
import { WaveCanvas } from "../../widgets/background/WaveCanvas";
import { useMe } from "../../entities/user/api";
import { usePlans } from "../../entities/plan/api";
import { PricingSection } from "./PricingSection";
import { FaqSection, FeaturesSection, FinalCtaSection, HowItWorksSection, RevealWords } from "./sections";
import { ExperiencePreview } from "../../widgets/experience/ExperiencePreview";

/** Floating mock of the modeler canvas used as the hero visual. */
function HeroMockup() {
  return (
    <div className="sf-float relative mx-auto mt-16 w-full max-w-3xl rounded-xl border border-white/10 bg-slate-900/90 shadow-2xl shadow-black/50 backdrop-blur">
      <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-500/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
        <span className="ml-3 text-xs text-slate-500">SpecForge — checkout workflow</span>
      </div>
      <div className="relative h-64 overflow-hidden p-6 sm:h-72">
        {/* nodes */}
        <div className="absolute left-[8%] top-[14%] rounded-lg border border-emerald-400/60 bg-slate-800 px-4 py-2 text-xs font-medium text-emerald-300">
          ● Start
        </div>
        <div className="absolute left-[34%] top-[42%] rounded-lg border border-forge-400/60 bg-slate-800 px-4 py-2 text-xs font-medium text-forge-300">
          ◆ Payment OK?
        </div>
        <div className="absolute left-[62%] top-[18%] rounded-lg border border-sky-400/60 bg-slate-800 px-4 py-2 text-xs font-medium text-sky-300">
          ▭ Charge card
        </div>
        <div className="absolute bottom-[12%] right-[8%] rounded-lg border border-violet-400/60 bg-slate-800 px-4 py-2 text-xs font-medium text-violet-300">
          ⤵ Ship order
        </div>
        {/* edges */}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <path d="M22 24 C 32 32, 30 46, 38 52" fill="none" stroke="rgba(148,163,184,0.5)" strokeWidth="0.5" />
          <path d="M54 48 C 62 40, 62 30, 66 28" fill="none" stroke="rgba(148,163,184,0.5)" strokeWidth="0.5" />
          <path d="M78 36 C 82 52, 76 66, 72 74" fill="none" stroke="rgba(148,163,184,0.5)" strokeWidth="0.5" />
        </svg>
      </div>
      <div className="border-t border-white/10 px-4 py-2 text-[11px] text-slate-500">
        Mermaid preview generated automatically — no syntax written by hand
      </div>
    </div>
  );
}

const PROOF_POINTS = [
  "36-file workspace per project",
  "4 diagram kinds, zero syntax",
  "Agent-neutral task packs",
  "Full audit trail",
];

function ProductShowcase() {
  return (
    <section className="relative overflow-hidden border-y border-white/5 bg-slate-950 py-24">
      <div className="absolute left-1/2 top-0 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-forge-300">The clarity layer</p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">Build the case, then tell the story.</h2>
          <p className="mt-4 text-base leading-relaxed text-slate-400">
            Start with the commercial truth inside a living canvas. Turn those decisions into a narrative your team, stakeholders, and agents can act on.
          </p>
        </div>
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <div className="group rounded-3xl border border-white/10 bg-white/[0.035] p-3 shadow-2xl shadow-black/20 transition-transform duration-300 hover:-translate-y-1 sm:p-4">
            <ExperiencePreview kind="business-model" />
            <div className="px-2 pb-2 pt-5 sm:px-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-forge-300">01 / Business Model</p>
              <h3 className="mt-2 text-xl font-semibold text-white">Make the value legible.</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">Capture customers, channels, partners, and economics in one editable nine-block canvas that stays connected to the project.</p>
              <Link to="/register" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-white transition-colors hover:text-forge-300">Explore the canvas <span aria-hidden="true">→</span></Link>
            </div>
          </div>
          <div className="group rounded-3xl border border-white/10 bg-white/[0.035] p-3 shadow-2xl shadow-black/20 transition-transform duration-300 hover:-translate-y-1 sm:p-4">
            <ExperiencePreview kind="presentation" />
            <div className="px-2 pb-2 pt-5 sm:px-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">02 / Presentation</p>
              <h3 className="mt-2 text-xl font-semibold text-white">Make the story travel.</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">Turn project evidence into a live pitch deck with generated slides, keyboard navigation, print-ready layout, and one-click PPTX export.</p>
              <Link to="/register" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-white transition-colors hover:text-violet-300">See the narrative <span aria-hidden="true">→</span></Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Public landing page (Prompt 21). Guests see this at `/`; signed-in users
 * get the internal dashboard instead (routed in App.tsx).
 */
export function LandingPage() {
  const { data: me } = useMe();
  const { data: plans } = usePlans();

  return (
    <>
      {/* Hero ------------------------------------------------------------- */}
      <section className="relative overflow-hidden">
        <WaveCanvas className="absolute inset-0 h-full w-full" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-950 to-transparent" />

        <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-20 text-center sm:pt-28">
          <p className="sf-rise inline-flex items-center gap-2 rounded-full border border-forge-500/40 bg-forge-600/10 px-4 py-1.5 text-xs font-medium text-forge-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-forge-400" />
            Spec → docs → diagrams → agent tasks
          </p>

          <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-6xl">
            <RevealWords text="Turn visual plans into engineering reality" />
          </h1>

          <p className="sf-rise mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg" style={{ animationDelay: "480ms" }}>
            SpecForge Studio converts your canvas models into complete Markdown workspaces,
            deterministic diagrams, roadmaps and executable task packs — with approvals and
            traceability built in.
          </p>

          <div className="sf-rise mt-9 flex flex-wrap items-center justify-center gap-3" style={{ animationDelay: "600ms" }}>
            <Link
              to={me ? "/" : "/checkout/free"}
              className="rounded-md bg-forge-600 px-6 py-3 text-sm font-semibold text-white transition-all duration-150 hover:bg-forge-500 active:scale-[0.98]"
            >
              Start for free
            </Link>
            <Link
              to="/#pricing"
              className="rounded-md border border-white/15 px-6 py-3 text-sm font-semibold text-white transition-all duration-150 hover:bg-white/10 active:scale-[0.98]"
            >
              See pricing
            </Link>
          </div>

          <HeroMockup />
        </div>
      </section>

      {/* Proof strip ------------------------------------------------------ */}
      <section className="border-y border-white/5 bg-slate-900/40 py-6">
        <ul className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-2 px-6 text-sm text-slate-500">
          {PROOF_POINTS.map((point) => (
            <li key={point} className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-forge-500" />
              {point}
            </li>
          ))}
        </ul>
      </section>

      <FeaturesSection />
      <HowItWorksSection />
      <ProductShowcase />
      <PricingSection />
      <FaqSection />
      <FinalCtaSection plans={plans ?? []} />
    </>
  );
}
