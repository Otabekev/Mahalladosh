# Privilege audit — 2026-07-27

An audit of every path that grants or checks authority, run before the first real
deployment. Six auditors covered admin/raisi granting, ownership checks, cross-mahalla
scoping, session and ban handling, the family privacy gate, and input/resource abuse.
They produced **27 findings**.

**Status: 11 fixed, 16 triaged but NOT independently verified.** The adversarial
verification pass did not complete, so everything in the second table is a *claim* with a
file:line, not a confirmed vulnerability. Some are certainly false positives. Do not treat
an unverified row as either safe or exploitable until someone reads the code.

Regression tests for the fixed items: `api/tests/test_privilege_audit.py`,
`api/tests/test_deploy_safety.py`.

## Fixed

| Sev | Finding | Where |
|---|---|---|
| CRITICAL | `SECRET_KEY` defaulted to the committed literal `"change-me"`. Sessions are HS256 JWTs signed with it, so anyone who read this public repo could forge a cookie for user id 1 — the seeded platform admin. Production now refuses to start. | `app/security.py` |
| CRITICAL | `/auth/dev-login` took `is_admin` from the request body **and promoted any existing user named in the payload**. Gated only by `ENVIRONMENT`, which defaulted to `dev`. | `app/routers/auth.py` |
| HIGH | Raisi authority was not scoped to a mahalla — `_is_raisi(db, user)` checked the viewer's own mahalla, so every raisi could moderate every cross-mahalla share post in the country. | `app/presenters.py`, `app/routers/posts.py` |
| HIGH | A raisi could ban the platform admin, with no recovery route (the admin is the only account that could undo it). | `app/routers/raisi.py` |
| MEDIUM | Cross-mahalla household/service reads returned 403, confirming the id exists — a platform-wide enumeration oracle. Now 404, byte-identical to a missing row. | `app/routers/households.py`, `app/routers/services.py` |
| MEDIUM | A banned account could still log in via `POST /auth/telegram` and rewrite its name and photo — community-wide, on every post it ever wrote. The ban lockout lives in `get_current_user`, which a login route never runs. | `app/routers/auth.py` |
| MEDIUM | The family privacy gate checked that the viewer's household was *verified* but not that it was in the **same mahalla**. Not reachable through today's routes (they 404 across mahallas), fixed in the gate itself so a future route cannot reopen it. | `app/presenters.py` |
| HIGH | `set_raisi` proposals skipped the verified-resident gate that `ban_user` proposals apply. The raisi can ban members unilaterally, so nominating yourself was a route around the exact gate the rule exists to enforce. Both privileged actions now require it; pure coordination proposals stay open to everyone. | `app/routers/proposals.py` |
| MEDIUM | `_apply_action` installed a raisi without re-checking eligibility at apply time — a vote runs for days, and the nominee can leave the mahalla or be banned in that window. | `app/routers/proposals.py` |
| HIGH | An unauthenticated caller could make the server buffer an unbounded request body: the upload route's `require_member` runs only after the cost is paid. A body-size middleware now rejects with 413 before routing. | `app/main.py` |
| HIGH | `MAX_PIXELS` was 40 MP, letting a ~0.6 MB JPEG allocate ~230 MB. Lowered to 24 MP — above every phone camera, and the output is thumbnailed to 1600px regardless. | `app/routers/uploads.py` |
| MEDIUM | DingDong throttled successful rings only, so out-of-range probes were unlimited — each answering "is this house within 100m of this point?". Attempts are now rate-limited. **Partly refuted:** the reply already withheld the distance, so the oracle was narrower than reported. | `app/routers/households.py` |

## Triaged, not verified

Ordered by the severity the auditor assigned. **Each needs confirming before it is
believed.** The three starred as most important were verified in a second pass and have
moved to the Fixed table, along with every remaining HIGH. One of them (DingDong) was
partly a false alarm, which is a fair sample of what to expect from the rest.

**Everything left below is MEDIUM or LOW.** None is known to be exploitable; all are
worth a read before a second district joins.

| Sev | Claim | Where |
|---|---|---|
| MEDIUM | `GET /mahallas/{id}` gives any signed-in account the raisi's identity for every mahalla on the platform. (Already noted in ROADMAP as the gap blocking diaspora mode.) | `app/routers/mahallas.py` |
| MEDIUM | `approve_join` grants household stewardship without re-checking the requester is still in the household's mahalla. | `app/routers/households.py` |
| MEDIUM | Every non-share post fans out to the whole mahalla, in-app and by Telegram DM, with no throttle on post creation. | `app/routers/posts.py`, `app/notify.py` |
| MEDIUM | Search's services branch has no scan limit, and nothing caps offerings per household. | `app/routers/search.py` |
| MEDIUM | Uploads are quota-free and no file is ever reclaimed, including files never attached to anything. | `app/routers/uploads.py` |
| LOW | Account deletion reuses `banned_until`, so an admin unban silently un-deletes an anonymised account and a retained cookie works again. | `app/routers/me.py`, `app/moderation.py`, `app/routers/admin.py` |
| LOW | Remaining 403-instead-of-404 enumeration oracles: `DELETE /posts/{id}`, household member delete, reporting a household. | `posts.py`, `households.py`, `reports.py` |
| LOW | `images.clean_urls` validates a prefix and nothing else — traversal-shaped and over-length values are stored (rendered as URLs, not used for filesystem access). | `app/images.py` |

## Accepted for the pilot

- **No rate limiting anywhere.** One district, invite-only, Telegram-authenticated. It
  should not survive contact with a second district.
- **`require_raisi` returns early for `is_admin`**, so a platform admin is implicitly raisi
  everywhere. Intended, and worth restating: admin is the key to everything, which is why
  anything that can grant it is treated as critical.
- **View counts are client-reported** (`POST /services/views`) and so are a directional
  signal, never a billing input.
