import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Deps } from "../types";
import { requireAdmin } from "./auth";
import { resolveSmtpConfig } from "../config/index";
import { logEvent } from "../utils/events";
import { badRequest, notFound } from "../utils/errors";

const statusSchema = z.enum(["active", "canceled"]);
const aiProviderUpdateSchema = z.object({
  provider: z.enum(["openai", "anthropic", "gemini"]).optional(),
  model: z.string().min(1).max(120).trim().optional(),
  secret_ref: z.string().max(240).trim().optional(),
  managed_enabled: z.boolean().optional(),
  monthly_generations: z.number().int().min(0).max(1_000_000).optional(),
  monthly_tokens: z.number().int().min(0).max(1_000_000_000).optional(),
  max_context_tokens: z.number().int().min(1000).max(2_000_000).optional(),
  max_output_tokens: z.number().int().min(100).max(500_000).optional(),
  estimated_input_cost_micros: z.number().int().min(0).max(1_000_000_000).optional(),
  estimated_output_cost_micros: z.number().int().min(0).max(1_000_000_000).optional(),
  hard_stop_micros: z.number().int().min(0).max(1_000_000_000_000).optional(),
  privacy_notice: z.string().min(20).max(2000).trim().optional(),
}).strict();

const planUpdateSchema = z.object({
  name: z.string().min(1).max(120).trim().optional(),
  tagline: z.string().max(240).trim().optional(),
  monthly_price_cents: z.number().int().min(0).max(10_000_000).optional(),
  yearly_price_cents: z.number().int().min(0).max(10_000_000).optional(),
  features: z.array(z.string().max(160)).max(30).optional(),
  popular: z.boolean().optional(),
  active: z.boolean().optional(),
  sort_order: z.number().int().min(0).max(999).optional(),
});

function backupStatus(config: Deps["config"]): { status: string; completed_at?: string; age_hours?: number } {
  try {
    const record = JSON.parse(readFileSync(resolve(config.BACKUP_STATUS_FILE), "utf8")) as { status?: string; completed_at?: string };
    if (record.status !== "ok" || !record.completed_at) return { status: "unknown" };
    const ageHours = Math.max(0, (Date.now() - new Date(record.completed_at).getTime()) / 3_600_000);
    return { status: ageHours <= 24 ? "ok" : "stale", completed_at: record.completed_at, age_hours: Math.round(ageHours * 10) / 10 };
  } catch {
    return { status: "not_reported" };
  }
}

function migrationVersion(db: Deps["db"]): string {
  const row = db.query("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations'").get() as { name: string } | undefined;
  if (!row) return "canonical-schema";
  const columns = db.query("PRAGMA table_info(schema_migrations)").all() as Array<{ name: string }>;
  const versionColumn = columns.find((column) => ["version", "id", "migration"].includes(column.name));
  if (!versionColumn) return "tracked";
  const latest = db.query(`SELECT MAX(${versionColumn.name.replaceAll('"', '""')}) AS version FROM schema_migrations`).get() as { version?: string | number } | undefined;
  return latest?.version === undefined || latest.version === null ? "tracked" : String(latest.version);
}

export function registerAdminRoutes(app: FastifyInstance, deps: Deps): void {
  const { db, config } = deps;

  app.get("/admin/overview", async (request) => {
    const actor = requireAdmin(db, request);
    db.query("SELECT 1").get();
    const smtp = resolveSmtpConfig(config);
    const backup = backupStatus(config);
    const users = db.query("SELECT COUNT(*) AS count FROM users").get() as { count: number };
    const verifiedUsers = db.query("SELECT COUNT(*) AS count FROM users WHERE email_verified = 1").get() as { count: number };
    const activeSubscriptions = db.query("SELECT COUNT(*) AS count FROM subscriptions WHERE status = 'active'").get() as { count: number };
    const invoices = db.query("SELECT COUNT(*) AS count FROM invoices").get() as { count: number };
    const projects = db.query("SELECT COUNT(*) AS count FROM projects").get() as { count: number };
    const audits = db.query("SELECT entity_type, entity_id, action, actor, created_at FROM event_log ORDER BY created_at DESC LIMIT 12").all();
    logEvent(db, { entityType: "admin", entityId: actor.id, action: "overview_viewed", actor: actor.id, actorType: "human" });
    return {
      data: {
        operations: {
          database: "ok",
          smtp: smtp.missing.length === 0 ? "configured" : "missing_configuration",
          smtp_missing: smtp.missing,
          migration_version: migrationVersion(db),
          backup: backup.status,
          backup_completed_at: backup.completed_at,
          backup_age_hours: backup.age_hours,
          checked_at: new Date().toISOString(),
        },
        counts: {
          users: users.count,
          verified_users: verifiedUsers.count,
          active_subscriptions: activeSubscriptions.count,
          invoices: invoices.count,
          projects: projects.count,
        },
        recent_audit_events: audits,
      },
    };
  });

  app.get("/admin/users", async (request) => {
    requireAdmin(db, request);
    const query = request.query as { search?: string; status?: string };
    const search = query.search?.trim();
    const status = query.status === "active" || query.status === "banned" ? query.status : undefined;
    const clauses: string[] = [];
    const args: string[] = [];
    if (search) { clauses.push("(email LIKE ? OR name LIKE ? OR id LIKE ?)"); const pattern = `%${search}%`; args.push(pattern, pattern, pattern); }
    if (status) { clauses.push("account_status = ?"); args.push(status); }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const users = db.query(`SELECT id, email, name, is_admin, account_status, ban_reason, banned_at, created_at FROM users ${where} ORDER BY created_at DESC LIMIT 200`).all(...args);
    return { data: users };
  });

  app.post("/admin/users/:id/ban", async (request) => {
    const actor = requireAdmin(db, request);
    const params = request.params as { id: string };
    const body = z.object({ reason: z.string().max(500).trim().default("Policy violation") }).parse(request.body ?? {});
    if (params.id === actor.id) throw badRequest("You cannot ban your own administrator account.");
    const target = db.query("SELECT id, is_admin, account_status FROM users WHERE id = ?").get(params.id) as { id: string; is_admin: number; account_status: string } | undefined;
    if (!target) throw notFound("User not found.");
    if (target.is_admin === 1) throw badRequest("Administrator accounts require a separate operator procedure.");
    db.query("UPDATE users SET account_status = 'banned', ban_reason = ?, banned_at = strftime('%Y-%m-%dT%H:%M:%fZ','now'), banned_by = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?").run(body.reason, actor.id, params.id);
    db.query("DELETE FROM sessions WHERE user_id = ?").run(params.id);
    logEvent(db, { entityType: "user", entityId: params.id, action: "admin_banned", actor: actor.id, actorType: "human", payload: { reason: body.reason } });
    return { data: { id: params.id, account_status: "banned" } };
  });

  app.post("/admin/users/:id/unban", async (request) => {
    const actor = requireAdmin(db, request);
    const params = request.params as { id: string };
    const target = db.query("SELECT id FROM users WHERE id = ?").get(params.id) as { id: string } | undefined;
    if (!target) throw notFound("User not found.");
    db.query("UPDATE users SET account_status = 'active', ban_reason = '', banned_at = NULL, banned_by = NULL, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?").run(params.id);
    logEvent(db, { entityType: "user", entityId: params.id, action: "admin_unbanned", actor: actor.id, actorType: "human" });
    return { data: { id: params.id, account_status: "active" } };
  });

  app.get("/admin/ai-provider", async (request) => {
    requireAdmin(db, request);
    db.query("INSERT OR IGNORE INTO ai_provider_settings (id) VALUES ('AI-0001')").run();
    const settings = db.query("SELECT id, provider, model, secret_ref, managed_enabled, monthly_generations, monthly_tokens, max_context_tokens, max_output_tokens, estimated_input_cost_micros, estimated_output_cost_micros, hard_stop_micros, privacy_notice, updated_by, updated_at FROM ai_provider_settings WHERE id = 'AI-0001'").get();
    return { data: settings };
  });

  app.patch("/admin/ai-provider", async (request) => {
    const actor = requireAdmin(db, request);
    db.query("INSERT OR IGNORE INTO ai_provider_settings (id) VALUES ('AI-0001')").run();
    const body = aiProviderUpdateSchema.parse(request.body);
    const fields: string[] = [];
    const values: Array<string | number> = [];
    for (const key of ["provider", "model", "secret_ref", "managed_enabled", "monthly_generations", "monthly_tokens", "max_context_tokens", "max_output_tokens", "estimated_input_cost_micros", "estimated_output_cost_micros", "hard_stop_micros", "privacy_notice"] as const) {
      const value = body[key];
      if (value === undefined) continue;
      fields.push(`${key} = ?`);
      values.push(typeof value === "boolean" ? (value ? 1 : 0) : value);
    }
    if (fields.length) {
      fields.push("updated_by = ?", "updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')");
      values.push(actor.id);
      db.query(`UPDATE ai_provider_settings SET ${fields.join(", ")} WHERE id = 'AI-0001'`).run(...values);
      logEvent(db, { entityType: "ai_provider_settings", entityId: "AI-0001", action: "admin_updated", actor: actor.id, actorType: "human", payload: { fields: Object.keys(body), managed_enabled: body.managed_enabled } });
    }
    const settings = db.query("SELECT id, provider, model, secret_ref, managed_enabled, monthly_generations, monthly_tokens, max_context_tokens, max_output_tokens, estimated_input_cost_micros, estimated_output_cost_micros, hard_stop_micros, privacy_notice, updated_by, updated_at FROM ai_provider_settings WHERE id = 'AI-0001'").get();
    return { data: settings };
  });

  app.get("/admin/plans", async (request) => {
    requireAdmin(db, request);
    const plans = db.query("SELECT id, key, name, tagline, monthly_price_cents, yearly_price_cents, features, popular, active, sort_order, updated_at FROM plans ORDER BY sort_order, id").all();
    return { data: plans };
  });

  app.patch("/admin/plans/:id", async (request) => {
    const actor = requireAdmin(db, request);
    const params = request.params as { id: string };
    const body = planUpdateSchema.parse(request.body);
    const existing = db.query("SELECT id FROM plans WHERE id = ?").get(params.id) as { id: string } | undefined;
    if (!existing) throw notFound("Plan not found.");
    const fields: string[] = [];
    const values: Array<string | number> = [];
    const updates: Record<string, unknown> = body;
    for (const key of ["name", "tagline", "monthly_price_cents", "yearly_price_cents", "features", "popular", "active", "sort_order"] as const) {
      if (updates[key] === undefined) continue;
      fields.push(`${key} = ?`);
      const value = updates[key];
      values.push(key === "features" ? JSON.stringify(value) : key === "popular" || key === "active" ? (value ? 1 : 0) : value as string | number);
    }
    if (fields.length === 0) return { data: { id: params.id, updated: false } };
    fields.push("updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')");
    db.query(`UPDATE plans SET ${fields.join(", ")} WHERE id = ?`).run(...values, params.id);
    logEvent(db, { entityType: "plan", entityId: params.id, action: "admin_updated", actor: actor.id, actorType: "human", payload: { fields: Object.keys(body) } });
    return { data: { id: params.id, updated: true } };
  });

  app.get("/admin/invoices", async (request) => {
    requireAdmin(db, request);
    const query = request.query as { search?: string };
    const search = query.search?.trim();
    const pattern = search ? `%${search}%` : undefined;
    const rows = pattern
      ? db.query("SELECT i.id, i.user_id, u.email, u.name, i.plan_key, i.cycle, i.amount_cents, i.card_last4, i.status, i.description, i.created_at FROM invoices i JOIN users u ON u.id = i.user_id WHERE u.email LIKE ? OR u.name LIKE ? OR i.id LIKE ? ORDER BY i.created_at DESC LIMIT 200").all(pattern, pattern, pattern)
      : db.query("SELECT i.id, i.user_id, u.email, u.name, i.plan_key, i.cycle, i.amount_cents, i.card_last4, i.status, i.description, i.created_at FROM invoices i JOIN users u ON u.id = i.user_id ORDER BY i.created_at DESC LIMIT 200").all();
    return { data: rows };
  });

  app.get("/admin/subscriptions", async (request) => {
    requireAdmin(db, request);
    const query = request.query as { status?: string; search?: string };
    const status = query.status ? statusSchema.parse(query.status) : undefined;
    const search = query.search?.trim();
    const clauses: string[] = [];
    const args: Array<string> = [];
    if (status) { clauses.push("s.status = ?"); args.push(status); }
    if (search) { clauses.push("(u.email LIKE ? OR u.name LIKE ? OR s.id LIKE ?)"); const pattern = `%${search}%`; args.push(pattern, pattern, pattern); }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const rows = db.query(`SELECT s.id, s.user_id, u.email, u.name, p.key AS plan_key, p.name AS plan_name, s.cycle, s.status, s.card_last4, s.started_at, s.current_period_end, s.canceled_at FROM subscriptions s JOIN users u ON u.id = s.user_id JOIN plans p ON p.id = s.plan_id ${where} ORDER BY s.started_at DESC LIMIT 200`).all(...args);
    return { data: rows };
  });

  app.post("/admin/subscriptions/:id/:action", async (request, reply) => {
    const actor = requireAdmin(db, request);
    const params = request.params as { id: string; action: string };
    if (params.action !== "cancel" && params.action !== "reactivate") return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Admin action not found." } });
    const existing = db.query("SELECT id, status FROM subscriptions WHERE id = ?").get(params.id) as { id: string; status: string } | undefined;
    if (!existing) throw notFound("Subscription not found.");
    const nextStatus = params.action === "cancel" ? "canceled" : "active";
    db.query("UPDATE subscriptions SET status = ?, canceled_at = CASE WHEN ? = 'canceled' THEN strftime('%Y-%m-%dT%H:%M:%fZ','now') ELSE NULL END WHERE id = ?").run(nextStatus, nextStatus, params.id);
    logEvent(db, { entityType: "subscription", entityId: params.id, action: `admin_${params.action}`, actor: actor.id, actorType: "human", payload: { previous_status: existing.status, next_status: nextStatus } });
    return { data: { id: params.id, status: nextStatus } };
  });
}
