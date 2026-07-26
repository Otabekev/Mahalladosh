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

## 🎨 Phase 4 — Identity & Feel

- Elder-UX pass — larger-text mode, simpler navigation audit
- App-feel round — no shell flash, real Back, optimistic UI, motion
- Raisi panel — real daily tools for the mahalla head
- Skeleton loaders · installable-PWA prompt (elder-guided)

## 🤝 Phase 5 — Social layer

- Comments on all post types · one-tap 🤲 Rahmat reactions
- Tappable public profiles · multi-photo posts + lightbox · family albums
- Edit/delete own content · mahalla invite link + QR (growth)

## 📚 Phase 6 — Depth

- Levels from all-time points · badges (Asoschi, Tarixchi, Mehmondo‘st…)
- Events with RSVP · charity progress bars · quick polls
- Mahalla contacts page · service photos · content lifecycle + in-mahalla search · pagination

## 🌍 Phase 7 — Scale & go-to-market

- Diaspora follower mode (the future paid tier, free today)
- Admin metrics dashboard (per-day, per-mahalla health)
- Services commercial surface (views + contact-taps)
- Free-tier deploy + investor demo kit

### Launch prerequisites

Blocking the first deployment with real users, regardless of feature progress:

- **Alembic migrations.** Development builds the schema from the models
  (`Base.metadata.create_all`), which is fine while the schema moves weekly and no rows
  matter. The moment real families have data, schema changes need to be versioned and
  reversible. See [ARCHITECTURE.md §5](ARCHITECTURE.md#5-data--schema-evolution).
- **Postgres exercised in CI**, not just configured — the engine reads `DATABASE_URL`,
  but an untested swap is not a supported swap.
- **Scheduler extracted or locked** before running more than one instance, since two
  concurrent sweeps would double-send reminders and digests.

---

_Have an idea? Open a [feature request](../../issues/new?template=feature_request.yml)._
