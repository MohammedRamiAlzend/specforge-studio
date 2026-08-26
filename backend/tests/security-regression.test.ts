import { describe, expect, it } from "bun:test";
import { loadConfig } from "../src/config/index";
import { bootApp, createTestContext } from "./helpers";

describe("security response boundaries", () => {
  it("emits baseline browser security headers on liveness responses", async () => {
    const ctx = createTestContext();
    const app = await bootApp(ctx);
    const response = await app.inject({ method: "GET", url: "/healthz" });

    expect(response.statusCode).toBe(200);
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBe("DENY");
    expect(response.headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(response.headers["permissions-policy"]).toBe("camera=(), microphone=(), geolocation=()");
  });

  it("fails closed for unsafe production authentication configuration", () => {
    expect(() => loadConfig({
      NODE_ENV: "production",
      AUTH_REQUIRED: "false",
      COOKIE_SECURE: "false",
      CORS_ORIGIN: "https://studio.example.com",
      ADMIN_EMAILS: "admin@specforge.com",
    })).toThrow("AUTH_REQUIRED must remain true in production");

    expect(() => loadConfig({
      NODE_ENV: "production",
      AUTH_REQUIRED: "true",
      COOKIE_SECURE: "true",
      CORS_ORIGIN: "https://studio.example.com",
      ADMIN_EMAILS: "admin@specforge.com",
      LEONA_CREDENTIAL_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    })).not.toThrow();
  });

  it("only grants credentialed CORS to the exact configured origin", async () => {
    const ctx = createTestContext();
    ctx.config = { ...ctx.config, CORS_ORIGIN: "https://studio.example.com" };
    const app = await bootApp(ctx);

    const allowed = await app.inject({
      method: "OPTIONS",
      url: "/auth/me",
      headers: { origin: "https://studio.example.com" },
    });
    expect(allowed.statusCode).toBe(204);
    expect(allowed.headers["access-control-allow-origin"]).toBe("https://studio.example.com");
    expect(allowed.headers["access-control-allow-credentials"]).toBe("true");

    const rejected = await app.inject({
      method: "OPTIONS",
      url: "/auth/me",
      headers: { origin: "https://evil.example" },
    });
    expect(rejected.statusCode).toBe(204);
    expect(rejected.headers["access-control-allow-origin"]).toBeUndefined();
    expect(rejected.headers["access-control-allow-credentials"]).toBeUndefined();
  });
});
