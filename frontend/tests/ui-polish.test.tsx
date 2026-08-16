/**
 * Frontend tests for Prompt 17 (UI polish & motion).
 * Static rendering (react-dom/server) keeps page markup identical while the
 * new motion classes are applied purely via Tailwind class names, so we can
 * assert the classes appear in the rendered HTML without a browser.
 */
import { describe, expect, it } from "bun:test";
import type { ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { EmptyState, ErrorState } from "../src/shared/ui/States";
import { Button } from "../src/shared/ui/Button";
import { Card } from "../src/shared/ui/Card";

function render(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="*" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("motion primitives", () => {
  it("Button includes press-feedback transition classes", () => {
    const html = render(<Button>Save</Button>);
    expect(html).toContain("transition-all");
    expect(html).toContain("active:scale-[0.98]");
  });

  it("Card carries the transition classes for hover polish", () => {
    const html = render(<Card>Hello</Card>);
    expect(html).toContain("transition-all");
  });

  it("Empty state renders with the sf-rise entrance class", () => {
    const html = render(<EmptyState title="Nothing yet" hint="Create one." />);
    expect(html).toContain("sf-rise");
  });

  it("Error state renders with the sf-rise entrance class", () => {
    const html = render(<ErrorState message="Boom" />);
    expect(html).toContain("sf-rise");
  });
});