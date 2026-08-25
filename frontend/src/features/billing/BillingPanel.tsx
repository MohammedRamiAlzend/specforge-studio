/**
 * Billing panel (DEC-029 billing lifecycle): current subscription status,
 * plan switching / cancellation, and the invoice history table.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useCancelSubscription,
  useInvoices,
  useMySubscription,
} from "../../entities/subscription/api";
import { errorMessage } from "../../shared/api/client";
import { Button } from "../../shared/ui/Button";
import { Card, CardHeader } from "../../shared/ui/Card";
import { ConfirmDialog } from "../../shared/ui/ConfirmDialog";
import { Spinner } from "../../shared/ui/Spinner";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  expired: "bg-amber-50 text-amber-700 border-amber-200",
  canceled: "bg-slate-100 text-slate-600 border-slate-200",
};

function price(cents: number): string {
  return cents === 0 ? "$0" : `$${Math.round(cents / 100)}`;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function StatusChip({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${
        STATUS_STYLES[status] ?? STATUS_STYLES.canceled
      }`}
    >
      {status}
    </span>
  );
}

export function BillingPanel() {
  const navigate = useNavigate();
  const { data: subscription, isLoading } = useMySubscription();
  const { data: invoices = [] } = useInvoices();
  const cancelSubscription = useCancelSubscription();
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-6 w-6 text-slate-400" />
      </div>
    );
  }

  const isPaidActive = Boolean(subscription && subscription.plan.monthlyPriceCents > 0);
  // Paid plans the user could switch to (everything paid except the current one).
  const switchTargets = [
    { key: "plus", name: "Plus" },
    { key: "premium", name: "Premium" },
  ].filter((p) => p.key !== subscription?.plan.key);

  return (
    <div className="space-y-4">
      {/* Current plan ---------------------------------------------------- */}
      <Card>
        <CardHeader title="Current plan" />
        {subscription ? (
          <div className="space-y-4 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-slate-900">{subscription.plan.name}</h3>
                <StatusChip status={subscription.status} />
              </div>
              <p className="text-sm text-slate-500">
                {price(
                  subscription.cycle === "yearly"
                    ? subscription.plan.yearlyPriceCents
                    : subscription.plan.monthlyPriceCents,
                )}
                <span className="ml-1">/ {subscription.cycle === "yearly" ? "year" : "month"}</span>
              </p>
            </div>

            <dl className="grid gap-x-8 gap-y-2 text-xs sm:grid-cols-2">
              <div className="flex justify-between gap-4 sm:block">
                <dt className="text-slate-500">Billing cycle</dt>
                <dd className="font-medium capitalize text-slate-800">{subscription.cycle}</dd>
              </div>
              <div className="flex justify-between gap-4 sm:block">
                <dt className="text-slate-500">
                  {subscription.status === "canceled" ? "Canceled on" : "Renews on"}
                </dt>
                <dd className="font-medium text-slate-800">
                  {formatDate(subscription.canceledAt ?? subscription.currentPeriodEnd)}
                </dd>
              </div>
              {subscription.cardLast4 ? (
                <div className="flex justify-between gap-4 sm:block">
                  <dt className="text-slate-500">Card</dt>
                  <dd className="font-mono text-slate-800">•••• {subscription.cardLast4}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4 sm:block">
                <dt className="text-slate-500">Started</dt>
                <dd className="font-medium text-slate-800">{formatDate(subscription.startedAt)}</dd>
              </div>
            </dl>

            {subscription.status === "expired" ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Your billing period has ended — you are now limited to the Free plan. Renew below
                to restore your workspace limits.
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {switchTargets.map((target) => (
                <Button
                  key={target.key}
                  size="sm"
                  variant={isPaidActive ? "secondary" : "primary"}
                  onClick={() => navigate(`/checkout/${target.key}`)}
                >
                  Switch to {target.name}
                </Button>
              ))}
              {isPaidActive ? (
                <Button size="sm" variant="ghost" onClick={() => setConfirmingCancel(true)}>
                  Cancel subscription…
                </Button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="space-y-3 px-5 py-4">
            <p className="text-sm text-slate-500">
              You are on the Free plan (1 project). Upgrade any time — checkout keeps your projects
              and data.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => navigate("/checkout/plus")}>
                Upgrade to Plus
              </Button>
              <Button size="sm" variant="secondary" onClick={() => navigate("/checkout/premium")}>
                Upgrade to Premium
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Invoice history -------------------------------------------------- */}
      <Card>
        <CardHeader title="Invoice history" />
        {invoices.length === 0 ? (
          <p className="px-5 py-4 text-sm text-slate-500">
            No invoices yet — they appear here after you activate a plan.
          </p>
        ) : (
          <div className="overflow-x-auto px-5 pb-4">
            <table className="w-full min-w-[520px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-4 font-medium">Date</th>
                  <th className="py-2 pr-4 font-medium">Description</th>
                  <th className="py-2 pr-4 font-medium">Card</th>
                  <th className="py-2 pr-4 font-medium">Amount</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2.5 pr-4 whitespace-nowrap text-slate-700">
                      {formatDate(invoice.createdAt)}
                    </td>
                    <td className="py-2.5 pr-4 text-slate-700">
                      {invoice.description}
                      <span className="ml-2 font-mono text-[10px] text-slate-400">{invoice.id}</span>
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-slate-500">
                      {invoice.cardLast4 ? `•••• ${invoice.cardLast4}` : "—"}
                    </td>
                    <td className="py-2.5 pr-4 font-semibold text-slate-900">
                      {price(invoice.amountCents)}
                    </td>
                    <td className="py-2.5">
                      <StatusChip status={invoice.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={confirmingCancel}
        title="Cancel your subscription?"
        description={
          subscription
            ? `Your ${subscription.plan.name} plan stays active until ${formatDate(subscription.currentPeriodEnd)}, then your workspace drops to Free limits.`
            : undefined
        }
        confirmLabel="Cancel subscription"
        danger
        busy={cancelSubscription.isPending}
        onClose={() => setConfirmingCancel(false)}
        onConfirm={() => {
          cancelSubscription.mutate(undefined, {
            onSettled: () => setConfirmingCancel(false),
          });
        }}
      />
      {cancelSubscription.isError ? (
        <p role="alert" className="text-xs text-rose-600">{errorMessage(cancelSubscription.error)}</p>
      ) : null}
    </div>
  );
}
