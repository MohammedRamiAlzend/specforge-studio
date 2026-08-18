/**
 * Frontend tests for Prompt 20 (Execution & Delivery): lib helpers plus
 * static render of the new pages and widgets (Issues, Releases, Tasks board,
 * Team section, Activity feed, Health cards) inside the app's provider
 * hierarchy. During static rendering TanStack Query returns the synchronous
 * loading state, so we assert page shells and loading presentations.
 */
import { describe, expect, it } from "bun:test";
import type { ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { IssuesPage } from "../src/pages/IssuesPage";
import { ReleasesPage } from "../src/pages/ReleasesPage";
import { TasksPage } from "../src/pages/TasksPage";
import { TeamSection } from "../src/widgets/team/TeamSection";
import { ActivityFeed } from "../src/widgets/activity/ActivityFeed";
import { buildHealthCards } from "../src/widgets/health/HealthCards";
import {
  applyIssueFilters,
  issueKindLabel,
  nextIssueStatus,
} from "../src/entities/issue/lib";
import { nextReleaseStatus, releaseStatusLabel } from "../src/entities/release/lib";
import { searchTypeLabel } from "../src/entities/search/types";
import { describeAction } from "../src/entities/activity/api";
import type { Issue } from "../src/entities/issue/types";
import type { ProjectHealth } from "../src/entities/health/types";

function renderPage(route: string, element: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="/projects/:projectId/*" element={element} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const issues: Issue[] = [
  {
    id: "ISS-0001",
    project_id: "PRJ-0001",
    kind: "bug",
    severity: "high",
    status: "open",
    title: "Checkout crashes on empty cart",
    description: "Reproduce with an empty cart.",
    requirement_id: null,
    task_id: "TASK-0001",
    test_case_id: null,
    created_by: "ada@acme.internal",
    created_at: "2026-08-17T00:00:00Z",
    updated_at: "2026-08-17T00:00:00Z",
  },
  {
    id: "ISS-0002",
    project_id: "PRJ-0001",
    kind: "enhancement",
    severity: "low",
    status: "resolved",
    title: "Catalog search autocomplete",
    description: "",
    requirement_id: null,
    task_id: null,
    test_case_id: null,
    created_by: null,
    created_at: "2026-08-17T00:00:00Z",
    updated_at: "2026-08-17T00:00:00Z",
  },
];

describe("issue lib helpers", () => {
  it("labels kinds and computes status transitions", () => {
    expect(issueKindLabel("tech_debt")).toBe("tech debt");
    expect(nextIssueStatus("open")).toBe("in_progress");
    expect(nextIssueStatus("in_progress")).toBe("resolved");
    expect(nextIssueStatus("resolved")).toBe("closed");
    expect(nextIssueStatus("closed")).toBeNull();
  });

  it("filters issues by status and kind", () => {
    expect(applyIssueFilters(issues, {})).toHaveLength(2);
    expect(applyIssueFilters(issues, { status: "open" })).toHaveLength(1);
    expect(applyIssueFilters(issues, { kind: "enhancement" })).toHaveLength(1);
    expect(applyIssueFilters(issues, { status: "open", kind: "bug" })).toHaveLength(1);
    expect(applyIssueFilters(issues, { status: "closed" })).toHaveLength(0);
    expect(applyIssueFilters(undefined, {})).toEqual([]);
  });
});

describe("release lib helpers", () => {
  it("labels statuses and computes transitions", () => {
    expect(releaseStatusLabel("in_progress")).toBe("in progress");
    expect(nextReleaseStatus("planned")).toBe("in_progress");
    expect(nextReleaseStatus("in_progress")).toBe("released");
    expect(nextReleaseStatus("released")).toBeNull();
    expect(nextReleaseStatus("archived")).toBeNull();
  });
});

describe("search + activity helpers", () => {
  it("labels search result types", () => {
    expect(searchTypeLabel("team_member")).toBe("team member");
    expect(searchTypeLabel("api_endpoint")).toBe("api endpoint");
  });

  it("describes activity actions", () => {
    expect(describeAction({ entity_type: "task", action: "created", to_status: null })).toBe("created");
    expect(
      describeAction({ entity_type: "task", action: "status_change", to_status: "done" }),
    ).toBe("moved to done");
    expect(describeAction({ entity_type: "approval", action: "approval_requested", to_status: "pending" })).toBe(
      "requested approval for",
    );
  });
});

describe("health cards builder", () => {
  const health: ProjectHealth = {
    project_id: "PRJ-0001",
    requirements: { total: 4, approved: 2, completion: 50 },
    tasks: { total: 10, open: 3, in_progress: 2, blocked: 1, done: 4, cancelled: 0, completion: 40 },
    approvals: { total: 2, approved: 1, pending: 1, coverage: 50 },
    validation: { errors: 1, warnings: 2, infos: 0 },
    traceability: { total_requirements: 4, covered: 3, coverage: 75 },
    milestones: { total: 2, reached: 1, in_progress: 1, completion: 50 },
    issues: { total: 2, open: 1, resolved: 1 },
    releases: { total: 2, released: 1 },
  };

  it("builds three grouped metric cards with bars and chips", () => {
    const cards = buildHealthCards(health);
    expect(cards.map((c) => c.title)).toEqual(["Definition", "Execution", "Delivery"]);
    expect(cards[0]?.bars.map((b) => b.label)).toEqual([
      "Requirements approved",
      "Traceability coverage",
    ]);
    expect(cards[1]?.chips?.some((c) => c.label === "blocked" && c.value === 1)).toBe(true);
    expect(cards[2]?.chips?.some((c) => c.label === "pending approvals" && c.value === 1)).toBe(true);
  });
});

describe("Prompt 20 pages", () => {
  it("IssuesPage renders its shell and filters", () => {
    const html = renderPage("/projects/PRJ-0001/issues", <IssuesPage />);
    expect(html).toContain("Issues");
    expect(html).toContain("Filter by status");
    expect(html).toContain("Filter by kind");
    expect(html).toContain("New issue");
  });

  it("ReleasesPage renders its shell", () => {
    const html = renderPage("/projects/PRJ-0001/releases", <ReleasesPage />);
    expect(html).toContain("Releases");
    expect(html).toContain("New release");
  });

  it("TasksPage renders the shell with board/table toggle and assignee filter", () => {
    const html = renderPage("/projects/PRJ-0001/tasks", <TasksPage />);
    expect(html).toContain("Tasks");
    expect(html).toContain("Board");
    expect(html).toContain("Table");
    expect(html).toContain("Filter by assignee");
    expect(html).toContain("All assignees");
  });

  it("TeamSection renders its shell with add-member action", () => {
    const html = renderPage("/projects/PRJ-0001", <TeamSection projectId="PRJ-0001" />);
    expect(html).toContain("Team");
    expect(html).toContain("Add member");
  });

  it("ActivityFeed renders its shell", () => {
    const html = renderPage("/projects/PRJ-0001", <ActivityFeed projectId="PRJ-0001" />);
    expect(html).toContain("Activity");
  });
});
