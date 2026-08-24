import type { Plan } from "../plan/types";

export type SubscriptionStatus = "active" | "canceled";

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
