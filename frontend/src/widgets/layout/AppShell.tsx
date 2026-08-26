import { Outlet, useLocation, useParams } from "react-router-dom";
import { useEffect, useState, type ReactNode } from "react";
import { useAppStore } from "../../app/store";
import { Logo } from "../../shared/ui/Logo";
import { useProjects } from "../../entities/project/api";
import { useMe } from "../../entities/user/api";
import { SearchBox } from "../search/SearchBox";
import { AccountMenu } from "./AccountMenu";
import { DashboardSidebar } from "./DashboardSidebar";
import { LeonaAgentOverlay } from "../leona/LeonaAgentOverlay";

export function AppShell({ children }: { children?: ReactNode }) {
  const params = useParams<{ projectId: string }>();
  const location = useLocation();
  const activeProjectId = useAppStore((state) => state.activeProjectId);
  const setActiveProjectId = useAppStore((state) => state.setActiveProjectId);
  const { data: projects } = useProjects();
  const { data: user } = useMe();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(false);

  useEffect(() => {
    if (window.localStorage.getItem("specforge:nav-collapsed") === "1") setNavCollapsed(true);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("specforge:nav-collapsed", navCollapsed ? "1" : "0");
  }, [navCollapsed]);

  useEffect(() => {
    if (params.projectId) setActiveProjectId(params.projectId);
  }, [params.projectId, setActiveProjectId]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const project = projects?.find((item) => item.id === (params.projectId ?? activeProjectId));
  const closeMobile = () => setMobileOpen(false);
  const compact = navCollapsed && !mobileOpen;
  const isCanvasRoute = /^\/projects\/[^/]+\/modeler\/[^/]+$/.test(location.pathname);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {mobileOpen && <button type="button" aria-label="Close navigation" onClick={closeMobile} className="fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-sm lg:hidden" />}
      <DashboardSidebar
        project={project}
        user={user}
        collapsed={navCollapsed}
        mobileOpen={mobileOpen}
        onToggleCollapse={() => setNavCollapsed((value) => !value)}
        onCloseMobile={closeMobile}
      />

      <main className={`h-screen min-w-0 flex-1 overflow-y-auto transition-[margin] duration-200 ${compact ? "lg:ml-[76px]" : "lg:ml-[288px]"}`}>
        <div className="sticky top-0 z-20 hidden items-center justify-between gap-6 border-b border-slate-200 bg-white/90 px-6 py-3 backdrop-blur lg:flex">
          <div className="min-w-0 flex-1"><SearchBox projectId={params.projectId} /></div>
          <AccountMenu />
        </div>
        <div className="relative flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
          <button type="button" aria-label="Open navigation" onClick={() => setMobileOpen(true)} className="rounded-lg border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-forge-500/20">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className="flex min-w-0 items-center gap-2"><Logo size={24} /><span className="truncate text-sm font-semibold text-slate-800">{project?.name ?? "SpecForge Studio"}</span></div>
          <AccountMenu />
        </div>
        {isCanvasRoute ? <div className="h-full overflow-hidden"><div key={location.pathname} className="sf-page-enter h-full"><Outlet /></div></div> : <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8"><div key={location.pathname} className="sf-page-enter">{children ?? <Outlet />}</div></div>}
        <LeonaAgentOverlay projectName={project?.name} />
      </main>
    </div>
  );
}
