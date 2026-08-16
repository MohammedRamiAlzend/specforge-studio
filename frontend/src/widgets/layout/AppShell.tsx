import { NavLink, Outlet, useLocation, useParams } from "react-router-dom";
import { useEffect } from "react";
import { useAppStore } from "../../app/store";
import { useProjects } from "../../entities/project/api";

function navLinkClass(isActive: boolean): string {
  return `flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors ${
    isActive ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
  }`;
}

export function AppShell() {
  const params = useParams<{ projectId: string }>();
  const location = useLocation();
  const activeProjectId = useAppStore((s) => s.activeProjectId);
  const setActiveProjectId = useAppStore((s) => s.setActiveProjectId);
  const { data: projects } = useProjects();

  // The modeler canvas is a full-bleed workspace (no container padding).
  const isCanvasRoute = /^\/projects\/[^/]+\/modeler\/[^/]+$/.test(location.pathname);

  useEffect(() => {
    if (params.projectId) setActiveProjectId(params.projectId);
  }, [params.projectId, setActiveProjectId]);

  const project = projects?.find((p) => p.id === (params.projectId ?? activeProjectId));

  return (
    <div className="flex h-full min-h-screen bg-slate-50">
      <aside className="flex w-60 shrink-0 flex-col border-r border-slate-800 bg-slate-950">
        <div className="flex items-center gap-2.5 px-4 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-forge-600 text-sm font-bold text-white">
            SF
          </div>
          <div>
            <p className="text-sm font-semibold text-white">SpecForge Studio</p>
            <p className="text-[11px] text-slate-500">Spec → docs → tasks</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          <p className="px-2.5 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
            Workspace
          </p>
          <NavLink to="/" end className={({ isActive }) => navLinkClass(isActive)}>
            Dashboard
          </NavLink>

          {project ? (
            <>
              <p className="px-2.5 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                {project.name}
              </p>
              <NavLink to={`/projects/${project.id}`} end className={({ isActive }) => navLinkClass(isActive)}>
                Overview
              </NavLink>
              <NavLink to={`/projects/${project.id}/workflows`} className={({ isActive }) => navLinkClass(isActive)}>
                Workflows
              </NavLink>
              <NavLink to={`/projects/${project.id}/data-model`} className={({ isActive }) => navLinkClass(isActive)}>
                Data Model
              </NavLink>
              <NavLink to={`/projects/${project.id}/architecture`} className={({ isActive }) => navLinkClass(isActive)}>
                Architecture
              </NavLink>
              <NavLink to={`/projects/${project.id}/diagrams`} className={({ isActive }) => navLinkClass(isActive)}>
                Diagrams
              </NavLink>
              <NavLink to={`/projects/${project.id}/roadmap`} className={({ isActive }) => navLinkClass(isActive)}>
                Roadmap
              </NavLink>
              <NavLink to={`/projects/${project.id}/docs`} className={({ isActive }) => navLinkClass(isActive)}>
                Docs Export
              </NavLink>
              <NavLink to={`/projects/${project.id}/tasks`} className={({ isActive }) => navLinkClass(isActive)}>
                Tasks
              </NavLink>
              <NavLink to={`/projects/${project.id}/skills`} className={({ isActive }) => navLinkClass(isActive)}>
                Skills
              </NavLink>
            </>
          ) : null}

          <p className="px-2.5 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
            System
          </p>
          <NavLink to="/settings" className={({ isActive }) => navLinkClass(isActive)}>
            Settings
          </NavLink>
        </nav>

        <div className="border-t border-slate-800/80 px-4 py-3 text-[11px] text-slate-600">
          v0.1 · internal platform
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className={isCanvasRoute ? "h-full overflow-hidden" : "mx-auto max-w-6xl px-6 py-8"}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
