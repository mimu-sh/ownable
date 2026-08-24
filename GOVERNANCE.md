# Governance

Deliberately small. This is a two-package library maintained by one person; heavier process would
cost more than it protects.

## Who decides

[@davidstrouk](https://github.com/davidstrouk) is the maintainer and has the final say on scope,
API design, and releases. There is no committee, no voting, and no formal membership.

## How decisions get made

- **Bug fixes and doc improvements** — merged on review. No discussion needed to start one.
- **New behaviour or API changes** — discussed in an issue first, in public, before the code
  exists. The bar is whether it belongs in a library that can see neither your database nor your
  users; see **Status** in the [README](./README.md) for what is deliberately out of scope.
- **Breaking changes** — allowed while the project is `0.x`, but they must arrive with a
  changeset, a changelog entry that says what to do about it, and a migration note in the
  affected package's README.
- **Disagreement** — argued in the open, on the issue or pull request. If it does not converge,
  the maintainer decides and says why. "No" is an answer this project is willing to give, and
  forking is a legitimate response to it.

## Becoming a maintainer

There is no application process. Sustained, good-quality contribution — patches, review, or
answering other people's issues — leads to an invitation to commit. If that happens, this
document gets rewritten to describe how a group makes decisions instead of a person.

## If the maintainer disappears

The packages are Apache-2.0 licensed, so anyone may fork and continue the work. If this project
goes unmaintained for a long stretch, expect a note at the top of the README saying so rather
than silence.
