# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- **Versioned schema (Alembic).** Migrations replace `create_all` everywhere, and a
  drift-guard test fails CI if a model changes without one. Landing it meant naming
  eleven anonymous constraints and breaking a real foreign-key cycle that would have
  produced a first migration valid on SQLite and invalid on Postgres.
- **Postgres in CI.** The whole suite now runs against `postgres:16-alpine` as well
  as SQLite, because the engine reading `DATABASE_URL` is not the same thing as the
  engine being supported. Connection strings in the `postgres://` form that hosts
  actually hand out are normalised rather than failing with a driver error.

### Fixed
- **The scheduler was not safe for a second instance**, contrary to its own
  docstring. Three of five sweep steps check for an existing notification and then
  insert — two instances interleave that into duplicate reminders and duplicate
  weekly digests. The sweep now takes a lease before doing any work.
- **Nine `ORDER BY` clauses had no tiebreaker**, including the one that decides who
  is honoured as *Faol qo'shni*. Two neighbours on equal points is the normal case,
  and the winner was effectively arbitrary.
- The demo seed pointed at four service images that were never created, and
  `api/uploads/` is gitignored, so a fresh clone had no demo images at all. Demo
  assets are now committed and installed at seed time, and a missing file falls back
  to the initials avatar instead of a broken image.
- Removed a dead "Vatan bilan aloqa" row from the profile screen — styled exactly
  like the tappable rows around it, and doing nothing.

### Added
- **Depth pass** — the mahalla now has the things a community actually does.
  **Quick polls** answerable in one tap from the feed card (deliberately the light
  counterpart to a binding governance proposal: no seconding, no quorum, no
  deadline). **Events done properly** — a guest list, an *Upcoming* strip so a to‘y
  stops sinking into a reverse-chronological feed, and a day-before reminder.
  **Charity collections** with a goal and a progress bar. **Photos of the work** on
  service offerings, so the directory stops being a wall of text. **Earned badges**
  — Faol qo‘shni, Asoschi, Mehmondo‘st, Tarixchi — on every profile.
- **Feed pagination and pull-to-refresh** — the feed loads fifteen posts at a time
  behind an explicit "Yana ko‘rsatish", rather than everything at once. Keyset
  rather than offset paging, so a neighbour posting while you read cannot make the
  next page repeat or skip a row.
- **Content lifecycle** — old posts age off the front page on a per-type schedule
  (a help request is stale in a month, a charity collection runs all season, a
  to‘y is irrelevant the morning after). Purely a query-time filter: nothing is
  written, nothing is deleted, and an aged-out post still opens by link.
- **In-mahalla search** over posts and services, folding text so that the four ways
  Uzbek writes an apostrophe (qo'shni / qoʻshni / qo‘shni / qoshni) are one word,
  and a Cyrillic query finds the Latin post — it is the same word. Household
  members are deliberately *not* searchable: that would let an unverified account
  confirm who lives where, bypassing the family privacy gate.

### Fixed
- Closing a post never recorded *when* it was closed, only that it was. Harmless
  until the feed lifecycle started reading that timestamp, at which point an old
  announcement would have vanished the instant its author closed it.
- The badge grid on your own profile was fabricated — it showed all four badges to
  every account regardless of anything they had done.
- Family album photos were served as bare paths while the UI expected `{id, url}`,
  so on a fresh checkout the grid rendered nothing and delete sent an undefined id.

### Security
- **Four-language CI guard.** TypeScript already catches a *missing* language;
  what it cannot see is Russian pasted into the Uzbek Cyrillic slot, which looks
  plausible to any reviewer who does not read Uzbek and reaches exactly the elders
  that slot exists for. A dependency-free check now fails the build on it, along
  with the wrong script in any slot and lost `{placeholders}`.
- One shared photo mechanism (`app/images.py`) behind posts, family albums and
  service offerings, replacing what had become three copies of the same
  validate-then-write block. The rule that matters — a stored path must have come
  from the upload endpoint, or a caller could point a row at any URL on the
  internet and have it render inside a neighbour's family album — is now stated
  and enforced once.

### Added
- **Social layer** — a 🤲 Rahmat one-tap reaction on every post (optimistic, no
  points so it can't be farmed), free-form **comment threads** on all post types
  (with light author/raisi delete), **tappable public profiles** reached from any
  author name, **edit & delete** for your own posts, a **mahalla invite link with a
  QR code** that joins the opener to your mahalla, **multi-photo posts** with a
  fullscreen swipeable lightbox, and an **opt-in family photo album** on the
  household page (visible only to trusted neighbours, same gate as family history).
- **Raisi panel** — the mahalla head's daily tools: pin one post to the top of the
  feed, curate the mahalla's contacts, work a moderation queue scoped to their own
  mahalla, and a member roster with a scoped ban. The "approvals queue" is moderation
  rather than join-approval, because joining is open and household joins are
  steward-approved by the family on purpose.
- **Important numbers (contacts) page** — every member sees the raisi-curated
  raisi/clinic/emergency numbers with one-tap Call buttons; the raisi edits them.
- **Elder-guided PWA install banner**, **skeleton loaders**, and a **branded confirm
  dialog** replacing every `window.confirm` (app-feel pass).
- **Telegram DM push channel** — notifications now also arrive as Telegram direct
  messages, in each neighbour's own language, using the `tg_id` captured at login.
  Almost nobody grants browser push, so this is the pilot's real push path. Built to
  fail silently: it never raises into a request, never touches the caller's database
  transaction, does its network work off the request thread, and is a complete no-op
  without a bot token (so dev and CI never dial out). A per-account toggle in Settings
  opts out of DMs while keeping every in-app notice.
- **Structured, per-reader notifications** — notifications are stored as an event key
  plus parameters and rendered into the reader's chosen language at read time, from a
  single backend catalog shared by the in-app list and the Telegram sender. The same
  stored row shows Cyrillic to a grandmother and Russian to her son-in-law.
- **Richer weekly digest** — the Monday digest now reports new posts, help requests
  resolved, and new neighbours, instead of a bare post count.
- **Friendlier timestamps** — Hozir / "Bugun 14:30" / "Kecha 14:30" / a real date, in
  all four languages, in place of "17 soat oldin".
- **Account language + Telegram opt-out** — the language switcher now mirrors the
  choice to the account so backend-composed messages match, and DMs can be turned off.
- **Onboarding checklist** — a feed card that walks a new neighbour through the first
  high-value actions (family page, history, DingDong location, first post, first help),
  with a live progress bar; derived from real state and auto-hiding when complete.

### Fixed
- The language mirror could strand the backend on an abandoned language (try a
  language, switch back), so Telegram DMs and reminders would arrive in the wrong one.

### Security
- Reading language and the Telegram opt-out are no longer serialized to the whole feed;
  they were briefly present on the public user shape embedded as post authors and are
  now confined to the account's own self view.
- **Continuous integration** — GitHub Actions runs backend lint (ruff) + tests
  (pytest) and a frontend typecheck + production build on every push and PR.
- **Backend test suite** — hermetic pytest suite covering auth/membership gating,
  household flows (creation, steward-approved join, privacy gate, vouch gate), and
  a pinned regression for every confirmed security-review finding.
- Steward notifications for household join/claim requests, and a claimed-name hint
  so a steward sees who a requester says they are before approving.

### Changed
- Modernized typing across the API (`Optional[X]` → `X | None`) and standardized
  import ordering via ruff.

### Security
- **Household claim is now steward-approved.** Previously any member could claim an
  unclaimed named row of any household and inherit full stewardship; claiming now
  raises a pending request that a steward must approve.
- The account lockout (ban / deletion) is enforced in `get_current_user`, so a
  retained JWT can no longer act on any authenticated route.
- A community vote-ban now also deactivates the target's service listings.
- Leaving or deleting an account unlinks any claimed household-member row.
- User reports are mahalla-scoped, preventing cross-mahalla identity enumeration.

## [0.2.0] — Trust & moderation

### Added
- Moderation v1: report button → admin queue → takedown / ban with a repeat-offender
  ledger (temporary-first, permanent on repeat).
- Trust hardening: family/lineage privacy gate (visible only to verified neighbours),
  verification "teeth" (only verified households may vouch), full ban lifecycle.
- Household join/claim + stewardship; account basics (edit profile, leave
  mahalla/household, delete → anonymize).

## [0.1.0] — MVP

### Added
- Full-stack PWA: FastAPI + SQLAlchemy backend, React 19 + Vite + Tailwind v4 frontend.
- Family/household pages, the mutual-aid help loop with honour (obro') points,
  monthly *Faol qo'shni*, community governance (propose → second → vote), the
  DingDong virtual doorbell, share posts + a viewer-scoped discover feed.
- Petition-to-open mahalla activation, Telegram Login, an original Uzbek design
  system, four languages (uz-Latin, uz-Cyrillic, Russian, English), analytics
  foundation, a background scheduler, and offline resilience.
