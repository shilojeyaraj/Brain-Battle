import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe/config';
import { getUserIdFromRequest } from '@/lib/auth/session-cookies';

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Get userId from session cookie, not request body
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - please log in' },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    // Get user's subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (!subscription) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 500 }
      );
    }

    // Resume subscription (remove cancel_at_period_end)
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: false,
    });

    // Update database
    await supabase
      .from('subscriptions')
      .update({ cancel_at_period_end: false })
      .eq('id', subscription.stripe_subscription_id);

    return NextResponse.json({
      success: true,
      message: 'Subscription has been resumed',
    });
  } catch (error: any) {
    console.error('Error resuming subscription:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to resume subscription' },
      { status: 500 }
    );
  }
}

