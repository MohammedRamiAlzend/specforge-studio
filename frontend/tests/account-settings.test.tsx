import { describe, expect, it } from "bun:test";
import type { ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AccountPage } from "../src/pages/AccountPage";
import { SettingsPage } from "../src/pages/SettingsPage";

function renderPage(route: string, element: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="/account" element={element} />
          <Route path="/settings" element={element} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("account and settings IA", () => {
  it("keeps settings focused on workspace and billing instead of technical reference tabs", () => {
    const html = renderPage("/settings", <SettingsPage />);
    expect(html).toContain("Workspace");
    expect(html).toContain("Billing");
    expect(html).not.toContain("Environment");
    expect(html).not.toContain("Reference documentation");
    expect(html).toContain("Open profile");
  });

  it("renders a safe loading shell for the protected account page", () => {
    const html = renderPage("/account", <AccountPage />);
    expect(html).toContain("animate-spin");
  });
});
