import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePlans } from "../../entities/plan/api";
import type { BillingCycle, Plan } from "../../entities/plan/types";
import { useMe } from "../../entities/user/api";
import { Spinner } from "../../shared/ui/Spinner";
import { Reveal } from "../../shared/ui/Reveal";

function formatPrice(cents: number): string {
  return `$${Math.round(cents / 100)}`;
}

function priceFor(plan: Plan, cycle: BillingCycle): string {
  return cycle === "monthly" ? formatPrice(plan.monthlyPriceCents) : formatPrice(plan.yearlyPriceCents);
}

function periodLabel(cycle: BillingCycle): string {
  return cycle === "monthly" ? "/month" : "/year";
}

function CheckIcon(): React.ReactElement {
  return (
    <svg viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0 text-forge-400" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.3 3.29 6.8-6.8a1 1 0 0 1 1.4 0Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function PlanCard({
  plan,
  cycle,
  signedIn,
  delay = 0,
}: {
  plan: Plan;
  cycle: BillingCycle;
  signedIn: boolean;
  delay?: number;
}) {
  const navigate = useNavigate();
  const isPopular = plan.popular;

  const onSubscribe = (): void => {
    const target = `/checkout/${plan.key}${cycle === "yearly" ? "?cycle=yearly" : ""}`;
    navigate(signedIn ? target : `/register?return=${encodeURIComponent(target)}`);
  };

  return (
    <Reveal
      delay={delay}
      className={`relative flex flex-col rounded-xl border p-6 transition-transform duration-300 hover:-translate-y-1 ${
        isPopular
          ? "sf-glow-pulse border-forge-500/60 bg-gradient-to-b from-forge-600/15 to-slate-900"
          : "border-white/10 bg-slate-900"
      }`}
    >
      {isPopular ? (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-forge-600 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
          Most popular
        </span>
      ) : null}
      <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
      <p className="mt-1 text-sm text-slate-400">{plan.tagline}</p>
      <div className="mt-5 flex items-baseline gap-1">
        <span className="text-4xl font-bold tracking-tight text-white">{priceFor(plan, cycle)}</span>
        <span className="text-sm text-slate-500">{periodLabel(cycle)}</span>
      </div>
      {cycle === "yearly" && plan.monthlyPriceCents > 0 ? (
        <p className="mt-1 text-xs font-medium text-forge-400">2 months free vs monthly</p>
      ) : null}
      <ul className="mt-6 flex-1 space-y-2.5 text-sm text-slate-300">
        {plan.features.map((feature) => (
          <li key={feature} className="flex gap-2">
            <CheckIcon />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onSubscribe}
        className={`mt-6 w-full rounded-md px-4 py-2.5 text-sm font-semibold transition-all duration-150 active:scale-[0.98] ${
          isPopular
            ? "bg-forge-600 text-white hover:bg-forge-500"
            : plan.key === "free"
              ? "border border-white/15 bg-transparent text-white hover:bg-white/10"
              : "bg-white text-slate-900 hover:bg-slate-200"
        }`}
      >
        {plan.key === "free" ? "Start for free" : `Subscribe to ${plan.name}`}
      </button>
    </Reveal>
  );
}

/** Landing pricing section: three plans + monthly/yearly toggle. */
export function PricingSection() {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const { data: plans, isLoading } = usePlans();
  const { data: me } = useMe();

  return (
    <section id="pricing" className="scroll-mt-24 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-forge-400">Pricing</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Pick the plan that fits your forge
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-400">
            Start free, upgrade when your specs grow. Cancel anytime.
          </p>

          <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-forge-500/20 bg-forge-500/[0.06] p-5 text-left">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-forge-500/15 text-forge-300" aria-hidden="true">✦</span>
              <div>
                <p className="text-sm font-semibold text-white">Meet Leona Agent</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-400">Leona reads your Business Model, Presentation, and Markdown workspace to create a structured project draft. Bring your own provider key on supported plans, or use the managed SpecForge provider on Premium subject to the published usage policy.</p>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-medium">
                  <span className="rounded-full border border-white/10 bg-slate-950/40 px-2.5 py-1 text-slate-300">BYOK: your provider, your bill</span>
                  <span className="rounded-full border border-forge-400/20 bg-forge-400/10 px-2.5 py-1 text-forge-200">Managed: Premium plan</span>
                  <span className="rounded-full border border-white/10 bg-slate-950/40 px-2.5 py-1 text-slate-300">Draft first · approve before writing</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 inline-flex items-center rounded-full border border-white/10 bg-slate-900 p-1">
            {(["monthly", "yearly"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setCycle(option)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-all duration-200 ${
                  cycle === option ? "bg-forge-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                {option === "yearly" ? "Yearly · −17%" : option}
              </button>
            ))}
          </div>
        </Reveal>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner className="h-6 w-6 text-forge-500" />
          </div>
        ) : (
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {(plans ?? []).map((plan, index) => (
              <PlanCard key={plan.id} plan={plan} cycle={cycle} signedIn={Boolean(me)} delay={index * 90} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
