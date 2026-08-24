import { describe, it, expect } from 'vitest'
import {
  priceToTake, askingPrice, validateAcquire, createRuleset, usd,
  type Ruleset,
} from '../src/index'

const RULES: Ruleset = { floorCents: 900, takeMultiplier: 1.5 }

describe('priceToTake', () => {
  it('applies the configured multiplier', () => expect(priceToTake(1000, RULES)).toBe(1500))
  it('rounds up, never down', () => {
    expect(priceToTake(901, RULES)).toBe(1352)
    expect(priceToTake(3, RULES)).toBe(5)
  })
  it('always strictly exceeds the current price', () => {
    for (const p of [1, 2, 3, 900, 901, 12345]) {
      expect(priceToTake(p, RULES)).toBeGreaterThan(p)
    }
  })
})

describe('askingPrice', () => {
  it('is the floor when unheld', () => expect(askingPrice(null, RULES)).toBe(900))
  it('is the take price when held', () => {
    expect(askingPrice({ ownerId: 'a', priceCents: 1000 }, RULES)).toBe(1500)
  })
})

describe('validateAcquire', () => {
  it('accepts a claim at exactly the floor', () => {
    expect(validateAcquire(null, 900, RULES)).toEqual({ ok: true })
  })
  it('rejects a claim below the floor', () => {
    expect(validateAcquire(null, 899, RULES))
      .toEqual({ ok: false, reason: 'below_floor', requiredCents: 900 })
  })
  it('accepts a take at exactly 1.5x', () => {
    expect(validateAcquire({ ownerId: 'a', priceCents: 1000 }, 1500, RULES)).toEqual({ ok: true })
  })
  it('rejects a take one cent short and reports the real price', () => {
    expect(validateAcquire({ ownerId: 'a', priceCents: 1000 }, 1499, RULES))
      .toEqual({ ok: false, reason: 'below_take_price', requiredCents: 1500 })
  })
})

describe('a non-default ruleset', () => {
  const cheap: Ruleset = { floorCents: 100, takeMultiplier: 2 }
  it('uses the configured floor', () => expect(askingPrice(null, cheap)).toBe(100))
  it('uses the configured multiplier', () => expect(priceToTake(250, cheap)).toBe(500))
  it('reports the configured floor when rejecting', () => {
    expect(validateAcquire(null, 99, cheap))
      .toEqual({ ok: false, reason: 'below_floor', requiredCents: 100 })
  })
  it('still rounds up under a fractional multiplier', () => {
    expect(priceToTake(101, { floorCents: 100, takeMultiplier: 1.5 })).toBe(152)
  })
})

describe('createRuleset', () => {
  it('binds config once and behaves identically', () => {
    const r = createRuleset({ floorCents: 500, takeMultiplier: 3 })
    expect(r.askingPrice(null)).toBe(500)
    expect(r.priceToTake(100)).toBe(300)
    expect(r.validateAcquire(null, 499))
      .toEqual({ ok: false, reason: 'below_floor', requiredCents: 500 })
    expect(r.validateAcquire(null, 500)).toEqual({ ok: true })
  })
})

describe('usd', () => {
  it('formats cents as dollars', () => {
    expect(usd(900)).toBe('$9')
    expect(usd(1352)).toBe('$13.52')
    expect(usd(1500000)).toBe('$15,000')
  })
})
