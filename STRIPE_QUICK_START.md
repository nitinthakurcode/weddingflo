# Stripe Payment System - Quick Start Guide

## 🚀 Quick Start (5 Minutes)

### Step 1: Verify Environment Variables

Check that `.env.local` has all required Stripe variables:

```bash
# Already configured ✅
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PRICE_STARTER=price_...
NEXT_PUBLIC_STRIPE_PRICE_PROFESSIONAL=price_...
NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE=price_...
```

### Step 2: Start Development Server

```bash
npm run dev
```

Server will start on `http://localhost:3001`

### Step 3: Navigate to Billing Page

Open in browser:
```
http://localhost:3001/settings/billing
```

You should see:
- ✅ Test mode banner (yellow)
- ✅ Current plan card
- ✅ Usage statistics
- ✅ Three pricing plan cards

### Step 4: Test Checkout Flow

1. **Click "Upgrade" on Professional plan ($99/mo)**
   - Should redirect to Stripe Checkout
   - See test mode indicator at top

2. **Enter test card details:**
   ```
   Card Number: 4242 4242 4242 4242
   Expiry: 12/34 (any future date)
   CVC: 123
   Name: Test User
   Email: test@example.com
   ```

3. **Click "Subscribe"**
   - Should redirect back to `/settings/billing?success=true`
   - See success toast notification
   - Current plan should update to "Professional"

### Step 5: Test Webhook (Local Testing)

In a new terminal:

```bash
# Install Stripe CLI (if not already installed)
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3001/api/stripe/webhook
```

You should see:
```
> Ready! Your webhook signing secret is whsec_... (^C to quit)
```

Copy the webhook secret and update `.env.local`:
```bash
STRIPE_WEBHOOK_SECRET=whsec_...
```

Restart your dev server for the new secret to take effect.

### Step 6: Trigger Test Webhook

```bash
stripe trigger checkout.session.completed
```

Check the webhook logs to see the event processed.

### Step 7: Test Subscription Management

Back in the billing page:

1. **Click "Manage Subscription"**
   - Opens Stripe Customer Portal
   - Can update payment method
   - Can view invoices

2. **Click "Cancel Plan"**
   - Confirm cancellation
   - Subscription status updates to "Cancels on [date]"
   - Access continues until period end

## 🧪 Testing Complete Flow

### Scenario 1: New User Subscription

1. Create a new test company
2. Navigate to `/settings/billing`
3. Click "Upgrade" on Professional plan
4. Complete checkout with test card
5. Verify subscription active
6. Check Stripe Dashboard for customer and subscription

### Scenario 2: Plan Upgrade

1. Start with Starter plan active
2. Click "Upgrade" on Professional plan
3. Complete checkout
4. Verify prorated charge in Stripe
5. Verify plan updated immediately

### Scenario 3: Usage Limits

1. View usage stats on billing page
2. Note current guest count
3. Try creating guests near limit
4. Verify warning at 80% usage
5. Verify blocking at 100% usage

### Scenario 4: Cancellation

1. Have active subscription
2. Click "Cancel Plan"
3. Confirm cancellation
4. Verify "Cancels on" date shown
5. Verify access continues until date
6. Check webhook received `customer.subscription.updated` with `cancel_at_period_end=true`

## 📊 Verify Everything Works

### Checklist

- [ ] Billing page loads without errors
- [ ] Test mode banner shows
- [ ] Current plan displays correctly
- [ ] Usage stats show real numbers
- [ ] All three plans render
- [ ] Checkout redirects to Stripe
- [ ] Can complete test payment
- [ ] Success redirect works
- [ ] Subscription updates in database
- [ ] Webhooks process correctly
- [ ] Customer portal opens
- [ ] Can cancel subscription
- [ ] Cancellation updates status

## 🔍 Debugging

### Check Convex Logs

```bash
npx convex logs
```

Look for:
- Subscription queries
- Usage stat calculations
- Mutation updates

### Check Next.js Logs

In your terminal where `npm run dev` is running:
- API route calls
- Compilation errors
- Runtime errors

### Check Stripe Dashboard

1. **Customers**: https://dashboard.stripe.com/test/customers
   - Verify customer created
   - Check metadata includes companyId

2. **Subscriptions**: https://dashboard.stripe.com/test/subscriptions
   - Verify subscription active
   - Check correct price ID

3. **Webhooks**: https://dashboard.stripe.com/test/webhooks
   - View recent events
   - Check delivery status
   - See request/response logs

4. **Logs**: https://dashboard.stripe.com/test/logs
   - See all API calls
   - Debug any errors

### Common Issues

**Issue: "No companyId found"**
- Solution: Ensure user is signed in and has companyId in metadata
- Check: `user?.publicMetadata?.companyId`

**Issue: Webhooks not working**
- Solution: Make sure Stripe CLI is running
- Check webhook secret matches in `.env.local`

**Issue: Checkout not redirecting**
- Solution: Check browser console for errors
- Verify API route returns `{ url: string }`

**Issue: Subscription not updating**
- Solution: Check Convex logs for errors
- Verify webhook secret is correct
- Check webhook event is in handled list

## 🎯 What to Test

### Required Tests

1. **✅ Complete Checkout**
   - New subscription creation
   - Customer creation
   - Webhook processing
   - Database update

2. **✅ View Subscription**
   - Current plan display
   - Usage statistics
   - Billing dates
   - Plan features

3. **✅ Upgrade/Downgrade**
   - Change to higher tier
   - Change to lower tier
   - Proration handling
   - Immediate access

4. **✅ Cancellation**
   - Cancel at period end
   - Access continuation
   - Status update
   - Re-activation option

5. **✅ Usage Enforcement**
   - Limit checking
   - Warning at 80%
   - Blocking at 100%
   - Upgrade prompts

### Optional Tests

1. **Payment Failure**
   - Use card `4000000000000002`
   - Verify failure handling
   - Check email notifications

2. **3D Secure**
   - Use card `4000002500003155`
   - Complete 3D Secure flow
   - Verify completion

3. **Webhook Retry**
   - Temporarily break webhook endpoint
   - See retry in Stripe dashboard
   - Fix and verify success

## 📱 Production Deployment

### Before Going Live

1. **Switch to Live Keys**
   ```bash
   STRIPE_SECRET_KEY=sk_live_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
   ```

2. **Create Live Products**
   - Create products in live mode
   - Create price IDs
   - Update env variables

3. **Set Up Production Webhook**
   - Go to Stripe Dashboard → Webhooks
   - Add endpoint: `https://yourdomain.com/api/stripe/webhook`
   - Select events
   - Copy webhook secret
   - Update production env variable

4. **Test with Real Card**
   - Use actual payment method
   - Verify charge appears
   - Check invoice sent

5. **Monitor**
   - Set up Stripe alerts
   - Monitor webhook failures
   - Track subscription metrics

## 🎉 Success Criteria

You're ready for production when:

- ✅ All checklist items pass
- ✅ No console errors
- ✅ Webhooks process reliably
- ✅ Database updates correctly
- ✅ Users can complete checkout
- ✅ Cancellation works properly
- ✅ Usage limits enforce correctly
- ✅ Test mode indicator removed in production
- ✅ Production webhook configured
- ✅ Real payment tested

## 📚 Next Steps

After basic implementation works:

1. **Add Email Notifications**
   - Receipt emails
   - Cancellation confirmations
   - Payment failure alerts

2. **Add Invoice History**
   - List past invoices
   - Download PDFs
   - View payment details

3. **Add Analytics**
   - Track conversions
   - Monitor churn
   - Revenue metrics

4. **Add Promo Codes**
   - Create discount codes
   - Trial extensions
   - Referral bonuses

## 🆘 Getting Help

- **Stripe Docs**: https://stripe.com/docs
- **Stripe Support**: https://support.stripe.com
- **Convex Docs**: https://docs.convex.dev
- **Next.js Docs**: https://nextjs.org/docs

## 🔐 Security Reminders

- ✅ Never commit Stripe keys to git
- ✅ Use environment variables
- ✅ Verify webhook signatures
- ✅ Validate on server-side
- ✅ Check user authorization
- ✅ Use HTTPS in production
