import { describe, it, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import PresentationPage from "../src/pages/PresentationPage";

const mockSlides = [
  { kind: "title", title: "Test Project", bullets: ["Built with React"] },
  { kind: "features", title: "Key Features", bullets: ["Login flow", "Export reports"] },
  { kind: "metrics", title: "Delivery Metrics", bullets: ["Tasks done: 3/5 (60%)"] },
];

const mockData = {
  data: {
    project: { id: "PRJ-0001", name: "Test Project", description: null, status: "active" },
    stacks: [],
    slides: mockSlides,
    generated_at: "2026-08-25T12:00:00.000Z",
  },
};

function renderPage(projectId = "PRJ-0001") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  queryClient.setQueryData(["presentation-data", projectId], mockData);

  return renderToStaticMarkup(
    createElement(QueryClientProvider, { client: queryClient },
      createElement(MemoryRouter, { initialEntries: [`/projects/${projectId}/presentation`] },
        createElement(Routes, null,
          createElement(Route, { path: "/projects/:projectId/presentation", element: createElement(PresentationPage) }),
        ),
      ),
    ),
  );
}

describe("PresentationPage", () => {
  it("renders the pitch deck heading", () => {
    const html = renderPage();
    expect(html).toContain("Pitch Deck");
  });

  it("shows slide title content when data is available", () => {
    const html = renderPage();
    expect(html).toContain("Test Project");
    expect(html).toContain("Built with React");
  });

  it("shows slide count and bullet content", () => {
    const html = renderPage();
    expect(html).toContain("Slide 1 of 3");
    expect(html).toContain("Login flow");
  });

  it("contains the download button", () => {
    const html = renderPage();
    expect(html).toContain("Download .pptx");
  });
});
