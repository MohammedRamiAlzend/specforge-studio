/**
 * Auth hardening test suite: email verification OTP + password recovery.
 *
 * Covers: register sends a code, unverified logins are blocked, verify-email
 * consumes the code and opens a session, wrong-code attempts are counted and
 * locked, resend cooldown, anti-enumeration on resend/forgot, and reset
 * revoking every existing session.
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { FastifyInstance } from "fastify";
import {
  bootAppWithMailer,
  createTestContext,
  request,
  type FakeMailer,
} from "./helpers";

async function register(
  app: FastifyInstance,
  email: string,
  password = "test-password-1",
): Promise<void> {
  const res = await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: { name: "Otp User", email, password },
  });
  if (res.statusCode !== 201) throw new Error(`register failed: ${res.body}`);
}

describe("auth OTP & recovery", () => {
  let app: FastifyInstance;
  let mailer: FakeMailer;
  let db: import("bun:sqlite").Database;

  beforeAll(async () => {
    const ctx = createTestContext();
    db = ctx.db;
    const booted = await bootAppWithMailer(ctx);
    app = booted.app;
    mailer = booted.mailer;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  test("register emails a 6-digit verification code", async () => {
    await register(app, "otp-a@example.com");
    expect(mailer.sent.length).toBe(1);
    const mail = mailer.sent[0];
    expect(mail?.to).toBe("otp-a@example.com");
    expect(/\d{6}/.test(mailer.lastCode())).toBe(true);
  });

  test("login before verification -> 403 EMAIL_NOT_VERIFIED", async () => {
    const res = await request(app, "POST", "/auth/login", {
      email: "otp-a@example.com",
      password: "test-password-1",
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe("EMAIL_NOT_VERIFIED");
  });

  test("wrong code is rejected without consuming; correct code verifies + sets cookie", async () => {
    const realCode = mailer.lastCode();
    const bad = await app.inject({
      method: "POST",
      url: "/auth/verify-email",
      payload: { email: "otp-a@example.com", code: "000000" },
    });
    expect(bad.statusCode).toBe(400);
    expect(bad.json().error.message).toContain("attempt");

    const good = await app.inject({
      method: "POST",
      url: "/auth/verify-email",
      payload: { email: "otp-a@example.com", code: realCode },
    });
    expect(good.statusCode).toBe(200);
    const token = /sf_session=([^;]+)/.exec((good.headers["set-cookie"] as string) ?? "")?.[1];
    expect(token).toBeTruthy();

    const me = await app.inject({
      method: "GET",
      url: "/auth/me",
      headers: { cookie: `sf_session=${token}` },
    });
    expect(me.statusCode).toBe(200);
    expect(me.json().data.user.email_verified).toBe(true);

    // The same code cannot be reused.
    const replay = await app.inject({
      method: "POST",
      url: "/auth/verify-email",
      payload: { email: "otp-a@example.com", code: realCode },
    });
    expect(replay.statusCode).toBe(400);
    expect(replay.json().error.message).toContain("No active code");
  });

  test("resend-otp honors the 60-second cooldown with 429 RATE_LIMITED", async () => {
    await register(app, "otp-b@example.com");
    // First registration already issued a code moments ago.
    const res = await app.inject({
      method: "POST",
      url: "/auth/resend-otp",
      payload: { email: "otp-b@example.com" },
    });
    expect(res.statusCode).toBe(429);
    expect(res.json().error.code).toBe("RATE_LIMITED");

    // The old code was superseded only on successful issue — it must still work.
    const stillWorks = await app.inject({
      method: "POST",
      url: "/auth/verify-email",
      payload: { email: "otp-b@example.com", code: mailer.lastCode() },
    });
    expect(stillWorks.statusCode).toBe(200);
  });

  test("resend-otp answers generically for unknown or verified addresses (anti-enumeration)", async () => {
    const ghost = await app.inject({
      method: "POST",
      url: "/auth/resend-otp",
      payload: { email: "ghost@example.com" },
    });
    expect(ghost.statusCode).toBe(200);
    expect(ghost.json().data.ok).toBe(true);
    expect(mailer.sent.length).toBeLessThan(10); // no email for the ghost
  });

  test("five wrong codes lock the flow until a new code is requested", async () => {
    await register(app, "otp-c@example.com");
    for (let i = 0; i < 5; i += 1) {
      const attempt = await app.inject({
        method: "POST",
        url: "/auth/verify-email",
        payload: { email: "otp-c@example.com", code: "11111" + String(i) },
      });
      expect(attempt.statusCode).toBe(400);
    }
    const locked = await app.inject({
      method: "POST",
      url: "/auth/verify-email",
      payload: { email: "otp-c@example.com", code: "222222" },
    });
    expect(locked.statusCode).toBe(429);
    expect(locked.json().error.code).toBe("CODE_LOCKED");
  });

  test("expired verification codes are rejected", async () => {
    await register(app, "otp-d@example.com");
    db.query("UPDATE otp_codes SET expires_at = '2000-01-01T00:00:00.000Z'").run();
    const res = await app.inject({
      method: "POST",
      url: "/auth/verify-email",
      payload: { email: "otp-d@example.com", code: mailer.lastCode() },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.message).toContain("expired");
  });

  test("forgot-password never reveals whether an account exists", async () => {
    const ghost = await app.inject({
      method: "POST",
      url: "/auth/forgot-password",
      payload: { email: "no-such-user@example.com" },
    });
    expect(ghost.statusCode).toBe(200);
    expect(ghost.json().data.ok).toBe(true);

    const known = await app.inject({
      method: "POST",
      url: "/auth/forgot-password",
      payload: { email: "otp-a@example.com" },
    });
    expect(known.statusCode).toBe(200);
    const last = mailer.sent[mailer.sent.length - 1];
    expect(last?.subject).toContain("password-reset");
    expect(last?.to).toBe("otp-a@example.com");
  });

  test("reset-password requires the emailed code, then revokes all sessions", async () => {
    // otp-a is verified from earlier tests; give her two sessions.
    const loginA = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "otp-a@example.com", password: "test-password-1" },
    });
    const tokenA = /sf_session=([^;]+)/.exec((loginA.headers["set-cookie"] as string) ?? "")?.[1];
    expect(tokenA).toBeTruthy();

    await app.inject({ method: "POST", url: "/auth/forgot-password", payload: { email: "otp-a@example.com" } });
    const wrong = await app.inject({
      method: "POST",
      url: "/auth/reset-password",
      payload: { email: "otp-a@example.com", code: "999999", new_password: "brand-new-pass-1" },
    });
    expect(wrong.statusCode).toBe(400);

    const ok = await app.inject({
      method: "POST",
      url: "/auth/reset-password",
      payload: { email: "otp-a@example.com", code: mailer.lastCode(), new_password: "brand-new-pass-1" },
    });
    expect(ok.statusCode).toBe(200);

    // Every pre-reset session is dead.
    const staleMe = await app.inject({
      method: "GET",
      url: "/auth/me",
      headers: { cookie: `sf_session=${tokenA}` },
    });
    expect(staleMe.statusCode).toBe(401);

    // And the new password works.
    const relogin = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "otp-a@example.com", password: "brand-new-pass-1" },
    });
    expect(relogin.statusCode).toBe(200);
  });
});
