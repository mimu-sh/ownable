import type { Cents } from './rules'

const WHOLE = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const CENTS = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })

export function usd(cents: Cents): string {
  return cents % 100 === 0 ? WHOLE.format(cents / 100) : CENTS.format(cents / 100)
}
