<!-- Keep PRs small and single-purpose. -->

## What & why

<!-- One or two sentences: what does this change and what problem does it solve? -->

Closes #

## How I verified

<!-- Tests added/updated? Manual steps? Screenshots for UI changes? -->

- [ ] `cd api && ruff check . && pytest` passes
- [ ] `cd web && npm run build` passes

## Checklist

- [ ] Commit messages follow Conventional Commits (`feat:`, `fix:`, `test:`…)
- [ ] User-facing strings added in all four languages (uz / uzc / ru / en)
- [ ] Elder-first: large tap targets, icon + label, ≤2 taps to the action
- [ ] `api/app/schemas.py` and `web/src/core/api/types.ts` kept in sync
