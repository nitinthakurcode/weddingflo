import Stripe from 'stripe';

// Lazy initialization - client created on first use (not at build time)
let stripeClient: Stripe | null = null;

function getStripeClient(): Stripe {
  if (!stripeClient) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-12-15.clover',
      typescript: true,
    });
  }
  return stripeClient;
}

// Legacy export for backward compatibility
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return (getStripeClient() as any)[prop];
  }
});

// Supported currencies with their symbols and names
export const SUPPORTED_CURRENCIES = {
  usd: { symbol: '$', name: 'US Dollar', locale: 'en-US' },
  eur: { symbol: '€', name: 'Euro', locale: 'en-EU' },
  gbp: { symbol: '£', name: 'British Pound', locale: 'en-GB' },
  cad: { symbol: 'C$', name: 'Canadian Dollar', locale: 'en-CA' },
  aud: { symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU' },
  jpy: { symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP' },
  inr: { symbol: '₹', name: 'Indian Rupee', locale: 'en-IN' },
} as const;

export type SupportedCurrency = keyof typeof SUPPORTED_CURRENCIES;

// Format amount based on currency (Stripe uses smallest unit - cents for USD, etc)
export function formatStripeAmount(amount: number, currency: SupportedCurrency): string {
  const currencyInfo = SUPPORTED_CURRENCIES[currency];

  // JPY and other zero-decimal currencies don't use cents
  const divisor = ['jpy', 'krw'].includes(currency) ? 1 : 100;
  const actualAmount = amount / divisor;

  return new Intl.NumberFormat(currencyInfo.locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(actualAmount);
}

// Convert amount to Stripe's smallest unit
export function toStripeAmount(amount: number, currency: SupportedCurrency): number {
  // JPY and other zero-decimal currencies don't use cents
  const multiplier = ['jpy', 'krw'].includes(currency) ? 1 : 100;
  return Math.round(amount * multiplier);
}

// Convert from Stripe's smallest unit to decimal
export function fromStripeAmount(amount: number, currency: SupportedCurrency): number {
  const divisor = ['jpy', 'krw'].includes(currency) ? 1 : 100;
  return amount / divisor;
}

// Create Stripe Connect account for vendor
export async function createConnectAccount({
  email,
  businessName,
  country = 'US',
}: {
  email: string;
  businessName: string;
  country?: string;
}): Promise<Stripe.Account> {
  try {
    const account = await stripe.accounts.create({
      type: 'express',
      country,
      email,
      business_type: 'individual',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_profile: {
        name: businessName,
      },
    });

    return account;
  } catch (error) {
    console.error('Error creating Stripe Connect account:', error);
    throw error;
  }
}

// Create account link for Connect onboarding
export async function createAccountLink({
  accountId,
  returnUrl,
  refreshUrl,
}: {
  accountId: string;
  returnUrl: string;
  refreshUrl: string;
}): Promise<string> {
  try {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });

    return accountLink.url;
  } catch (error) {
    console.error('Error creating account link:', error);
    throw error;
  }
}

// Create payment intent
export async function createPaymentIntent({
  amount,
  currency,
  customerId,
  metadata,
  connectedAccountId,
  applicationFeeAmount,
}: {
  amount: number; // In smallest currency unit (cents for USD)
  currency: SupportedCurrency;
  customerId?: string;
  metadata?: Record<string, string>;
  connectedAccountId?: string; // For Stripe Connect
  applicationFeeAmount?: number; // Platform fee
}): Promise<Stripe.PaymentIntent> {
  try {
    const params: Stripe.PaymentIntentCreateParams = {
      amount,
      currency,
      customer: customerId,
      metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    };

    // If using Stripe Connect, specify destination account and fee
    if (connectedAccountId) {
      params.transfer_data = {
        destination: connectedAccountId,
      };
      if (applicationFeeAmount) {
        params.application_fee_amount = applicationFeeAmount;
      }
    }

    const paymentIntent = await stripe.paymentIntents.create(params);
    return paymentIntent;
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
}

// Retrieve payment intent
export async function retrievePaymentIntent(
  paymentIntentId: string
): Promise<Stripe.PaymentIntent> {
  try {
    return await stripe.paymentIntents.retrieve(paymentIntentId);
  } catch (error) {
    console.error('Error retrieving payment intent:', error);
    throw error;
  }
}

// Create refund
export async function createRefund({
  paymentIntentId,
  amount,
  reason,
}: {
  paymentIntentId: string;
  amount?: number; // Optional - full refund if not specified
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
}): Promise<Stripe.Refund> {
  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount,
      reason,
    });

    return refund;
  } catch (error) {
    console.error('Error creating refund:', error);
    throw error;
  }
}

// Create Stripe customer
export async function createCustomer({
  email,
  name,
  phone,
  metadata,
}: {
  email: string;
  name?: string;
  phone?: string;
  metadata?: Record<string, string>;
}): Promise<Stripe.Customer> {
  try {
    const customer = await stripe.customers.create({
      email,
      name,
      phone,
      metadata,
    });

    return customer;
  } catch (error) {
    console.error('Error creating customer:', error);
    throw error;
  }
}

// Retrieve customer
export async function retrieveCustomer(customerId: string): Promise<Stripe.Customer> {
  try {
    return await stripe.customers.retrieve(customerId) as Stripe.Customer;
  } catch (error) {
    console.error('Error retrieving customer:', error);
    throw error;
  }
}

// Get Connect account balance
export async function getAccountBalance(
  accountId: string
): Promise<Stripe.Balance> {
  try {
    return await stripe.balance.retrieve({
      stripeAccount: accountId,
    });
  } catch (error) {
    console.error('Error retrieving account balance:', error);
    throw error;
  }
}

// Verify webhook signature
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string
): Stripe.Event {
  try {
    return stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    throw error;
  }
}

// Payment status helpers
export function isPaymentSuccessful(
  paymentIntent: Stripe.PaymentIntent
): boolean {
  return paymentIntent.status === 'succeeded';
}

export function isPaymentPending(paymentIntent: Stripe.PaymentIntent): boolean {
  return ['processing', 'requires_action', 'requires_confirmation'].includes(
    paymentIntent.status
  );
}

export function isPaymentFailed(paymentIntent: Stripe.PaymentIntent): boolean {
  return ['canceled', 'failed'].includes(paymentIntent.status);
}
