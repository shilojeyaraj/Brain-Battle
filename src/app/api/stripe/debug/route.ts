import { NextRequest, NextResponse } from 'next/server'

/**
 * Debug endpoint to check Stripe configuration
 * Only use this in development!
 */
export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 403 }
    )
  }

  const secretKey = process.env.STRIPE_SECRET_KEY
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY
  const monthlyPriceId = process.env.STRIPE_PRO_MONTHLY_PRICE_ID
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  const isTestMode = secretKey?.startsWith('sk_test_')
  const isLiveMode = secretKey?.startsWith('sk_live_')
  const hasKeys = !!secretKey && !!publishableKey
  const hasPriceId = !!monthlyPriceId && monthlyPriceId !== 'price_xxxxx'
  const hasWebhookSecret = !!webhookSecret

  return NextResponse.json({
    status: 'ok',
    configuration: {
      hasSecretKey: !!secretKey,
      hasPublishableKey: !!publishableKey,
      hasMonthlyPriceId: hasPriceId,
      hasWebhookSecret: hasWebhookSecret,
      mode: isTestMode ? 'TEST' : isLiveMode ? 'LIVE' : 'UNKNOWN',
      secretKeyPrefix: secretKey ? secretKey.substring(0, 10) + '...' : 'NOT SET',
      publishableKeyPrefix: publishableKey ? publishableKey.substring(0, 10) + '...' : 'NOT SET',
      monthlyPriceId: monthlyPriceId || 'NOT SET',
    },
    issues: [
      !hasKeys && 'Missing Stripe API keys',
      isLiveMode && '⚠️ Using LIVE mode keys - test cards will be rejected! Use TEST mode keys (sk_test_...)',
      !isTestMode && !isLiveMode && secretKey && '⚠️ Unexpected key format',
      !hasPriceId && 'Missing monthly price ID',
      !hasWebhookSecret && 'Missing webhook secret (optional for testing)',
    ].filter(Boolean),
    recommendations: [
      isLiveMode && 'Switch to TEST mode in Stripe Dashboard and use test keys (sk_test_...)',
      !hasKeys && 'Add STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY to .env.local',
      !hasPriceId && 'Add STRIPE_PRO_MONTHLY_PRICE_ID to .env.local',
    ].filter(Boolean),
  })
}

