export type FullPayment = {
  paymentMethod: "FULL";
};

export type PartialPayment = {
  paymentMethod: "PARTIAL";
  depositPercentage: number;
  chargeTiming: "AFTER_CHECKOUT" | "SCHEDULED_DATE" | "ON_FULFILLMENT";
  daysAfterCheckout?: number; // For AFTER_CHECKOUT
  chargeDate?: string; // For SCHEDULED_DATE
};

export type BillingPolicy = FullPayment | PartialPayment;

export type Offer = BillingPolicy;
