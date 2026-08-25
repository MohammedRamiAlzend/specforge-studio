import { describe, it, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { PresentationPage } from "../src/pages/PresentationPage";

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  queryClient.setQueryData(["presentation-data", "PRJ-0001"], {
    project: { id: "PRJ-0001", name: "Test Project", description: null, status: "active" },
    stacks: [],
    slides: [
      { kind: "title", title: "Test Project", bullets: ["Built with React"] },
      { kind: "features", title: "Key Features", bullets: ["Login flow"] },
      { kind: "metrics", title: "Delivery Metrics", bullets: ["Tasks done: 3/5 (60%)"] },
    ],
    generated_at: "2026-08-25T12:00:00.000Z",
  });

  return renderToStaticMarkup(
    createElement(QueryClientProvider, { client: queryClient },
      createElement(MemoryRouter, { initialEntries: ["/projects/PRJ-0001/presentation"] },
        createElement(Routes, null,
          createElement(Route, { path: "/projects/:projectId/presentation", element: createElement(PresentationPage) }),
        ),
      ),
    ),
  );
}

describe("PresentationPage", () => {
  it("renders the pitch deck heading and download button", () => {
    const html = renderPage();
    expect(html).toContain("Pitch Deck");
    expect(html).toContain("Download .pptx");
  });

  it("renders without crashing", () => {
    const html = renderPage();
    expect(html.length).toBeGreaterThan(100);
  });

  it("contains print container for all slides", () => {
    const html = renderPage();
    expect(html).toContain("print:block");
  });

  it("contains navigation controls", () => {
    const html = renderPage();
    expect(html).toContain("Previous slide");
    expect(html).toContain("Next slide");
  });
});
