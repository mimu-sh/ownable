# Contributing to ownable

Thanks for being here. This is a small project maintained in spare hours, so this document is
mostly about setting expectations honestly in both directions — what you can expect from us, and
what makes a change easy to accept.

## Ways to help that are not code

- **Tell us where the docs lie.** If a README made you guess, that is a bug worth filing.
- **Report a real-world integration problem.** Especially around payment providers, where the
  failure modes are hard to discover from documentation alone.
- **Improve an error message.** A `Verdict` or a thrown error that does not say what to do next
  is a defect.

## Setting up

Requires Node 22+ and [pnpm](https://pnpm.io) (the version in `packageManager` is authoritative;
`corepack enable` will pick it up for you).

```bash
git clone https://github.com/mimu-sh/ownable.git
cd ownable
pnpm install
pnpm -r build      # payments typechecks against core's built declarations
pnpm test          # vitest, all packages
pnpm typecheck     # builds first, then tsc --noEmit everywhere
```

`pnpm test -- --watch` while you work. CI runs the same commands plus
[`attw`](https://github.com/arethetypeswrong/arethetypeswrong.github.io), which checks that the
dual ESM/CJS type entry points resolve correctly for consumers.

## Before you open a large pull request

Open an issue first and describe what you want to change. This is not bureaucracy — it is so you
don't spend an evening on something that is out of scope (see **Status** in the
[README](./README.md)), or that a maintainer is already halfway through.

Small fixes, doc corrections, and added test cases need no discussion. Just send them.

## What a good change looks like here

1. **Tests come with it.** New behaviour needs tests; a bug fix needs a test that fails without
   the fix. The existing suites are the style guide.
2. **Comments explain *why*, not *what*.** Several comments in this codebase are load-bearing:
   they record a failure mode that cost real money to discover. If you change such code, update
   the reasoning with it. If you delete a comment because it looks redundant, please make sure
   you have understood what it was protecting.
3. **No new runtime dependencies in `core`.** It is a zero-dependency package on purpose. In
   `payments`, a new dependency needs a justification in the pull request.
4. **No configuration read from the environment.** Packages take config as arguments. If your
   change needs a value, add it to a config object.
5. **Money stays integer cents.** Never floats, never an implicit currency.
6. **Add a changeset.** Run `pnpm changeset`, pick the affected packages and a bump type, and
   commit the generated file. Doc-only changes can skip this.

Formatting: match the surrounding file. There is no linter to argue with, so please do not
reformat code you are not otherwise changing — it buries the actual diff.

## Commit messages and pull requests

Conventional-commit prefixes (`feat:`, `fix:`, `docs:`, `chore:`) are used here, scoped by package
where it helps (`fix(payments): ...`). The important part is the body: say what was wrong and why
this fixes it.

**Please keep downstream deployments out of the repository.** Do not name a specific production
site, paste its data, describe how it is hosted, or file a public issue that amounts to "site X
built on this library can be exploited this way". If a bug here has consequences for a live site,
that makes it a security report — see [SECURITY.md](./SECURITY.md).

## Review and response times

One maintainer, no SLA. Expect a first response within a week or so; ping the pull request if it
has gone quiet for longer, which is a normal and welcome thing to do rather than a nuisance.

Not every pull request will be merged. If yours is declined, it is about scope or maintenance
cost, not about you — and a declined change is still welcome to live as a fork.

## Releasing

Maintainers only: releases run from the `Release` workflow via `workflow_dispatch`, which
publishes through [changesets](https://github.com/changesets/changesets) to npm with provenance.

## Code of Conduct

Participation is governed by the [Code of Conduct](./CODE_OF_CONDUCT.md).
