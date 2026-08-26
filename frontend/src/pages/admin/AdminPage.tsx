import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMe } from "../../entities/user/api";
import {
  useAdminOverview,
  useAdminInvoices,
  useAdminPlans,
  useAdminSubscriptionAction,
  useAdminSubscriptions,
} from "../../entities/admin/api";
import { errorMessage } from "../../shared/api/client";
import { PageHeader } from "../../shared/ui/PageHeader";
import { AdminAiProviderPanel } from "../../features/admin-ai/AdminAiProviderPanel";
import { AdminUserPanel } from "../../features/admin-users/AdminUserPanel";

function statusClass(status: string | undefined): string {
  if (status === "ok" || status === "configured" || status === "ready") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (status === "not_reported") return "bg-slate-100 text-slate-600 ring-slate-200";
  return "bg-amber-50 text-amber-700 ring-amber-200";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function AdminPage() {
  const { data: user, isLoading: userLoading } = useMe();
  const isAdmin = user?.is_admin === true;
  const overview = useAdminOverview(isAdmin);
  const plans = useAdminPlans(isAdmin);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const subscriptions = useAdminSubscriptions({ search, status }, isAdmin);
  const invoices = useAdminInvoices(invoiceSearch, isAdmin);
  const action = useAdminSubscriptionAction();
  const [feedback, setFeedback] = useState<string | null>(null);
  const notAdmin = !userLoading && user && !isAdmin;

  const planRows = useMemo(() => plans.data ?? [], [plans.data]);

  if (userLoading) {
    return <div className="p-8 text-sm text-slate-500">Checking administrator access…</div>;
  }

  if (!user || notAdmin) {
    return (
      <div className="mx-auto max-w-2xl p-8">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Restricted area</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Administrator access required</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">This area is protected separately from project membership. Ask an operator to grant your account global administrator access.</p>
          <Link to="/" className="mt-5 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Return to dashboard</Link>
        </div>
      </div>
    );
  }

  const counts = overview.data?.counts;
  const operations = overview.data?.operations;

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 lg:p-8">
      <PageHeader
        title="Admin operations"
        description="Platform-level visibility for access, billing, readiness, and audit activity."
        actions={<span className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">Global admin</span>}
      />

      {overview.isError ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Unable to load operations overview: {errorMessage(overview.error)}</div> : null}
      {feedback ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{feedback}</div> : null}

      <AdminAiProviderPanel />
      <AdminUserPanel />

      <section aria-labelledby="operations-heading">
        <div className="flex items-center justify-between gap-4">
          <div><h2 id="operations-heading" className="text-sm font-semibold text-slate-900">Operations status</h2><p className="mt-1 text-xs text-slate-500">Safe diagnostics only. Secrets and payment credentials are never returned.</p></div>
          {operations ? <p className="text-xs text-slate-400">Checked {formatDate(operations.checked_at)}</p> : null}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Database", operations?.database ?? "loading"],
            ["SMTP", operations?.smtp ?? "loading"],
            ["Migrations", operations?.migration_version ?? "loading"],
            ["Backups", operations?.backup ?? "loading"],
            ["Auth boundary", "protected"],
          ].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-medium text-slate-500">{label}</p><span className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusClass(value)}`}>{value}</span></div>)}
        </div>
        {operations?.smtp_missing.length ? <p className="mt-3 text-xs text-amber-700">Missing SMTP configuration: {operations.smtp_missing.join(", ")}</p> : null}
      </section>

      <section aria-labelledby="counts-heading">
        <h2 id="counts-heading" className="text-sm font-semibold text-slate-900">Platform snapshot</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[['Users', counts?.users], ['Verified users', counts?.verified_users], ['Projects', counts?.projects], ['Active subscriptions', counts?.active_subscriptions], ['Invoices', counts?.invoices]].map(([label, value]) => <div key={String(label)} className="rounded-xl bg-slate-900 p-4 text-white"><p className="text-xs text-slate-400">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight">{value ?? "—"}</p></div>)}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4"><div><h2 className="text-sm font-semibold text-slate-900">Plan catalog</h2><p className="mt-1 text-xs text-slate-500">Current catalog visibility. Catalog mutations remain limited to safe metadata and are audit logged.</p></div><Link to="/#pricing" className="text-xs font-semibold text-forge-600 hover:text-forge-700">Public pricing</Link></div>
          <div className="mt-5 space-y-3">{planRows.map((plan) => <div key={plan.id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3"><div><p className="text-sm font-semibold text-slate-800">{plan.name} <span className="ml-1 font-mono text-[10px] uppercase text-slate-400">{plan.key}</span></p><p className="mt-0.5 text-xs text-slate-500">{plan.tagline || "No tagline"}</p></div><div className="text-right"><p className="font-mono text-xs text-slate-700">${(plan.monthly_price_cents / 100).toFixed(0)}/mo</p><p className={`mt-1 text-[10px] font-semibold uppercase ${plan.active ? "text-emerald-600" : "text-slate-400"}`}>{plan.active ? "active" : "inactive"}</p></div></div>)}</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div><h2 className="text-sm font-semibold text-slate-900">Subscriptions</h2><p className="mt-1 text-xs text-slate-500">Search and manage simulated subscription state with an audit trail.</p></div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search email, name, or subscription ID" className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-forge-200 placeholder:text-slate-400 focus:ring-2" /><select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-forge-200"><option value="">All statuses</option><option value="active">Active</option><option value="canceled">Canceled</option></select></div>
          <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-xs"><thead className="border-b border-slate-100 text-slate-400"><tr><th className="pb-2 font-medium">Account</th><th className="pb-2 font-medium">Plan</th><th className="pb-2 font-medium">Period</th><th className="pb-2 font-medium">Status</th><th className="pb-2 text-right font-medium">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{(subscriptions.data ?? []).map((item) => <tr key={item.id}><td className="py-3"><p className="font-medium text-slate-800">{item.name}</p><p className="text-slate-500">{item.email}</p></td><td className="py-3 text-slate-600">{item.plan_name}</td><td className="py-3 text-slate-500">{formatDate(item.current_period_end)}</td><td className="py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${item.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{item.status}</span></td><td className="py-3 text-right"><button type="button" disabled={action.isPending} onClick={() => { const next = item.status === "active" ? "cancel" : "reactivate"; action.mutate({ id: item.id, action: next }, { onSuccess: () => setFeedback(`${item.id} ${next}d successfully.`), onError: (error) => setFeedback(errorMessage(error)) }); }} className="font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50">{item.status === "active" ? "Cancel" : "Reactivate"}</button></td></tr>)}</tbody></table>{subscriptions.isLoading ? <p className="py-8 text-center text-sm text-slate-400">Loading subscriptions…</p> : null}{!subscriptions.isLoading && subscriptions.data?.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">No subscriptions match this filter.</p> : null}</div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-sm font-semibold text-slate-900">Invoice inspection</h2><p className="mt-1 text-xs text-slate-500">Read-only billing history with card numbers reduced to last four digits.</p></div><input value={invoiceSearch} onChange={(event) => setInvoiceSearch(event.target.value)} placeholder="Search invoice or account" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-forge-200 sm:w-64" /></div>
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[720px] text-left text-xs"><thead className="border-b border-slate-100 text-slate-400"><tr><th className="pb-2 font-medium">Invoice</th><th className="pb-2 font-medium">Account</th><th className="pb-2 font-medium">Plan</th><th className="pb-2 font-medium">Amount</th><th className="pb-2 font-medium">Card</th><th className="pb-2 font-medium">Status</th><th className="pb-2 text-right font-medium">Created</th></tr></thead><tbody className="divide-y divide-slate-100">{(invoices.data ?? []).map((invoice) => <tr key={invoice.id}><td className="py-3 font-mono text-slate-600">{invoice.id}</td><td className="py-3"><p className="font-medium text-slate-800">{invoice.name}</p><p className="text-slate-500">{invoice.email}</p></td><td className="py-3 text-slate-600">{invoice.plan_key} · {invoice.cycle}</td><td className="py-3 text-slate-600">${(invoice.amount_cents / 100).toFixed(2)}</td><td className="py-3 font-mono text-slate-500">{invoice.card_last4 ? `•••• ${invoice.card_last4}` : "No card"}</td><td className="py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${invoice.status === "paid" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{invoice.status}</span></td><td className="py-3 text-right text-slate-400">{formatDate(invoice.created_at)}</td></tr>)}</tbody></table>{invoices.isLoading ? <p className="py-8 text-center text-sm text-slate-400">Loading invoices…</p> : null}{!invoices.isLoading && invoices.data?.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">No invoices match this search.</p> : null}</div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-4"><div><h2 className="text-sm font-semibold text-slate-900">Recent audit events</h2><p className="mt-1 text-xs text-slate-500">Administrative and authentication events from the database event log.</p></div><span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">last 12</span></div><div className="mt-4 divide-y divide-slate-100">{(overview.data?.recent_audit_events ?? []).map((event, index) => <div key={`${event.entity_id}-${event.action}-${index}`} className="flex flex-wrap items-center justify-between gap-2 py-3 text-xs"><div><span className="font-semibold text-slate-700">{event.action}</span><span className="ml-2 text-slate-400">{event.entity_type}/{event.entity_id}</span></div><span className="text-slate-400">{formatDate(event.created_at)}</span></div>)}{overview.data?.recent_audit_events.length === 0 ? <p className="py-6 text-sm text-slate-400">No audit events yet.</p> : null}</div></section>
    </div>
  );
}
