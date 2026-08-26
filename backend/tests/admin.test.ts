import { describe, expect, it } from "bun:test";
import { buildApp } from "../src/app";
import { openDatabase } from "../src/db/index";
import { TEST_CONFIG, FakeMailer } from "./helpers";

async function createFixture() {
  const db = openDatabase(":memory:");
  const adminHash = await Bun.password.hash("password123");
  const userHash = await Bun.password.hash("password123");
  db.query("INSERT INTO users (id, email, name, password_hash, email_verified, is_admin) VALUES (?, ?, ?, ?, 1, 1)").run("USR-0001", "admin@test.local", "Admin User", adminHash);
  db.query("INSERT INTO users (id, email, name, password_hash, email_verified, is_admin) VALUES (?, ?, ?, ?, 1, 0)").run("USR-0002", "user@test.local", "Normal User", userHash);
  const app = await buildApp({ config: { ...TEST_CONFIG, AUTH_REQUIRED: true }, db, mailer: new FakeMailer() });
  return { app, db };
}

async function login(app: Awaited<ReturnType<typeof buildApp>>, email: string) {
  const response = await app.inject({ method: "POST", url: "/auth/login", payload: { email, password: "password123" } });
  expect(response.statusCode).toBe(200);
  return response.headers["set-cookie"] as string;
}

describe("admin monitoring", () => {
  it("requires a global administrator and never returns secret fields", async () => {
    const { app } = await createFixture();
    const adminCookie = await login(app, "admin@test.local");
    const response = await app.inject({ method: "GET", url: "/admin/overview", headers: { cookie: adminCookie } });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data.counts.users).toBe(2);
    expect(body.data.operations.database).toBe("ok");
    expect(JSON.stringify(body)).not.toContain("password_hash");
    expect(JSON.stringify(body)).not.toContain("password123");
    expect(JSON.stringify(body)).not.toContain("SMTP_PASS");
  });

  it("denies normal users and anonymous requests", async () => {
    const { app } = await createFixture();
    const anonymous = await app.inject({ method: "GET", url: "/admin/overview" });
    expect(anonymous.statusCode).toBe(401);
    const userCookie = await login(app, "user@test.local");
    const normalUser = await app.inject({ method: "GET", url: "/admin/overview", headers: { cookie: userCookie } });
    expect(normalUser.statusCode).toBe(403);
  });

  it("allows an administrator to cancel and reactivate a subscription with audit logging", async () => {
    const { app, db } = await createFixture();
    db.query("INSERT INTO subscriptions (id, user_id, plan_id, cycle, status, current_period_end) VALUES (?, ?, ?, ?, ?, ?)").run("SUB-0001", "USR-0002", "PLAN-0001", "monthly", "active", "2099-01-01T00:00:00.000Z");
    const adminCookie = await login(app, "admin@test.local");
    const canceled = await app.inject({ method: "POST", url: "/admin/subscriptions/SUB-0001/cancel", headers: { cookie: adminCookie } });
    expect(canceled.statusCode).toBe(200);
    expect(canceled.json().data.status).toBe("canceled");
    const reactivated = await app.inject({ method: "POST", url: "/admin/subscriptions/SUB-0001/reactivate", headers: { cookie: adminCookie } });
    expect(reactivated.statusCode).toBe(200);
    expect(reactivated.json().data.status).toBe("active");
    const audit = db.query("SELECT action FROM event_log WHERE entity_id = ? ORDER BY created_at ASC").all("SUB-0001") as Array<{ action: string }>;
    expect(audit.map((entry) => entry.action)).toEqual(["admin_cancel", "admin_reactivate"]);
  });
});
