import Stripe from 'stripe';

// Stripe is currently disabled - make it completely optional
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

// Validate Stripe keys based on environment
if (stripeSecretKey) {
  // Check for whitespace or formatting issues
  const trimmedKey = stripeSecretKey.trim();
  if (trimmedKey !== stripeSecretKey) {
    console.warn('⚠️ [STRIPE] Warning: Secret key has leading/trailing whitespace. Trimming...');
  }
  
  const isLiveMode = trimmedKey.startsWith('sk_live_');
  const isTestMode = trimmedKey.startsWith('sk_test_');
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Validate key format
  if (!isLiveMode && !isTestMode) {
    console.error('❌ [STRIPE] ERROR: Invalid secret key format!');
    console.error('❌ [STRIPE] Key should start with "sk_test_" (test mode) or "sk_live_" (live mode)');
    console.error('❌ [STRIPE] Current key starts with:', trimmedKey.substring(0, Math.min(20, trimmedKey.length)));
    console.error('❌ [STRIPE] Key length:', trimmedKey.length, '(should be around 100+ characters)');
    throw new Error('Invalid Stripe secret key format. Must start with "sk_test_" or "sk_live_".');
  }
  
  // Validate key length
  if (trimmedKey.length < 50) {
    console.error('❌ [STRIPE] ERROR: Secret key appears to be incomplete!');
    console.error('❌ [STRIPE] Key length:', trimmedKey.length, '(should be around 100+ characters)');
    console.error('❌ [STRIPE] Make sure you copied the ENTIRE key from Stripe Dashboard');
    throw new Error('Stripe secret key appears incomplete. Please copy the full key from Stripe Dashboard.');
  }
  
  // Warn about mode mismatch (but allow it - user knows what they're doing)
  if (isLiveMode && !isProduction) {
    console.warn('⚠️ [STRIPE] WARNING: Using LIVE mode keys in non-production environment!');
    console.warn('⚠️ [STRIPE] Live mode keys will charge real money. Use test keys (sk_test_...) for development.');
  } else if (isTestMode && isProduction) {
    console.warn('⚠️ [STRIPE] WARNING: Using TEST mode keys in production!');
    console.warn('⚠️ [STRIPE] Test mode keys will not process real payments. Use live keys (sk_live_...) for production.');
  }
  
  // Log the mode being used
  if (isLiveMode) {
    console.log('✅ [STRIPE] Using LIVE mode keys (sk_live_...)');
    console.log('✅ [STRIPE] Key length:', trimmedKey.length, 'characters');
  } else {
    console.log('✅ [STRIPE] Using TEST mode keys (sk_test_...)');
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

