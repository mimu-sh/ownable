# @mimu-sh/ownable-core

Pure economics for contested-ownership sites. Zero dependencies, no I/O, no clock.

```ts
import { createRuleset } from '@mimu-sh/ownable-core'

const rules = createRuleset({ floorCents: 900, takeMultiplier: 1.5 })
rules.askingPrice(null)                                 // 900 — unheld, so the floor
rules.askingPrice({ ownerId: 'a', priceCents: 1000 })   // 1500 — held, so 1.5x
rules.validateAcquire(null, 899)
// { ok: false, reason: 'below_floor', requiredCents: 900 }
```

`priceToTake` rounds up, which guarantees the price strictly increases — no takeover is ever free.

`Verdict`'s `'not_held'` reason is never returned by `validateAcquire`. Emit it yourself when a
requested unit is absent from your inventory; this package does not know your inventory.

Slug collisions are also yours to detect. `slugify` normalises one string at a time.

## Migrating existing slugs

`slugify` collapses runs of separator characters, so `'rock -- roll'` produces `rock-roll`
rather than `rock----roll`. If you are moving an existing deployment onto this package and its
slugs were produced by a different implementation, re-derive and diff them before you migrate:
slugs are identity here, and a changed slug is a changed primary key.

Versioned `0.x`: minor bumps may break.
