/**
 * Frontend API client tests (Prompt 12: export actions + error states).
 * Verifies the { data } / { error } envelope handling used by every entity
 * hook, including the docs export (generate/delete) paths, with a stubbed
 * fetch — no network.
 */
import { afterEach, describe, expect, it } from "bun:test";
import { ApiError, api, errorMessage } from "../src/shared/api/client";

const realFetch = globalThis.fetch;

function stubFetch(handler: (url: string, init?: RequestInit) => Response) {
  globalThis.fetch = ((url: unknown, init?: RequestInit) => Promise.resolve(handler(String(url), init))) as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("api() success path", () => {
  it("unwraps the data envelope", async () => {
    stubFetch((url, init) => {
      expect(url).toContain("/docs/exports?project=PRJ-0001");
      expect(init?.method).toBeUndefined();
      return new Response(JSON.stringify({ data: [{ id: "DOCS-0001" }] }), { status: 200 });
    });
    const data = await api<{ id: string }[]>("/docs/exports?project=PRJ-0001");
    expect(data[0]?.id).toBe("DOCS-0001");
  });

  it("sends JSON bodies for mutations (generate export action)", async () => {
    stubFetch((url, init) => {
      expect(url).toContain("/docs/generate");
      expect(init?.method).toBe("POST");
      expect(init?.body).toBe(JSON.stringify({ project_id: "PRJ-0001" }));
      return new Response(JSON.stringify({ data: { id: "DOCS-0002", project_id: "PRJ-0001" } }), { status: 201 });
    });
    const data = await api<{ id: string; project_id: string }>("/docs/generate", {
      method: "POST",
      body: JSON.stringify({ project_id: "PRJ-0001" }),
    });
    expect(data.id).toBe("DOCS-0002");
  });

  it("supports DELETE (delete export action)", async () => {
    stubFetch((url, init) => {
      expect(url).toContain("/docs/exports/DOCS-0001");
      expect(init?.method).toBe("DELETE");
      return new Response(JSON.stringify({ data: null }), { status: 204 });
    });
    // A 204 envelope carries data: null.
    await expect(api<null>("/docs/exports/DOCS-0001", { method: "DELETE" })).resolves.toBeNull();
  });
});

describe("api() error path", () => {
  it("throws ApiError with status + code and a clear message", async () => {
    stubFetch(() =>
      new Response(JSON.stringify({ error: { code: "NOT_FOUND", message: "Project PRJ-9999 not found" } }), {
        status: 404,
      }),
    );
    try {
      await api("/projects/PRJ-9999");
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiError = err as ApiError;
      expect(apiError.status).toBe(404);
      expect(apiError.code).toBe("NOT_FOUND");
      expect(apiError.message).toBe("Project PRJ-9999 not found");
    }
  });

  it("falls back to a generic code when the error envelope is missing", async () => {
    stubFetch(() => new Response("boom", { status: 500 }));
    try {
      await api("/projects");
      expect.unreachable("should have thrown");
    } catch (err) {
      expect((err as ApiError).status).toBe(500);
      expect((err as ApiError).code).toBe("INTERNAL_ERROR");
    }
  });
});

describe("errorMessage", () => {
  it("prefers the server message for ApiError and handles unknown errors", () => {
    expect(errorMessage(new ApiError(400, "VALIDATION_ERROR", "Bad request"))).toBe("Bad request");
    expect(errorMessage(new Error("boom"))).toBe("boom");
    expect(errorMessage("weird")).toBe("Unexpected error");
  });
});
