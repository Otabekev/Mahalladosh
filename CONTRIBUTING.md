# Contributing to Mahalladosh

Thanks for your interest. This guide gets you from a clean checkout to a green
test run.

## Repository layout

```
mahalladosh/
├─ api/    FastAPI backend  (app/routers, models, scheduler, analytics, tests)
└─ web/    Vite + React PWA (src/screens, src/core, src/components)
```

## Backend (Python 3.12)

```bash
cd api
python -m venv .venv
.venv/Scripts/pip install -r requirements-dev.txt   # source .venv/bin/activate on macOS/Linux
.venv/Scripts/python demo_seed.py                   # populate a demo mahalla
.venv/Scripts/python -m uvicorn app.main:app --reload --port 8000
```

Before pushing, run the same checks CI runs:

```bash
cd api
ruff check .        # lint (also: ruff check --fix .)
pytest              # hermetic suite on a throwaway SQLite DB
```

The dev database is SQLite (`api/mahalladosh.db`), created automatically. There
are no migrations in dev — the schema is built from the models on startup, so
after a model change, delete the file and re-run `demo_seed.py`.

## Frontend

```bash
cd web
npm install
npm run dev         # http://localhost:5174  (proxies /api → :8000)
npm run build       # typecheck (tsc --noEmit) + production build — CI runs this
```

## Conventions

- **Commits** follow [Conventional Commits](https://www.conventionalcommits.org/):
  `feat:`, `fix:`, `test:`, `chore:`, `style:`, `docs:`. Keep each commit a single
  logical change.
- **Business logic stays UI-free.** Anything reusable by a future native app lives
  in `web/src/core/` (API client, queries, stores, i18n); screens only compose it.
- **Four languages, always.** New user-facing strings go through the i18n dicts in
  `web/src/core/i18n/` in all four: `uz` (Latin), `uzc` (Cyrillic), `ru`, `en`.
- **Elder-first UX.** Large tap targets, icon + label, ≤2 taps to any core action.
- **The API contract is the source of truth.** `api/app/schemas.py` and
  `web/src/core/api/types.ts` mirror each other — change them together.
- Every behavioural change to the backend should come with a test.
