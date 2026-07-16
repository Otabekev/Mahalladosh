# Mahalladosh — Build Plan

> Companion to `Mahalladosh_Social_Business_Plan_v2.pdf`. That document is the *why* and *what*.
> This document is the *how we build it* — the stack, the architecture, and the rules that keep
> a cheap PWA today convertible into a real native app later without a rewrite.

**Status:** MVP CODE-COMPLETE (2026-07-15) — all §9 features built and E2E-verified locally,
including in-app notifications (§9-H), automatic monthly Faol qo'shni honor, the anti-gaming
pair cap, and Telegram Login Widget wiring (activates itself when bot token+username are set
in env; dev name-login until then). Adversarially reviewed (11 findings fixed).
Repo: `api/` (FastAPI+SQLite) + `web/` (Vite+React PWA).
**Remaining before pilot:** deploy-day tasks (Alembic, hosting, BotFather bot, prod env,
first-admin bootstrap) + hand-curated real MFY list for the launch district + wipe test data.
**Run it:** start `api` (uvicorn, port 8000) and `web` (`npm run dev`, port 5174); open
http://localhost:5174 — on the phone, same Wi-Fi, `http://<laptop-ip>:5174`.
**Guiding constraint:** Build slowly. Pay nothing until the product is real (one live pilot mahalla).

---

## 1. Core strategy: build once, transition cheaply

We build a **PWA (installable web app)** now. Everything is chosen so that *if* we later need a
true native app, we rewrite only the screens — never the engine underneath.

Every app is three layers. Only one of them costs money to move to native:

| Layer | Example | Transfers to native? |
|---|---|---|
| **Backend** — API, database, all business rules | family pages, mutual-aid logic, auth | **100%, untouched** |
| **Shared core** — API client, types, validation, state, business logic (TS) | "load my mahalla feed", "validate a post" | **~80–90%, light edits** |
| **UI** — the actual screens, layout, styling | buttons, lists, forms | **Rewritten** (this is the only real cost) |

**The whole architecture below exists to make the top two layers as large as possible and the
bottom layer as thin and isolated as possible.** If we do that, a future native rewrite is *weeks
for a small app*, not a restart.

The three rules that make this work:
1. **No business logic inside screens.** Screens call functions from the shared core; they never
   contain API calls, validation, or data-shaping of their own.
2. **Server state lives in TanStack Query, client state in Zustand.** Both run identically on web
   and React Native, so this entire layer moves untouched.
3. **Style with Tailwind now → NativeWind later.** NativeWind lets React Native use the same
   Tailwind class names, so even much of the visual markup survives the transition.

---

## 2. The stack

### Frontend (the PWA)

| Concern | Choice | Why this one / does it transfer |
|---|---|---|
| Language | **TypeScript** | Same language as native (React Native). Types shared with logic. Transfers. |
| UI framework | **React** | Same mental model & component syntax as React Native. Transfers as knowledge; screens rewrite. |
| Build tool / dev server | **Vite** | Fastest dev loop; instant hot-reload on your phone over Wi-Fi. Web-only tool (fine). |
| PWA / installability | **vite-plugin-pwa** | Service worker, home-screen install, offline shell, splash — no cost, no store. |
| Routing | **React Router** | Web-only; deliberately kept thin (native uses React Navigation later). |
| Server state / data fetching | **TanStack Query** | Caching, refetch, loading states. **Identical on web + native — transfers 100%.** |
| Client state | **Zustand** | Tiny, simple. **Runs identically on web + native — transfers 100%.** |
| Forms | **React Hook Form** | Works on web + native. Transfers. |
| Validation | **Zod** | One schema validates forms *and* mirrors backend types. Works everywhere. Transfers. |
| Styling | **Tailwind CSS** (→ NativeWind on native) | Utility classes; the NativeWind path means class names largely survive the transition. |
| HTTP client | **Typed fetch wrapper** in shared core | One file, all API calls typed. Transfers. |

### Backend

| Concern | Choice | Why |
|---|---|---|
| Framework | **FastAPI (Python)** | You already know it from the Reservation App. Auto-generates OpenAPI → we generate TS types from it, so frontend and backend types stay in sync. **100% reusable in a native transition.** |
| ORM + migrations | **SQLAlchemy + Alembic** | Same as Reservation App. Migrations version the schema safely. |
| Database | **PostgreSQL** | Free tiers everywhere; **PostGIS-ready** for "someone two streets away" geo features later. |
| Auth | **Telegram-based (leaning Mini App)** — see §5 | Near-free, and 85–88% of Uzbekistan already has Telegram. Open decision, flagged below. |

### Why not build native (React Native) from day one?
Because it costs store fees ($25 Google / $99-yr Apple), needs push/native tooling we don't need
for a pilot, and — most importantly — the plan says validate one mahalla with elders first. An
installable PWA link is *lower friction for elders and cheap Android phones* than "go to the Play
Store." We keep native as a Phase-2/3 option, not a Phase-0 cost.

---

## 3. Folder structure (transition-friendly by design)

The split between `core/` (moves to native) and `web/` (rewritten for native) is the whole point.

```
mahalladosh/
├─ api/                      # FastAPI backend — 100% reused by web AND future native app
│  ├─ app/
│  │  ├─ routers/            # HTTP endpoints (profiles, family, mutual-aid, feed, auth)
│  │  ├─ models/             # SQLAlchemy tables
│  │  ├─ schemas/            # Pydantic request/response shapes → OpenAPI
│  │  ├─ services/           # business rules (kept out of routers)
│  │  └─ core/               # config, db session, auth deps
│  ├─ alembic/               # migrations
│  └─ requirements.txt
│
├─ web/                      # the PWA (Vite + React)
│  ├─ src/
│  │  ├─ core/               # ⭐ TRANSFERS TO NATIVE — keep this fat, keep it UI-free
│  │  │  ├─ api/             #   typed API client (generated types + fetch wrapper)
│  │  │  ├─ stores/          #   Zustand stores (client state)
│  │  │  ├─ queries/         #   TanStack Query hooks (server state)
│  │  │  ├─ validation/      #   Zod schemas
│  │  │  └─ logic/           #   pure business logic / data shaping
│  │  ├─ screens/            # ⚠️ REWRITTEN FOR NATIVE — pages, one folder per feature
│  │  ├─ components/         # ⚠️ REWRITTEN FOR NATIVE — shared UI (buttons, cards, lists)
│  │  ├─ router.tsx          # web-only routing (thin)
│  │  └─ main.tsx
│  ├─ vite.config.ts         # + vite-plugin-pwa
│  └─ package.json
│
├─ plan.md                   # this file
└─ Mahalladosh_Social_Business_Plan_v2.pdf
```

**The rule that makes the transition cheap:** anything in `web/src/core/` must never import from
`screens/` or `components/`, and must never touch the DOM. If we hold that line, `core/` lifts out
whole into a React Native app on transition day.

---

## 4. Cost & hosting timeline — $0 until it's real

| Stage | Frontend | Backend | Database | Cost |
|---|---|---|---|---|
| **Building** (now) | Vite dev server on your laptop, opened on your phone over Wi-Fi | FastAPI local | Local Postgres (or Neon free) | **$0** |
| **Pilot** (one mahalla) | Vercel free tier | Render / Fly.io free tier (sleeps when idle — fine) | Neon / Supabase free Postgres | **$0** |
| **Real traction** (a district) | Vercel paid | Always-on backend instance | Paid Postgres | pay only here |
| **Store presence** (optional) | Wrap PWA with Capacitor → Play Store | same | same | $25 one-time Google |
| **True native** (if ever needed) | Rewrite screens in React Native/Expo; reuse `core/` + `api/` | untouched | untouched | dev time only |

During development you never deploy: laptop runs the server, phone opens `http://<laptop-ip>:5173`
on the same Wi-Fi, and every code change appears live on the phone.

---

## 5. Identity & login

**Decided: standalone PWA only. No Telegram Mini App.**

Two separate things, don't confuse them:

- **Login: decided → Telegram Login Widget.** Free, no per-message cost, and everyone in UZ has
  Telegram. Needs a BotFather bot + a domain registered via `/setdomain`. On login we get the user's
  Telegram id, name, username, photo — verified server-side by HMAC-SHA256 against the bot token.
  Note: the widget does **not** hand over a phone number (fine — we don't need it; identity + name is
  enough and residency is by vouching). Requires an HTTPS domain, so local dev either stubs auth or
  uses a free tunnel (cloudflared) / the Vercel free deploy for real Telegram login.
- **Residency verification (how we know you actually live in this mahalla):** this is a *product*
  mechanic, not a login method — done by **community vouching** (the raisi and/or existing verified
  neighbors confirm a new household). This is the trust backbone; designed in the features section.

---

## 6. Product principles (the rules that define the feel)

These five rules override any individual feature decision. When a feature conflicts with one of
these, the rule wins.

1. **Structured, not chat.** There is no free-typing feed. Every post is a *typed* item with a
   purpose, a short form, and a lifecycle (open → done). This is the deliberate opposite of Telegram
   — and the reason Telegram can't replicate it. Telegram is where you *chat*; Mahalladosh is where
   the neighborhood *does things*.
2. **Honor over points.** Gamification is a lightweight tracker, never the reward. The real prize is
   *obro'* — public recognition (the monthly **Faol qo'shni**, honored by the raisi). Keep points
   gentle so genuine help never feels transactional.
3. **Elder-friendly or it failed.** Every form is 2–3 fields, big text, no jargon. If an elder can't
   complete an action in ~20 seconds, redesign it. The whole family-history content strategy depends
   on elders being able to use it.
4. **Opt-in, community-owned, never state-facing.** Family/lineage data is sensitive. Everything
   about it is opt-in, privacy-tiered, visible only to verified neighbors, and clearly separate from
   any government system. This is a trust requirement, not a nice-to-have.
5. **Depth before breadth.** Prove the one core loop (help + family pages) in one mahalla before
   adding anything. Marketplace, diaspora, news, reels are later phases — not the first build.

---

## 7. Core entities (the data model)

Everything below lives as business logic in `web/src/core/` (transferable) backed by the FastAPI
tables. Field lists are the essentials, not exhaustive.

**Mahalla** — the container.
`id, name, district, boundary(optional geo), status(forming|active), activation_threshold,
raisi_id → Person, created_at`
*A mahalla starts `forming` and flips to `active` once verified households ≥ threshold (see §9,
activation).*

**Household (Xonadon)** — the core unit, exactly as you described.
`id, mahalla_id, family_name, resident_count, street(optional), location(optional geo),
created_by → Person, verification_status(pending|verified), visibility(neighbors|family_only),
family_history(optional text), generations_here(optional), photos(optional, opt-in), created_at`
*Minimum to join = `family_name` + `resident_count`. Everything else is optional and opt-in.*

**Person / Profile** — an individual in a household.
`id, household_id, full_name, is_account(bool), is_elder(bool), contact(optional),
reputation_month(int), reputation_alltime(int), claimed(bool), created_at`
*`is_account=false` = a named-only member (an elder with no phone), added by whoever manages the
household. They can later `claim` their own profile if they join.*

**Post** — the structured, typed content item (see §8 for the type catalog).
`id, mahalla_id, author_id, type(enum), title, body, status(open|resolved|closed),
resolved_at, created_at` + type-specific fields.

**Proposal + Vote** — governance.
`Proposal: id, mahalla_id, author_id, kind(coordination|punitive), target_person_id(if punitive),
title, description, status(draft|seconding|voting|passed|rejected|expired), seconds_count,
voting_opens_at, voting_closes_at, threshold(majority|supermajority), quorum, binding(bool)`
`Vote: proposal_id, voter_id, choice(yes|no), created_at`

**ServiceOffering** — the discovery-only directory.
`id, household_id, title, category(food|goods|rental|service|skill), description,
price(optional), contact_method, active, created_at`
*No booking, no payment, no availability. Browse + contact directly.*

**Vouch** — verification.
`household_id, voucher_id → Person, created_at`
*A household becomes `verified` at N vouches, or one vouch from the raisi.*

**ReputationEntry** — the points ledger (audit trail, powers both leaderboards).
`person_id, amount, reason(help_fulfilled|history_seeded|newcomer_welcomed), source_id, created_at`
*`reputation_month` resets monthly (fresh race); `reputation_alltime` accumulates (standing).*

---

## 8. The structured post types (the anti-chat catalog)

Short, fixed menu. Each is a simple form with a clear life. Keep it to these ~6 for MVP.

| Type | Purpose | Who posts | Key fields | Lifecycle | Earns points? |
|---|---|---|---|---|---|
| **Yordam kerak** (Need help) | the mutual-aid engine | any resident | what, category (tool/ride/labor/childcare), when | open → helped → thanked | ✅ helper, on thanks |
| **E'lon** (Announcement) | one-way info | any resident / raisi | title, body | posted → (auto-expires) | no |
| **Xayriya** (Charity) | a collection / someone in need | any resident | cause, goal, how to give | open → closed | optional |
| **To'y / life event** | wedding, funeral, circumcision | any resident | type, date, RSVP/contribution | upcoming → past | no |
| **Yangi qo'shni** (Newcomer) | welcome a new household | neighbor / auto on join | who, note | posted | ✅ welcomer |
| **Ovoz berish** (Proposal) | governance action | any resident (→ seconding) | see §10 | draft → seconding → voting → result | no |

*Safety alerts can fold into E'lon for MVP; split out later if needed.*

---

## 9. MVP features (build first — Phase 1)

The smallest set that proves the core loop. Build in roughly this order.

**A. Verified profiles & residency verification.**
Login (Telegram widget or email — §5), then create/join a household. New households are `pending`
until **community vouching** verifies them (N neighbors or the raisi). Verification is the trust
backbone — points and family data only mean something if residency is real.

**B. Household & family pages (the differentiator).**
Join with just name + headcount. Optionally add member names, then family history/photos — the
non-portable data that is the whole moat. **Elders seed this**, and seeding *earns points* — the
content strategy and the reward are the same action. Privacy-tiered, neighbors-only, opt-in.

**C. The mutual-aid help loop (the engine).**
Post a **Yordam kerak** → a neighbor helps in real life → requester marks it done and **awards
points/thanks** → helper climbs the leaderboard. Award-on-receipt is the anti-spam mechanic: only
*confirmed real help* scores. Anti-gaming: one reward per request; soft cap on repeated point-trades
between the same two people (flag, don't hard-block, for MVP).

**D. Gamification — gentle.**
Two numbers per person: **monthly** (resets, fresh race, newcomers can win) and **all-time**
(permanent standing). Per-mahalla leaderboard. Monthly **Faol qo'shni** featured on the mahalla home
and **honored by the raisi** — honor is the reward, points are just the tracker.

**E. Mahalla activation threshold (Nextdoor's founding-member model, from PDF §9).**
A mahalla's feed stays `forming` until a minimum number of verified households join, then flips to
`active` with a visible "founding members" push. This solves the empty-app cold start — nobody joins
a dead feed; everyone joins a countdown.

**F. Governance — proposals + voting.**
Any resident **drafts** a proposal → it needs **N neighbors to second it** to become a live vote
(filters junk, prevents vote-fatigue) → time-boxed vote → result. Two kinds:
- **Coordination** (organize a hashar, a community decision) — open, low bar, advisory or binding.
- **Punitive** (ban/remove a person) — **higher bar**: more seconders, the accused is notified and
  can respond, supermajority + quorum to pass, reversible-first. This is the anti-mob safeguard.
The **raisi has limited power**: they can propose and they hand out the monthly honor, but they
cannot act unilaterally — the community votes. Decisions are fair because they're voted.

**G. Services directory (discovery-only).**
Households list offerings (sell eggs, rent equipment, a skill). Neighbors browse by category and
contact directly. **No reservations, no payment** — deliberately unlike the Reservation App. Trust
comes from it being a verified neighbor.

**H. Hyperlocal notifications (the retention driver, PDF §7).**
"A new family joined your mahalla," "someone two streets away needs help," "a note was added to your
grandfather's family page," "a vote closes in 6 hours." Relevant purely because they're about the
user's literal street — something no generic algorithm can copy.

---

## 10. Governance mechanics (exact rules)

| Aspect | Coordination proposal | Punitive proposal (ban/remove) |
|---|---|---|
| Who drafts | any resident | any resident |
| Seconds to go live | few (e.g. 3) | more (e.g. 5) |
| Accused notified + can respond | n/a | **required** |
| Voting window | e.g. 48h | e.g. 48h |
| Pass threshold | simple majority of voters | **supermajority (⅔) + quorum** |
| On pass | advisory (coordinate) or binding | remove — **temporary/appealable first**, permanent on repeat |
| Limits | 1 active proposal per person; short cooldown | same |

---

## 11. Retention model (why people come back — PDF §7)

Three loops Instagram/Telegram structurally cannot copy:
- **Non-portable data** — family/household pages exist only here; people revisit for what only this
  app holds.
- **Reciprocity loops** — an open help request is a real reason to reopen (did anyone answer? should
  I answer?) — social obligation, not passive scrolling.
- **Hyperlocal relevance** — notifications about the user's literal physical world (§9-H).

---

## 12. Later phases (documented, deliberately deferred — PDF §6)

Not in the first build. Listed so we don't lose them and don't build them early.

- **Life-event coordination** deepened (contributions, RSVPs) — Phase 2.
- **Trusted marketplace with transactions/fees** — the directory (§9-G) grows up. Phase 2.
- **Diaspora bridge** — the ~1.34M in Russia / ~100K in Korea follow their home mahalla's feed and
  family updates. Big differentiator, and the first *paid* tier. Phase 3.
- **Local advertising** (Nextdoor's ~80% revenue model), **premium diaspora subscription**,
  **marketplace fees** — monetization, only at real density. Phase 3.
- **News aggregation, short-video/reels, institutional tools** for mahalla committees/NGOs — Phase 4,
  once there's enough real local content to not feel like a diluted Instagram.

---

## 13. Seeding: the petition-to-open model (how a mahalla comes into being)

Bottom-up and self-assembling. **No mayor and no anchor required** — residents converge on a name
and the mahalla opens itself once enough of them ask for the same one.

**The flow:**
1. A resident opens the app, picks **region → district** (preloaded), selects their **MFY / mahalla**,
   and submits a request (with an estimated household count, cosmetic only).
2. App confirms: *"Request accepted — waiting for your neighbors to do the same."*
3. When requests for the **same mahalla** pass a flat threshold (e.g. **5–10**), it **auto-opens**
   with those founding requesters. It's then findable in search, and members can add/invite others.
4. **Before it opens, the batch surfaces to the admin console** — approve, or reject improper/abusive
   names. Approval also **merges duplicates** into the canonical entry.

**The one make-or-break rule — no free-typed mahalla names.** If people type the name freely, the
same "Yoshlik" fragments into *Yoshlik / Yoshlik MFY / yoshlik mahallasi / Йошлик / Yoslik*, each
variant collects 2–3 requests, **none hits the threshold, and the mahalla never opens.** So:
**preload/autocomplete the MFY list under each district** (fuzzy-match + backend merge), so everyone
requesting Yoshlik lands on the *same* record. This is the single point the whole mechanic lives or
dies on.

**Design notes:**
- **Open-threshold is a flat number** (5–10 requests), never a % of the self-reported household
  estimate (inconsistent/gameable). The estimate is display-only ("~100 households").
- **Junk / "boys-club" mahallas** are low-harm (whatever they do stays inside their own room). The
  real cost is *search clutter* and *splitting real neighbors across a real + a joke entry* — handled
  by the admin gate **merging duplicates**, not just filtering profanity. Manual approval is a
  launch-phase tool; auto-rules/trusted approvers replace it at scale.
- **Opening ≠ verifying residency.** The petition opens the *room*; it doesn't prove those 5 people
  live there. Fine for the pilot — but keep household **vouching** (§9-A) *inside* the mahalla so the
  trust and the family pages stay real even though the opening is loose.
- **Mayor stays emergent** (§9-F): the real raisi joins and is confirmed by residents, or the
  community elects one by vote. Never required to create the mahalla.

---

## 14. Next step

Data model + seeding strategy defined. Next: pick the login method (§5), then scaffold the repo
(`api/` + `web/` with the transition-friendly `core/` split) and draw the MVP screens — home/feed,
household page, create-post, leaderboard, proposal/vote, and the "find & join your mahalla" flow.
