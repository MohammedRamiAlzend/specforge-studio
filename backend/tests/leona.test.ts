import { describe, expect, it } from "bun:test";
import { bootAppWithMailer, createTestContext, registerVerifiedUser } from "./helpers";

describe("Leona provider connections", () => {
  it("stores an encrypted BYOK connection and never returns the raw key", async () => {
    const ctx = createTestContext();
    ctx.config.AUTH_REQUIRED = true;
    ctx.config.LEONA_CREDENTIAL_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const { app, mailer } = await bootAppWithMailer(ctx);
    const token = await registerVerifiedUser(app, mailer, "leona-owner@test.local");
    const headers = { cookie: `sf_session=${token}` };

    const created = await app.inject({
      method: "POST",
      url: "/leona/providers",
      headers,
      payload: { provider: "openai", model: "gpt-5-mini", api_key: "sk-test-secret-123456" },
    });
    expect(created.statusCode).toBe(201);
    expect(created.body).not.toContain("sk-test-secret-123456");
    expect(created.json().data.key_last4).toBe("3456");

    const stored = ctx.db.query("SELECT encrypted_key, iv, auth_tag, key_last4 FROM leona_provider_connections").get() as { encrypted_key: string; iv: string; auth_tag: string; key_last4: string };
    expect(stored.encrypted_key).not.toContain("sk-test-secret-123456");
    expect(stored.iv.length).toBeGreaterThan(0);
    expect(stored.auth_tag.length).toBeGreaterThan(0);
    expect(stored.key_last4).toBe("3456");

    const listed = await app.inject({ method: "GET", url: "/leona/providers", headers });
    expect(listed.statusCode).toBe(200);
    expect(listed.body).not.toContain("sk-test-secret-123456");
    expect(listed.json().data[0].status).toBe("active");

    const id = created.json().data.id as string;
    const revoked = await app.inject({ method: "DELETE", url: `/leona/providers/${id}`, headers });
    expect(revoked.statusCode).toBe(200);
    expect(revoked.json().data.ok).toBe(true);
  });

  it("fails closed when credential encryption is not configured", async () => {
    const ctx = createTestContext();
    ctx.config.AUTH_REQUIRED = true;
    const { app, mailer } = await bootAppWithMailer(ctx);
    const token = await registerVerifiedUser(app, mailer, "leona-no-key@test.local");
    const response = await app.inject({
      method: "POST",
      url: "/leona/providers",
      headers: { cookie: `sf_session=${token}` },
      payload: { provider: "openai", api_key: "sk-test-secret-123456" },
    });
    expect(response.statusCode).toBe(503);
    expect(response.body).not.toContain("sk-test-secret-123456");
  });
});
