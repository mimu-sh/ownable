import type { Cents } from '@mimu-sh/ownable-core'

export type PaymentEvent = {
  providerEventId: string
  slug: string
  ownerId: string
  amountCents: Cents
}

export interface PaymentAdapter {
  createCheckout(i: {
    slug: string
    ownerId: string
    amountCents: Cents
    returnUrl: string
  }): Promise<{ url: string }>
  verifyWebhook(raw: string, headers: Record<string, string>): Promise<PaymentEvent | null>
}

/**
 * Thrown by verifyWebhook() when the webhook secret itself is missing or
 * malformed — as opposed to a genuinely unverifiable payload (bad
 * signature, tampered body, expired timestamp). Every webhook fails
 * identically until a human fixes the config, so the caller must treat
 * this as retryable (503), never as "ignore, not our event" (202), or
 * every payment is lost silently for as long as the misconfiguration lasts.
 *
 * Inherent limitation, noted rather than silently accepted: a secret that
 * is present and well-formed but simply WRONG is indistinguishable from a
 * forged payload — both fail signature verification identically. HMAC
 * cannot separate "wrong key" from "attacker" by design. Only the
 * missing/malformed case is reliably detectable.
 */
export class WebhookConfigError extends Error {}

// Positively match PERMANENT failures ONLY — everything not matched here
// falls through to 'transient'. Deliberately biased toward the recoverable
// side: retrying a permanent failure is cheap and visible; silently
// terminating a transient one costs a customer their money with no retry
// and no signal at all. The trap this avoids is specific — serverless
// Postgres drivers commonly surface their own connection failures as plain
// Errors carrying no .code, so a default-to-permanent scheme classifies the
// single most likely infrastructure blip as terminal.
//
// 22 = data exception, 23 = integrity constraint violation, 42 = syntax
// error or access rule violation. Each fails again identically on retry;
// only a code or data fix resolves them.
//
// SQLSTATE's 3-character subclass is defined over digits AND uppercase
// letters, not digits alone — e.g. 42P01 (undefined_table, what a missing
// table throws) is squarely a class-42 syntax/access error despite the
// letter. A digits-only pattern misses these and lets a permanently broken
// query retry forever, so the subclass character class below stays
// [0-9A-Z], not \d.
const PERMANENT_SQLSTATE_CLASSES = /^(?:22|23|42)[0-9A-Z]{3}$/

export function classifyFailure(e: unknown): 'transient' | 'permanent' {
  if (e instanceof TypeError || e instanceof ReferenceError) return 'permanent'
  if (typeof e !== 'object' || e === null) return 'transient'
  const code = (e as { code?: unknown }).code
  if (typeof code !== 'string') return 'transient'
  return PERMANENT_SQLSTATE_CLASSES.test(code) ? 'permanent' : 'transient'
}
