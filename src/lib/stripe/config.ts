import Stripe from 'stripe';

// Stripe is currently disabled - make it completely optional
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

// Validate that we're using test mode keys (not live mode)
if (stripeSecretKey) {
  // Check for whitespace or formatting issues
  const trimmedKey = stripeSecretKey.trim();
  if (trimmedKey !== stripeSecretKey) {
    console.warn('⚠️ [STRIPE] Warning: Secret key has leading/trailing whitespace. Trimming...');
  }
  
  if (trimmedKey.startsWith('sk_live_')) {
    console.error('❌ [STRIPE] ERROR: You are using LIVE mode keys!');
    console.error('❌ [STRIPE] Live mode keys start with "sk_live_" and will reject test cards.');
    console.error('❌ [STRIPE] Please use TEST mode keys that start with "sk_test_"');
    console.error('❌ [STRIPE] Get test keys from: Stripe Dashboard → Developers → API keys (with Test mode ON)');
    throw new Error('Cannot use live mode keys with test cards. Please use test mode keys (sk_test_...)');
  } else if (!trimmedKey.startsWith('sk_test_')) {
    console.error('❌ [STRIPE] ERROR: Invalid secret key format!');
    console.error('❌ [STRIPE] Key should start with "sk_test_" for test mode');
    console.error('❌ [STRIPE] Current key starts with:', trimmedKey.substring(0, Math.min(20, trimmedKey.length)));
    console.error('❌ [STRIPE] Key length:', trimmedKey.length, '(should be around 100+ characters)');
    throw new Error('Invalid Stripe secret key format. Must start with "sk_test_" for test mode.');
  } else if (trimmedKey.length < 50) {
    console.error('❌ [STRIPE] ERROR: Secret key appears to be incomplete!');
    console.error('❌ [STRIPE] Key length:', trimmedKey.length, '(should be around 100+ characters)');
    console.error('❌ [STRIPE] Make sure you copied the ENTIRE key from Stripe Dashboard');
    throw new Error('Stripe secret key appears incomplete. Please copy the full key from Stripe Dashboard.');
  } else {
    console.log('✅ [STRIPE] Using test mode keys (sk_test_...)');
    console.log('✅ [STRIPE] Key length:', trimmedKey.length, 'characters');
  }
}

// Initialize Stripe only if key is available
// For now, Stripe is disabled - all users get free tier access
export const stripe = stripeSecretKey 
  ? new Stripe(stripeSecretKey.trim(), {
      apiVersion: '2025-02-24.acacia',
      typescript: true,
    })
  : null;

// Export a flag to check if Stripe is enabled
export const isStripeEnabled = !!stripeSecretKey;

// Stripe Price IDs - Replace these with your actual Stripe Price IDs
// You'll create these in your Stripe Dashboard
export const STRIPE_PRICE_IDS = {
  PRO_MONTHLY: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || 'price_xxxxx',
  PRO_YEARLY: process.env.STRIPE_PRO_YEARLY_PRICE_ID || undefined, // Optional - only set if you have a yearly plan
} as const;

// Get valid price IDs (filter out undefined values)
export const getValidPriceIds = (): string[] => {
  return Object.values(STRIPE_PRICE_IDS).filter((id): id is string => typeof id === 'string' && id !== 'price_xxxxx');
};

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

