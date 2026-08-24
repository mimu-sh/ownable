# ownable

[![CI](https://github.com/mimu-sh/ownable/actions/workflows/ci.yml/badge.svg)](https://github.com/mimu-sh/ownable/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](./LICENSE)

Building blocks for **contested-ownership sites** — pages where every item has an owner, and
anyone can take that ownership by paying more than the current holder did.

The pricing rules and the payment plumbing for that pattern are fiddly in the same ways every
time: the price has to strictly increase or takeovers become free, a webhook that arrives in the
wrong currency has to be rejected without dropping a real payment, and a database blip must not
be mistaken for a permanent failure and charge someone for nothing. These packages are that
logic, extracted and tested, with no opinion about your framework, database, or hosting.

```bash
npm install @mimu-sh/ownable-core @mimu-sh/ownable-payments
```

```ts
import { createRuleset, usd } from '@mimu-sh/ownable-core'

const rules = createRuleset({ floorCents: 900, takeMultiplier: 1.5 })

rules.askingPrice(null)                                // 900  — unheld, so the floor
rules.askingPrice({ ownerId: 'a', priceCents: 1000 })  // 1500 — held, so 1.5x
usd(1500)                                              // '$15'

rules.validateAcquire(null, 899)
// { ok: false, reason: 'below_floor', requiredCents: 900 }
```

## Packages

| Package | What it is |
| --- | --- |
| [`@mimu-sh/ownable-core`](./packages/core) | Pure economics: floor prices, take-over pricing, verdicts, slugs. Zero dependencies, no I/O, no clock. |
| [`@mimu-sh/ownable-payments`](./packages/payments) | A provider-agnostic payment contract, a Dodo Payments adapter, and a retry-safe failure classifier. No database, no `process.env`. |

Each package has its own README with the full API and the reasoning behind the sharp edges.

## Design rules

These hold across both packages and are the reason they are worth extracting at all:

- **Configuration is injected, never module-level.** No package reads `process.env`. Your app
  reads its own environment and hands values in, so tests need no environment and two rulesets
  can coexist in one process.
- **Pure where it can be.** `ownable-core` has no dependencies, does no I/O, and reads no clock,
  so every rule is testable as a plain function.
- **Fail toward the recoverable side.** Unrecognised failures are classified transient and
  retried, because a wrongly-terminal payment costs a real customer real money silently, while a
  wrongly-retried one is cheap and visible.
- **Money is USD cents, as integers.** No floats, no implicit currency conversion.

## Status

`0.x` and honest about it: minor bumps may break. The API is small and the test suite is
thorough, but it has not been through many hands yet. Pin an exact version if that matters to you.

Deliberately **out of scope** — these belong to your application, not to a library that cannot see
your data:

- storage, inventory, and whether a requested item exists at all
- slug collision detection (`slugify` normalises one string at a time)
- normalising an owner id before you key on it, and idempotency on webhook replay
- auth, sessions, and anything about who a user is

## Contributing

Issues and pull requests are welcome — including "the README didn't explain this", which is a
real bug. Start with [CONTRIBUTING.md](./CONTRIBUTING.md) for the setup and the review
expectations, and [GOVERNANCE.md](./GOVERNANCE.md) for who decides what.

Everyone taking part is expected to follow the [Code of Conduct](./CODE_OF_CONDUCT.md). To report
a security issue, follow [SECURITY.md](./SECURITY.md) rather than opening a public issue.

## License

[Apache-2.0](./LICENSE) © mimu.sh
