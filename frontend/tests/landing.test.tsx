/**
 * Landing / pricing / auth / checkout render tests (Prompt 21).
 *
 * Static react-dom/server rendering inside the app's provider hierarchy.
 * During static rendering TanStack Query returns the synchronous loading
 * state, so plan-dependent sections assert their shells and fallbacks.
 */
import { describe, expect, it } from "bun:test";
import type { ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { LandingPage } from "../src/pages/landing/LandingPage";
import { PricingSection, PlanCard } from "../src/pages/landing/PricingSection";
import { AuthPage } from "../src/pages/auth/AuthPage";
import { CheckoutPage } from "../src/pages/billing/CheckoutPage";
import { WaveCanvas } from "../src/widgets/background/WaveCanvas";
import { PublicShell } from "../src/widgets/layout/PublicShell";
import type { Plan } from "../src/entities/plan/types";

function render(route: string, element: ReactElement): string {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>{element}</MemoryRouter>
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

describe("LandingPage", () => {
  it("renders the hero, section anchors and CTA targets", () => {
    const html = render("/", <LandingPage />);
    // Words are rendered as staggered spans separated by non-breaking spaces,
    // so assert on the closing word rather than the full sentence.
    expect(html).toContain("Turn");
    expect(html).toContain("engineering");
    expect(html).toContain("reality");
    expect(html).toContain("Start for free");
    expect(html).toContain("See pricing");
    // Section anchors for the marketing nav.
    expect(html).toContain('id="features"');
    expect(html).toContain('id="how-it-works"');
    expect(html).toContain('id="pricing"');
    expect(html).toContain('id="faq"');
    // Hero mockup + canvas background are present.
    expect(html).toContain("<canvas");
    expect(html).toContain("checkout workflow");
  });

  it("renders feature cards, steps and FAQ items", () => {
    const html = render("/", <LandingPage />);
    expect(html).toContain("Visual modeler");
    expect(html).toContain("Agent task packs");
    expect(html).toContain("Model it visually");
    expect(html).toContain("Do I need to learn Mermaid or diagram syntax?");
  });

  it("shows the pricing loading spinner while plans load", () => {
    const html = render("/", <PricingSection />);
    expect(html).toContain("Pick the plan that fits your forge");
    expect(html).toContain("animate-spin");
  });
});

describe("PlanCard", () => {
  it("renders prices per cycle with a subscribe target", () => {
    const monthly = render("/pricing", <PlanCard plan={PLUS_PLAN} cycle="monthly" signedIn={false} />);
    expect(monthly).toContain("$19");
    expect(monthly).toContain("/month");
    expect(monthly).toContain("Most popular");

    const yearly = render("/pricing", <PlanCard plan={PLUS_PLAN} cycle="yearly" signedIn={true} />);
    expect(yearly).toContain("$190");
    expect(yearly).toContain("/year");
    expect(yearly).toContain("2 months free");
  });
});

describe("AuthPage", () => {
  it("renders register fields in register mode", () => {
    const html = render("/register", <AuthPage mode="register" />);
    expect(html).toContain("Create your account");
    expect(html).toContain('name="name"');
    expect(html).toContain("new-password");
    expect(html).toContain("Already have an account?");
  });

  it("renders sign-in fields in sign-in mode", () => {
    const html = render("/signin", <AuthPage mode="signin" />);
    expect(html).toContain("Welcome back");
    expect(html).not.toContain('name="name"');
    expect(html).toContain("New to SpecForge?");
  });
});

describe("CheckoutPage", () => {
  function renderCheckout(planKey: string): string {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    return renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/checkout/${planKey}`]}>
          <Routes>
            <Route path="/checkout/:planKey" element={<CheckoutPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  it("renders the loading spinner while session/plan data resolve", () => {
    const html = renderCheckout("plus");
    // Static render: queries have not resolved yet -> spinner, not content.
    expect(html).toContain("animate-spin");
  });

  it("renders a spinner (not an error) for unknown plans during static render", () => {
    const html = renderCheckout("does-not-exist");
    expect(html).toContain("animate-spin");
  });
});

describe("PublicShell", () => {
  it("renders navbar links, sign-in/get-started actions and footer", () => {
    const html = render("/", (
      <PublicShell>
        <p>content</p>
      </PublicShell>
    ));
    expect(html).toContain("SpecForge Studio");
    expect(html).toContain("Sign in");
    expect(html).toContain("Get started");
    expect(html).toContain("#pricing");
    expect(html).toContain("content");
  });

  it("renders the SVG brand logo (no SF letters)", () => {
    const html = render("/", (
      <PublicShell>
        <p>content</p>
      </PublicShell>
    ));
    expect(html).toContain('data-testid="brand-logo"');
    expect(html).toContain('aria-label="SpecForge Studio logo"');
  });

  it("renders the modern footer with product links, plan rows and back-to-top", () => {
    const html = render("/", (
      <PublicShell>
        <p>content</p>
      </PublicShell>
    ));
    expect(html).toContain("Product");
    expect(html).toContain("Get started");
    expect(html).toContain("Plans");
    expect(html).toContain("$19/mo");
    expect(html).toContain("$49/mo");
    expect(html).toContain("Back to top");
    expect(html).toContain("All rights reserved");
  });

  it("points section nav at /#anchors so they work from any route", () => {
    const html = render("/signin", (
      <PublicShell>
        <p>content</p>
      </PublicShell>
    ));
    expect(html).toContain('href="/#features"');
    expect(html).toContain('href="/#how-it-works"');
    expect(html).not.toContain('href="#features"');
  });
});

describe("WaveCanvas", () => {
  it("renders an aria-hidden canvas element", () => {
    const html = render("/", <WaveCanvas className="test-canvas" />);
    expect(html).toContain("<canvas");
    expect(html).toContain("aria-hidden=");
    expect(html).toContain("test-canvas");
  });
});
