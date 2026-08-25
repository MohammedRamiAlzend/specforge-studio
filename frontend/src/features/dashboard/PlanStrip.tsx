import { Link } from "react-router-dom";
import type { DashboardSummary } from "../../entities/dashboard/types";
import { formatDate } from "../../shared/lib/format";

const PLAN_CHIP: Record<string, string> = {
  free: "bg-slate-700 text-slate-300",
  plus: "bg-forge-600 text-white",
  premium: "bg-gradient-to-r from-forge-500 to-amber-400 text-slate-950",
};

/**
 * Plan-awareness strip (DEC-030): quota usage for Free users, renewal info
 * for paying users, and an expiry banner with a reactivation CTA.
 */
export function PlanStrip({ summary }: { summary: DashboardSummary }) {
  const { quota, subscription } = summary;
  const expired = subscription.status === "expired";

  if (expired) {
    return (
      <div className="sf-rise flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${PLAN_CHIP[subscription.plan_key] ?? PLAN_CHIP.free}`}>
          {subscription.plan_key}
        </span>
        <p className="text-xs font-medium text-amber-900">
          Your billing period ended {subscription.current_period_end ? formatDate(subscription.current_period_end) : "recently"} —
          Free plan limits apply again.
        </p>
        <Link
          to="/settings?tab=Billing"
          className="ml-auto rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-amber-500"
        >
          Reactivate
        </Link>
      </div>
    );
  }

  if (quota.plan_key === "free") {
    const pct = quota.limit ? Math.min(100, Math.round((quota.used / quota.limit) * 100)) : 0;
    return (
      <div className="sf-rise flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-slate-200 bg-white px-4 py-3">
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${PLAN_CHIP.free}`}>free</span>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${pct >= 100 ? "bg-rose-500" : "bg-forge-500"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-slate-600">
            {quota.used} of {quota.limit} project slot{quota.limit === 1 ? "" : "s"} used
          </p>
        </div>
        <Link
          to="/settings?tab=Billing"
          className="ml-auto text-xs font-medium text-forge-600 transition-colors hover:text-forge-500"
        >
          Upgrade to Plus →
        </Link>
      </div>
    );
  }

  return (
    <div className="sf-rise flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-slate-200 bg-white px-4 py-3">
      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${PLAN_CHIP[quota.plan_key] ?? PLAN_CHIP.free}`}>
        {quota.plan_key}
      </span>
      <p className="text-xs text-slate-600">
        Unlimited projects · Renews{" "}
        {subscription.current_period_end ? formatDate(subscription.current_period_end) : "—"}
        {subscription.card_last4 ? <> · •••• {subscription.card_last4}</> : null}
      </p>
      <Link
        to="/settings?tab=Billing"
        className="ml-auto text-xs font-medium text-slate-500 transition-colors hover:text-slate-700"
      >
        Manage billing
      </Link>
    </div>
  );
}
