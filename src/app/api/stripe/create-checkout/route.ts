import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe, STRIPE_PRICE_IDS } from '@/lib/stripe/config';
import { getOrCreateStripeCustomer } from '@/lib/stripe/utils';
import { getUserIdFromRequest } from '@/lib/auth/session-cookies';

export async function POST(request: NextRequest) {
  try {
    // Validate Stripe is configured
    if (!stripe) {
      console.error('❌ [STRIPE] Stripe is not initialized. Check STRIPE_SECRET_KEY in .env.local');
      return NextResponse.json(
        { error: 'Stripe is not configured. Please check your API keys.' },
        { status: 500 }
      );
    }

    // SECURITY: Get userId from session cookie, not request body
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - please log in' },
        { status: 401 }
      );
    }

    const supabase = await createClient();
    const body = await request.json();
    const { priceId, mode = 'subscription' } = body;

    // Get user from database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, username')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Validate price ID (only check against valid/configured price IDs)
    const validPriceIds = Object.values(STRIPE_PRICE_IDS).filter(
      (id): id is string => typeof id === 'string' && id !== 'price_xxxxx' && id !== undefined
    );
    if (!priceId || !validPriceIds.includes(priceId)) {
      return NextResponse.json(
        { error: 'Invalid price ID' },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    const customerId = await getOrCreateStripeCustomer(
      user.id,
      user.email
    );

    // Create checkout session with automatic renewal enabled
    // Stripe subscriptions automatically renew unless cancel_at_period_end is set to true
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: mode as 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${request.headers.get('origin')}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.headers.get('origin')}/pricing?canceled=true`,
      metadata: {
        userId: user.id,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
        },
        // Explicitly ensure subscription auto-renews (this is the default, but being explicit)
        // cancel_at_period_end defaults to false, meaning subscription will automatically renew
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

