/**
 * Frontend tests for Prompt 13 (platform configuration).
 * Renders the new widgets/features with react-dom/server inside the provider
 * hierarchy the app uses. During static rendering TanStack Query stays in its
 * synchronous pending state, so the loading presentation is what we assert for
 * data-driven components; pure presentational components are asserted directly.
 */
import { describe, expect, it } from "bun:test";
import type { ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { PlatformBadges } from "../src/widgets/platform-badges/PlatformBadges";
import { CreateProjectForm } from "../src/features/create-project/CreateProjectForm";
import { PlatformSettingsPanel } from "../src/features/platform-settings/PlatformSettingsPanel";
import type { ProjectTypeSelection } from "../src/entities/project/types";

function renderWithProviders(element: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return renderToStaticMarkup(<QueryClientProvider client={queryClient}>{element}</QueryClientProvider>);
}

describe("PlatformBadges", () => {
  const selection: ProjectTypeSelection[] = [
    {
      type_id: "PTYPE-0001",
      key: "web",
      label: "Web",
      color: "#2563eb",
      icon: "globe",
      stack_id: "STK-0004",
      stack_name: "React",
      stack_language: "TypeScript",
      libraries: [{ id: "LIB-0011", name: "React Router", purpose: null, category: null }],
    },
    {
      type_id: "PTYPE-0003",
      key: "api",
      label: "API",
      color: "#059669",
      icon: "server",
      stack_id: null,
      stack_name: null,
      stack_language: null,
      libraries: [],
    },
  ];

  it("renders a badge per type with label, color, and stack name", () => {
    const html = renderToStaticMarkup(<PlatformBadges types={selection} />);
    expect(html).toContain("Web");
    expect(html).toContain("React");
    expect(html).toContain("API");
    expect(html).toContain("#2563eb");
  });

  it("renders nothing when there are no types", () => {
    expect(renderToStaticMarkup(<PlatformBadges types={[]} />)).toBe("");
    expect(renderToStaticMarkup(<PlatformBadges />)).toBe("");
  });
});

describe("CreateProjectForm", () => {
  it("shows a loading spinner while the platform configuration loads", () => {
    const html = renderWithProviders(<CreateProjectForm />);
    expect(html).toContain("animate-spin");
  });
});

describe("PlatformSettingsPanel", () => {
  it("shows a loading spinner while the platform configuration loads", () => {
    const html = renderWithProviders(<PlatformSettingsPanel />);
    expect(html).toContain("animate-spin");
  });
});
