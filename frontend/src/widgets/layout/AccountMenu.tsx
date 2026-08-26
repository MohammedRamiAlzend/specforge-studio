import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { performSignOut, useMe } from "../../entities/user/api";
import { useMySubscription } from "../../entities/subscription/api";
import { ConfirmDialog } from "../../shared/ui/ConfirmDialog";

const PLAN_STYLES: Record<string, string> = {
  free: "border-slate-200 bg-slate-100 text-slate-600",
  plus: "border-forge-200 bg-forge-50 text-forge-700",
  premium: "border-amber-200 bg-amber-50 text-amber-700",
};

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

function displayName(name: string, email: string): string {
  return name.trim() || email.split("@")[0] || "SpecForge user";
}

type MenuIconName = "profile" | "billing" | "settings" | "signout";

function MenuIcon({ name }: { name: MenuIconName }) {
  const paths: Record<MenuIconName, ReactNode> = {
    profile: <><circle cx="12" cy="8" r="3" /><path d="M5 20c.8-3.2 3.1-5 7-5s6.2 1.8 7 5" /></>,
    billing: <><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M4 10h16M8 15h3" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.1h-2.5v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1A1.7 1.7 0 0 0 8 15a1.7 1.7 0 0 0-1.5-1H6v-2.5h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.8-1.8.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5v-.1h2.5v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.1V14h-.1a1.7 1.7 0 0 0-1.5 1Z" /></>,
    signout: <><path d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4M14 8l4 4-4 4M10 12h8" /></>,
  };
  return <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

/** Desktop/mobile account menu kept outside the sidebar scroll region. */
export function AccountMenu() {
  const { data: me } = useMe();
  const { data: subscription } = useMySubscription();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!signingOut) return;
    const timer = window.setTimeout(() => setSigningOut(false), 5000);
    return () => window.clearTimeout(timer);
  }, [signingOut]);

  if (!me) return null;

  const name = displayName(me.name, me.email);
  const planKey = subscription?.plan.key ?? "free";
  const planLabel = subscription?.plan.name ?? "Free plan";
  const planStyle = PLAN_STYLES[planKey] ?? PLAN_STYLES.free;

  return (
    <>
      <div ref={rootRef} className="relative shrink-0">
        <button
          type="button"
          aria-label={`Open account menu for ${name}`}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-left shadow-sm transition-all duration-150 hover:border-slate-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-forge-500/25 active:scale-[0.98]"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-forge-500 to-indigo-500 text-xs font-bold text-white shadow-sm">
            {initials(me.name, me.email)}
          </span>
          <span className="hidden max-w-[10rem] min-w-0 sm:block">
            <span className="block truncate text-xs font-semibold text-slate-800">{name}</span>
            <span className="block truncate text-[10px] text-slate-500">{planLabel}</span>
          </span>
          <svg className={`h-4 w-4 text-slate-400 transition-transform duration-150 ${open ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        {open ? (
          <div role="menu" aria-label="Account menu" className="sf-scale-in absolute right-0 top-[calc(100%+0.5rem)] z-50 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10">
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-forge-500 to-indigo-500 text-sm font-bold text-white">
                {initials(me.name, me.email)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
                <p className="truncate text-xs text-slate-500">{me.email}</p>
                <span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${planStyle}`}>{planLabel}</span>
              </div>
            </div>

            <div className="my-2 border-t border-slate-100" />
            <Link role="menuitem" to="/account" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-950">
              <MenuIcon name="profile" />
              <span><span className="block font-medium">Profile</span><span className="block text-xs text-slate-500">Personal details and account status</span></span>
            </Link>
            <Link role="menuitem" to="/settings?tab=Billing" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-950">
              <MenuIcon name="billing" />
              <span><span className="block font-medium">Billing</span><span className="block text-xs text-slate-500">Plan, invoices, and renewal</span></span>
            </Link>
            <Link role="menuitem" to="/settings?tab=Workspace" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-950">
              <MenuIcon name="settings" />
              <span><span className="block font-medium">Workspace settings</span><span className="block text-xs text-slate-500">Project types and modeler setup</span></span>
            </Link>

            <div className="my-2 border-t border-slate-100" />
            <button
              role="menuitem"
              type="button"
              disabled={signingOut}
              onClick={() => setConfirming(true)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <MenuIcon name="signout" />
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirming}
        title="Sign out of SpecForge Studio?"
        description="You will need to sign in again to access your projects."
        confirmLabel="Sign out"
        danger
        busy={signingOut}
        onConfirm={() => {
          setConfirming(false);
          setSigningOut(true);
          performSignOut();
        }}
        onClose={() => setConfirming(false)}
      />
    </>
  );
}
