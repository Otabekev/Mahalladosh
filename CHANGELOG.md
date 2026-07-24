# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- **Onboarding checklist** — a feed card that walks a new neighbour through the first
  high-value actions (family page, history, DingDong location, first post, first help),
  with a live progress bar; derived from real state and auto-hiding when complete.
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
