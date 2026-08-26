import { NavLink, Outlet, useLocation, useParams } from "react-router-dom";
import { useEffect, useState, type ReactNode } from "react";
import { useAppStore } from "../../app/store";
import { Logo } from "../../shared/ui/Logo";
import { useProjects } from "../../entities/project/api";
import { useMe } from "../../entities/user/api";
import { SearchBox } from "../search/SearchBox";
import { AccountMenu } from "./AccountMenu";
import { LeonaAgentOverlay } from "../leona/LeonaAgentOverlay";

type Glyph = "grid" | "home" | "map" | "check" | "issue" | "rocket" | "workflow" | "database" | "layers" | "diagram" | "spark" | "document" | "canvas" | "presentation" | "settings";
type NavItem = { label: string; to: string; end?: boolean; glyph?: Glyph };

function NavGlyph({ name }: { name?: Glyph }) {
  if (!name) return null;
  const paths: Record<Glyph, ReactNode> = {
    grid: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></>,
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v10h14V9" /><path d="M9 19v-6h6v6" /></>,
    map: <><path d="m4 5 5-2 6 2 5-2v16l-5 2-6-2-5 2V5Z" /><path d="M9 3v16M15 5v16" /></>,
    check: <><path d="M5 4h14v16H5z" /><path d="m8 12 2.2 2.2L16 8.5" /></>,
    issue: <><circle cx="12" cy="12" r="8.5" /><path d="M12 8v5M12 16h.01" /></>,
    rocket: <><path d="M14 4c2.5-1.2 4.7-.7 6-.2.5 1.3 1 3.5-.2 6-1.5 3.2-5.1 5.2-8.5 5.8L8.4 12.7C8.8 9.1 10.8 5.5 14 4Z" /><path d="m9 15-3 3M8 10l-3-1 2-2M14 16l1 3 2-2" /><circle cx="15" cy="8" r="1" /></>,
    workflow: <><rect x="3.5" y="4" width="6" height="5" rx="1" /><rect x="14.5" y="15" width="6" height="5" rx="1" /><path d="M9.5 6.5h3a2 2 0 0 1 2 2v6.5" /><path d="m12.5 12 2 3 2-3" /></>,
    database: <><ellipse cx="12" cy="5" rx="7.5" ry="3" /><path d="M4.5 5v7c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V5M4.5 12v7c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-7" /></>,
    layers: <><path d="m12 3 8 4-8 4-8-4 8-4Z" /><path d="m4 12 8 4 8-4M4 17l8 4 8-4" /></>,
    diagram: <><circle cx="6" cy="6" r="2" /><circle cx="18" cy="8" r="2" /><circle cx="12" cy="18" r="2" /><path d="m7.7 7 2.7 8.8M16.3 9.2l-2.7 6.8M8 6.5h8" /></>,
    spark: <><path d="m12 3 1.4 5.6L19 10l-5.6 1.4L12 17l-1.4-5.6L5 10l5.6-1.4L12 3Z" /><path d="m19 16 .6 2.4L22 19l-2.4.6L19 22l-.6-2.4L16 19l2.4-.6L19 16Z" /></>,
    document: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5M9 12h6M9 16h6" /></>,
    canvas: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M8 8h3v3H8zM13 8h3v3h-3zM8 13h3v3H8zM13 13h3v3h-3z" /></>,
    presentation: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="m10 9 5 3-5 3V9Z" /><path d="M6 8h.01M6 12h.01M6 16h.01" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.1h-2.5v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1A1.7 1.7 0 0 0 8 15a1.7 1.7 0 0 0-1.5-1H6v-2.5h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.8-1.8.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5v-.1h2.5v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.1V14h-.1a1.7 1.7 0 0 0-1.5 1Z" /></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0" aria-hidden="true">{paths[name]}</svg>;
}

function navLinkClass(isActive: boolean): string {
  return `group relative flex min-h-9 items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-all duration-200 ${
    isActive
      ? "bg-white/[0.1] text-white shadow-sm ring-1 ring-white/10"
      : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-100"
  }`;
}

function NavGroup({ label, items, onNavigate, collapsed }: { label: string; items: NavItem[]; onNavigate?: () => void; collapsed: boolean }) {
  const location = useLocation();
  const hasActiveItem = items.some((item) => location.pathname === item.to || (!item.end && location.pathname.startsWith(`${item.to}/`)));
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (hasActiveItem) setOpen(true);
  }, [hasActiveItem]);

  return (
    <div className="space-y-1">
      {!collapsed ? (
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="flex w-full items-center justify-between px-2.5 pb-1 pt-4 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 transition-colors hover:text-slate-300"
        >
          <span>{label}</span>
          <svg className={`h-3 w-3 transition-transform ${open ? "rotate-0" : "-rotate-90"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
        </button>
      ) : null}
      {(collapsed || open) ? (
        <div className="space-y-0.5">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} onClick={onNavigate} title={item.label} className={({ isActive }) => `${navLinkClass(isActive)} ${collapsed ? "justify-center px-2.5" : ""}`}>
              {({ isActive }) => <><span className={isActive ? "text-forge-300" : "text-slate-600 group-hover:text-slate-400"}><NavGlyph name={item.glyph} /></span>{!collapsed ? <span className="truncate">{item.label}</span> : null}{isActive ? <span className={collapsed ? "absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-forge-300" : "ml-auto h-1.5 w-1.5 rounded-full bg-forge-300"} /> : null}</>}
            </NavLink>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function AppShell({ children }: { children?: ReactNode }) {
  const params = useParams<{ projectId: string }>();
  const location = useLocation();
  const activeProjectId = useAppStore((s) => s.activeProjectId);
  const setActiveProjectId = useAppStore((s) => s.setActiveProjectId);
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

  const isCanvasRoute = /^\/projects\/[^/]+\/modeler\/[^/]+$/.test(location.pathname);

  useEffect(() => {
    if (params.projectId) setActiveProjectId(params.projectId);
  }, [params.projectId, setActiveProjectId]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const project = projects?.find((p) => p.id === (params.projectId ?? activeProjectId));
  const closeMobile = () => setMobileOpen(false);
  const navCompact = navCollapsed && !mobileOpen;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {mobileOpen ? <button type="button" aria-label="Close navigation" onClick={closeMobile} className="fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-sm lg:hidden" /> : null}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[18rem] shrink-0 flex-col border-r border-slate-800 bg-slate-950 shadow-2xl shadow-slate-950/20 transition-[width,transform] duration-200 lg:translate-x-0 lg:shadow-none ${mobileOpen ? "translate-x-0" : "-translate-x-full"} ${navCompact ? "lg:w-[4.5rem]" : "lg:w-[18rem]"}`}>
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-4">
          <NavLink to="/" end onClick={closeMobile} className="flex min-w-0 items-center gap-2.5">
            <Logo size={32} />
            {!navCompact ? <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">SpecForge Studio</p>
              <p className="text-[10px] text-slate-500">Plan clearly. Ship confidently.</p>
            </div> : null}
          </NavLink>
          <button type="button" aria-label={navCompact ? "Expand navigation" : "Collapse navigation"} title={navCompact ? "Expand navigation" : "Collapse navigation"} onClick={() => setNavCollapsed((value) => !value)} className="hidden rounded-md p-1.5 text-slate-500 transition-colors hover:bg-white/10 hover:text-white lg:block">
            <svg className={`h-5 w-5 transition-transform ${navCompact ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M15 6 9 12l6 6" /><path d="M19 6 13 12l6 6" /></svg>
          </button>
          <button type="button" aria-label="Close navigation" onClick={closeMobile} className="rounded-md p-1.5 text-slate-500 hover:bg-white/10 hover:text-white lg:hidden">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>

        <nav className={`flex-1 overflow-y-auto py-3 ${navCompact ? "px-2" : "px-3"}`} aria-label="Workspace navigation">
          {!navCompact ? <div className="mb-1 flex items-center justify-between px-2.5 pb-1 pt-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">Workspace</span>
            <span className="rounded-full border border-white/10 px-1.5 py-0.5 text-[9px] text-slate-600">⌘ K</span>
          </div> : null}
          <NavLink to="/" end onClick={closeMobile} title="Dashboard" className={({ isActive }) => `${navLinkClass(isActive)} ${navCompact ? "justify-center px-2.5" : ""}`}>
            {({ isActive }) => <><span className={isActive ? "text-forge-300" : "text-slate-600 group-hover:text-slate-400"}><NavGlyph name="home" /></span>{!navCompact ? <span>Dashboard</span> : null}{isActive ? <span className={navCompact ? "absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-forge-300" : "ml-auto h-1.5 w-1.5 rounded-full bg-forge-300"} /> : null}</>}
          </NavLink>

          {project ? (
            <>
              <div className={`mt-4 rounded-xl border border-white/10 bg-white/[0.04] p-2.5 ${navCompact ? "flex justify-center" : ""}`}>
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-forge-500/15 text-xs font-semibold text-forge-300">{project.name.slice(0, 1).toUpperCase()}</span>
                  {!navCompact ? <div className="min-w-0">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-600">Active project</p>
                    <p className="truncate text-xs font-semibold text-slate-200" title={project.name}>{project.name}</p>
                  </div> : null}
                </div>
                {!navCompact ? <NavLink to={`/projects/${project.id}`} end onClick={closeMobile} className="mt-2 flex items-center justify-center rounded-md border border-white/10 px-2 py-1.5 text-[10px] font-medium text-slate-400 transition-colors hover:border-forge-400/40 hover:text-white">
                  View overview <span className="ml-1 text-forge-300" aria-hidden="true">→</span>
                </NavLink> : null}
              </div>
              <NavGroup label="Plan" onNavigate={closeMobile} items={[
                { label: "Overview", to: `/projects/${project.id}`, end: true, glyph: "grid" },
                { label: "Roadmap", to: `/projects/${project.id}/roadmap`, glyph: "map" },
                { label: "Tasks", to: `/projects/${project.id}/tasks`, glyph: "check" },
                { label: "Issues", to: `/projects/${project.id}/issues`, glyph: "issue" },
                { label: "Releases", to: `/projects/${project.id}/releases`, glyph: "rocket" },
              ]} collapsed={navCompact} />
              <NavGroup label="Design" onNavigate={closeMobile} items={[
                { label: "Workflows", to: `/projects/${project.id}/workflows`, glyph: "workflow" },
                { label: "Data Model", to: `/projects/${project.id}/data-model`, glyph: "database" },
                { label: "Architecture", to: `/projects/${project.id}/architecture`, glyph: "layers" },
                { label: "Diagrams", to: `/projects/${project.id}/diagrams`, glyph: "diagram" },
                { label: "Skills", to: `/projects/${project.id}/skills`, glyph: "spark" },
              ]} collapsed={navCompact} />
              <NavGroup label="Outputs" onNavigate={closeMobile} items={[
                { label: "Docs Export", to: `/projects/${project.id}/docs`, glyph: "document" },
                { label: "Business Model", to: `/projects/${project.id}/business-model`, glyph: "canvas" },
                { label: "Presentation", to: `/projects/${project.id}/presentation`, glyph: "presentation" },
              ]} collapsed={navCompact} />
            </>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-white/10 px-3 py-4 text-center">
              <p className="text-xs font-medium text-slate-400">No project selected</p>
              <p className="mt-1 text-[10px] leading-relaxed text-slate-600">Choose a project from the dashboard to unlock its workspace.</p>
            </div>
          )}

          <div className="mt-4 border-t border-white/[0.06] pt-2">
            <NavLink to="/settings" onClick={closeMobile} className={({ isActive }) => `${navLinkClass(isActive)} ${navCompact ? "justify-center px-2.5" : ""}`} title="Settings">
              {({ isActive }) => <><span className={isActive ? "text-forge-300" : "text-slate-600 group-hover:text-slate-400"}><NavGlyph name="settings" /></span>{!navCompact ? <span>Settings</span> : null}{isActive ? <span className={navCompact ? "absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-forge-300" : "ml-auto h-1.5 w-1.5 rounded-full bg-forge-300"} /> : null}</>}
            </NavLink>
            {user?.is_admin ? <NavLink to="/admin" onClick={closeMobile} className={({ isActive }) => `${navLinkClass(isActive)} ${navCompact ? "justify-center px-2.5" : ""}`} title="Admin operations">
              {({ isActive }) => <><span className={isActive ? "text-forge-300" : "text-slate-600 group-hover:text-slate-400"}><NavGlyph name="layers" /></span>{!navCompact ? <span>Admin operations</span> : null}{isActive ? <span className={navCompact ? "absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-forge-300" : "ml-auto h-1.5 w-1.5 rounded-full bg-forge-300"} /> : null}</>}
            </NavLink> : null}
          </div>
        </nav>

        <div className="border-t border-white/[0.06] px-4 py-3">
          <p className="text-[10px] font-medium text-slate-600">Local-first workspace · SQLite core</p>
        </div>
      </aside>

      <main className={`h-screen min-w-0 flex-1 overflow-y-auto transition-[margin] duration-200 ${navCompact ? "lg:ml-[4.5rem]" : "lg:ml-[18rem]"}`}>
        <div className="sticky top-0 z-20 hidden items-center justify-between gap-6 border-b border-slate-200 bg-white/90 px-6 py-3 backdrop-blur lg:flex">
          <div className="min-w-0 flex-1"><SearchBox projectId={params.projectId} /></div>
          <AccountMenu />
        </div>
        <div className="relative flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
          <button type="button" aria-label="Open navigation" onClick={() => setMobileOpen(true)} className="rounded-lg border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-forge-500/20">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className="flex min-w-0 items-center gap-2">
            <Logo size={24} />
            <span className="truncate text-sm font-semibold text-slate-800">{project?.name ?? "SpecForge Studio"}</span>
          </div>
          <AccountMenu />
        </div>
        {isCanvasRoute ? (
          <div className="h-full overflow-hidden">
            <div key={location.pathname} className="sf-page-enter h-full">
              <Outlet />
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
            <div key={location.pathname} className="sf-page-enter">{children ?? <Outlet />}</div>
          </div>
        )}
        <LeonaAgentOverlay projectName={project?.name} />
      </main>
    </div>
  );
}
