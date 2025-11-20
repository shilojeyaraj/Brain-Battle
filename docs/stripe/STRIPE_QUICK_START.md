# ⚡ Stripe Integration - Quick Start

## ✅ What's Been Implemented

### 1. **Database Setup**
- ✅ Migration script: `supabase/stripe-migration.sql`
- ✅ Adds subscription fields to `users` table
- ✅ Creates `subscriptions` and `subscription_history` tables

### 2. **Backend API Routes**
- ✅ `/api/stripe/create-checkout` - Create checkout session
- ✅ `/api/stripe/webhook` - Handle Stripe webhooks
- ✅ `/api/stripe/subscription-status` - Get user's subscription status
- ✅ `/api/stripe/create-portal-session` - Customer portal access
- ✅ `/api/stripe/cancel-subscription` - Cancel subscription
- ✅ `/api/stripe/resume-subscription` - Resume subscription

### 3. **Frontend Components**
- ✅ `/pricing` - Pricing page with plan comparison
- ✅ `/success` - Success page after checkout
- ✅ `PricingCard` component - Reusable pricing card
- ✅ `SubscriptionButton` component - Subscribe button
- ✅ `CustomerPortalButton` component - Manage subscription button

### 4. **Utilities & Configuration**
- ✅ Stripe configuration (`src/lib/stripe/config.ts`)
- ✅ Subscription utilities (`src/lib/stripe/utils.ts`)
- ✅ Helper functions for subscription management

---

## 🚀 Next Steps (What You Need to Do)

### Step 1: Install Dependencies
```bash
cd Brain-Brawl
npm install
```

### Step 2: Set Up Stripe Account
1. Go to [stripe.com](https://stripe.com) and create an account
2. Get your API keys from Dashboard → Developers → API keys
3. Copy your **Secret Key** (starts with `sk_test_`)

### Step 3: Create Products in Stripe
1. Go to Stripe Dashboard → **Products**
2. Click **"Add product"**
3. Create two products:
   - **Pro Monthly**: $9.99/month
   - **Pro Yearly**: $99.99/year
4. **Copy the Price IDs** (start with `price_`)

### Step 4: Configure Environment Variables
Create/update `.env.local`:
```env
# Stripe Keys
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx

# Stripe Price IDs (from Step 3)
STRIPE_PRO_MONTHLY_PRICE_ID=price_xxxxx
STRIPE_PRO_YEARLY_PRICE_ID=price_xxxxx
NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID=price_xxxxx
NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID=price_xxxxx

# Stripe Webhook Secret (get this after setting up webhook)
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

### Step 5: Run Database Migration
1. Go to Supabase Dashboard → **SQL Editor**
2. Open `supabase/stripe-migration.sql`
3. Copy and paste the entire script
4. Click **"Run"**

### Step 6: Set Up Webhook (For Local Development)
```bash
# Install Stripe CLI
# macOS: brew install stripe/stripe-cli/stripe
# Windows: Download from stripe.com/docs/stripe-cli

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Copy the webhook signing secret (starts with whsec_)
# Add it to your .env.local as STRIPE_WEBHOOK_SECRET
```

### Step 7: Test the Integration
1. Start your dev server: `npm run dev`
2. Go to `http://localhost:3000/pricing`
3. Click "Subscribe Now" on a Pro plan
4. Use test card: `4242 4242 4242 4242`
5. Complete checkout
6. Verify subscription in Stripe Dashboard

---

## 📚 Documentation

- **Full Setup Guide**: See `STRIPE_SETUP_GUIDE.md` for detailed instructions
- **Pro Plan Features**: See `PRO_PLAN_FEATURES.md` for feature ideas

---

## 🎯 Key Features

### For Users
- ✅ Easy subscription checkout via Stripe Checkout
- ✅ Customer portal for managing subscriptions
- ✅ Automatic subscription status updates
- ✅ Cancel/resume subscriptions

### For You
- ✅ Automatic webhook handling
- ✅ Database tracking of all subscriptions
- ✅ Subscription history audit trail
- ✅ Easy integration with existing auth system

---

## 🔧 How to Use in Your Code

### Check if User Has Pro Subscription
```typescript
import { hasProSubscription } from '@/lib/stripe/utils';

const isPro = await hasProSubscription(userId);
if (!isPro) {
  // Show upgrade prompt or restrict feature
}
```

### Get Subscription Status
```typescript
import { getUserSubscription } from '@/lib/stripe/utils';

const subscription = await getUserSubscription(userId);
console.log(subscription.tier); // 'free' or 'pro'
console.log(subscription.isActive); // true/false
```

### Add Subscribe Button to Any Page
```tsx
import { SubscriptionButton } from '@/components/subscription/subscription-button';

<SubscriptionButton priceId="price_xxxxx">
  Upgrade to Pro
</SubscriptionButton>
```

### Add Customer Portal Button
```tsx
import { CustomerPortalButton } from '@/components/subscription/customer-portal-button';

<CustomerPortalButton>
  Manage Subscription
</CustomerPortalButton>
```

---

## ⚠️ Important Notes

1. **Authentication**: The integration uses your existing custom auth system (userId from localStorage)
2. **Price IDs**: Make sure to replace `price_xxxxx` with your actual Stripe Price IDs
3. **Webhook Secret**: Required for production - get it from Stripe Dashboard → Webhooks
4. **Test Mode**: Use test API keys and test cards during development
5. **Production**: Switch to live keys when ready to go live

---

## 🐛 Troubleshooting

**Checkout not working?**
- Verify `STRIPE_SECRET_KEY` is set correctly
- Check Price IDs match your Stripe Dashboard
- Ensure user is logged in (userId in localStorage)

**Webhook not receiving events?**
- Verify webhook URL is correct
- Check webhook signing secret matches
- Use Stripe CLI for local testing

**Subscription not updating in database?**
- Check webhook endpoint is receiving events
- Verify database migration ran successfully
- Check server logs for errors

---

## 📞 Need Help?

- Check `STRIPE_SETUP_GUIDE.md` for detailed setup instructions
- Review Stripe documentation: https://stripe.com/docs
- Check your Stripe Dashboard for webhook events and logs

---

**Ready to go!** Follow the steps above and you'll have Stripe subscriptions working in no time! 🚀

