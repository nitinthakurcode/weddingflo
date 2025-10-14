# Stripe Payment System - Implementation Guide

## Overview

A complete Stripe payment and subscription management system has been implemented with the following features:

- ✅ Multiple subscription tiers (Starter, Professional, Enterprise)
- ✅ Stripe Checkout integration
- ✅ Customer portal for subscription management
- ✅ Webhook handling for real-time updates
- ✅ Usage enforcement and limit checking
- ✅ Billing page with current plan and usage stats
- ✅ Upgrade/downgrade flows
- ✅ Cancellation handling

## File Structure

```
src/
├── lib/
│   ├── stripe/
│   │   ├── stripe-client.ts       # Stripe SDK initialization
│   │   ├── config.ts              # Stripe configuration
│   │   └── plans.ts               # Subscription plan definitions
│   └── limits/
│       └── usage-checker.ts       # Usage enforcement logic
├── app/
│   ├── api/
│   │   └── stripe/
│   │       ├── create-checkout/   # Create checkout session
│   │       ├── update-subscription/ # Update subscription tier
│   │       ├── cancel-subscription/ # Cancel subscription
│   │       ├── portal/            # Customer portal access
│   │       └── webhook/           # Stripe webhook handler
│   └── (dashboard)/
│       └── settings/
│           └── billing/
│               └── page.tsx       # Main billing page
└── components/
    ├── billing/
    │   ├── test-mode-banner.tsx   # Test mode indicator
    │   ├── plan-card.tsx          # Individual plan display
    │   ├── plan-comparison.tsx    # All plans comparison
    │   ├── current-plan-card.tsx  # Current subscription card
    │   └── usage-stats.tsx        # Usage statistics display
    └── limits/
        └── upgrade-prompt.tsx     # Limit exceeded prompt

convex/
└── billing.ts                     # Convex billing functions
```

## Subscription Plans

### Starter - $29/month
- 100 guests per event
- 5 events total
- 2 team members
- Basic features

### Professional - $99/month ⭐ Most Popular
- 1,000 guests per event
- Unlimited events
- 10 team members
- Advanced features (AI, analytics, etc.)

### Enterprise - $299/month
- Unlimited guests
- Unlimited events
- Unlimited team members
- All features + white-label + custom domain

## Configuration

All Stripe configuration is in `.env.local`:

```bash
# Stripe Keys
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Product Price IDs
NEXT_PUBLIC_STRIPE_PRICE_STARTER=price_...
NEXT_PUBLIC_STRIPE_PRICE_PROFESSIONAL=price_...
NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE=price_...
```

## Testing the Payment Flow

### 1. Navigate to Billing Page
```
http://localhost:3001/settings/billing
```

### 2. Test Card Numbers (Stripe Test Mode)

**Successful Payment:**
```
Card: 4242 4242 4242 4242
Expiry: Any future date
CVC: Any 3 digits
```

**Failed Payment:**
```
Card: 4000 0000 0000 0002
```

**3D Secure Required:**
```
Card: 4000 0027 6000 3184
```

### 3. Test Flow

1. **View Current Plan**
   - See active subscription tier
   - View renewal date
   - Check usage stats

2. **Upgrade Plan**
   - Click "Upgrade" on a higher tier plan
   - Redirected to Stripe Checkout
   - Complete payment with test card
   - Redirected back with success message

3. **Manage Subscription**
   - Click "Manage Subscription"
   - Opens Stripe Customer Portal
   - Update payment method
   - View invoices

4. **Cancel Subscription**
   - Click "Cancel Plan"
   - Subscription continues until period end
   - Status updates to "cancels on [date]"

## Webhook Setup

### Local Testing with Stripe CLI

1. **Install Stripe CLI:**
```bash
brew install stripe/stripe-cli/stripe
```

2. **Login to Stripe:**
```bash
stripe login
```

3. **Forward webhooks to local:**
```bash
stripe listen --forward-to localhost:3001/api/stripe/webhook
```

4. **Get webhook secret:**
The CLI will output a webhook secret starting with `whsec_`. Add this to `.env.local`:
```bash
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Production Webhook Setup

1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://yourdomain.com/api/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy webhook secret to production environment variables

## Usage Enforcement

### Example: Checking Guest Limit Before Creating

```typescript
import { UsageChecker } from '@/lib/limits/usage-checker';
import { UpgradePrompt } from '@/components/limits/upgrade-prompt';

function GuestList() {
  const subscription = useQuery(api.billing.getCurrentSubscription, { companyId });
  const usage = useQuery(api.billing.getUsageStats, { companyId });

  const handleAddGuest = () => {
    if (!subscription || !usage) return;

    const checker = new UsageChecker(subscription.tier, {
      guestsCount: usage.guestsCount,
      eventsCount: usage.eventsCount,
      usersCount: usage.usersCount,
    });

    const guestCheck = checker.checkGuestLimit(1);

    if (!guestCheck.allowed) {
      // Show upgrade prompt
      toast({
        title: 'Guest Limit Reached',
        description: guestCheck.message,
      });
      return;
    }

    // Proceed with adding guest
    createGuest(...);
  };
}
```

### Example: Displaying Upgrade Prompt

```typescript
import { UpgradePrompt } from '@/components/limits/upgrade-prompt';

<UpgradePrompt
  title="Guest Limit Reached"
  message="You've reached your plan's guest limit. Upgrade to add more guests."
  resourceType="guests"
/>
```

## Webhook Events Handled

### checkout.session.completed
- Creates/updates company subscription
- Sets Stripe customer ID
- Sets subscription tier and status

### customer.subscription.updated
- Updates subscription tier
- Updates billing period dates
- Handles plan changes (upgrade/downgrade)

### customer.subscription.deleted
- Marks subscription as canceled
- Sets canceled_at timestamp

### invoice.payment_succeeded
- Confirms successful payment
- Can trigger receipt emails

### invoice.payment_failed
- Alerts on failed payment
- Can trigger dunning emails

## Database Schema Updates

The `companies` table subscription object now includes:

```typescript
subscription: {
  tier: 'starter' | 'professional' | 'enterprise',
  status: 'active' | 'trial' | 'past_due' | 'canceled' | 'trialing' | 'unpaid',
  stripe_customer_id?: string,
  stripe_subscription_id?: string,
  stripe_price_id?: string,
  current_period_start?: number,
  current_period_end?: number,
  cancel_at_period_end?: boolean,
  canceled_at?: number,
  billing_cycle: string,
  trial_ends_at?: number,
}
```

## API Routes

### POST /api/stripe/create-checkout
Creates a Stripe Checkout session for subscription.

**Body:**
```json
{
  "priceId": "price_...",
  "companyId": "..."
}
```

### POST /api/stripe/update-subscription
Updates an existing subscription to a new plan.

**Body:**
```json
{
  "companyId": "...",
  "newPriceId": "price_..."
}
```

### POST /api/stripe/cancel-subscription
Cancels a subscription at period end.

**Body:**
```json
{
  "companyId": "..."
}
```

### POST /api/stripe/portal
Creates a Stripe Customer Portal session.

**Body:**
```json
{
  "companyId": "..."
}
```

### POST /api/stripe/webhook
Handles Stripe webhook events (secured with signature verification).

## Convex Functions

### Query: getCurrentSubscription
Gets the current subscription for a company.

### Query: getUsageStats
Gets actual usage counts for guests, events, and users.

### Query: getCompanyByStripeCustomerId
Finds a company by their Stripe customer ID.

### Mutation: updateSubscriptionFromStripe
Updates company subscription from Stripe webhook data.

### Mutation: updateStripeCustomerId
Sets the Stripe customer ID for a company.

## Security Considerations

1. **Webhook Signature Verification**: All webhooks are verified using Stripe's signature
2. **Authentication**: All API routes check for authenticated user
3. **Authorization**: Company ownership is verified before operations
4. **Test Mode Indicator**: Clear banner shown in test mode

## Common Issues & Troubleshooting

### Issue: Webhooks not working locally
**Solution:** Make sure Stripe CLI is running and forwarding to correct port:
```bash
stripe listen --forward-to localhost:3001/api/stripe/webhook
```

### Issue: "No Stripe customer found" error
**Solution:** User needs to complete checkout at least once to create customer

### Issue: Subscription not updating after payment
**Solution:** Check webhook logs in Stripe Dashboard and verify webhook secret is correct

### Issue: Test mode banner showing in production
**Solution:** Ensure STRIPE_SECRET_KEY in production starts with `sk_live_` not `sk_test_`

## Next Steps

1. **Email Notifications**
   - Send receipt emails after successful payment
   - Send dunning emails for failed payments
   - Send cancellation confirmation

2. **Invoice History**
   - Create billing history page
   - Display past invoices
   - Allow invoice downloads

3. **Payment Method Management**
   - Display current payment method
   - Allow updating without Customer Portal

4. **Analytics**
   - Track subscription conversions
   - Monitor churn rate
   - Analyze upgrade patterns

## Support

For Stripe-related issues:
- Stripe Dashboard: https://dashboard.stripe.com
- Stripe Logs: https://dashboard.stripe.com/logs
- Stripe Webhooks: https://dashboard.stripe.com/webhooks
- Stripe Docs: https://stripe.com/docs
