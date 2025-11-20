# 🎯 Stripe Subscription Setup Guide

Complete step-by-step guide to set up Stripe subscriptions for Brain Battle.

---

## 📋 Prerequisites

- Stripe account (sign up at [stripe.com](https://stripe.com))
- Access to your Stripe Dashboard
- Your application running locally or deployed

---

## 🚀 Step 1: Get Your Stripe API Keys

1. **Log in to Stripe Dashboard**: Go to [dashboard.stripe.com](https://dashboard.stripe.com)

2. **Navigate to API Keys**:
   - Click on **"Developers"** in the left sidebar
   - Click on **"API keys"**

3. **Copy Your Keys**:
   - **Publishable key** (starts with `pk_test_` or `pk_live_`)
   - **Secret key** (starts with `sk_test_` or `sk_live_`)
   - ⚠️ **Keep your secret key secure! Never commit it to version control.**

4. **Add to Environment Variables**:
   Create or update your `.env.local` file:
   ```env
   STRIPE_SECRET_KEY=sk_test_xxxxx
   STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
   ```

---

## 🛍️ Step 2: Create Products and Prices

### 2.1 Create Pro Monthly Product

1. **Go to Products**: In Stripe Dashboard, click **"Products"** → **"Add product"**

2. **Product Details**:
   - **Name**: `Brain Battle Pro - Monthly`
   - **Description**: `Unlock advanced features with Pro subscription`
   - **Pricing model**: `Standard pricing`
   - **Price**: `$9.99`
   - **Billing period**: `Monthly`
   - **Currency**: `USD` (or your preferred currency)

3. **Click "Save product"**

4. **Copy the Price ID**: 
   - After creating, you'll see a Price ID (starts with `price_`)
   - Copy this ID - you'll need it!

### 2.2 Create Pro Yearly Product

1. **Add another product**:
   - **Name**: `Brain Battle Pro - Yearly`
   - **Description**: `Unlock advanced features with Pro subscription (Annual)`
   - **Price**: `$99.99`
   - **Billing period**: `Yearly`
   - **Currency**: `USD`

2. **Copy the Price ID** for this product as well

### 2.3 Add Price IDs to Environment Variables

Update your `.env.local`:
```env
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_PRO_MONTHLY_PRICE_ID=price_xxxxx
STRIPE_PRO_YEARLY_PRICE_ID=price_xxxxx
NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID=price_xxxxx
NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID=price_xxxxx
```

### 2.4 Update Code with Your Price IDs

Update `src/lib/stripe/config.ts`:
```typescript
export const STRIPE_PRICE_IDS = {
  PRO_MONTHLY: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || 'price_xxxxx', // Replace with your actual price ID
  PRO_YEARLY: process.env.STRIPE_PRO_YEARLY_PRICE_ID || 'price_xxxxx', // Replace with your actual price ID
} as const;
```

---

## 🔗 Step 3: Set Up Webhook Endpoint

Webhooks allow Stripe to notify your application about subscription events (payments, cancellations, etc.).

### 3.1 For Local Development (Using Stripe CLI)

1. **Install Stripe CLI**: 
   - Download from [stripe.com/docs/stripe-cli](https://stripe.com/docs/stripe-cli)
   - Or install via package manager:
     ```bash
     # macOS
     brew install stripe/stripe-cli/stripe
     
     # Windows (using Scoop)
     scoop install stripe
     ```

2. **Login to Stripe CLI**:
   ```bash
   stripe login
   ```

3. **Forward Webhooks to Local Server**:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

4. **Copy the Webhook Signing Secret**:
   - The CLI will output a webhook signing secret (starts with `whsec_`)
   - Add it to your `.env.local`:
     ```env
     STRIPE_WEBHOOK_SECRET=whsec_xxxxx
     ```

### 3.2 For Production

1. **Go to Webhooks in Stripe Dashboard**:
   - Click **"Developers"** → **"Webhooks"**
   - Click **"Add endpoint"**

2. **Configure Endpoint**:
   - **Endpoint URL**: `https://yourdomain.com/api/stripe/webhook`
   - **Description**: `Brain Battle Subscription Webhooks`
   - **Events to send**: Select these events:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`

3. **Copy the Signing Secret**:
   - After creating the endpoint, click on it
   - Under **"Signing secret"**, click **"Reveal"**
   - Copy the secret (starts with `whsec_`)
   - Add to your production environment variables:
     ```env
     STRIPE_WEBHOOK_SECRET=whsec_xxxxx
     ```

---

## 🗄️ Step 4: Set Up Database

1. **Run the Migration Script**:
   - Go to your Supabase Dashboard
   - Navigate to **SQL Editor**
   - Open the file `supabase/stripe-migration.sql`
   - Copy and paste the entire SQL script
   - Click **"Run"**

2. **Verify Tables Created**:
   - Check that these tables exist:
     - `subscriptions` (for subscription records)
     - `subscription_history` (for audit trail)
   - Verify that `users` table has these new columns:
     - `stripe_customer_id`
     - `subscription_status`
     - `subscription_tier`
     - `subscription_current_period_end`
     - `subscription_cancel_at_period_end`

---

## 🧪 Step 5: Test Your Integration

### 5.1 Install Dependencies

```bash
npm install
```

### 5.2 Test with Stripe Test Cards

Stripe provides test cards for testing different scenarios:

| Card Number | Scenario |
|------------|----------|
| `4242 4242 4242 4242` | Payment succeeds |
| `4000 0025 0000 3155` | Payment requires authentication |
| `4000 0000 0000 9995` | Payment is declined |

**Test Card Details**:
- **Expiry**: Any future date (e.g., `12/34`)
- **CVC**: Any 3 digits (e.g., `123`)
- **ZIP**: Any 5 digits (e.g., `12345`)

### 5.3 Test Flow

1. **Start your development server**:
   ```bash
   npm run dev
   ```

2. **Navigate to Pricing Page**:
   - Go to `http://localhost:3000/pricing`
   - Click "Subscribe Now" on a Pro plan

3. **Complete Test Checkout**:
   - Use test card `4242 4242 4242 4242`
   - Complete the checkout process
   - You should be redirected to `/success`

4. **Verify Subscription**:
   - Check your Stripe Dashboard → **Customers** (you should see a new customer)
   - Check your database → `subscriptions` table (should have a new record)
   - Check your database → `users` table (subscription_status should be `active`)

5. **Test Customer Portal**:
   - Go to your dashboard
   - Click "Manage Subscription"
   - You should be able to view and manage your subscription

---

## 🔧 Step 6: Configure Customer Portal (Optional but Recommended)

The Customer Portal allows users to manage their subscriptions without you building a custom UI.

1. **Go to Customer Portal Settings**:
   - In Stripe Dashboard, click **"Settings"** → **"Billing"** → **"Customer portal"**

2. **Configure Portal Features**:
   - **Allow customers to cancel subscriptions**: ✅ Enabled
   - **Allow customers to update payment methods**: ✅ Enabled
   - **Allow customers to update billing details**: ✅ Enabled
   - **Allow customers to view invoices**: ✅ Enabled

3. **Customize Branding** (Optional):
   - Add your logo
   - Customize colors to match your brand
   - Add custom text

---

## 📱 Step 7: Update Your Application

### 7.1 Add Subscription Check to Protected Features

Example: Check if user has Pro subscription before allowing access:

```typescript
import { hasProSubscription } from '@/lib/stripe/utils';

// In your API route or component
const isPro = await hasProSubscription(userId);

if (!isPro) {
  return NextResponse.json(
    { error: 'Pro subscription required' },
    { status: 403 }
  );
}
```

### 7.2 Add Subscription Status to Dashboard

Add a subscription management section to your dashboard that shows:
- Current plan (Free/Pro)
- Subscription status
- Next billing date
- "Manage Subscription" button

---

## 🚨 Common Issues & Troubleshooting

### Issue: Webhook not receiving events

**Solution**:
- Verify webhook URL is correct and accessible
- Check webhook signing secret matches
- Use Stripe CLI for local testing: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
- Check server logs for webhook errors

### Issue: "No such customer" error

**Solution**:
- Ensure `getOrCreateStripeCustomer` is called before creating checkout session
- Verify user has a `stripe_customer_id` in database

### Issue: Subscription not updating in database

**Solution**:
- Check webhook endpoint is receiving events (check Stripe Dashboard → Webhooks → Events)
- Verify `updateSubscriptionFromStripe` function is working
- Check database connection and permissions

### Issue: Checkout session creation fails

**Solution**:
- Verify `STRIPE_SECRET_KEY` is set correctly
- Check price IDs are valid and match your Stripe Dashboard
- Ensure success/cancel URLs are publicly accessible

---

## 🔐 Security Best Practices

1. **Never expose secret keys**:
   - Keep `STRIPE_SECRET_KEY` server-side only
   - Never commit `.env.local` to version control
   - Use environment variables in production

2. **Verify webhook signatures**:
   - Always verify webhook signatures (already implemented)
   - Use the webhook secret from Stripe

3. **Validate user authentication**:
   - Always check user is authenticated before creating checkout sessions
   - Verify user owns the subscription before allowing management

4. **Use HTTPS in production**:
   - Stripe requires HTTPS for webhooks in production
   - Ensure your production URL uses HTTPS

---

## 📊 Monitoring & Analytics

### Monitor in Stripe Dashboard

- **Payments**: View successful and failed payments
- **Subscriptions**: Track active, canceled, and past-due subscriptions
- **Customers**: View customer details and payment history
- **Webhooks**: Monitor webhook delivery and retries

### Monitor in Your Application

- Check `subscriptions` table for subscription status
- Check `subscription_history` table for event audit trail
- Set up alerts for failed payments or subscription cancellations

---

## 🎯 Next Steps

1. **Customize Pricing Plans**: Adjust prices and features as needed
2. **Add Trial Periods**: Consider offering free trials for new subscribers
3. **Implement Usage Limits**: Enforce Pro feature limits based on subscription tier
4. **Add Analytics**: Track subscription metrics (MRR, churn, etc.)
5. **Email Notifications**: Send welcome emails and payment receipts
6. **Upgrade/Downgrade Flow**: Allow users to change plans

---

## 📚 Additional Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Checkout Guide](https://stripe.com/docs/payments/checkout)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe Customer Portal](https://stripe.com/docs/billing/subscriptions/integrating-customer-portal)
- [Stripe Testing](https://stripe.com/docs/testing)

---

## ✅ Checklist

Before going live, ensure:

- [ ] Stripe API keys are set (test mode tested, live mode ready)
- [ ] Products and prices created in Stripe Dashboard
- [ ] Price IDs added to environment variables
- [ ] Database migration completed
- [ ] Webhook endpoint configured and tested
- [ ] Test checkout flow works end-to-end
- [ ] Customer portal configured
- [ ] Subscription status checks implemented for Pro features
- [ ] Error handling and user feedback implemented
- [ ] Security best practices followed
- [ ] Production webhook endpoint configured
- [ ] Monitoring and alerts set up

---

**Need Help?** Check the troubleshooting section or refer to Stripe's comprehensive documentation.

