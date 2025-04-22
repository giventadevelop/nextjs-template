import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-03-31.basil",
  typescript: true,
});

export type StripeSubscriptionStatus =
  | "trialing"
  | "active"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "past_due"
  | "paused"
  | "unpaid";

export type StripePriceType = "one_time" | "recurring";

export type StripeSubscriptionPriceInterval = "day" | "week" | "month" | "year";

export interface StripeSubscription {
  id: string;
  status: StripeSubscriptionStatus;
  current_period_end: number;
  cancel_at_period_end: boolean;
}

export interface StripePrice {
  id: string;
  type: StripePriceType;
  interval?: StripeSubscriptionPriceInterval;
  interval_count?: number;
  unit_amount: number;
  currency: string;
  product: {
    name: string;
    description?: string;
  };
}
