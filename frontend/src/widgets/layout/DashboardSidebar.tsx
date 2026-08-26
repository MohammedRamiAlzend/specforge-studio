import { NavLink, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { Logo } from "../../shared/ui/Logo";
import type { Project } from "../../entities/project/types";

export type SidebarUser = { is_admin?: boolean } | null | undefined;
type IconName = "home" | "grid" | "map" | "check" | "issue" | "rocket" | "workflow" | "database" | "layers" | "diagram" | "spark" | "document" | "canvas" | "presentation" | "settings";
type Item = { label: string; to: string; icon: IconName; end?: boolean };

const iconPaths: Record<IconName, ReactNode> = {
  home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v10h14V9" /><path d="M9 19v-6h6v6" /></>,
  grid: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></>,
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
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.1h-2.5v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1A1.7 1.7 0 0 0 8 15a1.7 1.7 0 0 0-1.5-1H6v-2.5h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.8-1.8.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5v-.1h2.5v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0-1.5 1Z" /></>,
};

function Icon({ name }: { name: IconName }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] shrink-0" aria-hidden="true">{iconPaths[name]}</svg>;
}

function Group({ label, items, collapsed, onNavigate }: { label: string; items: Item[]; collapsed: boolean; onNavigate: () => void }) {
  const location = useLocation();
  return <section className="space-y-1">
    {!collapsed && <h2 className="px-3 pb-1 pt-5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{label}</h2>}
    <div className="space-y-1">
      {items.map((item) => <NavLink key={item.to} to={item.to} end={item.end} title={collapsed ? item.label : undefined} aria-label={collapsed ? item.label : undefined} onClick={onNavigate} className={({ isActive }) => `group relative flex h-10 items-center rounded-xl text-[13px] font-medium transition-colors ${collapsed ? "justify-center px-0" : "gap-3 px-3"} ${isActive ? "bg-forge-500/15 text-white ring-1 ring-forge-400/20" : "text-slate-400 hover:bg-white/[0.06] hover:text-white"}`}>
        {({ isActive }) => <><span className={isActive ? "text-forge-300" : "text-slate-500 group-hover:text-slate-300"}><Icon name={item.icon} /></span>{!collapsed && <span className="min-w-0 truncate">{item.label}</span>}{isActive && <span className={`absolute h-1.5 w-1.5 rounded-full bg-forge-300 ${collapsed ? "right-1" : "right-3"}`} />}</>}
      </NavLink>)}
    </div>
  </section>;
}

export function DashboardSidebar({ project, user, collapsed, mobileOpen, onToggleCollapse, onCloseMobile }: { project?: Project; user: SidebarUser; collapsed: boolean; mobileOpen: boolean; onToggleCollapse: () => void; onCloseMobile: () => void }) {
  const compact = collapsed && !mobileOpen;
  const base = project?.id ?? "";
  return <aside className={`fixed inset-y-0 left-0 z-40 flex shrink-0 flex-col border-r border-slate-800/90 bg-[#080d1a] text-white shadow-2xl shadow-slate-950/30 transition-[width,transform] duration-200 lg:translate-x-0 lg:shadow-none ${mobileOpen ? "translate-x-0" : "-translate-x-full"} ${compact ? "w-[76px]" : "w-[288px]"}`}>
    <header className={`relative flex h-[76px] shrink-0 items-center border-b border-white/[0.07] ${compact ? "justify-center px-2" : "justify-between px-5"}`}>
      <NavLink to="/" end onClick={onCloseMobile} aria-label="SpecForge Studio home" className="flex min-w-0 items-center gap-3">
        <Logo size={compact ? 34 : 36} />
        {!compact && <span className="min-w-0"><strong className="block truncate text-[15px] tracking-tight text-white">SpecForge Studio</strong><small className="block truncate text-[10px] text-slate-500">Plan clearly. Ship confidently.</small></span>}
      </NavLink>
      <button type="button" aria-label={compact ? "Expand navigation" : "Collapse navigation"} title={compact ? "Expand navigation" : "Collapse navigation"} onClick={onToggleCollapse} className={`hidden rounded-lg p-2 text-slate-500 transition hover:bg-white/10 hover:text-white lg:block ${compact ? "absolute right-1 top-1" : ""}`}>
        <svg className={`h-4 w-4 transition-transform ${compact ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M15 6 9 12l6 6M19 6l-6 6 6 6" /></svg>
      </button>
      <button type="button" aria-label="Close navigation" onClick={onCloseMobile} className="rounded-lg p-2 text-slate-500 hover:bg-white/10 hover:text-white lg:hidden"><span aria-hidden="true">×</span></button>
    </header>

    <nav className={`min-h-0 flex-1 overflow-y-auto py-3 ${compact ? "px-2" : "px-3"}`} aria-label="Workspace navigation">
      <NavLink to="/" end onClick={onCloseMobile} title={compact ? "Dashboard" : undefined} aria-label={compact ? "Dashboard" : undefined} className={({ isActive }) => `group relative flex h-10 items-center rounded-xl text-[13px] font-medium ${compact ? "justify-center" : "gap-3 px-3"} ${isActive ? "bg-white/[0.09] text-white" : "text-slate-400 hover:bg-white/[0.06] hover:text-white"}`}>
        {({ isActive }) => <><span className={isActive ? "text-forge-300" : "text-slate-500 group-hover:text-slate-300"}><Icon name="home" /></span>{!compact && <span>Dashboard</span>}{isActive && <span className={`absolute h-1.5 w-1.5 rounded-full bg-forge-300 ${compact ? "right-1" : "right-3"}`} />}</>}
      </NavLink>

      {project && <>
        <div className={`mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.035] ${compact ? "flex justify-center p-2" : "p-3"}`}>
          <div className={`flex items-center ${compact ? "justify-center" : "gap-3"}`}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-forge-500/15 text-sm font-bold text-forge-300">{project.name.slice(0, 1).toUpperCase()}</span>
            {!compact && <span className="min-w-0"><small className="block text-[9px] font-bold uppercase tracking-[0.16em] text-slate-600">Active project</small><strong className="block truncate text-xs text-slate-200" title={project.name}>{project.name}</strong></span>}
          </div>
          {!compact && <NavLink to={`/projects/${project.id}`} end onClick={onCloseMobile} className="mt-3 flex h-8 items-center justify-center rounded-lg border border-white/10 text-[10px] font-semibold text-slate-400 hover:border-forge-400/40 hover:text-white">View overview <span className="ml-1 text-forge-300">→</span></NavLink>}
        </div>
        <Group label="Plan" collapsed={compact} onNavigate={onCloseMobile} items={[{ label: "Overview", to: `/projects/${base}`, icon: "grid", end: true }, { label: "Roadmap", to: `/projects/${base}/roadmap`, icon: "map" }, { label: "Tasks", to: `/projects/${base}/tasks`, icon: "check" }, { label: "Issues", to: `/projects/${base}/issues`, icon: "issue" }, { label: "Releases", to: `/projects/${base}/releases`, icon: "rocket" }]} />
        <Group label="Design" collapsed={compact} onNavigate={onCloseMobile} items={[{ label: "Workflows", to: `/projects/${base}/workflows`, icon: "workflow" }, { label: "Data Model", to: `/projects/${base}/data-model`, icon: "database" }, { label: "Architecture", to: `/projects/${base}/architecture`, icon: "layers" }, { label: "Diagrams", to: `/projects/${base}/diagrams`, icon: "diagram" }, { label: "Skills", to: `/projects/${base}/skills`, icon: "spark" }]} />
        <Group label="Outputs" collapsed={compact} onNavigate={onCloseMobile} items={[{ label: "Docs Export", to: `/projects/${base}/docs`, icon: "document" }, { label: "Business Model", to: `/projects/${base}/business-model`, icon: "canvas" }, { label: "Presentation", to: `/projects/${base}/presentation`, icon: "presentation" }]} />
      </>}

      {!project && !compact && <div className="mt-4 rounded-2xl border border-dashed border-white/10 px-3 py-4 text-center text-xs text-slate-500">Select a project to unlock its workspace.</div>}

      <div className={`mt-5 border-t border-white/[0.07] pt-3 ${compact ? "space-y-1" : "space-y-1"}`}>
        <NavLink to="/settings" onClick={onCloseMobile} title={compact ? "Settings" : undefined} aria-label={compact ? "Settings" : undefined} className={({ isActive }) => `flex h-10 items-center rounded-xl text-[13px] font-medium ${compact ? "justify-center" : "gap-3 px-3"} ${isActive ? "bg-white/[0.09] text-white" : "text-slate-400 hover:bg-white/[0.06] hover:text-white"}`}><Icon name="settings" />{!compact && <span>Settings</span>}</NavLink>
        {user?.is_admin && <NavLink to="/admin" onClick={onCloseMobile} title={compact ? "Admin operations" : undefined} aria-label={compact ? "Admin operations" : undefined} className={`flex h-10 items-center rounded-xl text-[13px] font-medium ${compact ? "justify-center" : "gap-3 px-3"} text-slate-400 hover:bg-white/[0.06] hover:text-white`}><Icon name="layers" />{!compact && <span>Admin operations</span>}</NavLink>}
      </div>
    </nav>
    <footer className={`shrink-0 border-t border-white/[0.07] py-3 ${compact ? "flex justify-center" : "px-5"}`}>{compact ? <span className="h-1.5 w-1.5 rounded-full bg-forge-400/70" title="Local-first workspace" /> : <span className="text-[10px] font-medium text-slate-600">Local-first workspace · SQLite core</span>}</footer>
  </aside>;
}
