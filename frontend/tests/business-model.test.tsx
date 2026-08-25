/**
 * Business Model Canvas render tests (DEC-030 Phase A).
 *
 * Static react-dom/server rendering inside the provider hierarchy with the
 * React Query cache seeded directly.
 */
import { describe, expect, it } from "bun:test";
import type { ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { BusinessModelPage } from "../src/pages/BusinessModelPage";
import { bmcKeys } from "../src/entities/bmc/api";
import type { BmcNote } from "../src/entities/bmc/types";
import { BLOCK_LABELS, BANDS, groupByBlock } from "../src/entities/bmc/lib";

const NOTE: BmcNote = {
  id: "BMC-0001",
  project_id: "PRJ-0001",
  block: "value_propositions",
  content: "Specs to pitch in one place.",
  sort_order: 0,
  created_at: "2026-08-25T00:00:00.000Z",
  updated_at: "2026-08-25T00:00:00.000Z",
};

function renderPage(notes?: BmcNote[]): string {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  if (notes) queryClient.setQueryData(bmcKeys.all("PRJ-0001"), notes);
  return renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/projects/PRJ-0001/business-model"]}>
        <Routes>
          <Route path="/projects/:projectId/business-model" element={<BusinessModelPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("bmc lib helpers", () => {
  it("orders blocks canonically and groups notes", () => {
    const grouped = groupByBlock([NOTE]);
    expect(grouped.value_propositions).toHaveLength(1);
    expect(grouped.key_partners).toHaveLength(0);
    // Bands cover all nine blocks exactly once.
    const flat = BANDS.flat();
    expect(flat).toHaveLength(9);
    expect(new Set(flat).size).toBe(9);
    expect(BLOCK_LABELS["revenue_streams"]).toBe("Revenue Streams");
  });
});

describe("BusinessModelPage", () => {
  it("renders all nine canvas block titles", () => {
    const html = renderPage([NOTE]);
    for (const label of Object.values(BLOCK_LABELS)) {
      expect(html).toContain(label);
    }
  });

  it("shows seeded note content inside its block", () => {
    const html = renderPage([NOTE]);
    expect(html).toContain("Specs to pitch in one place.");
    expect(html).toContain("Add note");
  });

  it("keeps a loading shell before data resolves", () => {
    const html = renderPage();
    expect(html).not.toContain("Specs to pitch in one place.");
    expect(html).toContain("Business Model");
  });
});
