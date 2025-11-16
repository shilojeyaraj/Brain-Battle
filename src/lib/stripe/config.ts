import Stripe from 'stripe';

// Stripe is currently disabled - make it completely optional
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

// Initialize Stripe only if key is available
// For now, Stripe is disabled - all users get free tier access
export const stripe = stripeSecretKey 
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2024-12-18.acacia',
      typescript: true,
    })
  : null;

// Export a flag to check if Stripe is enabled
export const isStripeEnabled = !!stripeSecretKey;

// Stripe Price IDs - Replace these with your actual Stripe Price IDs
// You'll create these in your Stripe Dashboard
export const STRIPE_PRICE_IDS = {
  PRO_MONTHLY: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || 'price_xxxxx', // Replace with your actual price ID
  PRO_YEARLY: process.env.STRIPE_PRO_YEARLY_PRICE_ID || 'price_xxxxx', // Replace with your actual price ID
} as const;

// Subscription tiers
export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  PRO: 'pro',
} as const;

// Subscription statuses
export const SUBSCRIPTION_STATUS = {
  FREE: 'free',
  ACTIVE: 'active',
  TRIALING: 'trialing',
  PAST_DUE: 'past_due',
  CANCELED: 'canceled',
  UNPAID: 'unpaid',
} as const;

export type SubscriptionTier = typeof SUBSCRIPTION_TIERS[keyof typeof SUBSCRIPTION_TIERS];
export type SubscriptionStatus = typeof SUBSCRIPTION_STATUS[keyof typeof SUBSCRIPTION_STATUS];

