import type { Cents } from '@mimu-sh/ownable-core'
import { WebhookConfigError, type PaymentAdapter, type PaymentEvent } from './types'

export interface DodoConfig {
  apiKey: string
  webhookSecret: string
  productId: string
  /**
   * Defaults to live. A missing value must fail toward "real money,
   * obviously wrong test result" rather than toward silently hitting test
   * mode in production. Point this at Dodo's test host locally so
   * switching modes never requires a code edit.
   */
  apiBase?: string
}

const LIVE = 'https://live.dodopayments.com'

/** standardwebhooks' verify() returns unknown. This is the shape we expect
 *  back from Dodo once verified — narrowed against, never trusted. */
type DodoWebhookPayload = {
  type: string
  data: {
    payment_id: string
    total_amount: number
    currency?: string
    metadata?: { slug?: string; ownerId?: string }
  }
}

export function createDodoAdapter(cfg: DodoConfig): PaymentAdapter {
  const api = cfg.apiBase ?? LIVE

  return {
    async createCheckout(i) {
      const res = await fetch(`${api}/checkouts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cfg.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // `amount` belongs INSIDE the cart item, not at the top level.
          // A top-level `amount` is not a field the API reads, and a cart
          // item without one leaves the product priced "Pay What You
          // Want" — the buyer, not the server, decides what to pay. On the
          // cart item the session is server-priced with no customer input,
          // which is the only form this adapter supports.
          product_cart: [{ product_id: cfg.productId, quantity: 1, amount: i.amountCents }],
          return_url: i.returnUrl,
          metadata: { slug: i.slug, ownerId: i.ownerId },
          // Without this, Dodo detects the buyer's currency from their IP.
          // On an Adaptive-Currency account a non-US buyer is billed in
          // EUR/GBP, the webhook then arrives with a non-USD `currency`,
          // and the USD guard in verifyWebhook below returns null for a
          // real, paid event: 202, no retry, customer charged, nothing
          // delivered. Pinning it here makes that guard enforceable by
          // this code, not dependent on an account-level setting.
          billing_currency: 'USD',
        }),
      })
      if (!res.ok) throw new Error(`dodo checkout ${res.status}`)
      const body = (await res.json()) as { checkout_url: string }
      return { url: body.checkout_url }
    },

    async verifyWebhook(raw, headers): Promise<PaymentEvent | null> {
      const { Webhook, WebhookVerificationError } = await import('standardwebhooks')
      let payload: unknown
      try {
        payload = new Webhook(cfg.webhookSecret).verify(raw, headers)
      } catch (e) {
        if (e instanceof WebhookVerificationError) {
          // Genuinely unverifiable event (bad/missing signature, tampered
          // body, timestamp out of tolerance) — the secret itself is fine.
          return null
        }
        // Anything else — most concretely the constructor's own "Secret
        // can't be empty." when the secret is unset, or a base64 decode
        // failure if it is garbage — means missing or malformed config.
        throw new WebhookConfigError(e instanceof Error ? e.message : String(e))
      }
      const p = payload as DodoWebhookPayload
      if (p?.type !== 'payment.succeeded') return null
      // Money is USD cents specifically — the floor and take price are USD
      // amounts. Without this, 900 of a non-USD minor unit (900 JPY, about
      // six US cents) would silently clear a $9 floor. Reject anything not
      // explicitly USD, including a payload omitting currency entirely.
      if (typeof p.data?.currency !== 'string' || p.data.currency.toLowerCase() !== 'usd') return null
      const m = p.data?.metadata
      if (!m?.slug || !m?.ownerId) return null
      return {
        providerEventId: p.data.payment_id,
        slug: m.slug,
        ownerId: m.ownerId,
        amountCents: p.data.total_amount as Cents,
      }
    },
  }
}
