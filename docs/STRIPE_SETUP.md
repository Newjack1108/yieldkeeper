# Stripe Setup for YieldKeeper

YieldKeeper uses Stripe for tenant payments on maintenance tasks (window cleaning, grass cutting, gutter cleanout, etc.) and quoted custom work.

## Environment Variables

Add to your `.env`:

```env
STRIPE_SECRET_KEY=<from Stripe Dashboard>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<from Stripe Dashboard>
STRIPE_WEBHOOK_SECRET=<from Stripe CLI or Dashboard>
```

- **STRIPE_SECRET_KEY**: From [Stripe Dashboard](https://dashboard.stripe.com/apikeys) (use test keys for development)
- **NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY**: Publishable key from the same page
- **STRIPE_WEBHOOK_SECRET**: Created when you add a webhook endpoint (see below)

## Webhook Setup

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login: `stripe login`
3. Forward webhooks to local: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
4. Copy the webhook signing secret (starts with `whsec_`) to `STRIPE_WEBHOOK_SECRET`

For production, add a webhook in [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks):
- Endpoint URL: `https://yourdomain.com/api/webhooks/stripe`
- Events: `payment_intent.succeeded`
