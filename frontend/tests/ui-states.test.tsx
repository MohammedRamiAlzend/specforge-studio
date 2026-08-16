/**
 * Frontend UI-state tests (Prompt 12: loading and error states).
 * Renders shared state components with react-dom/server — no DOM or new
 * dependencies required — and asserts their loading/error presentation.
 */
import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ErrorState, EmptyState } from "../src/shared/ui/States";
import { Spinner } from "../src/shared/ui/Spinner";

describe("EmptyState", () => {
  it("renders the title and hint", () => {
    const html = renderToStaticMarkup(
      <EmptyState title="No workspace generated yet" hint="Generate the full Markdown workspace." />,
    );
    expect(html).toContain("No workspace generated yet");
    expect(html).toContain("Generate the full Markdown workspace.");
  });
});

describe("ErrorState", () => {
  it("renders a clear error message", () => {
    const html = renderToStaticMarkup(<ErrorState message="Failed to load exports" />);
    expect(html).toContain("Something went wrong");
    expect(html).toContain("Failed to load exports");
  });

  it("renders a retry action when provided", () => {
    const html = renderToStaticMarkup(<ErrorState message="boom" onRetry={() => undefined} />);
    expect(html).toContain("Try again");
  });
});

describe("Spinner", () => {
  it("renders a loading indicator with configurable size classes", () => {
    const html = renderToStaticMarkup(<Spinner className="h-5 w-5 text-slate-400" />);
    expect(html).toContain("h-5 w-5");
    expect(html).toContain("animate-spin");
  });
});
