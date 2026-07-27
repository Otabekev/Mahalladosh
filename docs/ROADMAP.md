# Roadmap

How Mahalladosh is being built: narrow and deep, one home district first. Shipped
work is checked; the rest is sequenced by what most moves activation and retention.

## ✅ Shipped — foundation & trust

- **Full-stack MVP** — FastAPI + SQLAlchemy backend, React 19 + Vite + Tailwind v4 PWA
- **Four languages** — O‘zbekcha (Latin), Ўзбекча (Cyrillic), Русский, English
- **Family / household pages** — generational history, elders, the privacy gate
- **Mutual-aid help loop** — structured posts + honour (obro‘) points, monthly *Faol qo‘shni*
- **Community governance** — propose → second → time-boxed vote, punitive supermajority
- **DingDong** — GPS-gated virtual doorbell
- **Petition-to-open** — a mahalla activates once enough neighbours request it
- **Moderation & trust hardening** — report → admin queue → takedown/ban, verification teeth
- **Analytics foundation** — DAU/retention, activation funnel, append-only event log
- **Background scheduler** — vote deadlines, reminders, monthly honour, weekly digest
- **Offline resilience** — poor village connectivity never logs people out
- **Original Uzbek design system** — suzani/tilework palette, girih mark, Rubik + Cormorant
- **Engineering hygiene** — pytest suite, GitHub Actions CI (lint + tests + build), MIT license

## ✅ Phase 3 — The Daily Pull (retention)

The reason to open it every morning.

- Telegram bot DM channel — the pilot's push notifications
- Onboarding checklist card — the activation driver
- Weekly digest notification
- Notification i18n refactor — store type + params, render per-language
- Friendlier time formatting (Bugun / Kecha + date separators)

## ✅ Phase 4 — Identity & Feel

- Elder-UX pass — larger-text mode, tap-target audit
- App-feel round — killed the shell flash, real Back, optimistic UI, page motion, styled confirms
- Raisi panel — the mahalla head's daily tools (pin · contacts · moderation · roster)
- Skeleton loaders on every list · installable-PWA prompt (elder-guided)
- Mahalla contacts page (pulled forward from Phase 6)

## ✅ Phase 5 — Social layer

- Comments on all post types · one-tap 🤲 Rahmat reactions
- Tappable public profiles · edit/delete own content · invite link + QR
- Multi-photo posts + fullscreen lightbox · opt-in family albums

## ✅ Phase 6 — Depth

- Earned badges (Faol qo‘shni · Asoschi · Mehmondo‘st · Tarixchi), derived from
  facts rather than awarded — no table, nothing to backfill or revoke
- Events done properly — RSVP with a guest list, an “Upcoming” strip, day-before reminder
- Charity progress bars · quick polls answerable from the feed card
- Service photos · keyset feed pagination + pull-to-refresh
- Content lifecycle (old posts age off the feed) + in-mahalla search that folds
  Uzbek apostrophes and matches Cyrillic queries against Latin content
- A four-language CI guard that catches Russian pasted into the Uzbek Cyrillic slot

### ✅ Launch prerequisites — done

These blocked the first deployment with real users, regardless of feature progress.

- **Alembic migrations.** The schema is versioned and reversible, and a drift-guard
  test fails CI if `models.py` changes without a migration. Landing it required
  naming eleven anonymous constraints (SQLite's batch mode cannot drop an unnamed
  one) and breaking a real foreign-key cycle that would have made the first
  migration valid on SQLite and invalid on Postgres.
- **Postgres exercised in CI.** The full suite runs against `postgres:16-alpine`
  alongside the SQLite run. This also surfaced nine `ORDER BY` clauses with no
  tiebreaker — including the one deciding who is honoured as *Faol qo'shni*.
- **Scheduler locked.** It turned out three of the five sweep steps were not
  idempotent at all: they SELECT for an existing notification and then insert, so
  two instances would double-send reminders and the Monday digest. The sweep now
  takes a lease.

## 🌍 Phase 7 — Scale & go-to-market

- Admin metrics dashboard (per-day, per-mahalla health)
- Services commercial surface (views + contact-taps)
- Free-tier deploy + investor demo kit

**Diaspora follower mode — designed, deliberately deferred.** Uzbeks abroad
following the mahalla they left is the intended paid tier. The design is settled: a
follower is a read-only spectator who sees `share` posts *and nothing else*, because
`share` is the only post type whose author was told, in their own language and at the
moment of writing, that it travels beyond the mahalla. Help requests, events, charity
and family content were written for neighbours, and a remote audience for them is not
something the authors consented to.

It is not built yet because it is the one feature here whose failure mode is a privacy
incident rather than a broken screen, and it wants a proper security review — plus an
answer to a pre-existing gap it would put a product on: `GET /mahallas/{id}` currently
returns any mahalla's name, member count and raisi to any signed-in account. A
half-built follower mode with a leak is far worse than this paragraph.

---

_Have an idea? Open a [feature request](../../issues/new?template=feature_request.yml)._
