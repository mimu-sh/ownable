## What this changes

<!-- What was wrong, and why this fixes it. Link the issue if there is one. -->

## Checklist

- [ ] Tests cover the change — a bug fix has a test that fails without it
- [ ] `pnpm -r build && pnpm test && pnpm typecheck` passes locally
- [ ] A changeset is included (`pnpm changeset`), or this is docs-only
- [ ] No new runtime dependency in `core`, and nothing reads `process.env`
- [ ] No live deployment is named, and no keys, customer data, or site URLs appear in the diff
- [ ] If a load-bearing comment was changed or removed, the reasoning was updated with it

## Breaking change?

<!-- 0.x allows breaking changes, but say so here and note what consumers must do. -->
