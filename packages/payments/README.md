# @mimu-sh/ownable-payments

Provider logic for contested-ownership sites. No database, no `process.env`.

```ts
import { createDodoAdapter, classifyFailure } from '@mimu-sh/ownable-payments'

const dodo = createDodoAdapter({
  apiKey: process.env.DODO_API_KEY!,          // read env in YOUR app, not here
  webhookSecret: process.env.DODO_WEBHOOK_SECRET!,
  productId: process.env.DODO_PRODUCT_ID!,
  apiBase: process.env.DODO_API_BASE,         // omit for live
})
```

**The Dodo product must be configured Pay-What-You-Want and Single Payment.** Otherwise the
per-cart-item `amount` is ignored and every checkout charges the product's fixed price.

`verifyWebhook` returns `null` for anything unverifiable or irrelevant, and throws
`WebhookConfigError` when the secret is missing or malformed. Treat the throw as retryable (503),
never as "ignore" (202) — otherwise a misconfiguration loses every payment silently.

`verifyWebhook` returns `ownerId` and `amountCents` raw, with no normalisation. Trim/lowercase/
length-cap the owner id and integer-check the amount in your own fulfilment code before using
them — two casings of the same email (`A@b.co` vs `a@b.co`) would otherwise become two separate
owners holding different units instead of one.

`classifyFailure` returns `'transient'` for anything it does not positively recognise as permanent.
This is deliberate: serverless Postgres drivers commonly surface real connection failures as plain
`Error`s with no `.code`, and treating those as permanent turns the likeliest infrastructure blip
into a charge with nothing delivered.

Versioned `0.x`: minor bumps may break.
