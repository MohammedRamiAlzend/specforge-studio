/**
 * Dashboard redesign render tests (DEC-030).
 *
 * Static react-dom/server rendering inside the provider hierarchy with the
 * React Query cache seeded directly, so every data-driven widget resolves
 * synchronously.
 */
import { describe, expect, it } from "bun:test";
import type { ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { DashboardPage } from "../src/pages/DashboardPage";
import { userKeys } from "../src/entities/user/api";
import type { User } from "../src/entities/user/types";
import { projectKeys } from "../src/entities/project/api";
import type { Project } from "../src/entities/project/types";
import { dashboardKeys } from "../src/entities/dashboard/api";
import type { DashboardSummary } from "../src/entities/dashboard/types";
import { healthKeys } from "../src/entities/health/api";
import { activityKeys } from "../src/entities/activity/api";

const USER: User = {
  id: "USR-0001",
  email: "ada@test.local",
  name: "Ada Lovelace",
  email_verified: true,
  is_admin: false,
  created_at: "2026-08-01T00:00:00.000Z",
};

const PROJECT: Project = {
  id: "PRJ-0001",
  name: "StoreSphere",
  type: "web",
  description: "E-commerce storefront.",
  repository_url: null,
  status: "active",
  created_by: "USR-0001",
  created_at: "2026-08-01T00:00:00.000Z",
  updated_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
};

const HEALTH = {
  requirements: { total: 10, approved: 5, completion: 50 },
  tasks: { total: 8, open: 2, in_progress: 1, blocked: 1, done: 4, cancelled: 0, completion: 50 },
  approvals: { total: 4, approved: 2, pending: 2, coverage: 50 },
  validation: { errors: 0, warnings: 1, infos: 0 },
  traceability: { total_requirements: 10, covered: 6, coverage: 60 },
  milestones: { total: 3, reached: 1, in_progress: 1, completion: 33 },
  issues: { total: 5, open: 2, resolved: 3 },
  releases: { total: 2, released: 1 },
} as never;

const SUMMARY: DashboardSummary = {
  projects: { total: 1, by_status: { active: 1 } },
  quota: { used: 1, limit: 1, plan_key: "free" },
  subscription: { plan_key: "free", status: "active", cycle: "monthly", current_period_end: "", card_last4: "" },
  tasks: { open: 2, in_progress: 1, blocked: 1, done: 4, cancelled: 0 },
  blocked_tasks: [
    { id: "TASK-0002", title: "Stuck migration", priority: "high", project_id: "PRJ-0001", project_name: "StoreSphere" },
  ],
  issues: { open: 2, critical_open: 1 },
  critical_issues: [
    { id: "ISS-0001", title: "Checkout double-charges cards", severity: "critical", project_id: "PRJ-0001", project_name: "StoreSphere" },
  ],
  pending_approvals: [
    { id: "APR-0001", artifact_id: "REQ-0001", artifact_type: "requirement", approver_role: "product_owner", project_id: "PRJ-0001", project_name: "StoreSphere" },
  ],
  upcoming_milestones: [
    { id: "MS-0001", name: "Beta gate", due_date: "2099-01-15", status: "planned", project_id: "PRJ-0001", project_name: "StoreSphere" },
  ],
};

function renderWithCache(seed?: { me?: User; summary?: DashboardSummary; projects?: Project[] }): string {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  if (seed?.me) queryClient.setQueryData(userKeys.me, { user: seed.me });
  if (seed?.summary) queryClient.setQueryData(dashboardKeys.summary, seed.summary);
  if (seed?.projects) {
    queryClient.setQueryData(projectKeys.all, seed.projects);
    for (const project of seed.projects) {
      queryClient.setQueryData(healthKeys.one(project.id), HEALTH);
    }
  }
  queryClient.setQueryData(activityKeys.list(undefined, 18), []);
  return renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("DashboardPage (DEC-030)", () => {
  it("greets the signed-in user by first name", () => {
    const html = renderWithCache({ me: USER });
    expect(html).toContain("Welcome back, Ada");
  });

  it("shows KPI counters and the attention panel when the summary resolves", () => {
    const html = renderWithCache({ me: USER, summary: SUMMARY, projects: [PROJECT] });
    expect(html).toContain("Active projects");
    expect(html).toContain("Blocked tasks");
    expect(html).toContain("Critical issues");
    expect(html).toContain("Pending approvals");
    expect(html).toContain("Needs attention");
    expect(html).toContain("Stuck migration");
    expect(html).toContain("Checkout double-charges cards");
    expect(html).toContain("/projects/PRJ-0001/governance");
  });

  it("surfaces the Free-plan quota strip with an upgrade CTA", () => {
    const html = renderWithCache({ me: USER, summary: SUMMARY });
    expect(html).toContain("1 of 1 project slot used");
    expect(html).toContain("Upgrade to Plus");
    expect(html).toContain("/settings?tab=Billing");
  });

  it("lists upcoming milestones with their due dates", () => {
    const html = renderWithCache({ me: USER, summary: SUMMARY });
    expect(html).toContain("Upcoming milestones");
    expect(html).toContain("Beta gate");
    expect(html).toContain("/projects/PRJ-0001/roadmap");
  });

  it("renders project freshness instead of raw creation dates", () => {
    const html = renderWithCache({ me: USER, summary: SUMMARY, projects: [PROJECT] });
    expect(html).toContain("Updated 3h ago");
    expect(html).toContain("Recently updated");
  });

  it("keeps a calm loading shell while data resolves", () => {
    const html = renderWithCache();
    expect(html).toContain("animate-pulse");
    // The plan strip and KPI numbers stay hidden; panels show quiet empties.
    expect(html).not.toContain("project slot used");
    expect(html).toContain("Nothing blocked");
  });
});
