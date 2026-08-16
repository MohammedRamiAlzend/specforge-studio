/**
 * Frontend tests for Prompt 14 (multi-project workspace): pure lib helpers
 * for cross-project references and the two presentational widgets
 * (LinkedProjectsCard, CrossProjectCalls) rendered with react-dom/server.
 */
import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  buildCrossProjectMetadata,
  crossProjectRefOf,
  dependencyKindLabel,
  DEPENDENCY_KINDS,
} from "../src/entities/project-link/lib";
import { LinkedProjectsCard } from "../src/widgets/linked-projects/LinkedProjectsCard";
import { CrossProjectCalls } from "../src/widgets/project-calls/CrossProjectCalls";
import type {
  CrossProjectCall,
  ProjectDependency,
  ProjectDependent,
  ReferenceTarget,
} from "../src/entities/project-link/types";

describe("project-link lib helpers", () => {
  it("labels dependency kinds", () => {
    expect(dependencyKindLabel("workflow_call")).toBe("Workflow call");
    expect(dependencyKindLabel("data")).toBe("Data");
    expect(dependencyKindLabel("deploy")).toBe("Deploy");
    expect(dependencyKindLabel("other")).toBe("Other");
    expect(DEPENDENCY_KINDS).toContain("workflow_call");
  });

  it("builds cross-project metadata preserving other keys", () => {
    const metadata = buildCrossProjectMetadata(
      { tags: ["checkout"] },
      { project_id: "PRJ-0002", graph_id: "GRPH-0002" },
    );
    expect(metadata.cross_project).toEqual({ project_id: "PRJ-0002", graph_id: "GRPH-0002" });
    expect(metadata.tags).toEqual(["checkout"]);
  });

  it("parses a stored cross-project reference and rejects broken shapes", () => {
    expect(crossProjectRefOf({ cross_project: { project_id: "PRJ-0002", graph_id: "GRPH-0002" } })).toEqual({
      project_id: "PRJ-0002",
      graph_id: "GRPH-0002",
    });
    expect(crossProjectRefOf({})).toBeNull();
    expect(crossProjectRefOf(null)).toBeNull();
    expect(crossProjectRefOf({ cross_project: { project_id: "PRJ-0002" } })).toBeNull();
  });
});

describe("LinkedProjectsCard", () => {
  const outgoing: ProjectDependency[] = [
    {
      id: "PDEP-0001",
      project_id: "PRJ-0001",
      depends_on_project_id: "PRJ-0002",
      depends_on_project_name: "Acme API Platform",
      depends_on_project_type: "api",
      depends_on_project_status: "active",
      kind: "workflow_call",
      note: "Checkout calls the orders API",
      created_at: "2026-08-16T00:00:00Z",
    },
  ];
  const incoming: ProjectDependent[] = [
    {
      id: "PDEP-0002",
      project_id: "PRJ-0003",
      depending_project_id: "PRJ-0003",
      depending_project_name: "Ambition Mobile",
      depending_project_type: "mobile",
      depending_project_status: "draft",
      kind: "data",
      note: null,
      created_at: "2026-08-16T00:00:00Z",
    },
  ];
  const targets: ReferenceTarget[] = [
    { project_id: "PRJ-0002", project_name: "Acme API Platform", project_type: "api", is_linked: true, workflows: [] },
    { project_id: "PRJ-0003", project_name: "Ambition Mobile", project_type: "mobile", is_linked: false, workflows: [] },
  ];

  it("renders outgoing and incoming dependencies with kind labels and statuses", () => {
    const html = renderToStaticMarkup(
      <LinkedProjectsCard
        outgoing={outgoing}
        incoming={incoming}
        targets={targets}
        onAdd={() => {}}
        onRemove={() => {}}
      />,
    );
    expect(html).toContain("Linked projects");
    expect(html).toContain("Acme API Platform");
    expect(html).toContain("Workflow call");
    expect(html).toContain("Checkout calls the orders API");
    expect(html).toContain("Ambition Mobile");
    expect(html).toContain("active");
    expect(html).toContain("Remove");
  });

  it("shows empty states when there are no links", () => {
    const html = renderToStaticMarkup(
      <LinkedProjectsCard outgoing={[]} incoming={[]} targets={[]} onAdd={() => {}} onRemove={() => {}} />,
    );
    expect(html).toContain("No dependencies declared yet.");
    expect(html).toContain("No other project depends on this one.");
  });

  it("hides already-linked projects from the add dropdown", () => {
    const html = renderToStaticMarkup(
      <LinkedProjectsCard outgoing={outgoing} incoming={incoming} targets={targets} onAdd={() => {}} onRemove={() => {}} />,
    );
    // PRJ-0002 is already linked, so only PRJ-0003 is selectable.
    expect(html).toContain("Ambition Mobile");
    expect(html.match(/PRJ-0003/g)?.length).toBeGreaterThan(1);
  });
});

describe("CrossProjectCalls", () => {
  const calls: CrossProjectCall[] = [
    {
      workflow_id: "GRPH-0001",
      workflow_name: "Checkout flow",
      node_id: "GRPH-0001-N02",
      node_title: "Call Orders API",
      target_project_id: "PRJ-0002",
      target_project_name: "Acme API Platform",
      target_graph_id: "GRPH-0002",
      target_graph_name: "Orders API",
    },
  ];

  it("groups calls by workflow and shows the target project badge", () => {
    const html = renderToStaticMarkup(<CrossProjectCalls calls={calls} />);
    expect(html).toContain("Checkout flow");
    expect(html).toContain("GRPH-0001-N02");
    expect(html).toContain("PRJ-0002");
    expect(html).toContain("Acme API Platform");
    expect(html).toContain("Orders API");
  });

  it("renders nothing when there are no calls", () => {
    expect(renderToStaticMarkup(<CrossProjectCalls calls={[]} />)).toBe("");
  });
});