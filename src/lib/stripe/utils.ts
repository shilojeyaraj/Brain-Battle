import { createClient } from '@/lib/supabase/server';
import { stripe } from './config';
import type { SubscriptionTier, SubscriptionStatus } from './config';
import type Stripe from 'stripe';

export interface SubscriptionInfo {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  isActive: boolean;
}

/**
 * Get or create a Stripe customer for a user
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string
): Promise<string> {
  const supabase = await createClient();

  // Check if user already has a Stripe customer ID
  const { data: user } = await supabase
    .from('users')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single();

  // If user has a customer ID, verify it exists in Stripe
  if (user?.stripe_customer_id && stripe) {
    try {
      // Verify the customer exists in Stripe
      await stripe.customers.retrieve(user.stripe_customer_id);
      console.log('✅ [STRIPE] Using existing customer:', user.stripe_customer_id);
      return user.stripe_customer_id;
    } catch (error: any) {
      // Customer doesn't exist in Stripe (might have been deleted or from different account)
      console.warn('⚠️ [STRIPE] Customer ID in database does not exist in Stripe:', user.stripe_customer_id);
      console.warn('⚠️ [STRIPE] Creating new customer...');
      // Clear the invalid customer ID from database
      await supabase
        .from('users')
        .update({ stripe_customer_id: null })
        .eq('id', userId);
      // Fall through to create a new customer
    }
  }

  // Create a new Stripe customer (only if Stripe is configured)
  if (!stripe) {
    // Stripe is disabled - return a placeholder customer ID
    // In production, you would want to handle this differently
    console.warn('⚠️ [STRIPE] Stripe is not configured. Returning placeholder customer ID.');
    return `placeholder_customer_${userId}`;
  }

  console.log('📝 [STRIPE] Creating new Stripe customer for user:', userId);
  const customer = await stripe.customers.create({
    email,
    metadata: {
      userId,
    },
  });

  // Update user with Stripe customer ID
  await supabase
    .from('users')
    .update({ stripe_customer_id: customer.id })
    .eq('id', userId);

  console.log('✅ [STRIPE] Created new customer:', customer.id);
  return customer.id;
}

/**
 * Get user's subscription information
 * Returns free tier if Stripe is not configured
 */
export async function getUserSubscription(
  userId: string
): Promise<SubscriptionInfo | null> {
  // If Stripe is not configured, return free tier
  if (!stripe) {
    return {
      tier: 'free',
      status: 'free',
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      isActive: false,
    };
  }

  const supabase = await createClient();

  const { data: user } = await supabase
    .from('users')
    .select(
      'subscription_status, subscription_tier, subscription_current_period_end, subscription_cancel_at_period_end'
    )
    .eq('id', userId)
    .single();

  if (!user) {
    return {
      tier: 'free',
      status: 'free',
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      isActive: false,
    };
  }

  const isActive =
    user.subscription_status === 'active' ||
    user.subscription_status === 'trialing';

  return {
    tier: (user.subscription_tier as SubscriptionTier) || 'free',
    status: (user.subscription_status as SubscriptionStatus) || 'free',
    currentPeriodEnd: user.subscription_current_period_end
      ? new Date(user.subscription_current_period_end)
      : null,
    cancelAtPeriodEnd: user.subscription_cancel_at_period_end || false,
    isActive,
  };
}

/**
 * Check if user has Pro subscription
 * Returns false if Stripe is not configured (all users get free tier for now)
 */
export async function hasProSubscription(userId: string): Promise<boolean> {
  // If Stripe is not configured, all users are on free tier
  if (!stripe) {
    return false;
  }
  
  const subscription = await getUserSubscription(userId);
  return !!(subscription?.isActive && subscription.tier === 'pro');
}

/**
 * Update subscription in database from Stripe webhook
 */
export async function updateSubscriptionFromStripe(
  subscription: Stripe.Subscription
) {
  const supabase = await createClient();

  // Get user by Stripe customer ID
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_customer_id', subscription.customer as string)
    .single();

  if (!user) {
    console.error('User not found for Stripe customer:', subscription.customer);
    return;
  }

  const planName =
    subscription.items.data[0]?.price.nickname || 'pro';
  const status = subscription.status;

  // Upsert subscription record
  const { data: existingSubscription } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  const subscriptionData = {
    user_id: user.id,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: subscription.customer as string,
    status,
    plan_id: subscription.items.data[0]?.price.id || '',
    plan_name: planName,
    current_period_start: new Date(
      subscription.current_period_start * 1000
    ).toISOString(),
    current_period_end: new Date(
      subscription.current_period_end * 1000
    ).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end || false,
    canceled_at: subscription.canceled_at
      ? new Date(subscription.canceled_at * 1000).toISOString()
      : null,
    updated_at: new Date().toISOString(),
  };

  if (existingSubscription) {
    await supabase
      .from('subscriptions')
      .update(subscriptionData)
      .eq('id', existingSubscription.id);
  } else {
    await supabase.from('subscriptions').insert({
      ...subscriptionData,
      created_at: new Date().toISOString(),
    });
  }

  // Log subscription event
  await supabase.from('subscription_history').insert({
    user_id: user.id,
    subscription_id: existingSubscription?.id || null,
    event_type: existingSubscription ? 'updated' : 'created',
    event_data: subscription as any,
  });
}

