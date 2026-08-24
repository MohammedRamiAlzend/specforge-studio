export type BillingCycle = "monthly" | "yearly";

export interface Plan {
  id: string;
  key: "free" | "plus" | "premium";
  name: string;
  tagline: string;
  monthlyPriceCents: number;
  yearlyPriceCents: number;
  features: string[];
  popular: boolean;
  sortOrder: number;
}

export interface CardInput {
  name: string;
  number: string;
  exp_month: number;
  exp_year: number;
  cvc: string;
}

export interface CheckoutInput {
  plan_key: Plan["key"];
  cycle: BillingCycle;
  /** Required for paid plans; the Free plan activates without a card. */
  card?: CardInput;
}
