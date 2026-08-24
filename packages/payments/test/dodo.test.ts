import { describe, it, expect, vi, afterEach } from 'vitest'
import { Webhook } from 'standardwebhooks'
import { createDodoAdapter, WebhookConfigError } from '../src/index'

const SECRET = Buffer.from('a'.repeat(32)).toString('base64')
const CFG = { apiKey: 'k_test', webhookSecret: SECRET, productId: 'pdt_1' }

function sign(body: unknown, secret = SECRET) {
  const raw = JSON.stringify(body)
  const id = 'msg_1'
  const ts = new Date()
  const sig = new Webhook(secret).sign(id, ts, raw)
  return {
    raw,
    headers: {
      'webhook-id': id,
      'webhook-timestamp': Math.floor(ts.getTime() / 1000).toString(),
      'webhook-signature': sig,
    },
  }
}

const paid = (over: Record<string, unknown> = {}) => ({
  type: 'payment.succeeded',
  data: {
    payment_id: 'pay_1',
    total_amount: 1500,
    currency: 'USD',
    metadata: { slug: 'widget', ownerId: 'a@b.co' },
    ...over,
  },
})

afterEach(() => vi.unstubAllGlobals())

describe('createCheckout', () => {
  it('puts amount INSIDE the cart item, never at the top level', async () => {
    let sent: any
    vi.stubGlobal('fetch', vi.fn(async (_u: string, init: any) => {
      sent = JSON.parse(init.body)
      return { ok: true, json: async () => ({ checkout_url: 'https://pay.example/1' }) }
    }))
    const a = createDodoAdapter(CFG)
    const r = await a.createCheckout({
      slug: 'widget', ownerId: 'a@b.co', amountCents: 1500, returnUrl: 'https://x/ok',
    })
    expect(r.url).toBe('https://pay.example/1')
    expect(sent.product_cart[0]).toEqual({ product_id: 'pdt_1', quantity: 1, amount: 1500 })
    // A top-level amount is not a field the API reads. If amount is absent
    // from the cart item, Dodo treats the product as Pay-What-You-Want and
    // lets the BUYER choose the price.
    expect(sent.amount).toBeUndefined()
  })

  it('pins billing_currency to USD', async () => {
    // Without this, Dodo detects the buyer's currency from their IP, and a
    // non-USD arrival makes the USD guard in verifyWebhook reject a real,
    // paid event: 202, no retry, customer charged, nothing delivered.
    let sent: any
    vi.stubGlobal('fetch', vi.fn(async (_u: string, init: any) => {
      sent = JSON.parse(init.body)
      return { ok: true, json: async () => ({ checkout_url: 'https://pay.example/1' }) }
    }))
    await createDodoAdapter(CFG).createCheckout({
      slug: 'widget', ownerId: 'a@b.co', amountCents: 1500, returnUrl: 'https://x/ok',
    })
    expect(sent.billing_currency).toBe('USD')
  })

  it('uses config, not process.env', async () => {
    const saved = { ...process.env }
    delete process.env.DODO_API_KEY
    delete process.env.DODO_PRODUCT_ID
    delete process.env.DODO_API_BASE
    let url = ''
    let auth = ''
    vi.stubGlobal('fetch', vi.fn(async (u: string, init: any) => {
      url = u; auth = init.headers.Authorization
      return { ok: true, json: async () => ({ checkout_url: 'https://pay.example/1' }) }
    }))
    const a = createDodoAdapter({ ...CFG, apiBase: 'https://test.dodopayments.com' })
    await a.createCheckout({ slug: 'w', ownerId: 'a@b.co', amountCents: 900, returnUrl: 'https://x' })
    expect(url).toBe('https://test.dodopayments.com/checkouts')
    expect(auth).toBe('Bearer k_test')
    process.env = saved
  })

  it('defaults apiBase to live', async () => {
    let url = ''
    vi.stubGlobal('fetch', vi.fn(async (u: string) => {
      url = u
      return { ok: true, json: async () => ({ checkout_url: 'https://pay.example/1' }) }
    }))
    await createDodoAdapter(CFG).createCheckout({
      slug: 'w', ownerId: 'a@b.co', amountCents: 900, returnUrl: 'https://x',
    })
    expect(url).toBe('https://live.dodopayments.com/checkouts')
  })

  it('throws on a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 402 })))
    await expect(createDodoAdapter(CFG).createCheckout({
      slug: 'w', ownerId: 'a@b.co', amountCents: 900, returnUrl: 'https://x',
    })).rejects.toThrow('dodo checkout 402')
  })
})

describe('verifyWebhook', () => {
  it('returns the event for a correctly signed USD payment', async () => {
    const { raw, headers } = sign(paid())
    await expect(createDodoAdapter(CFG).verifyWebhook(raw, headers)).resolves.toEqual({
      providerEventId: 'pay_1', slug: 'widget', ownerId: 'a@b.co', amountCents: 1500,
    })
  })

  it('returns null for a bad signature', async () => {
    const { raw, headers } = sign(paid())
    const tampered = { ...headers, 'webhook-signature': 'v1,YmFk' }
    await expect(createDodoAdapter(CFG).verifyWebhook(raw, tampered)).resolves.toBeNull()
  })

  it('returns null for a non-payment event', async () => {
    const { raw, headers } = sign({ type: 'payment.failed', data: {} })
    await expect(createDodoAdapter(CFG).verifyWebhook(raw, headers)).resolves.toBeNull()
  })

  // 900 JPY is worth about six US cents. Without an explicit currency
  // check it would clear a $9 floor.
  it('returns null for a non-USD currency', async () => {
    const { raw, headers } = sign(paid({ currency: 'JPY' }))
    await expect(createDodoAdapter(CFG).verifyWebhook(raw, headers)).resolves.toBeNull()
  })

  it('returns null when currency is absent entirely', async () => {
    const { raw, headers } = sign(paid({ currency: undefined }))
    await expect(createDodoAdapter(CFG).verifyWebhook(raw, headers)).resolves.toBeNull()
  })

  // p.data?.currency?.toLowerCase() would throw a TypeError on a non-string
  // currency, which classifyFailure reads as permanent — terminal, charged,
  // nothing delivered. A non-string currency must be just another
  // unusable payload, same as a missing one.
  it('returns null when currency is not a string', async () => {
    const { raw, headers } = sign(paid({ currency: 123 }))
    await expect(createDodoAdapter(CFG).verifyWebhook(raw, headers)).resolves.toBeNull()
  })

  it('returns null when metadata is incomplete', async () => {
    const { raw, headers } = sign(paid({ metadata: { slug: 'widget' } }))
    await expect(createDodoAdapter(CFG).verifyWebhook(raw, headers)).resolves.toBeNull()
  })

  it('throws WebhookConfigError when the secret is empty', async () => {
    const { raw, headers } = sign(paid())
    await expect(createDodoAdapter({ ...CFG, webhookSecret: '' }).verifyWebhook(raw, headers))
      .rejects.toBeInstanceOf(WebhookConfigError)
  })

  // HMAC cannot distinguish "wrong key" from "attacker" — a well-formed but
  // WRONG secret fails signature verification exactly like a forged
  // payload. This is the inherent limitation documented on
  // WebhookConfigError: only the missing/malformed case is reliably
  // detectable, so a wrong-but-valid key must return null, not throw.
  it('returns null — not a throw — when the secret is well-formed but wrong', async () => {
    const wrongSecret = Buffer.from('b'.repeat(32)).toString('base64')
    const { raw, headers } = sign(paid(), SECRET)
    await expect(createDodoAdapter({ ...CFG, webhookSecret: wrongSecret }).verifyWebhook(raw, headers))
      .resolves.toBeNull()
  })

  it('throws WebhookConfigError when the secret is not valid base64', async () => {
    const { raw, headers } = sign(paid())
    await expect(createDodoAdapter({ ...CFG, webhookSecret: 'not-valid-base64!!!' }).verifyWebhook(raw, headers))
      .rejects.toBeInstanceOf(WebhookConfigError)
  })
})
