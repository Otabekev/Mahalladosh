# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
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
