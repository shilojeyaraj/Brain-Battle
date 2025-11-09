import { createClient } from '@/lib/supabase/server';
import { stripe } from './config';
import type { SubscriptionTier, SubscriptionStatus } from './config';

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

  if (user?.stripe_customer_id) {
    return user.stripe_customer_id;
  }

  // Create a new Stripe customer
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

  return customer.id;
}

/**
 * Get user's subscription information
 */
export async function getUserSubscription(
  userId: string
): Promise<SubscriptionInfo | null> {
  const supabase = await createClient();

  const { data: user } = await supabase
    .from('users')
    .select(
      'subscription_status, subscription_tier, subscription_current_period_end, subscription_cancel_at_period_end'
    )
    .eq('id', userId)
    .single();

  if (!user) {
    return null;
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
 */
export async function hasProSubscription(userId: string): Promise<boolean> {
  const subscription = await getUserSubscription(userId);
  return subscription?.isActive && subscription.tier === 'pro';
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

