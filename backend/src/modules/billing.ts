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
import { badRequest, notFound, planLimitReached } from "../utils/errors";
import { emailShell, requireUser, type UserRow } from "./auth";

/** Projects a Free-plan user may have active at once (DEC-029). */
export const FREE_PROJECT_LIMIT = 1;

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

export interface InvoiceRow {
  id: string;
  user_id: string;
  subscription_id: string;
  plan_key: string;
  cycle: "monthly" | "yearly";
  amount_cents: number;
  card_last4: string;
  status: "paid" | "refunded";
  description: string;
  created_at: string;
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
  /** Effective status: a lapsed period reads as "expired" (computed). */
  status: "active" | "canceled" | "expired";
  cardLast4: string;
  startedAt: string;
  currentPeriodEnd: string;
  canceledAt: string | null;
  plan: PlanView;
}

export interface InvoiceView {
  id: string;
  planKey: string;
  planName: string;
  cycle: InvoiceRow["cycle"];
  amountCents: number;
  cardLast4: string;
  status: InvoiceRow["status"];
  description: string;
  createdAt: string;
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

/**
 * The user's active subscription whose billing period has not lapsed.
 * Expiry is COMPUTED: rows keep physical status 'active' but a
 * current_period_end in the past no longer counts (DEC-029).
 */
function getActiveSubscription(db: Database, userId: string): SubscriptionRow | undefined {
  return db
    .query(
      `SELECT * FROM subscriptions
       WHERE user_id = ? AND status = 'active' AND current_period_end > strftime('%Y-%m-%dT%H:%M:%fZ','now')
       ORDER BY started_at DESC LIMIT 1`,
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
  // Effective status: physically-active rows whose period already ended read
  // as "expired" so the UI can show a renewal prompt.
  const lapsed =
    sub.status === "active" && sub.current_period_end <= new Date().toISOString();
  return {
    id: sub.id,
    cycle: sub.cycle,
    status: lapsed ? "expired" : sub.status,
    cardLast4: sub.card_last4,
    startedAt: sub.started_at,
    currentPeriodEnd: sub.current_period_end,
    canceledAt: sub.canceled_at,
    plan: toPlanView(planRow),
  };
}

// ---------------------------------------------------------------------------
// Invoices (billing lifecycle, DEC-029)
// ---------------------------------------------------------------------------

function toInvoiceView(row: InvoiceRow, planName: string): InvoiceView {
  return {
    id: row.id,
    planKey: row.plan_key,
    planName,
    cycle: row.cycle,
    amountCents: row.amount_cents,
    cardLast4: row.card_last4,
    status: row.status,
    description: row.description,
    createdAt: row.created_at,
  };
}

/** Newest-first billing history for one user. */
export function listInvoices(db: Database, userId: string): InvoiceView[] {
  const rows = db
    .query(
      `SELECT i.*, p.name AS plan_name FROM invoices i
       LEFT JOIN plans p ON p.key = i.plan_key
       WHERE i.user_id = ? ORDER BY i.created_at DESC, i.id DESC`,
    )
    .all(userId) as Array<InvoiceRow & { plan_name: string | null }>;
  return rows.map((row) => toInvoiceView(row, row.plan_name ?? row.plan_key));
}

/**
 * Effective plan key for enforcement: the active unexpired subscription's
 * plan, otherwise "free". Used by the project-allowance check.
 */
export function getEffectivePlanKey(db: Database, userId: string): "free" | "plus" | "premium" {
  const active = getActiveSubscription(db, userId);
  if (!active) return "free";
  const planRow = db.query("SELECT key FROM plans WHERE id = ?").get(active.plan_id) as
    | { key: string }
    | undefined;
  return planRow?.key === "plus" || planRow?.key === "premium" ? planRow.key : "free";
}

export interface SubscriptionSummary {
  plan_key: "free" | "plus" | "premium";
  status: "active" | "expired";
  cycle: BillingCycle;
  current_period_end: string;
  card_last4: string;
}

/**
 * Compact subscription state for dashboard widgets (DEC-030). Mirrors the
 * enforcement semantics of getEffectivePlanKey: a lapsed paid period reads as
 * status "expired" with the effective plan reverted to "free".
 *
 * Uses a single JOIN query + JS expiry check. Both getEffectivePlanKey (which
 * uses getActiveSubscription with SQL-level expiry) and this function agree
 * on the effective plan key — the only difference is that this function also
 * returns the "expired" status for the dashboard banner.
 */
export function getSubscriptionSummary(db: Database, userId: string): SubscriptionSummary {
  const row = db
    .query(
      `SELECT s.*, p.key AS plan_key FROM subscriptions s
       LEFT JOIN plans p ON p.id = s.plan_id
       WHERE s.user_id = ? AND s.status = 'active'
       ORDER BY s.started_at DESC LIMIT 1`,
    )
    .get(userId) as (SubscriptionRow & { plan_key: string | null }) | undefined;
  if (!row) {
    return { plan_key: "free", status: "active", cycle: "monthly", current_period_end: "", card_last4: "" };
  }
  const planKey = row.plan_key === "plus" || row.plan_key === "premium" ? row.plan_key : "free";
  const expired = row.current_period_end
    ? new Date(row.current_period_end).getTime() < Date.now()
    : false;
  return {
    plan_key: expired ? "free" : planKey,
    status: expired ? "expired" : "active",
    cycle: row.cycle,
    current_period_end: row.current_period_end ?? "",
    card_last4: row.card_last4 ?? "",
  };
}

/**
 * Enforces the Free-plan project allowance. Paid plans are unlimited.
 * Called from POST /projects only when a valid session exists — anonymous
 * callers (tests, seeds) keep their historical unrestricted behavior.
 */
export function assertProjectAllowance(db: Database, user: UserRow): void {
  if (getEffectivePlanKey(db, user.id) !== "free") return;
  const count = db
    .query("SELECT COUNT(*) AS n FROM projects WHERE created_by = ?")
    .get(user.id) as { n: number };
  if (count.n >= FREE_PROJECT_LIMIT) {
    throw planLimitReached(
      `The Free plan includes ${FREE_PROJECT_LIMIT} project. Upgrade to Plus for unlimited projects.`,
      { limit: FREE_PROJECT_LIMIT, plan: "free", upgradeTo: "plus" },
    );
  }
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

/** Branded receipt for a completed checkout (paid plans only). */
function receiptEmail(input: {
  name: string;
  planName: string;
  cycle: BillingCycle;
  amountCents: number;
  cardLast4: string;
  invoiceId: string;
  periodEnd: string;
}): { subject: string; text: string; html: string } {
  const amount = `$${(input.amountCents / 100).toFixed(2)}`;
  const shell = emailShell(
    "Your SpecForge receipt",
    `<p>Hi ${input.name}, thanks for your payment!</p>
     <table style="width:100%;font-size:13px;margin:16px 0;border-collapse:collapse">
       <tr><td style="color:#64748b;padding:4px 0">Plan</td><td style="text-align:right;font-weight:600">${input.planName} (${input.cycle})</td></tr>
       <tr><td style="color:#64748b;padding:4px 0">Amount</td><td style="text-align:right;font-weight:700">${amount}</td></tr>
       <tr><td style="color:#64748b;padding:4px 0">Card</td><td style="text-align:right">•••• ${input.cardLast4}</td></tr>
       <tr><td style="color:#64748b;padding:4px 0">Invoice</td><td style="text-align:right;font-family:monospace">${input.invoiceId}</td></tr>
       <tr><td style="color:#64748b;padding:4px 0">Renews on</td><td style="text-align:right">${input.periodEnd.slice(0, 10)}</td></tr>
     </table>
     <p>Manage your subscription anytime from Settings → Billing.</p>`,
  );
  return { subject: `SpecForge receipt ${input.invoiceId} — ${amount}`, ...shell };
}

async function checkout(db: Database, mailer: Deps["mailer"], user: UserRow, input: z.infer<typeof checkoutSchema>): Promise<SubscriptionView> {
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

  // Invoice for the billing-history UI. Free activations record a $0 invoice
  // so the account's history is complete from day one (DEC-029).
  const amountCents =
    input.cycle === "yearly" ? plan.yearly_price_cents : plan.monthly_price_cents;
  const invoiceId = allocateId(db, "INV");
  const description = isFreePlan
    ? `${plan.name} plan activation`
    : `${plan.name} plan — ${input.cycle} billing`;
  db.query(
    `INSERT INTO invoices (id, user_id, subscription_id, plan_key, cycle, amount_cents, card_last4, status, description)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'paid', ?)`,
  ).run(invoiceId, user.id, id, plan.key, input.cycle, amountCents, last4, description);

  // Receipt email for paid checkouts; delivery problems must not roll back a
  // completed activation, so failures are logged and swallowed.
  if (!isFreePlan) {
    try {
      await mailer.send({
        to: user.email,
        ...receiptEmail({
          name: user.name,
          planName: plan.name,
          cycle: input.cycle,
          amountCents,
          cardLast4: last4,
          invoiceId,
          periodEnd: period.toISOString(),
        }),
      });
    } catch (error) {
      logEvent(db, {
        entityType: "invoice",
        entityId: invoiceId,
        action: "updated",
        actor: user.id,
        actorType: "system",
        payload: { receiptError: error instanceof Error ? error.message : String(error) },
      });
    }
  }

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
  // The view deliberately includes lapsed periods so the billing UI can show
  // status "expired" and offer renewal; enforcement paths use the stricter
  // getActiveSubscription instead.
  const row = db
    .query(
      "SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active' ORDER BY started_at DESC LIMIT 1",
    )
    .get(user.id) as SubscriptionRow | undefined;
  return row ? subscriptionView(db, row) : null;
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
    return { data: await checkout(db, deps.mailer, user, body) };
  });

  app.get("/billing/subscription/me", async (request) => {
    return { data: currentSubscriptionView(db, request) };
  });

  app.delete("/billing/subscription/me", async (request) => {
    const user = requireUser(db, request);
    cancelSubscription(db, user);
    return { data: { ok: true } };
  });

  /** Billing history for the signed-in user (newest first). */
  app.get("/billing/invoices/me", async (request) => {
    const user = requireUser(db, request);
    return { data: listInvoices(db, user.id) };
  });
}
