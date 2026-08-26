import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMe, useUpdateProfile } from "../entities/user/api";
import { useMySubscription } from "../entities/subscription/api";
import { errorMessage } from "../shared/api/client";
import { Button } from "../shared/ui/Button";
import { ScenarioBanner } from "../shared/ui/ScenarioBanner";
import { Spinner } from "../shared/ui/Spinner";

function initials(name: string, email: string): string {
  const source = name.trim() || email.split("@")[0] || "SF";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length > 1) {
    const first = parts[0] ?? source;
    const last = parts[parts.length - 1] ?? source;
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function formatMemberSince(date: string): string {
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "—";
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(value);
}

export function AccountPage() {
  const { data: me, isLoading } = useMe();
  const { data: subscription } = useMySubscription();
  const updateProfile = useUpdateProfile();
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (me) setName(me.name);
  }, [me]);

  if (isLoading || !me) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="h-6 w-6 text-forge-500" />
      </div>
    );
  }

  const hasChanges = name.trim() !== me.name;
  const plan = subscription?.plan;

  const save = async () => {
    setSaved(false);
    await updateProfile.mutateAsync({ name: name.trim() });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-7 pb-10">
      <section className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white px-6 py-7 shadow-sm sm:px-8 sm:py-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-forge-100 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-forge-700">Account</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Your profile</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500">Keep your identity and workspace access details up to date.</p>
          </div>
          <Link to="/" className="text-sm font-semibold text-slate-500 transition-colors hover:text-slate-950">Back to dashboard <span aria-hidden="true">→</span></Link>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-forge-500 to-indigo-500 text-xl font-bold text-white shadow-sm">{initials(me.name, me.email)}</span>
            <div className="min-w-0">
              <p className="text-lg font-semibold text-slate-950">{me.name}</p>
              <p className="truncate text-sm text-slate-500">{me.email}</p>
            </div>
          </div>

          <div className="mt-6">
            <h2 className="text-base font-semibold text-slate-950">Personal details</h2>
            <p className="mt-1 text-sm text-slate-500">This name appears in your account menu and workspace greetings.</p>
            <label htmlFor="account-name" className="mt-5 block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-700">Display name</span>
              <input
                id="account-name"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setSaved(false);
                }}
                maxLength={120}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition-shadow placeholder:text-slate-400 focus:border-forge-500 focus:outline-none focus:ring-2 focus:ring-forge-500/20"
              />
            </label>
            {updateProfile.isError ? (
              <ScenarioBanner tone="danger" title="Profile could not be saved" description={errorMessage(updateProfile.error)} actionLabel="Try again" onAction={() => void save()} />
            ) : null}
            {saved ? <p role="status" className="mt-4 text-sm font-medium text-emerald-700">Profile saved.</p> : null}
            <div className="mt-5 flex justify-end">
              <Button type="button" onClick={() => void save()} disabled={!hasChanges || !name.trim() || updateProfile.isPending}>
                {updateProfile.isPending ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-base font-semibold text-slate-950">Account status</h2>
            <dl className="mt-5 space-y-4 text-sm">
              <div className="flex items-center justify-between gap-3"><dt className="text-slate-500">Email</dt><dd className="flex items-center gap-1.5 font-medium text-slate-800">{me.email_verified ? <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> : <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}{me.email_verified ? "Verified" : "Needs verification"}</dd></div>
              <div className="flex items-center justify-between gap-3"><dt className="text-slate-500">Member since</dt><dd className="font-medium text-slate-800">{formatMemberSince(me.created_at)}</dd></div>
              <div className="flex items-center justify-between gap-3"><dt className="text-slate-500">Account ID</dt><dd className="font-mono text-xs text-slate-500">{me.id}</dd></div>
            </dl>
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-slate-50 p-5 sm:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Current plan</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">{plan?.name ?? "Free plan"}</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">Manage your subscription, invoices, and renewal preferences.</p>
            <Link to="/settings?tab=Billing" className="mt-4 inline-flex text-sm font-semibold text-forge-700 hover:text-forge-800">Open billing <span className="ml-1" aria-hidden="true">→</span></Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
