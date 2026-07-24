# Mahalladosh

[![CI](https://github.com/Otabekev/Mahalladosh/actions/workflows/ci.yml/badge.svg)](https://github.com/Otabekev/Mahalladosh/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-b23a28.svg)](LICENSE)
![Python 3.12](https://img.shields.io/badge/Python-3.12-157c84.svg)
![React 19](https://img.shields.io/badge/React-19-157c84.svg)
![PWA](https://img.shields.io/badge/PWA-installable-d89a2a.svg)

**A social platform for the Uzbek _mahalla_ — the digital _guzar_ where a whole neighbourhood knows, honours, and helps one another again.**

Uzbekistan crossed a historic line in 2026: for the first time, more people live in cities than in rural mahallas. As neighbourhoods urbanise, the mahalla’s social fabric — knowing whose family is whose, who to ask for help, who has lived on your street for three generations — is quietly disappearing. Mahalladosh rebuilds it, digitally, around the unit Uzbeks already trust.

> _Mahalla — bu biz._ (The neighbourhood is us.)

---

## What it does

- **🏠 Family & household pages** — the core differentiator. Each household records its generational history, elders, and album. Non-portable memory no competitor can scrape — and the reason people stay.
- **🤝 Mutual aid** — structured “need help” posts with a confirm-and-thank loop that awards **obro’** (honour), not likes. The person who was helped grants the points.
- **⭐ Honour, not vanity** — a monthly _Faol qo‘shni_ (active neighbour) is celebrated with a gold medallion and a real leaderboard podium, awarded by the raisi.
- **🔔 DingDong** — a virtual doorbell: ring a neighbour only when GPS puts you at their gate; their phone chimes.
- **🗳 Community governance** — any resident proposes; neighbours second it; a time-boxed vote decides. Punitive actions carry a higher bar (supermajority + quorum + the accused can respond).
- **🌏 Discover** — a viewer-scoped feed: my mahalla / my region / all of Uzbekistan.
- **🏘 Petition-to-open** — a mahalla activates once enough neighbours request it; no empty rooms.
- **4 languages** — O‘zbekcha (lotin), Ўзбекча (кирилл), Русский, English. Elder-first UX with a large-text mode.

## Built for the pilot

Analytics (DAU/retention, activation funnel), a background scheduler (vote deadlines, reminders, monthly honour, weekly digest), offline resilience for village connectivity, moderation (report → admin queue → takedown/ban with a repeat-offender ledger), a privacy gate (family history visible only to verified neighbours), and account self-service (join/leave/edit/delete). Installable PWA.

## Tech

| Layer | Stack |
|---|---|
| **Frontend** | React 19 · TypeScript (strict) · Vite · Tailwind v4 · TanStack Query · Zustand · installable PWA |
| **Backend** | FastAPI · SQLAlchemy 2 · Pydantic v2 · JWT sessions · Pillow |
| **Design** | An original Uzbek design system — suzani/tilework palette (terracotta · teal · gold on warm paper), Rubik + Cormorant Garamond, a girih-star mark |
| **Data** | Real Uzbek region/district data (SOATO); Postgres-ready (SQLite in dev) |

The frontend keeps all business logic in a UI-free `web/src/core/` layer (typed API client, queries, stores, i18n) so a future native app reuses it wholesale — only the screens get rewritten.

```
mahalladosh/
├─ api/         FastAPI backend (app/routers, models, scheduler, analytics)
└─ web/         Vite + React PWA (src/screens, src/core, src/components)
```

## Run it locally

**Backend** (Python 3.12):
```bash
cd api
python -m venv .venv && .venv/Scripts/pip install -r requirements.txt   # (source .venv/bin/activate on macOS/Linux)
.venv/Scripts/python demo_seed.py     # seeds a populated demo mahalla
.venv/Scripts/python -m uvicorn app.main:app --port 8000
```

**Frontend:**
```bash
cd web
npm install
npm run dev        # http://localhost:5174  (proxies /api → :8000)
```

In dev, log in with any name — e.g. **Otabek Ergashaliyev** — to enter the seeded Yoshlik mahalla. Production login uses the Telegram Login Widget.

## Quality

CI runs on every push and PR (see the badge above): backend **lint (ruff)** +
**tests (pytest)**, and a frontend **typecheck + production build**. The backend
suite covers auth/membership gating, the household flows, and a pinned regression
for every security-review finding. Run it locally with `cd api && ruff check . && pytest`.

## Status

Active development. MVP feature-complete and pilot-safe; the roadmap runs through retention (Telegram DMs, daily anchor), a richer social layer (comments, reactions, albums), and diaspora + monetisation. Launching narrow and deep in a single home district first.

## License

[MIT](LICENSE) © 2026 Otabek Ergashaliyev

---

_Built with care for Uzbek neighbourhoods._
