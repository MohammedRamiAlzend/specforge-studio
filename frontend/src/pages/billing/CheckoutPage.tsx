import { useMemo, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useCheckout } from "../../entities/subscription/api";
import { usePlans } from "../../entities/plan/api";
import type { BillingCycle } from "../../entities/plan/types";
import { useMe } from "../../entities/user/api";
import { errorMessage } from "../../shared/api/client";
import { Spinner } from "../../shared/ui/Spinner";
import { WaveCanvas } from "../../widgets/background/WaveCanvas";

const inputClass =
  "w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 transition-colors focus:border-forge-500 focus:outline-none focus:ring-1 focus:ring-forge-500";

function groupCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 19);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

/**
 * Simulated checkout (Prompt 21): plan summary → cycle → mock card form →
 * success. Requires a signed-in session (guests are sent to register first).
 */
export function CheckoutPage() {
  const { planKey = "" } = useParams<{ planKey: string }>();
  const [params] = useSearchParams();
  const initialCycle = params.get("cycle") === "yearly" ? "yearly" : "monthly";

  const [cycle, setCycle] = useState<BillingCycle>(initialCycle);
  const [cardNumber, setCardNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const navigate = useNavigate();
  const { data: me, isLoading: meLoading } = useMe();
  const { data: plans, isLoading } = usePlans();
  const checkout = useCheckout();

  const plan = useMemo(() => plans?.find((p) => p.key === planKey), [plans, planKey]);
  const isFree = Boolean(plan && plan.monthlyPriceCents === 0 && plan.yearlyPriceCents === 0);
  const priceCents = cycle === "yearly" ? plan?.yearlyPriceCents ?? 0 : plan?.monthlyPriceCents ?? 0;

  if (!meLoading && !me) {
    const target = `/checkout/${planKey}${cycle === "yearly" ? "?cycle=yearly" : ""}`;
    return <Navigate to={`/register?return=${encodeURIComponent(target)}`} replace />;
  }

  if (isLoading || meLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="h-6 w-6 text-forge-500" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <h1 className="text-xl font-semibold text-white">Plan not found</h1>
        <p className="mt-2 text-sm text-slate-400">The plan “{planKey}” does not exist.</p>
        <Link to="/#pricing" className="mt-6 inline-block rounded-md bg-forge-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-forge-500">
          Back to pricing
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="relative overflow-hidden">
        <WaveCanvas className="absolute inset-0 h-full w-full opacity-60" />
        <div className="sf-page-enter relative mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 text-center">
          <span className="sf-scale-in flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
            <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <h1 className="sf-rise mt-6 text-2xl font-bold text-white">You're on {plan.name}!</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            {isFree
              ? "Your free workspace is ready."
              : `Payment recorded (${plan.name}, billed ${cycle}). A receipt was simulated — no real charge was made.`}
          </p>
          <button
            type="button"
            onClick={() => navigate("/", { replace: true })}
            className="mt-8 w-full rounded-md bg-forge-600 px-5 py-3 text-sm font-semibold text-white transition-all duration-150 hover:bg-forge-500 active:scale-[0.98]"
          >
            Enter your workspace
          </button>
        </div>
      </div>
    );
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    try {
      const form = new FormData(event.currentTarget);
      const digits = cardNumber.replace(/\D/g, "");
      await checkout.mutateAsync({
        plan_key: plan.key,
        cycle,
        ...(isFree
          ? {}
          : {
              card: {
                name: String(form.get("card_name") ?? ""),
                number: digits,
                exp_month: Number(form.get("exp_month") ?? 0),
                exp_year: Number(form.get("exp_year") ?? 0),
                cvc: String(form.get("cvc") ?? ""),
              },
            }),
      });
      setDone(true);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-14">
      <div className="sf-page-enter grid gap-8 lg:grid-cols-[1fr_1.1fr]">
        {/* Summary ------------------------------------------------------- */}
        <aside className={`h-fit rounded-xl border p-6 ${plan.popular ? "border-forge-500/50 bg-gradient-to-b from-forge-600/15 to-slate-900" : "border-white/10 bg-slate-900"}`}>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Order summary</p>
          <h2 className="mt-2 text-xl font-bold text-white">{plan.name}</h2>
          <p className="text-sm text-slate-400">{plan.tagline}</p>

          <div className="mt-6 inline-flex items-center rounded-full border border-white/10 bg-slate-950 p-1 text-sm">
            {(["monthly", "yearly"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setCycle(option)}
                className={`rounded-full px-3 py-1 font-medium capitalize transition-all duration-200 ${
                  cycle === option ? "bg-forge-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          <div className="mt-6 space-y-2 border-t border-white/10 pt-4 text-sm">
            <div className="flex justify-between text-slate-400">
              <span>Billed {cycle}</span>
              <span className="font-semibold text-white">${Math.round(priceCents / 100)}</span>
            </div>
            {isFree ? null : (
              <div className="flex justify-between text-slate-500">
                <span>Renews automatically · cancel anytime</span>
              </div>
            )}
          </div>

          <ul className="mt-6 space-y-2 text-sm text-slate-300">
            {plan.features.slice(0, 4).map((feature) => (
              <li key={feature} className="flex gap-2">
                <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0 text-forge-400" aria-hidden="true">
                  <path fillRule="evenodd" d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.3 3.29 6.8-6.8a1 1 0 0 1 1.4 0Z" clipRule="evenodd" />
                </svg>
                {feature}
              </li>
            ))}
          </ul>
        </aside>

        {/* Payment form -------------------------------------------------- */}
        <form onSubmit={onSubmit} className="rounded-xl border border-white/10 bg-slate-900 p-6" noValidate>
          <h2 className="text-lg font-semibold text-white">{isFree ? "Confirm your free plan" : "Payment details"}</h2>

          {isFree ? (
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              No card needed for the Free plan. Click below to activate your workspace.
            </p>
          ) : (
            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">Name on card</span>
                <input name="card_name" required placeholder="Ada Lovelace" autoComplete="cc-name" className={inputClass} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">Card number</span>
                <input
                  value={cardNumber}
                  onChange={(e) => setCardNumber(groupCardNumber(e.target.value))}
                  required
                  inputMode="numeric"
                  placeholder="4242 4242 4242 4242"
                  autoComplete="cc-number"
                  className={`${inputClass} font-mono tracking-wider`}
                />
              </label>
              <div className="grid grid-cols-3 gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">Month</span>
                  <input name="exp_month" required inputMode="numeric" placeholder="MM" maxLength={2} className={inputClass} />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">Year</span>
                  <input name="exp_year" required inputMode="numeric" placeholder="YYYY" maxLength={4} className={inputClass} />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">CVC</span>
                  <input name="cvc" required inputMode="numeric" placeholder="123" maxLength={4} autoComplete="cc-csc" className={inputClass} />
                </label>
              </div>
              <p className="rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-xs leading-relaxed text-slate-500">
                Demo checkout — no external payment provider is contacted and no real charge occurs.
                Try the test card <span className="font-mono text-slate-400">4242 4242 4242 4242</span>.
              </p>
            </div>
          )}

          {error ? (
            <p role="alert" className="sf-scale-in mt-4 rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={checkout.isPending}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-md bg-forge-600 px-5 py-3 text-sm font-semibold text-white transition-all duration-150 hover:bg-forge-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {checkout.isPending ? <Spinner className="h-4 w-4" /> : null}
            {isFree ? "Activate Free plan" : `Pay $${Math.round(priceCents / 100)} securely`}
          </button>
        </form>
      </div>
    </div>
  );
}
