# Deploying Mahalladosh

One container serves the API and the built PWA from the same origin. That is the
whole design: no CORS in production, no second host to keep in step, and a session
cookie that is simply first-party. The frontend already calls `/api/...` relatively,
so nothing in it changes between development and production.

Everything that does not need an account is already committed — `Dockerfile`,
`render.yaml`, the migrations, the startup guards. What follows is the part only the
repository owner can do.

## The demo (free, ~15 minutes)

**1. Database — Neon.** Sign in with GitHub, create a project in the region closest
to Uzbekistan, copy the **pooled** connection string. Do not edit it: `app/db.py`
rewrites the `postgres://` form Neon prints onto the driver actually installed.

> Render's own free Postgres expires after 30 days. That is fine for a week's demo
> and not fine for a pilot with real families, which is why `render.yaml` does not
> declare one.

**2. Service — Render.** New → Blueprint → pick this repository. It reads
`render.yaml`. Paste the Neon string into `DATABASE_URL`. Leave `SECRET_KEY` alone —
Render generates it. Leave `TELEGRAM_BOT_TOKEN` **empty** unless you want the demo
sending real messages; empty already means off.

**3. After the first deploy** set `PUBLIC_WEB_URL` to the hostname Render assigned,
or links inside notifications are silently omitted and a reader gets a message they
cannot act on.

**4. Seed the demo world.** From the Render shell:

```bash
cd /srv/api && python demo_seed.py
```

That applies the migrations, installs the committed demo images and creates the
Yoshlik mahalla — Malika opa as *Faol qo'shni*, a to'y in the feed, a poll mid-vote,
a charity collection part-way to its goal, four service offerings with photos.

**5. Check it on a phone, not a laptop.** This is a mobile-first PWA and the laptop
view is not what anyone will see.

- `/api/health` returns `{"status":"ok"}`
- the feed loads and the Bugun card is not empty
- switching to **Ўзбекча** changes the whole interface, not just the labels
- a deep link typed fresh — `…/app/mahalla` — returns the app, not a 404
- `/api/nope` returns JSON, not the HTML shell
- the browser offers **Add to Home Screen**

## Before real families join

Not optional, and each one is a decision rather than a step:

- **A disk for uploads.** Render's free plan has none, so every uploaded photo is
  lost on the next deploy while the database rows still point at it. Add a disk,
  set `UPLOAD_DIR` to its mount path, and remove `UPLOADS_MAY_BE_EPHEMERAL`. The app
  warns loudly at startup until you do.
- **Turn off `dev-login`.** It is already off — `ENVIRONMENT=production` is both the
  blueprint value and the built-in default — but confirm it, because that endpoint
  logs into any seeded account by name.
- **`RUN_MIGRATIONS_ON_START=false` past one instance**, and run
  `alembic upgrade head` as a release step instead. Two instances racing the same
  DDL is the failure it prevents.
- **Read `SECURITY-AUDIT.md`.** Sixteen findings are triaged but unverified; none is
  known to be exploitable, and none has been ruled out either.
- **Back up before the first `alembic upgrade head`** against a database holding real
  rows.

## Environment variables

| Variable | Needed | What it does |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string. `postgres://` and `postgresql://` both work. |
| `SECRET_KEY` | yes | Signs session cookies. The app **refuses to start** in production if it is missing, the committed placeholder, or under 32 characters — a guessable value lets anyone forge a session for any account. |
| `ENVIRONMENT` | yes | `production` unlocks nothing; anything else enables `/auth/dev-login`. Defaults to `production` so a forgotten variable is locked, not open. |
| `UPLOAD_DIR` | prod | Where photos are written. Empty means inside the app directory, which containers wipe on redeploy. |
| `UPLOADS_MAY_BE_EPHEMERAL` | demo | Accepts that loss and silences the warning. Never on a real instance. |
| `TELEGRAM_BOT_TOKEN` | no | Empty disables Telegram DMs entirely. |
| `PUBLIC_WEB_URL` | prod | Makes links inside notifications tappable. |
| `RUN_MIGRATIONS_ON_START` | no | Default `true`. Set `false` past one instance. |

## Showing it in 60 seconds

The order that lands, because it opens on the thing nobody else has:

1. **A family page** — generational history, the elders, the photo album. This is the
   moat: a directory anyone can rebuild, a family's story they cannot.
2. **The help loop** — post "narvon kerak", a neighbour answers, resolve it and watch
   the honour points move. Then the leaderboard, and last month's *Faol qo'shni*.
3. **DingDong** — the virtual doorbell, which only rings if you are actually at the
   house.
4. **Ўзбекча** — flip the language mid-demo. Four languages, and the Cyrillic is
   genuine Uzbek rather than Russian, which is the difference an elder notices.
5. **The raisi panel** — pin a post, curate the mahalla's phone numbers.

Log in as **Otabek Ergashaliyev** for the admin and raisi views, or **Malika opa
Yusupova** to see it as the honoured neighbour.
