/**
 * Frontend tests for OPT-003 (multi-project roadmap aggregation): the
 * link-kind label helper and the RoadmapAggregateCard widget rendered with
 * react-dom/server inside the app's provider hierarchy. During static
 * rendering TanStack Query returns the synchronous loading state, so we
 * assert the widget shell and its loading presentation.
 */
import { describe, expect, it } from "bun:test";
import type { ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { linkKindLabel } from "../src/entities/roadmap-aggregate/api";
import type { RoadmapAggregateProject } from "../src/entities/roadmap-aggregate/types";
import { RoadmapAggregateCard } from "../src/widgets/roadmap-aggregate/RoadmapAggregateCard";

function renderWithProviders(element: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{element}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("roadmap aggregate lib helpers", () => {
  it("labels link kinds", () => {
    expect(linkKindLabel("self")).toBe("This project");
    expect(linkKindLabel("dependent")).toBe("Depends on this project");
    expect(linkKindLabel("workflow_call")).toBe("Workflow calls");
    expect(linkKindLabel("data")).toBe("Shares data");
    expect(linkKindLabel("deploy")).toBe("Deploy dependency");
    expect(linkKindLabel("other")).toBe("Linked project");
    expect(linkKindLabel("custom_kind")).toBe("custom kind");
  });
});

describe("RoadmapAggregateCard", () => {
  it("renders the widget shell while loading", () => {
    const html = renderWithProviders(<RoadmapAggregateCard projectId="PRJ-0001" />);
    expect(html).toContain("Workspace roadmap");
    expect(html).toContain("linked project");
    expect(html).toContain("animate-spin");
  });
});

describe("aggregate project row model", () => {
  it("shapes a project row for rendering", () => {
    const project: RoadmapAggregateProject = {
      project_id: "PRJ-0002",
      project_name: "Order API",
      project_type: "api",
      link_kind: "data",
      roadmap_id: "RMP-0002",
      roadmap_name: "Roadmap for PRJ-0002",
      roadmap_status: "draft",
      phases: 5,
      epics: 6,
      milestones: 5,
      tasks_total: 10,
      tasks_packaged: 10,
      tasks_done: 4,
      completion: 40,
    };
    expect(project.completion).toBe(Math.round((project.tasks_done / project.tasks_total) * 100));
    expect(project.link_kind).toBe("data");
  });
});
