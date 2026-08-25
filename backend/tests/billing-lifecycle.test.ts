/**
 * Billing lifecycle test suite (DEC-029).
 *
 * Covers the full simulated payment lifecycle: invoices recorded on every
 * checkout (including $0 Free activations), receipt emails for paid plans,
 * GET /billing/invoices/me history, Free-plan project-limit enforcement
 * (authenticated users only — anonymous callers keep unrestricted behavior),
 * paid-plan unlimited projects, computed period expiry, and cancellation.
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Database } from "bun:sqlite";
import type { FastifyInstance } from "fastify";
import {
  bootAppWithMailer,
  createTestContext,
  registerVerifiedUser,
  request,
  type FakeMailer,
} from "./helpers";

const CARD = {
  name: "Ada Lovelace",
  number: "4242 4242 4242 4242",
  exp_month: 12,
  exp_year: 2099,
  cvc: "123",
};

async function currentUserId(app: FastifyInstance, token: string): Promise<string> {
  const me = await app.inject({
    method: "GET",
    url: "/auth/me",
    headers: { cookie: `sf_session=${token}` },
  });
  return me.json().data.user.id as string;
}

describe("billing lifecycle (DEC-029)", () => {
  let app: FastifyInstance;
  let mailer: FakeMailer;
  let db: Database;

  beforeAll(async () => {
    const ctx = createTestContext();
    const booted = await bootAppWithMailer(ctx);
    app = booted.app;
    mailer = booted.mailer;
    db = ctx.db;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  test("paid checkout records an invoice and emails a receipt", async () => {
    const token = await registerVerifiedUser(app, mailer, `paid-${Date.now()}@example.com`);
    const sentBefore = mailer.sent.length;
    const res = await app.inject({
      method: "POST",
      url: "/billing/checkout",
      headers: { cookie: `sf_session=${token}` },
      payload: { plan_key: "plus", cycle: "monthly", card: CARD },
    });
    expect(res.statusCode).toBe(200);
    const sub = res.json().data;
    expect(sub.status).toBe("active");
    expect(sub.cardLast4).toBe("4242");

    // Exactly one receipt email with invoice details.
    expect(mailer.sent.length).toBe(sentBefore + 1);
    const receipt = mailer.sent[mailer.sent.length - 1]!;
    expect(receipt.subject).toContain("SpecForge receipt");
    expect(receipt.html).toContain("$19");
    expect(receipt.html).toContain("•••• 4242");
  });

  test("free activation records a $0 invoice and does NOT email a receipt", async () => {
    const token = await registerVerifiedUser(app, mailer, `free-${Date.now()}@example.com`);
    const sentBefore = mailer.sent.length;
    const direct = await app.inject({
      method: "POST",
      url: "/billing/checkout",
      headers: { cookie: `sf_session=${token}` },
      payload: { plan_key: "free", cycle: "monthly" },
    });
    expect(direct.statusCode).toBe(200);
    expect(mailer.sent.length).toBe(sentBefore); // no receipt for $0

    const history = await app.inject({
      method: "GET",
      url: "/billing/invoices/me",
      headers: { cookie: `sf_session=${token}` },
    });
    expect(history.statusCode).toBe(200);
    const invoices = history.json().data;
    expect(invoices.length).toBe(1);
    expect(invoices[0].amountCents).toBe(0);
    expect(invoices[0].planKey).toBe("free");
    expect(invoices[0].status).toBe("paid");
  });

  test("GET /billing/invoices/me requires a session and lists newest first", async () => {
    const anon = await request(app, "GET", "/billing/invoices/me");
    expect(anon.statusCode).toBe(401);

    const token = await registerVerifiedUser(app, mailer, `hist-${Date.now()}@example.com`);
    await app.inject({
      method: "POST",
      url: "/billing/checkout",
      headers: { cookie: `sf_session=${token}` },
      payload: { plan_key: "premium", cycle: "yearly", card: CARD },
    });
    await app.inject({
      method: "POST",
      url: "/billing/checkout",
      headers: { cookie: `sf_session=${token}` },
      payload: { plan_key: "plus", cycle: "monthly", card: CARD },
    });
    const res = await app.inject({
      method: "GET",
      url: "/billing/invoices/me",
      headers: { cookie: `sf_session=${token}` },
    });
    const invoices = res.json().data;
    expect(invoices.length).toBe(2);
    // Newest first: the later plus/monthly checkout on top.
    expect(invoices[0].planKey).toBe("plus");
    expect(invoices[0].cycle).toBe("monthly");
    expect(invoices[1].planKey).toBe("premium");
    expect(invoices[1].amountCents).toBe(49000);
    // Plan names resolve through the plans table.
    expect(invoices[0].planName).toBe("Plus");
  });

  test("Free plan is limited to one project; second creation returns 402 PLAN_LIMIT_REACHED", async () => {
    const token = await registerVerifiedUser(app, mailer, `limited-${Date.now()}@example.com`);
    const userId = await currentUserId(app, token);
    expect(userId.startsWith("USR-")).toBe(true);

    const first = await app.inject({
      method: "POST",
      url: "/projects",
      headers: { cookie: `sf_session=${token}` },
      payload: { name: "First project", type: "web", created_by: userId },
    });
    expect(first.statusCode).toBe(201);

    const second = await app.inject({
      method: "POST",
      url: "/projects",
      headers: { cookie: `sf_session=${token}` },
      payload: { name: "Second project", type: "web", created_by: userId },
    });
    expect(second.statusCode).toBe(402);
    expect(second.json().error.code).toBe("PLAN_LIMIT_REACHED");
    expect(second.json().error.details.limit).toBe(1);
    expect(second.json().error.details.upgradeTo).toBe("plus");
  });

  test("anonymous project creation keeps its historical unrestricted behavior", async () => {
    const res = await request(app, "POST", "/projects", {
      name: "Anonymous seed project",
      type: "api",
      created_by: "tester@internal",
    });
    expect(res.statusCode).toBe(201);
  });

  test("paid plan subscribers can create unlimited projects", async () => {
    const token = await registerVerifiedUser(app, mailer, `unl-${Date.now()}@example.com`);
    const sub = await app.inject({
      method: "POST",
      url: "/billing/checkout",
      headers: { cookie: `sf_session=${token}` },
      payload: { plan_key: "plus", cycle: "monthly", card: CARD },
    });
    expect(sub.statusCode).toBe(200);
    const userId = await currentUserId(app, token);

    for (const name of ["Project A", "Project B", "Project C"]) {
      const res = await app.inject({
        method: "POST",
        url: "/projects",
        headers: { cookie: `sf_session=${token}` },
        payload: { name, type: "web", created_by: userId },
      });
      expect(res.statusCode).toBe(201);
    }
  });

  test("a lapsed period reads as expired and re-applies Free limits", async () => {
    const token = await registerVerifiedUser(app, mailer, `exp-${Date.now()}@example.com`);
    await app.inject({
      method: "POST",
      url: "/billing/checkout",
      headers: { cookie: `sf_session=${token}` },
      payload: { plan_key: "plus", cycle: "monthly", card: CARD },
    });
    const userId = await currentUserId(app, token);

    // Simulate time passing: backdate the billing period.
    db.query("UPDATE subscriptions SET current_period_end = '2020-01-01T00:00:00.000Z' WHERE user_id = ?").run(
      userId,
    );

    const view = await app.inject({
      method: "GET",
      url: "/billing/subscription/me",
      headers: { cookie: `sf_session=${token}` },
    });
    expect(view.json().data.status).toBe("expired");

    // Expired Plus falls back to Free limits: one project max.
    const first = await app.inject({
      method: "POST",
      url: "/projects",
      headers: { cookie: `sf_session=${token}` },
      payload: { name: "Post-expiry project", type: "web", created_by: userId },
    });
    expect(first.statusCode).toBe(201);
    const second = await app.inject({
      method: "POST",
      url: "/projects",
      headers: { cookie: `sf_session=${token}` },
      payload: { name: "Over limit", type: "web", created_by: userId },
    });
    expect(second.statusCode).toBe(402);
    expect(second.json().error.code).toBe("PLAN_LIMIT_REACHED");
  });

  test("DELETE /billing/subscription/me cancels and clears the active subscription", async () => {
    const token = await registerVerifiedUser(app, mailer, `cancel-${Date.now()}@example.com`);
    await app.inject({
      method: "POST",
      url: "/billing/checkout",
      headers: { cookie: `sf_session=${token}` },
      payload: { plan_key: "premium", cycle: "monthly", card: CARD },
    });
    const cancel = await app.inject({
      method: "DELETE",
      url: "/billing/subscription/me",
      headers: { cookie: `sf_session=${token}` },
    });
    expect(cancel.statusCode).toBe(200);

    const direct = await app.inject({
      method: "GET",
      url: "/billing/subscription/me",
      headers: { cookie: `sf_session=${token}` },
    });
    expect(direct.json().data).toBeNull();
  });
});
