/**
 * Dashboard summary tests (DEC-030).
 *
 * GET /dashboard/summary is the aggregate backing the redesigned dashboard:
 * plan/quota awareness, attention counts, pending approvals and upcoming
 * milestones — all in one auth-required response.
 */
import { describe, expect, test } from "bun:test";
import type { FastifyInstance } from "fastify";
import {
  bootAppWithMailer,
  createTestContext,
  registerVerifiedUser,
  seedProject,
  seedRequirement,
} from "./helpers";

async function call(
  app: FastifyInstance,
  token: string | undefined,
  method: "GET" | "POST" | "PATCH",
  url: string,
  payload?: unknown,
) {
  const res = await app.inject({
    method,
    url,
    payload: payload as undefined,
    headers: token ? { cookie: `sf_session=${token}` } : undefined,
  });
  return { statusCode: res.statusCode, json: () => res.json() };
}

describe("dashboard summary", () => {
  test("requires an authenticated session", async () => {
    const ctx = createTestContext();
    const { app } = await bootAppWithMailer(ctx);
    const res = await call(app, undefined, "GET", "/dashboard/summary");
    expect(res.statusCode).toBe(401);
  });

  test("returns zeroed aggregates on a fresh workspace", async () => {
    const ctx = createTestContext();
    const { app, mailer } = await bootAppWithMailer(ctx);
    const token = await registerVerifiedUser(app, mailer, "dash-zero@test.local");
    const res = await call(app, token, "GET", "/dashboard/summary");
    expect(res.statusCode).toBe(200);
    const body = res.json().data;
    expect(body.projects.total).toBe(0);
    expect(body.quota).toEqual({ used: 0, limit: 1, plan_key: "free" });
    expect(body.subscription.plan_key).toBe("free");
    expect(body.tasks).toEqual({ open: 0, in_progress: 0, blocked: 0, done: 0, cancelled: 0 });
    expect(body.blocked_tasks).toEqual([]);
    expect(body.issues).toEqual({ open: 0, critical_open: 0 });
    expect(body.pending_approvals).toEqual([]);
    expect(body.upcoming_milestones).toEqual([]);
  });

  test("aggregates attention data across projects", async () => {
    const ctx = createTestContext();
    const { app, mailer } = await bootAppWithMailer(ctx);
    const token = await registerVerifiedUser(app, mailer, "dash-data@test.local");

    const projectId = await seedProject(app);
    const reqId = await seedRequirement(app, projectId);

    // One open task + one blocked task.
    const t1 = await app.inject({
      method: "POST",
      url: "/tasks",
      payload: {
        project_id: projectId,
        title: "Open work item",
        objective: "Stay in the open column.",
        definition_of_done: "It is done.",
      },
    });
    expect(t1.statusCode).toBe(201);
    const t2 = await app.inject({
      method: "POST",
      url: "/tasks",
      payload: {
        project_id: projectId,
        title: "Stuck migration",
        priority: "high",
        objective: "Unblock the release.",
        definition_of_done: "Migration runs clean.",
      },
    });
    expect(t2.statusCode).toBe(201);
    const blocked = await app.inject({
      method: "PATCH",
      url: `/tasks/${t2.json().data.id}`,
      payload: { status: "blocked" },
    });
    expect(blocked.statusCode).toBe(200);

    // One critical open issue.
    const issue = await app.inject({
      method: "POST",
      url: "/issues",
      payload: {
        project_id: projectId,
        kind: "bug",
        severity: "critical",
        title: "Checkout double-charges cards",
        description: "Race between retry and idempotency key.",
        created_by: "qa@test.local",
      },
    });
    expect(issue.statusCode).toBe(201);

    // Milestones: one upcoming, one long past — only the future one counts.
    ctx.db
      .query(
        "INSERT INTO milestones (id, project_id, name, due_date, description, gate_criteria, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .run("MS-0001", projectId, "Beta gate", "2099-01-15", "", "", "planned");
    ctx.db
      .query(
        "INSERT INTO milestones (id, project_id, name, due_date, description, gate_criteria, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .run("MS-0002", projectId, "Ancient gate", "2020-01-01", "", "", "planned");

    // A pending approval.
    const apr = await app.inject({
      method: "POST",
      url: "/approvals",
      payload: {
        project_id: projectId,
        artifact_type: "requirement",
        artifact_id: reqId,
        approver_role: "product_owner",
      },
    });
    expect(apr.statusCode).toBe(201);

    const res = await call(app, token, "GET", "/dashboard/summary");
    expect(res.statusCode).toBe(200);
    const body = res.json().data;

    expect(body.projects.total).toBe(1);
    expect(body.projects.by_status.draft).toBe(1);
    expect(body.tasks.open).toBe(1);
    expect(body.tasks.blocked).toBe(1);
    expect(body.blocked_tasks).toHaveLength(1);
    expect(body.blocked_tasks[0]).toMatchObject({ title: "Stuck migration", project_name: "Test app" });
    expect(body.issues.critical_open).toBe(1);
    expect(body.critical_issues[0]).toMatchObject({ severity: "critical", project_name: "Test app" });
    expect(body.pending_approvals).toHaveLength(1);
    expect(body.pending_approvals[0].artifact_id).toBe(reqId);
    expect(body.upcoming_milestones).toHaveLength(1);
    expect(body.upcoming_milestones[0]).toMatchObject({ id: "MS-0001", due_date: "2099-01-15" });

    // The global activity feed now surfaces pending approvals too (DEC-030).
    const feed = await call(app, undefined, "GET", "/activity?limit=50");
    expect(feed.statusCode).toBe(200);
    const approvalRows = feed.json().data.filter((row: { entity_type: string }) => row.entity_type === "approval");
    expect(approvalRows.length).toBeGreaterThanOrEqual(1);
    expect(approvalRows.some((row: { pending?: boolean }) => row.pending === true)).toBe(true);
  });

  test("quota reflects paid plans as unlimited", async () => {
    const ctx = createTestContext();
    const { app, mailer } = await bootAppWithMailer(ctx);
    const token = await registerVerifiedUser(app, mailer, "dash-paid@test.local");

    const checkout = await call(app, token, "POST", "/billing/checkout", {
      plan_key: "plus",
      cycle: "monthly",
      card: { name: "Test User", number: "4242 4242 4242 4242", exp_month: 12, exp_year: 2030, cvc: "123" },
    });
    expect(checkout.statusCode).toBe(200);

    const res = await call(app, token, "GET", "/dashboard/summary");
    const body = res.json().data;
    expect(body.quota.limit).toBeNull();
    expect(body.quota.plan_key).toBe("plus");
    expect(body.subscription.status).toBe("active");
    expect(body.subscription.card_last4).toBe("4242");
  });
});
