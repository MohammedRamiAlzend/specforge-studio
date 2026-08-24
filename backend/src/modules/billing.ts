/**
 * Billing module (Prompt 21).
 *
 * Plans + subscriptions backing the landing pricing section and the
 * simulated checkout:
 *   * `seedBillingPlans` idempotently inserts the three built-in plans
 *     (free / plus / premium) with stable IDs PLAN-0001..0003 on boot;
 *   * checkout validates a mock card (Luhn + future expiry) and activates a
 *     subscription — no external payment provider (DEC-026, no-SaaS rule);
 *   * every endpoint except GET /plans requires a valid session cookie.
 *
 * All mutations are audit-logged (entity_type "plan" / "subscription").
 */
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import type { Database } from "bun:sqlite";
import type { Deps } from "../types";
import { allocateId } from "../utils/ids";
import { logEvent } from "../utils/events";
import { badRequest, notFound } from "../utils/errors";
import { requireUser, type UserRow } from "./auth";

// ---------------------------------------------------------------------------
// Row + view shapes
// ---------------------------------------------------------------------------

export interface PlanRow {
  id: string;
  key: string;
  name: string;
  tagline: string;
  monthly_price_cents: number;
  yearly_price_cents: number;
  features: string;
  popular: number;
  active: number;
  sort_order: number;
}

export interface SubscriptionRow {
  id: string;
  user_id: string;
  plan_id: string;
  cycle: "monthly" | "yearly";
  status: "active" | "canceled";
  card_last4: string;
  started_at: string;
  current_period_end: string;
  canceled_at: string | null;
}

export interface PlanView {
  id: string;
  key: string;
  name: string;
  tagline: string;
  monthlyPriceCents: number;
  yearlyPriceCents: number;
  features: string[];
  popular: boolean;
  sortOrder: number;
}

export interface SubscriptionView {
  id: string;
  cycle: SubscriptionRow["cycle"];
  status: SubscriptionRow["status"];
  cardLast4: string;
  startedAt: string;
  currentPeriodEnd: string;
  canceledAt: string | null;
  plan: PlanView;
}

type BillingCycle = "monthly" | "yearly";

const PLAN_SEEDS: Array<{
  id: string;
  key: string;
  name: string;
  tagline: string;
  monthly: number;
  yearly: number;
  features: string[];
  popular: boolean;
  sortOrder: number;
}> = [
  {
    id: "PLAN-0001",
    key: "free",
    name: "Free",
    tagline: "Forge your first specs.",
    monthly: 0,
    yearly: 0,
    features: [
      "1 project",
      "Visual modeler & diagrams",
      "Markdown workspace export",
      "Community templates",
    ],
    popular: false,
    sortOrder: 1,
  },
  {
    id: "PLAN-0002",
    key: "plus",
    name: "Plus",
    tagline: "For serious builders.",
    monthly: 1900,
    yearly: 19000,
    features: [
      "Unlimited projects",
      "Roadmap engine & agent task packs",
      "Governance & approvals",
      "Cross-project workspaces",
      "Priority email support",
    ],
    popular: true,
    sortOrder: 2,
  },
  {
    id: "PLAN-0003",
    key: "premium",
    name: "Premium",
    tagline: "For teams shipping at scale.",
    monthly: 4900,
    yearly: 49000,
    features: [
      "Everything in Plus",
      "Execution suite (team, issues, releases)",
      "Custom node palette & platform config",
      "Audit log & traceability reports",
      "Dedicated support channel",
    ],
    popular: false,
    sortOrder: 3,
  },
];

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

/** Idempotently seeds the three built-in plans; bumps the PLAN sequence. */
export function seedBillingPlans(db: Database): void {
  const insert = db.query(
    `INSERT OR IGNORE INTO plans
       (id, key, name, tagline, monthly_price_cents, yearly_price_cents,
        features, popular, active, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
  );
  for (const p of PLAN_SEEDS) {
    insert.run(
      p.id,
      p.key,
      p.name,
      p.tagline,
      p.monthly,
      p.yearly,
      JSON.stringify(p.features),
      p.popular ? 1 : 0,
      p.sortOrder,
    );
  }
  db.query(
    `INSERT INTO id_sequences (prefix, next_value, project_id)
     VALUES ('PLAN', ?, NULL)
     ON CONFLICT(prefix) DO UPDATE SET
       next_value = MAX(id_sequences.next_value, excluded.next_value),
       project_id = excluded.project_id`,
  ).run(PLAN_SEEDS.length + 1);
}

// ---------------------------------------------------------------------------
// Repository layer
// ---------------------------------------------------------------------------

function toPlanView(row: PlanRow): PlanView {
  let features: string[] = [];
  try {
    const parsed = JSON.parse(row.features);
    if (Array.isArray(parsed)) features = parsed.filter((f): f is string => typeof f === "string");
  } catch {
    features = [];
  }
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    tagline: row.tagline,
    monthlyPriceCents: row.monthly_price_cents,
    yearlyPriceCents: row.yearly_price_cents,
    features,
    popular: row.popular === 1,
    sortOrder: row.sort_order,
  };
}

export function listPlans(db: Database): PlanView[] {
  const rows = db
    .query("SELECT * FROM plans WHERE active = 1 ORDER BY sort_order, id")
    .all() as PlanRow[];
  return rows.map(toPlanView);
}

function getPlanByKey(db: Database, key: string): PlanRow | undefined {
  return db.query("SELECT * FROM plans WHERE key = ? AND active = 1").get(key) as
    | PlanRow
    | undefined;
}

function getActiveSubscription(db: Database, userId: string): SubscriptionRow | undefined {
  return db
    .query(
      "SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active' ORDER BY started_at DESC LIMIT 1",
    )
    .get(userId) as SubscriptionRow | undefined;
}

function getSubscriptionById(db: Database, id: string): SubscriptionRow {
  const row = db.query("SELECT * FROM subscriptions WHERE id = ?").get(id) as
    | SubscriptionRow
    | undefined;
  if (!row) throw notFound(`Subscription ${id} not found`);
  return row;
}

function subscriptionView(db: Database, sub: SubscriptionRow): SubscriptionView {
  const planRow = db.query("SELECT * FROM plans WHERE id = ?").get(sub.plan_id) as
    | PlanRow
    | undefined;
  if (!planRow) throw notFound(`Plan ${sub.plan_id} not found`);
  return {
    id: sub.id,
    cycle: sub.cycle,
    status: sub.status,
    cardLast4: sub.card_last4,
    startedAt: sub.started_at,
    currentPeriodEnd: sub.current_period_end,
    canceledAt: sub.canceled_at,
    plan: toPlanView(planRow),
  };
}

// ---------------------------------------------------------------------------
// Mock card validation
// ---------------------------------------------------------------------------

function luhnValid(digits: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let value = digits.charCodeAt(i) - 48;
    if (double) {
      value *= 2;
      if (value > 9) value -= 9;
    }
    sum += value;
    double = !double;
  }
  return sum % 10 === 0;
}

function validateMockCard(card: { name: string; number: string; exp_month: number; exp_year: number; cvc: string }): { last4: string } {
  const digits = card.number.replace(/[\s-]/g, "");
  if (!/^\d{12,19}$/.test(digits)) throw badRequest("Card number must be 12–19 digits.");
  if (!luhnValid(digits)) throw badRequest("Card number failed validation.");
  if (card.exp_month < 1 || card.exp_month > 12) throw badRequest("Expiry month must be 1–12.");
  const now = new Date();
  const expYear = card.exp_year < 100 ? 2000 + card.exp_year : card.exp_year;
  const expiry = new Date(expYear, card.exp_month, 0, 23, 59, 59);
  if (expiry < now) throw badRequest("Card is expired.");
  if (!/^\d{3,4}$/.test(card.cvc)) throw badRequest("CVC must be 3–4 digits.");
  return { last4: digits.slice(-4) };
}

// ---------------------------------------------------------------------------
// Service layer
// ---------------------------------------------------------------------------

const checkoutSchema = z.object({
  plan_key: z.enum(["free", "plus", "premium"]),
  cycle: z.enum(["monthly", "yearly"]),
  // The Free plan activates without a card; paid plans require one.
  card: z
    .object({
      name: z.string().min(1).max(200).trim(),
      number: z.string().min(1).max(32),
      exp_month: z.number().int(),
      exp_year: z.number().int(),
      cvc: z.string().min(3).max(4),
    })
    .optional(),
});

function checkout(db: Database, user: UserRow, input: z.infer<typeof checkoutSchema>): SubscriptionView {
  const plan = getPlanByKey(db, input.plan_key);
  if (!plan) throw notFound(`Plan "${input.plan_key}" not found`);
  const isFreePlan = plan.monthly_price_cents === 0 && plan.yearly_price_cents === 0;
  let last4 = "";
  if (input.card) {
    last4 = validateMockCard(input.card).last4;
  } else if (!isFreePlan) {
    throw badRequest("A card is required for paid plans.");
  }

  // Cancel any previous active subscription, then activate the new one.
  const previous = getActiveSubscription(db, user.id);
  if (previous) {
    db.query(
      "UPDATE subscriptions SET status = 'canceled', canceled_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?",
    ).run(previous.id);
    logEvent(db, {
      entityType: "subscription",
      entityId: previous.id,
      action: "replaced",
      actor: user.id,
      actorType: "human",
      payload: { newPlanKey: input.plan_key },
    });
  }

  const period =
    input.cycle === "monthly"
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

  const id = allocateId(db, "SUB");
  db.query(
    `INSERT INTO subscriptions (id, user_id, plan_id, cycle, status, card_last4, current_period_end)
     VALUES (?, ?, ?, ?, 'active', ?, ?)`,
  ).run(id, user.id, plan.id, input.cycle, last4, period.toISOString());
  logEvent(db, {
    entityType: "subscription",
    entityId: id,
    action: "created",
    toStatus: "active",
    actor: user.id,
    actorType: "human",
    payload: { plan_key: input.plan_key, cycle: input.cycle },
  });
  return subscriptionView(db, getSubscriptionById(db, id));
}

function cancelSubscription(db: Database, user: UserRow): void {
  const active = getActiveSubscription(db, user.id);
  if (!active) throw badRequest("No active subscription to cancel.");
  db.query(
    "UPDATE subscriptions SET status = 'canceled', canceled_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?",
  ).run(active.id);
  logEvent(db, {
    entityType: "subscription",
    entityId: active.id,
    action: "updated",
    fromStatus: "active",
    toStatus: "canceled",
    actor: user.id,
    actorType: "human",
  });
}

function currentSubscriptionView(db: Database, request: FastifyRequest): SubscriptionView | null {
  const user = requireUser(db, request);
  const active = getActiveSubscription(db, user.id);
  return active ? subscriptionView(db, active) : null;
}

// ---------------------------------------------------------------------------
// HTTP layer
// ---------------------------------------------------------------------------

export function registerBillingRoutes(app: FastifyInstance, deps: Deps): void {
  const { db } = deps;

  app.get("/plans", async () => {
    return { data: listPlans(db) };
  });

  app.post("/billing/checkout", async (request) => {
    const user = requireUser(db, request);
    const body = checkoutSchema.parse(request.body);
    return { data: checkout(db, user, body) };
  });

  app.get("/billing/subscription/me", async (request) => {
    return { data: currentSubscriptionView(db, request) };
  });

  app.delete("/billing/subscription/me", async (request) => {
    const user = requireUser(db, request);
    cancelSubscription(db, user);
    return { data: { ok: true } };
  });
}
