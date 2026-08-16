/**
 * Frontend tests for Prompt 16 (Skills): the lib helpers and the SkillsPage
 * shell (loading + empty states) rendered with react-dom/server inside the
 * query-client provider that the app uses.
 */
import { describe, expect, it } from "bun:test";
import type { ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import {
  LEVEL_COLORS,
  LEVELS,
  skillKindLabel,
  skillLevelLabel,
  splitSkills,
} from "../src/entities/skill/lib";
import type { Skill } from "../src/entities/skill/types";
import { SkillsPage } from "../src/pages/SkillsPage";

function renderWithProviders(element: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return renderToStaticMarkup(<QueryClientProvider client={queryClient}>{element}</QueryClientProvider>);
}

const skills: Skill[] = [
  {
    id: "SKL-0001",
    project_id: "PRJ-0001",
    kind: "capability",
    name: "Payments engineering",
    description: "PCI-sensitive checkout.",
    level: "expert",
    tag: null,
    sort_order: 1,
    created_at: "2026-08-16T00:00:00Z",
    updated_at: "2026-08-16T00:00:00Z",
  },
  {
    id: "SKL-0002",
    project_id: "PRJ-0001",
    kind: "tech",
    name: "React",
    description: "Storefront UI.",
    level: null,
    tag: "frontend",
    sort_order: 2,
    created_at: "2026-08-16T00:00:00Z",
    updated_at: "2026-08-16T00:00:00Z",
  },
];

describe("skill lib helpers", () => {
  it("labels kinds and levels", () => {
    expect(skillKindLabel("capability")).toBe("Capability");
    expect(skillKindLabel("tech")).toBe("Tech");
    expect(skillLevelLabel("advanced")).toBe("Advanced");
    expect(LEVELS).toEqual(["beginner", "intermediate", "advanced", "expert"]);
    expect(LEVEL_COLORS.expert).toBeTruthy();
  });

  it("splits skills into capability and tech buckets preserving order", () => {
    const { capability, tech } = splitSkills(skills);
    expect(capability).toHaveLength(1);
    expect(capability[0]?.name).toBe("Payments engineering");
    expect(tech).toHaveLength(1);
    expect(tech[0]?.name).toBe("React");
  });

  it("returns empty buckets when skills are undefined", () => {
    expect(splitSkills(undefined)).toEqual({ capability: [], tech: [] });
  });
});

describe("SkillsPage", () => {
  it("renders a page shell while loading", () => {
    const html = renderWithProviders(<SkillsPage />);
    expect(html.length).toBeGreaterThan(0);
  });

  it("shows the header title", () => {
    const html = renderWithProviders(<SkillsPage />);
    expect(html).toContain("Skills");
  });
});