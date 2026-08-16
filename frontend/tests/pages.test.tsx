/**
 * Frontend page-rendering tests (Prompt 12: page rendering + loading states).
 * Real pages are rendered with react-dom/server inside the same provider
 * hierarchy the app uses (MemoryRouter + QueryClientProvider). During static
 * rendering TanStack Query returns the synchronous loading state, so we can
 * assert the page shell and its loading presentation without a browser.
 */
import { describe, expect, it } from "bun:test";
import type { ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { DocsExportPage } from "../src/pages/DocsExportPage";

function renderPage(route: string, element: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="/projects/:projectId/docs" element={element} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("DocsExportPage", () => {
  it("renders the page shell and loading state while exports load", () => {
    const html = renderPage("/projects/PRJ-0001/docs", <DocsExportPage />);
    expect(html).toContain("Docs Export");
    expect(html).toContain("Generate workspace");
    // Query has not resolved during static render -> loading spinner shown.
    expect(html).toContain("animate-spin");
    // The database-as-source-of-truth note is visible.
    expect(html).toContain("database as source of truth");
  });
});
