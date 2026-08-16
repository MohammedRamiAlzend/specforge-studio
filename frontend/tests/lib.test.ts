/**
 * Frontend shared-library tests (Prompt 12, frontend checks).
 * Pure functions: date formatting and status badge classes.
 */
import { describe, expect, it } from "bun:test";
import { formatDate, formatDateTime, titleCase } from "../src/shared/lib/format";
import { statusClass } from "../src/shared/lib/status";

describe("format", () => {
  it("renders em-dash for empty dates", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate(undefined)).toBe("—");
    expect(formatDateTime("")).toBe("—");
  });

  it("formats valid ISO dates deterministically", () => {
    const out = formatDate("2026-10-31T00:00:00Z");
    expect(out).toMatch(/\d{1,2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) 2026/);
    expect(formatDateTime("2026-10-31T14:30:00Z")).toContain("2026");
  });

  it("returns the raw value for unparseable dates", () => {
    expect(formatDate("not-a-date")).toBe("not-a-date");
  });

  it("title-cases snake_case labels", () => {
    expect(titleCase("needs_review")).toBe("Needs Review");
    expect(titleCase("in_progress")).toBe("In Progress");
  });
});

describe("statusClass", () => {
  it("maps known statuses to their token classes", () => {
    expect(statusClass("approved")).toContain("emerald");
    expect(statusClass("blocked")).toContain("rose");
    expect(statusClass("rejected")).toContain("rose");
    expect(statusClass("pending")).toContain("amber");
  });

  it("falls back to a neutral class for unknown statuses", () => {
    const fallback = statusClass("definitely-not-a-status");
    expect(fallback).toContain("slate");
  });
});
