/**
 * Auth & billing test suite (Prompt 21).
 *
 * Covers the public landing flow end-to-end against an in-memory app:
 * plans seed/list, register, login, me, logout, session guards (401),
 * simulated checkout (Luhn + expiry validation), plan switching,
 * subscription retrieval and cancellation.
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { FastifyInstance } from "fastify";
import { bootAppWithMailer, createTestContext, registerVerifiedUser, request, type FakeMailer } from "./helpers";
import { seedAdminAccount } from "../src/modules/auth";

const GOOD_CARD = {
  name: "Ada Lovelace",
  number: "4242 4242 4242 4242", // Luhn-valid test number
  exp_month: 12,
  exp_year: 2099,
  cvc: "123",
};

describe("auth & billing (Prompt 21)", () => {
  let app: FastifyInstance;
  let mailer: FakeMailer;

  beforeAll(async () => {
    const ctx = createTestContext();
    const booted = await bootAppWithMailer(ctx);
    app = booted.app;
    mailer = booted.mailer;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  test("GET /plans lists the three seeded plans with prices and features", async () => {
    const res = await request(app, "GET", "/plans");
    expect(res.statusCode).toBe(200);
    const plans = res.json().data;
    expect(plans.map((p: { key: string }) => p.key)).toEqual(["free", "plus", "premium"]);
    const plus = plans[1];
    expect(plus.monthlyPriceCents).toBe(1900);
    expect(plus.yearlyPriceCents).toBe(19000);
    expect(plus.popular).toBe(true);
    expect(Array.isArray(plus.features)).toBe(true);
    expect(plus.features.length).toBeGreaterThan(3);
  });

  test("POST /auth/register creates a user, emails an OTP, and does NOT sign in", async () => {
    const before = mailer.sent.length;
    const res = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        name: "Ada Lovelace",
        email: "ada@example.com",
        password: "super-secret-9",
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json().data;
    expect(body.user.email).toBe("ada@example.com");
    expect(body.user.email_verified).toBe(false);
    expect(body.otp_sent).toBe(true);
    expect(body.user.password_hash).toBeUndefined();
    expect(res.headers["set-cookie"]).toBeUndefined();
    // Exactly one verification email went out with a 6-digit code.
    expect(mailer.sent.length).toBe(before + 1);
    expect(mailer.sent[mailer.sent.length - 1]?.to).toBe("ada@example.com");
    expect(/\d{6}/.test(mailer.lastCode())).toBe(true);
  });

  test("POST /auth/register rejects duplicate emails with 409", async () => {
    const dup = await request(app, "POST", "/auth/register", {
      name: "Clone",
      email: "ada@example.com",
      password: "super-secret-9",
    });
    expect(dup.statusCode).toBe(409);
    expect(dup.json().error.code).toBe("CONFLICT");
  });

  test("POST /auth/register rejects short passwords via VALIDATION_ERROR", async () => {
    const res = await request(app, "POST", "/auth/register", {
      name: "Weak",
      email: "weak@example.com",
      password: "short",
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("VALIDATION_ERROR");
  });

  test("POST /auth/register blocks email domains outside the trusted allowlist", async () => {
    const res = await request(app, "POST", "/auth/register", {
      name: "Spam Account",
      email: "spam@gmail.com",
      password: "safe-password",
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe("SIGNUP_DOMAIN_NOT_ALLOWED");
    expect(res.json().error.message).toContain("trusted organization email domains");
  });

  test("seedAdminAccount creates a verified global administrator with a hashed password", async () => {
    const ctx = createTestContext();
    const seeded = await seedAdminAccount(ctx.db);
    expect(seeded.email).toBe("admin@specforge.com");
    expect(seeded.email_verified).toBe(1);
    expect(seeded.is_admin).toBe(1);
    expect(seeded.password_hash).not.toBe("password123");
    const seededAgain = await seedAdminAccount(ctx.db);
    expect(seededAgain.id).toBe(seeded.id);
    expect(ctx.db.query("SELECT COUNT(*) AS count FROM users WHERE email = ?").get("admin@specforge.com")).toEqual({ count: 1 });
  });

  test("GET /auth/me without a session -> 401 UNAUTHORIZED", async () => {
    const res = await request(app, "GET", "/auth/me");
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe("UNAUTHORIZED");
  });

  test("register → verify → login → me round-trip resolves the user from the cookie", async () => {
    const reg = await request(app, "POST", "/auth/register", {
      name: "Grace Hopper",
      email: "grace@example.com",
      password: "compiler-queen",
    });
    expect(reg.statusCode).toBe(201);
    // Unverified accounts cannot log in yet.
    const blocked = await request(app, "POST", "/auth/login", {
      email: "grace@example.com",
      password: "compiler-queen",
    });
    expect(blocked.statusCode).toBe(403);
    expect(blocked.json().error.code).toBe("EMAIL_NOT_VERIFIED");

    await request(app, "POST", "/auth/verify-email", {
      email: "grace@example.com",
      code: mailer.lastCode(),
    });
    const raw = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "grace@example.com", password: "compiler-queen" },
    });
    const cookieHeader = (raw.headers["set-cookie"] as string | undefined) ?? "";
    const token = /sf_session=([^;]+)/.exec(cookieHeader)?.[1];
    expect(token).toBeTruthy();

    const me = await app.inject({
      method: "GET",
      url: "/auth/me",
      headers: { cookie: `sf_session=${token}` },
    });
    expect(me.statusCode).toBe(200);
    expect(me.json().data.user.email).toBe("grace@example.com");
  });

  test("PATCH /auth/me updates only the authenticated user's display name", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "grace@example.com", password: "compiler-queen" },
    });
    const token = /sf_session=([^;]+)/.exec((login.headers["set-cookie"] as string) ?? "")?.[1];
    expect(token).toBeTruthy();

    const update = await app.inject({
      method: "PATCH",
      url: "/auth/me",
      headers: { cookie: `sf_session=${token}` },
      payload: { name: "Grace Hopper · Product lead" },
    });
    expect(update.statusCode).toBe(200);
    expect(update.json().data.user.name).toBe("Grace Hopper · Product lead");
    expect(update.json().data.user.password_hash).toBeUndefined();

    const me = await app.inject({
      method: "GET",
      url: "/auth/me",
      headers: { cookie: `sf_session=${token}` },
    });
    expect(me.json().data.user.name).toBe("Grace Hopper · Product lead");
  });

  test("PATCH /auth/me without a session -> 401 UNAUTHORIZED", async () => {
    const res = await request(app, "PATCH", "/auth/me", { name: "Should fail" });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe("UNAUTHORIZED");
  });

  test("POST /auth/login with wrong password -> 401 INVALID_CREDENTIALS message", async () => {
    const res = await request(app, "POST", "/auth/login", {
      email: "grace@example.com",
      password: "totally-wrong",
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.message).toContain("Invalid email or password");
  });

  test("POST /auth/logout deletes the server-side session", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "grace@example.com", password: "compiler-queen" },
    });
    const token = /sf_session=([^;]+)/.exec((login.headers["set-cookie"] as string) ?? "")?.[1];
    expect(token).toBeTruthy();
    const logout = await app.inject({
      method: "POST",
      url: "/auth/logout",
      headers: { cookie: `sf_session=${token}` },
    });
    expect(logout.statusCode).toBe(200);
    // The old token must no longer authenticate.
    const me = await app.inject({
      method: "GET",
      url: "/auth/me",
      headers: { cookie: `sf_session=${token}` },
    });
    expect(me.statusCode).toBe(401);
  });

    describe("simulated checkout", () => {
    async function sessionFor(email: string): Promise<string> {
      return registerVerifiedUser(app, mailer, email);
    }

    test("checkout requires a session (401)", async () => {
      const res = await request(app, "POST", "/billing/checkout", {
        plan_key: "plus",
        cycle: "monthly",
        card: GOOD_CARD,
      });
      expect(res.statusCode).toBe(401);
    });

    test("valid checkout activates a subscription with last4 + period end", async () => {
      const token = await sessionFor("pay@example.com");
      const res = await app.inject({
        method: "POST",
        url: "/billing/checkout",
        headers: { cookie: `sf_session=${token}` },
        payload: { plan_key: "plus", cycle: "yearly", card: GOOD_CARD },
      });
      expect(res.statusCode).toBe(200);
      const sub = res.json().data;
      expect(sub.status).toBe("active");
      expect(sub.cardLast4).toBe("4242");
      expect(sub.plan.key).toBe("plus");
      expect(sub.cycle).toBe("yearly");
      expect(new Date(sub.currentPeriodEnd).getTime()).toBeGreaterThan(Date.now());

      const me = await app.inject({
        method: "GET",
        url: "/billing/subscription/me",
        headers: { cookie: `sf_session=${token}` },
      });
      expect(me.statusCode).toBe(200);
      expect(me.json().data.plan.key).toBe("plus");
    });

    test("Luhn-invalid card is rejected with BAD_REQUEST", async () => {
      const token = await sessionFor("luhn@example.com");
      const res = await app.inject({
        method: "POST",
        url: "/billing/checkout",
        headers: { cookie: `sf_session=${token}` },
        payload: {
          plan_key: "premium",
          cycle: "monthly",
          card: { ...GOOD_CARD, number: "4242 4242 4242 4241" },
        },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe("BAD_REQUEST");
      expect(res.json().error.message).toContain("validation");
    });

    test("expired card is rejected", async () => {
      const token = await sessionFor("expired@example.com");
      const res = await app.inject({
        method: "POST",
        url: "/billing/checkout",
        headers: { cookie: `sf_session=${token}` },
        payload: {
          plan_key: "premium",
          cycle: "monthly",
          card: { ...GOOD_CARD, exp_month: 1, exp_year: 2020 },
        },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error.message).toContain("expired");
    });

    test("switching plans cancels the previous active subscription", async () => {
      const token = await sessionFor("switch@example.com");
      const first = await app.inject({
        method: "POST",
        url: "/billing/checkout",
        headers: { cookie: `sf_session=${token}` },
        payload: { plan_key: "plus", cycle: "monthly", card: GOOD_CARD },
      });
      const second = await app.inject({
        method: "POST",
        url: "/billing/checkout",
        headers: { cookie: `sf_session=${token}` },
        payload: { plan_key: "premium", cycle: "yearly", card: GOOD_CARD },
      });
      expect(second.statusCode).toBe(200);
      expect(second.json().data.id).not.toBe(first.json().data.id);
      expect(second.json().data.plan.key).toBe("premium");

      const me = await app.inject({
        method: "GET",
        url: "/billing/subscription/me",
        headers: { cookie: `sf_session=${token}` },
      });
      expect(me.json().data.plan.key).toBe("premium");
    });

    test("DELETE /billing/subscription/me cancels; then me reports null", async () => {
      const token = await sessionFor("cancel@example.com");
      await app.inject({
        method: "POST",
        url: "/billing/checkout",
        headers: { cookie: `sf_session=${token}` },
        payload: { plan_key: "free", cycle: "monthly", card: GOOD_CARD },
      });
      const cancel = await app.inject({
        method: "DELETE",
        url: "/billing/subscription/me",
        headers: { cookie: `sf_session=${token}` },
      });
      expect(cancel.statusCode).toBe(200);
      const me = await app.inject({
        method: "GET",
        url: "/billing/subscription/me",
        headers: { cookie: `sf_session=${token}` },
      });
      expect(me.statusCode).toBe(200);
      expect(me.json().data).toBeNull();
    });
  });
});
