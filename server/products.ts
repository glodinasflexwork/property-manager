/**
 * Stripe Products and Pricing Configuration
 * 
 * This file defines the subscription plans for the Property Manager Pro SaaS.
 * Per-seat pricing model: charge based on number of active team members.
 */

export const STRIPE_PRODUCTS = {
  // Per-seat subscription - charged monthly per active team member
  PER_SEAT_MONTHLY: {
    name: "Property Manager Pro - Per Seat",
    description: "Monthly subscription per team member",
    pricePerSeat: 1999, // $19.99 per seat per month in cents
    currency: "usd",
    interval: "month" as const,
    // Stripe Price ID - will be created dynamically or set manually
    stripePriceId: process.env.STRIPE_PRICE_ID_PER_SEAT_MONTHLY || "",
  },
} as const;

/**
 * Calculate subscription cost based on number of seats
 */
export function calculateSubscriptionCost(numberOfSeats: number): number {
  return STRIPE_PRODUCTS.PER_SEAT_MONTHLY.pricePerSeat * numberOfSeats;
}

/**
 * Format price in cents to display format
 */
export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

/**
 * Get subscription description for invoice
 */
export function getSubscriptionDescription(numberOfSeats: number): string {
  return `Property Manager Pro - ${numberOfSeats} ${numberOfSeats === 1 ? "seat" : "seats"} @ ${formatPrice(STRIPE_PRODUCTS.PER_SEAT_MONTHLY.pricePerSeat)}/seat/month`;
}
