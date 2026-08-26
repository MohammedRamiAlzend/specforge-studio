import { useState } from "react";
import { Link } from "react-router-dom";
import { useMe } from "../entities/user/api";
import { useProjects } from "../entities/project/api";
import { useDashboardSummary } from "../entities/dashboard/api";
import type { Project } from "../entities/project/types";
import { CreateProjectForm } from "../features/create-project/CreateProjectForm";
import { PlanStrip } from "../features/dashboard/PlanStrip";
import { KpiRow } from "../features/dashboard/KpiRow";
import { AttentionPanel, UpcomingMilestones } from "../features/dashboard/AttentionPanel";
import { StatusBadge } from "../shared/ui/Badge";
import { Button } from "../shared/ui/Button";
import { Card, CardHeader } from "../shared/ui/Card";
import { ErrorState } from "../shared/ui/States";
import { formatRelative } from "../shared/lib/format";
import { PlatformBadges } from "../widgets/platform-badges/PlatformBadges";
import { HealthMiniCard } from "../widgets/health/HealthCards";

const STATUS_FILTERS = ["all", "active", "draft", "completed", "archived"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];
type SortMode = "updated" | "created" | "name";

function filterAndSort(projects: Project[], filter: StatusFilter, sort: SortMode): Project[] {
  const filtered = filter === "all" ? projects : projects.filter((p) => p.status === filter);
  const sorted = [...filtered];
  if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
  else if (sort === "created") sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
  else sorted.sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""));
  return sorted;
}

function FlowStep({ number, title, description, active = false }: { number: string; title: string; description: string; active?: boolean }) {
  return (
    <div className={`flex gap-3 rounded-2xl border p-4 ${active ? "border-forge-300 bg-forge-50/70" : "border-slate-200 bg-white"}`}>
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${active ? "bg-forge-600 text-white" : "bg-slate-100 text-slate-500"}`}>{number}</span>
      <div>
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { data: me } = useMe();
  const { data: summary } = useDashboardSummary();
  const { data: projects, isLoading, error } = useProjects();
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortMode>("updated");

  if (error) return <ErrorState message={error.message} />;

  const firstName = me?.name?.trim().split(/\s+/)[0];
  const visibleProjects = projects ? filterAndSort(projects, filter, sort) : [];
  const availableFilters = STATUS_FILTERS.filter((status) => status === "all" || (projects ?? []).some((p) => p.status === status));
  const featuredProject = visibleProjects[0];

  return (
    <div className="space-y-8 pb-8">
      <section className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white px-6 py-7 text-slate-900 shadow-sm shadow-slate-200/70 sm:px-9 sm:py-9">
        <div className="absolute -right-24 -top-32 h-80 w-80 rounded-full bg-forge-200/60 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-32 w-96 rounded-full bg-indigo-100/70 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-forge-700"><span className="h-1.5 w-1.5 rounded-full bg-forge-500" />Workspace overview</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{firstName ? `Welcome back, ${firstName}.` : "Your next clear decision starts here."}</h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-500 sm:text-base">Turn business clarity into an engineering story your team can build, review, and share.</p>
          </div>
          <Button size="sm" onClick={() => setShowForm((value) => !value)}>{showForm ? "Close form" : "New project"}</Button>
        </div>
        {showForm ? (
          <div className="relative mt-7 rounded-2xl border border-white/10 bg-white/[0.06] p-4 sm:p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Create a workspace once</p>
            <CreateProjectForm defaultCreator={me?.id ?? "owner@internal"} onCreated={() => setShowForm(false)} />
          </div>
        ) : null}
      </section>

      {summary ? <PlanStrip summary={summary} /> : null}
      <KpiRow summary={summary} />

      {isLoading || !projects ? (
        <div className="grid gap-4 sm:grid-cols-3"><Card className="h-32 animate-pulse" /><Card className="h-32 animate-pulse" /><Card className="h-32 animate-pulse" /></div>
      ) : projects.length === 0 ? (
        <section className="rounded-[28px] border border-dashed border-forge-300 bg-forge-50/50 px-6 py-10 text-center sm:px-10">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-forge-600 text-white shadow-lg shadow-forge-600/20">+</div>
          <h2 className="mt-4 text-xl font-semibold text-slate-900">Create your first project</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate-500">Business Model and Presentation are created inside a project. Start with a project, then open the Business Model Canvas to define the idea and the Pitch Deck to share it.</p>
          <Button className="mt-5" onClick={() => setShowForm(true)}>Create a project</Button>
        </section>
      ) : featuredProject ? (
        <>
          <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-forge-600">Continue here</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{featuredProject.name}</h2>
                  <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-500">Your project is the source of truth. Create the canvas first, then turn its decisions into a presentation.</p>
                </div>
                <StatusBadge status={featuredProject.status} />
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Link to={`/projects/${featuredProject.id}/business-model`} className="group rounded-2xl border border-forge-200 bg-forge-50/70 p-4 transition-all hover:-translate-y-0.5 hover:border-forge-400 hover:shadow-md">
                  <div className="flex items-center justify-between"><span className="rounded-lg bg-forge-600 p-2 text-white"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="4" width="7" height="7" rx="1.5" /><rect x="14" y="4" width="7" height="7" rx="1.5" /><rect x="3" y="13" width="7" height="7" rx="1.5" /><rect x="14" y="13" width="7" height="7" rx="1.5" /></svg></span><span className="text-forge-600 transition-transform group-hover:translate-x-1" aria-hidden="true">→</span></div>
                  <h3 className="mt-4 text-sm font-semibold text-slate-900">Create Business Model</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">Open the nine-block canvas and add your first strategic notes.</p>
                </Link>
                <Link to={`/projects/${featuredProject.id}/presentation`} className="group rounded-2xl border border-violet-200 bg-violet-50/70 p-4 transition-all hover:-translate-y-0.5 hover:border-violet-400 hover:shadow-md">
                  <div className="flex items-center justify-between"><span className="rounded-lg bg-violet-600 p-2 text-white"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="m10 9 5 3-5 3V9Z" /></svg></span><span className="text-violet-600 transition-transform group-hover:translate-x-1" aria-hidden="true">→</span></div>
                  <h3 className="mt-4 text-sm font-semibold text-slate-900">Generate Presentation</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">Open the live pitch deck generated from your project data.</p>
                </Link>
              </div>
              <Link to={`/projects/${featuredProject.id}`} className="mt-5 inline-flex text-xs font-semibold text-slate-500 transition-colors hover:text-slate-900">Open full project workspace <span className="ml-1" aria-hidden="true">→</span></Link>
            </div>
            <div className="rounded-[28px] border border-slate-200 bg-white p-5 text-slate-900 shadow-sm sm:p-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Recommended flow</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">From idea to story</h2>
              <div className="mt-5 space-y-3">
                <FlowStep number="1" title="Define the business" description="Capture the audience, value, channels, and economics." active />
                <FlowStep number="2" title="Model the system" description="Add workflows, data, and architecture to your project." />
                <FlowStep number="3" title="Share the story" description="Generate a presentation and download the deck when ready." />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Your workspaces</p><h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">Projects</h2></div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">{availableFilters.map((status) => <button key={status} type="button" onClick={() => setFilter(status)} className={`rounded-md px-2.5 py-1 text-[11px] font-medium capitalize transition-colors ${filter === status ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-800"}`}>{status}</button>)}</div>
                <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-medium text-slate-600 focus:border-forge-400 focus:outline-none" aria-label="Sort projects"><option value="updated">Recently updated</option><option value="created">Newest first</option><option value="name">Name A–Z</option></select>
              </div>
            </div>
            {visibleProjects.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-xs text-slate-400">No projects match this filter.</p> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{visibleProjects.map((project, index) => <Link key={project.id} to={`/projects/${project.id}`} className="sf-rise group" style={{ animationDelay: `${index * 40}ms` }}><Card className="h-full transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-slate-300 group-hover:shadow-md"><CardHeader title={project.name} description={project.types && project.types.length > 0 ? undefined : `${project.type.toUpperCase()} project`} actions={<StatusBadge status={project.status} />} /><div className="px-5 py-4 text-xs text-slate-500">{project.types && project.types.length > 0 ? <PlatformBadges types={project.types} /> : null}<p className={`line-clamp-2 text-sm text-slate-600 ${project.types && project.types.length > 0 ? "mt-2" : ""}`}>{project.description ?? "No description yet."}</p><HealthMiniCard projectId={project.id} /><p className="mt-3 flex items-baseline justify-between gap-2"><span>Updated {formatRelative(project.updated_at)}</span><span className="font-mono text-[10px] text-slate-300">{project.id}</span></p></div></Card></Link>)}</div>}
          </section>
        </>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-3"><div className="lg:col-span-2"><AttentionPanel summary={summary} /></div><UpcomingMilestones summary={summary} /></section>
    </div>
  );
}
