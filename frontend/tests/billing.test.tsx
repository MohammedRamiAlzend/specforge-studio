/**
 * Billing lifecycle render tests (DEC-029).
 *
 * Static react-dom/server rendering inside the provider hierarchy. Cache
 * entries are seeded directly so data-driven sections resolve synchronously;
 * with an empty cache the panel asserts its loading/upsell fallbacks.
 */
import { describe, expect, it } from "bun:test";
import type { ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { BillingPanel } from "../src/features/billing/BillingPanel";
import { subscriptionKeys } from "../src/entities/subscription/api";
import type { Invoice, Subscription } from "../src/entities/subscription/types";
import type { Plan } from "../src/entities/plan/types";

function renderWithCache(
  element: ReactElement,
  seed?: {
    subscription?: Subscription | null;
    invoices?: Invoice[];
  },
): string {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  if (seed?.subscription !== undefined) {
    queryClient.setQueryData(subscriptionKeys.me, seed.subscription);
  }
  if (seed?.invoices) {
    queryClient.setQueryData(subscriptionKeys.invoices, seed.invoices);
  }
  return renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{element}</MemoryRouter>
    </QueryClientProvider>,
  );
}

const PLUS_PLAN: Plan = {
  id: "PLAN-0002",
  key: "plus",
  name: "Plus",
  tagline: "For serious builders.",
  monthlyPriceCents: 1900,
  yearlyPriceCents: 19000,
  features: ["Unlimited projects", "Roadmap engine", "Governance"],
  popular: true,
  sortOrder: 2,
};

const ACTIVE_PLUS: Subscription = {
  id: "SUB-0001",
  cycle: "monthly",
  status: "active",
  cardLast4: "4242",
  startedAt: "2026-08-01T00:00:00.000Z",
  currentPeriodEnd: "2026-09-30T00:00:00.000Z",
  canceledAt: null,
  plan: PLUS_PLAN,
};

const INVOICE: Invoice = {
  id: "INV-0001",
  planKey: "plus",
  planName: "Plus",
  cycle: "monthly",
  amountCents: 1900,
  cardLast4: "4242",
  status: "paid",
  description: "Plus plan — monthly billing",
  createdAt: "2026-08-01T00:00:00.000Z",
};

describe("BillingPanel", () => {
  it("renders the loading shell while the subscription resolves", () => {
    const html = renderWithCache(<BillingPanel />);
    expect(html).toContain("animate-spin");
    expect(html).not.toContain("Current plan");
  });

  it("shows the active plan, status chip, renewal date and actions", () => {
    const html = renderWithCache(<BillingPanel />, {
      subscription: ACTIVE_PLUS,
      invoices: [INVOICE],
    });
    expect(html).toContain("Current plan");
    expect(html).toContain("Plus</h3>");
    expect(html).toContain(">active</span>");
    expect(html).toContain("$19");
    expect(html).toContain("Renews on");
    expect(html).toContain("•••• 4242");
    // Switch target excludes the current plan; cancel is available for paid.
    expect(html).toContain("Switch to Premium");
    expect(html).not.toContain("Switch to Plus");
    expect(html).toContain("Cancel subscription…");
  });

  it("lists invoice history rows with amounts and statuses", () => {
    const html = renderWithCache(<BillingPanel />, {
      subscription: ACTIVE_PLUS,
      invoices: [INVOICE],
    });
    expect(html).toContain("Invoice history");
    expect(html).toContain("Plus plan — monthly billing");
    expect(html).toContain("INV-0001");
    expect(html).toContain(">paid</span>");
  });

  it("offers upgrades when there is no active subscription", () => {
    const html = renderWithCache(<BillingPanel />, {
      subscription: null,
      invoices: [],
    });
    expect(html).toContain("Free plan (1 project)");
    expect(html).toContain("Upgrade to Plus");
    expect(html).toContain("Upgrade to Premium");
    expect(html).toContain("No invoices yet");
  });

  it("flags a lapsed period as expired with a renewal banner", () => {
    const html = renderWithCache(<BillingPanel />, {
      subscription: { ...ACTIVE_PLUS, status: "expired" },
      invoices: [],
    });
    expect(html).toContain(">expired</span>");
    expect(html).toContain("Your billing period has ended");
  });
});
