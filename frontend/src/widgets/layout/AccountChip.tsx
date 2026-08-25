import { useState } from "react";
import { performSignOut, useMe } from "../../entities/user/api";
import { useMySubscription } from "../../entities/subscription/api";

const PLAN_BADGE: Record<string, string> = {
  free: "bg-slate-700 text-slate-300",
  plus: "bg-forge-600 text-white",
  premium: "bg-gradient-to-r from-forge-500 to-amber-400 text-slate-950",
};

/**
 * Sidebar account chip (Prompt 21): shows the session user's email, current
 * plan badge and a sign-out action.
 */
export function AccountChip() {
  const { data: me } = useMe();
  const { data: subscription } = useMySubscription();
  const [signingOut, setSigningOut] = useState(false);

  if (!me) {
    return <p className="text-[11px] text-slate-600">v0.1 · internal platform</p>;
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-xs font-medium text-slate-300">{me.email}</p>
          {subscription ? (
            <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${PLAN_BADGE[subscription.plan.key] ?? PLAN_BADGE.free}`}>
              {subscription.plan.key}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          disabled={signingOut}
          // performSignOut ignores errors, clears the cookie server-side and
          // hard-navigates home with a watchdog timer — no cached data or
          // stale route can survive (fixes the stuck-on-dashboard bug).
          onClick={() => {
            setSigningOut(true);
            performSignOut();
          }}
          className="mt-0.5 text-[11px] text-slate-500 transition-colors hover:text-slate-300 disabled:opacity-60"
        >
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </div>
  );
}
