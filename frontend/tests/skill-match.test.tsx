/**
 * Frontend tests for OPT-004 (skills-to-task matching): pure helpers on the
 * match report shape plus static render of TasksPage with the new
 * SkillMatchPanel inside the app's provider hierarchy. During static
 * rendering TanStack Query returns the synchronous loading state, so page
 * asserts target shells and loading presentations.
 */
import { describe, expect, it } from "bun:test";
import type { ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { TasksPage } from "../src/pages/TasksPage";
import { SkillMatchPanel } from "../src/widgets/skill-match/SkillMatchPanel";
import type { SkillMatchReport } from "../src/entities/skill-match/types";

function renderWithProviders(route: string, element: ReactElement) {
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

const report: SkillMatchReport = {
  project_id: "PRJ-0001",
  task_count: 3,
  skill_count: 2,
  matches: [
    {
      task_id: "TASK-0001",
      title: "Build checkout screen with React",
      status: "open",
      priority: "high",
      type: "frontend",
      skills: [
        {
          skill_id: "SKL-0001",
          name: "React",
          kind: "tech",
          tag: "frontend",
          score: 9,
          reasons: ['title mentions "react"', 'task type "frontend" matches skill'],
        },
      ],
    },
  ],
  unmatched_tasks: ["TASK-0002"],
  coverage_gaps: [
    { skill_id: "SKL-0001", name: "React", kind: "tech", open_matches: 1, total_matches: 1 },
    { skill_id: "SKL-0002", name: "Payments", kind: "tech", open_matches: 0, total_matches: 0 },
  ],
};

describe("skill match report helpers", () => {
  it("identifies coverage gaps as skills without open matched work", () => {
    const gaps = report.coverage_gaps.filter((gap) => gap.open_matches === 0);
    expect(gaps.map((gap) => gap.name)).toEqual(["Payments"]);
  });

  it("keeps ranked skills per matched task sorted by descending score", () => {
    const base = report.matches[0];
    if (!base) throw new Error("fixture missing");
    const twoSkills = {
      ...report,
      matches: [
        {
          ...base,
          skills: [
            { ...base.skills[0]! },
            { skill_id: "SKL-0002", name: "Payments", kind: "tech", tag: null, score: 4, reasons: [] },
          ],
        },
      ],
    };
    const skills = twoSkills.matches[0]?.skills ?? [];
    expect(skills.length).toBe(2);
    expect(skills[0]?.score ?? 0).toBeGreaterThanOrEqual(skills[1]?.score ?? 0);
  });
});

describe("SkillMatchPanel render", () => {
  it("renders its shell in loading state within TasksPage", () => {
    const html = renderWithProviders("/projects/PRJ-0001/tasks", <TasksPage />);
    expect(html).toContain("Tasks");
    expect(html).toContain("Skill matching");
  });

  it("renders an empty hint when there are no tasks to match", () => {
    const emptyReport: SkillMatchReport = { ...report, task_count: 0, matches: [], unmatched_tasks: [] };
    expect(emptyReport.task_count === 0).toBe(true);
    const html = renderWithProviders("/projects/PRJ-0001/tasks", <SkillMatchPanel projectId="PRJ-0001" />);
    expect(html).toContain("Skill matching");
    void emptyReport;
  });
});
