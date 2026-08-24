import { type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Spinner } from "../shared/ui/Spinner";
import { useMe } from "../entities/user/api";
import { AppShell } from "../widgets/layout/AppShell";
import { PublicShell } from "../widgets/layout/PublicShell";
import { DashboardPage } from "../pages/DashboardPage";
import { LandingPage } from "../pages/landing/LandingPage";

function FullScreenSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <Spinner className="h-6 w-6 text-forge-500" />
    </div>
  );
}

/**
 * `/` gate (Prompt 21): guests get the public landing page wrapped in the
 * marketing shell; signed-in users get the internal dashboard in AppShell.
 * Internal URLs are untouched (DEC-026).
 */
export function HomeGate() {
  const { data: me, isLoading } = useMe();
  if (isLoading) return <FullScreenSpinner />;
  return me ? (
    <AppShell>
      <DashboardPage />
    </AppShell>
  ) : (
    <PublicShell>
      <LandingPage />
    </PublicShell>
  );
}

/** Renders children only for guests; signed-in users bounce to `/`. */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { data: me, isLoading } = useMe();
  if (isLoading) return <FullScreenSpinner />;
  if (me) return <Navigate to="/" replace />;
  return <>{children}</>;
}
