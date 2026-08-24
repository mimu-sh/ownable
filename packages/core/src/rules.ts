export type Cents = number
export type Holding = { ownerId: string; priceCents: Cents } | null

export type Verdict =
  | { ok: true }
  | {
      ok: false
      reason: 'below_floor' | 'not_held' | 'below_take_price'
      requiredCents: Cents
    }

/** The economics of one project. Injected, never module-level constants. */
export interface Ruleset {
  floorCents: Cents
  takeMultiplier: number
}

/**
 * Math.ceil is load-bearing: it guarantees the price strictly increases at
 * every price point, so no takeover can ever be free.
 */
export function priceToTake(current: Cents, rules: Ruleset): Cents {
  return Math.ceil(current * rules.takeMultiplier)
}

/** The price a visitor must pay right now, whether claiming or taking. */
export function askingPrice(h: Holding, rules: Ruleset): Cents {
  return h === null ? rules.floorCents : priceToTake(h.priceCents, rules)
}

export function validateAcquire(h: Holding, offered: Cents, rules: Ruleset): Verdict {
  const required = askingPrice(h, rules)
  if (offered < required) {
    return {
      ok: false,
      reason: h === null ? 'below_floor' : 'below_take_price',
      requiredCents: required,
    }
  }
  return { ok: true }
}

/** Binds a Ruleset once so application code stops threading it through. */
export function createRuleset(rules: Ruleset) {
  return {
    priceToTake: (current: Cents) => priceToTake(current, rules),
    askingPrice: (h: Holding) => askingPrice(h, rules),
    validateAcquire: (h: Holding, offered: Cents) => validateAcquire(h, offered, rules),
  }
}
