# 🧪 Stripe Payment Testing Guide

## ✅ Setup Checklist

Before testing, make sure you have:

- [ ] Run the database migration (`supabase/stripe-migration.sql`) in Supabase SQL Editor
- [ ] Added Stripe API keys to `.env.local`:
  - `STRIPE_SECRET_KEY=sk_test_xxxxx`
  - `STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx`
- [ ] Added your Price ID to `.env.local`:
  - `STRIPE_PRO_MONTHLY_PRICE_ID=price_1SUtiVLypanQyHquPhWhUEk5`
  - `NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID=price_1SUtiVLypanQyHquPhWhUEk5`
- [ ] Started Stripe webhook listener: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
- [ ] Copied webhook secret (`whsec_...`) to `.env.local` as `STRIPE_WEBHOOK_SECRET`
- [ ] Started your dev server: `npm run dev`

---

## 💳 Stripe Test Card Numbers

Stripe provides test card numbers for different scenarios. Use these in **test mode only**:

### ✅ Successful Payments

| Card Number | Scenario | Use Case |
|------------|----------|----------|
| `4242 4242 4242 4242` | Payment succeeds | Standard successful payment |
| `4000 0025 0000 3155` | Payment requires authentication | 3D Secure authentication |
| `4000 0027 6000 3184` | Payment requires authentication (declined) | Test failed 3D Secure |

### ❌ Declined Payments

| Card Number | Scenario | Use Case |
|------------|----------|----------|
| `4000 0000 0000 9995` | Card declined | Insufficient funds |
| `4000 0000 0000 0002` | Card declined | Generic decline |
| `4000 0000 0000 0069` | Card declined | Expired card |

### 🔄 Subscription Testing

| Card Number | Scenario | Use Case |
|------------|----------|----------|
| `4242 4242 4242 4242` | Subscription succeeds | Monthly recurring payment |
| `4000 0000 0000 0341` | Attaching payment method requires authentication | 3D Secure for subscriptions |

### 📝 Test Card Details (for all cards)

- **Expiry Date**: Any future date (e.g., `12/34` or `12/25`)
- **CVC**: Any 3 digits (e.g., `123`)
- **ZIP/Postal Code**: Any valid code (e.g., `12345` or `90210`)

---

## 🚀 Testing Flow

### Step 1: Start Your Services

1. **Start dev server** (in one terminal):
   ```bash
   npm run dev
   ```

2. **Start Stripe webhook listener** (in another terminal):
   ```bash
   # Refresh PATH first if needed:
   $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
   
   # Then start listener:
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   
   **Important**: Copy the `whsec_...` secret that appears and add it to `.env.local`

### Step 2: Test Checkout

1. Go to `http://localhost:3000/pricing`
2. Click "Subscribe Now" on the Pro plan
3. Use test card: `4242 4242 4242 4242`
   - Expiry: `12/34`
   - CVC: `123`
   - ZIP: `12345`
4. Complete checkout
5. You should be redirected to `/dashboard?session_id=...`

### Step 3: Verify Subscription

1. **Check Stripe Dashboard**:
   - Go to Stripe Dashboard → Customers
   - You should see a new customer
   - Go to Subscriptions → You should see an active subscription

2. **Check Your Database**:
   - Go to Supabase Dashboard → Table Editor
   - Check `users` table: `subscription_status` should be `active`, `subscription_tier` should be `pro`
   - Check `subscriptions` table: Should have a new record with status `active`

3. **Check Webhook Events**:
   - In the terminal running `stripe listen`, you should see events like:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `invoice.payment_succeeded`

### Step 4: Test Subscription Status

1. Go to your dashboard
2. Check if Pro features are unlocked
3. The subscription status should be visible

---

## 🔍 Troubleshooting

### Webhook Not Receiving Events

**Problem**: No events in `stripe listen` terminal

**Solutions**:
- Make sure `stripe listen` is running
- Check that webhook secret in `.env.local` matches the one from `stripe listen`
- Verify your dev server is running on port 3000
- Check server logs for webhook errors

### Subscription Not Updating in Database

**Problem**: Payment succeeds but database doesn't update

**Solutions**:
- Check webhook events in `stripe listen` terminal
- Verify database migration was run successfully
- Check server logs for database errors
- Verify `STRIPE_WEBHOOK_SECRET` is set correctly

### Checkout Session Creation Fails

**Problem**: Error when clicking "Subscribe Now"

**Solutions**:
- Verify `STRIPE_SECRET_KEY` is set in `.env.local`
- Check that Price ID matches your Stripe Dashboard
- Ensure user is logged in (userId in localStorage or session cookie)
- Check server logs for detailed error messages

### "Invalid price ID" Error

**Problem**: API returns "Invalid price ID"

**Solutions**:
- Verify `STRIPE_PRO_MONTHLY_PRICE_ID` matches your Stripe Dashboard
- Make sure you're using the Price ID (starts with `price_`), not Product ID
- Check that the price ID is active in Stripe Dashboard

---

## 📊 Monitoring Test Payments

### In Stripe Dashboard

1. **Payments**: View all test payments
   - Dashboard → Payments
   - Filter by "Test mode"

2. **Subscriptions**: View active subscriptions
   - Dashboard → Subscriptions
   - See subscription status, next billing date, etc.

3. **Webhooks**: Monitor webhook delivery
   - Dashboard → Developers → Webhooks
   - Click on your endpoint to see event logs

### In Your Application

1. **Database**: Check subscription records
   - Supabase → Table Editor → `subscriptions` table
   - Supabase → Table Editor → `users` table (subscription fields)

2. **Server Logs**: Check for webhook processing
   - Look for console logs like:
     - `Checkout session completed: cs_...`
     - `Subscription created/updated: sub_...`
     - `Invoice payment succeeded: in_...`

---

## 🎯 Test Scenarios

### Scenario 1: Successful Subscription
1. Use card: `4242 4242 4242 4242`
2. Complete checkout
3. Verify subscription is active in database
4. Verify Pro features are unlocked

### Scenario 2: Payment Requires Authentication
1. Use card: `4000 0025 0000 3155`
2. Complete 3D Secure authentication
3. Verify subscription is active

### Scenario 3: Payment Declined
1. Use card: `4000 0000 0000 9995`
2. Payment should be declined
3. Subscription should not be created
4. User should see error message

### Scenario 4: Cancel Subscription
1. Subscribe with `4242 4242 4242 4242`
2. Go to customer portal (if implemented)
3. Cancel subscription
4. Verify `cancel_at_period_end` is set to `true`
5. Verify subscription remains active until period end

---

## 🔐 Security Notes

- ⚠️ **Never use test cards in production**
- ⚠️ **Never commit `.env.local` to version control**
- ⚠️ **Always verify webhook signatures in production**
- ✅ **Test mode uses `sk_test_` and `pk_test_` keys**
- ✅ **Live mode uses `sk_live_` and `pk_live_` keys**

---

## 📚 Additional Resources

- [Stripe Test Cards Documentation](https://stripe.com/docs/testing)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe Testing Best Practices](https://stripe.com/docs/testing)

---

## ✅ Ready to Test!

Once you've completed the setup checklist, you're ready to test payments! Start with the successful payment scenario using `4242 4242 4242 4242`.

