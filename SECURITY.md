# Security Policy

## Supported versions

This project is pre-1.0. Only the latest published version of each package receives security
fixes; there are no backports to older `0.x` releases.

| Package | Supported |
| --- | --- |
| `@mimu-sh/ownable-core` | latest `0.x` release |
| `@mimu-sh/ownable-payments` | latest `0.x` release |

## Reporting a vulnerability

**Please do not open a public issue for a security problem.**

Report it privately through GitHub:
[**Report a vulnerability**](https://github.com/mimu-sh/ownable/security/advisories/new). If you
cannot use GitHub Security Advisories, email **davidstrouk@gmail.com** with `ownable security` in
the subject line.

Useful things to include: the affected package and version, what an attacker gains, and the
smallest reproduction you can manage — ideally a failing test against this repository.

What to expect:

- acknowledgement within **5 business days**
- an assessment, and a fix or an explanation of why it is not a vulnerability, within **30 days**
- credit in the advisory and the changelog, unless you would rather stay anonymous

This is a small project maintained in spare hours; those are honest targets, not a contractual
SLA. If a report goes unanswered past them, please follow up.

## Please keep live deployments out of your report

This library is used by sites that take real payments. If you have found a problem in a
**specific website** that uses it — rather than in this code — report it to that site's operator.
Do not report it here, and please do not include in any report to us:

- the name, URL, or hosting details of a site built on these packages
- account, order, or customer data from such a site
- credentials, tokens, or webhook secrets, whether yours or somebody else's

If a flaw in *this* library has consequences for live sites, describe the flaw in library terms
and we will handle coordinated disclosure with the operators we know of. A report that turns out
to affect deployments will stay embargoed until a fixed version is published.

## Testing scope

Testing against this repository, the published packages, and your own deployments is welcome.
Testing against somebody else's live site is not authorised by this policy and is not something
we can authorise on their behalf.

## What this library does and does not defend

Worth knowing before you file:

- **Configuration is the consumer's job.** Every package takes secrets as arguments and reads no
  environment variables. A leaked API key or webhook secret in an application's own configuration
  is that application's issue.
- **Webhook signature verification** is delegated to
  [`standardwebhooks`](https://github.com/standard-webhooks/standard-webhooks). A well-formed but
  *wrong* secret is indistinguishable from a forged payload by design — HMAC cannot separate the
  two — and that is documented, not a defect.
- **Idempotency and replay protection are the consumer's job.** `verifyWebhook` returns a
  `providerEventId` precisely so you can de-duplicate; it does not remember anything itself.
- **Input normalisation is the consumer's job.** `ownerId` and `amountCents` are returned raw and
  must be validated before you key on them.

A report showing that one of these boundaries is documented wrongly, or is impossible to hold up
correctly as a consumer, *is* a valid report.
