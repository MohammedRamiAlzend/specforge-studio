import type { Plan } from "../plan/types";

/** "expired" is computed server-side when the billing period has lapsed. */
export type SubscriptionStatus = "active" | "canceled" | "expired";

export interface Subscription {
  id: string;
  cycle: "monthly" | "yearly";
  status: SubscriptionStatus;
  cardLast4: string;
  startedAt: string;
  currentPeriodEnd: string;
  canceledAt: string | null;
  plan: Plan;
}

export interface Invoice {
  id: string;
  planKey: string;
  planName: string;
  cycle: "monthly" | "yearly";
  amountCents: number;
  cardLast4: string;
  status: "paid" | "refunded";
  description: string;
  createdAt: string;
}
