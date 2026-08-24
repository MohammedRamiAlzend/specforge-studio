import { useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { Plan } from "../../entities/plan/types";
import { Reveal } from "../../shared/ui/Reveal";

/** Splits a headline into staggered word-rise spans (Prompt 21). */
export function RevealWords({ text }: { text: string }) {
  const words = text.split(" ");
  return (
    <>
      {words.map((word, index) => (
        <span key={`${word}-${index}`} className="sf-word" style={{ "--word-index": index } as CSSProperties}>
          {word}
          {"\u00A0"}
        </span>
      ))}
    </>
  );
}

const FEATURES: Array<{ title: string; body: string; glyph: ReactNode; wide?: boolean }> = [
  {
    title: "Visual modeler",
    body: "Design workflows on an infinite canvas — no Mermaid syntax, ever. Nodes and edges become living specs.",
    glyph: (
      <path d="M4 6h5v5H4zM15 13h5v5h-5zM9 8.5h3.5v7H9" fill="none" stroke="currentColor" strokeWidth="1.6" />
    ),
    wide: true,
  },
  {
    title: "Auto-generated diagrams",
    body: "Workflow, sequence, ERD and architecture diagrams rendered deterministically from your data.",
    glyph: <path d="M4 16c4-1 4-9 8-10m0 10c-4-1-4-9-8-10m12 2v6m0-6a2 2 0 1 0 0 .01M16 18a2 2 0 1 0 0 .01" fill="none" stroke="currentColor" strokeWidth="1.6" />,
  },
  {
    title: "Markdown workspace",
    body: "A complete English docs workspace — SRS, HLD, guides — exported from the database in one click.",
    glyph: <path d="M4 5h16v14H4zm3 10 2.5-3L12 15l2.5-3 2.5 3" fill="none" stroke="currentColor" strokeWidth="1.6" />,
  },
  {
    title: "Roadmap engine",
    body: "Phases, milestones, epics and prioritized task drafts derived deterministically from your artifacts.",
    glyph: <path d="M4 19V5m0 14h16M8 15v-4m4 4V8m4 11v-7" fill="none" stroke="currentColor" strokeWidth="1.6" />,
  },
  {
    title: "Agent task packs",
    body: "Executable, agent-neutral checklists any AI can run — Claude, ChatGPT, Qwen or compatible agents.",
    glyph: <path d="M12 3v3m0 12v3M3 12h3m12 0h3m-9-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" fill="none" stroke="currentColor" strokeWidth="1.6" />,
    wide: true,
  },
];

/** Bento feature grid with staggered scroll reveals. */
export function FeaturesSection() {
  return (
    <section id="features" className="scroll-mt-24 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-forge-400">Features</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Everything between idea and execution
          </h2>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, index) => (
            <article
              key={feature.title}
              className={`sf-reveal group rounded-xl border border-white/10 bg-slate-900/70 p-6 transition-all duration-300 hover:border-forge-500/40 hover:bg-slate-900 ${
                feature.wide ? "sm:col-span-2 lg:col-span-1" : ""
              }`}
              style={{ transitionDelay: `${index * 60}ms` }}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-forge-600/15 text-forge-400 transition-transform duration-300 group-hover:scale-110">
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                  {feature.glyph}
                </svg>
              </span>
              <h3 className="mt-4 text-base font-semibold text-white">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{feature.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  {
    title: "Model it visually",
    body: "Sketch workflows on the canvas with a DB-driven palette. Validation warnings appear as you draw.",
  },
  {
    title: "Generate everything",
    body: "Diagrams, a 36-file Markdown workspace, a roadmap with gates, and executable task packs — from one model.",
  },
  {
    title: "Ship with governance",
    body: "Approvals, audit trails and traceability keep every artifact honest while agents execute checklists.",
  },
];

/** Three-step how-it-works band with connector line. */
export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="scroll-mt-24 border-y border-white/5 bg-slate-900/40 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-forge-400">How it works</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            From blank canvas to running tasks
          </h2>
        </div>
        <ol className="relative mt-14 grid gap-10 md:grid-cols-3 md:gap-6">
          <span
            aria-hidden="true"
            className="absolute left-6 top-6 hidden h-px w-[calc(66%-3rem)] bg-gradient-to-r from-forge-500/50 via-forge-500/25 to-transparent md:block"
          />
          {STEPS.map((step, index) => (
            <li key={step.title} className="sf-reveal relative" style={{ transitionDelay: `${index * 110}ms` }}>
              <span className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border border-forge-500/50 bg-slate-950 font-bold text-forge-400">
                {index + 1}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-white">{step.title}</h3>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-400">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const FAQS = [
  {
    q: "Do I need to learn Mermaid or diagram syntax?",
    a: "No. Diagrams are generated automatically from your visual model and structured data — you never write diagram code.",
  },
  {
    q: "What makes the task packs agent-neutral?",
    a: "Packs are plain Markdown checklists with stable IDs and verification hints, so Claude, ChatGPT, Qwen or any compatible agent can execute them without vendor lock-in.",
  },
  {
    q: "Can I export my documentation?",
    a: "Yes. The full workspace is Markdown, downloadable per file or as a ZIP archive at any time.",
  },
  {
    q: "Can I cancel my subscription?",
    a: "Anytime, from the app. Your data stays accessible on the Free plan features.",
  },
];

/** Accessible FAQ accordion. */
export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  return (
    <section id="faq" className="scroll-mt-24 py-24">
      <div className="mx-auto max-w-3xl px-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-forge-400">FAQ</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">Questions, answered</h2>
        </div>
        <div className="mt-10 space-y-3">
          {FAQS.map((faq, index) => {
            const open = openIndex === index;
            return (
              <div key={faq.q} className="overflow-hidden rounded-lg border border-white/10 bg-slate-900/70">
                <button
                  type="button"
                  onClick={() => setOpenIndex(open ? null : index)}
                  aria-expanded={open}
                  className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium text-white transition-colors hover:bg-white/5"
                >
                  {faq.q}
                  <span
                    className={`ml-4 shrink-0 text-forge-400 transition-transform duration-200 ${open ? "rotate-45" : ""}`}
                    aria-hidden="true"
                  >
                    +
                  </span>
                </button>
                <div
                  className={`grid transition-all duration-300 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
                >
                  <p className="overflow-hidden px-5 pb-4 text-sm leading-relaxed text-slate-400">{faq.a}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/** Full-width closing CTA band above the pricing section anchor. */
export function FinalCtaSection({ plans }: { plans: Plan[] }) {
  const plus = plans.find((p) => p.key === "plus");
  return (
    <section className="px-6 pb-24">
      <Reveal className="mx-auto max-w-6xl overflow-hidden rounded-2xl border border-forge-500/30 bg-gradient-to-br from-forge-700/30 via-slate-900 to-slate-950 p-12 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Ready to forge your next project?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-slate-400">
          Join builders turning visual plans into specs, diagrams and agent-ready tasks.
          {plus ? ` Plus starts at $${Math.round(plus.monthlyPriceCents / 100)}/month.` : ""}
        </p>
        <Link
          to="/#pricing"
          className="mt-8 inline-block rounded-md bg-forge-600 px-6 py-3 text-sm font-semibold text-white transition-all duration-150 hover:bg-forge-500 active:scale-[0.98]"
        >
          View plans
        </Link>
      </Reveal>
    </section>
  );
}
