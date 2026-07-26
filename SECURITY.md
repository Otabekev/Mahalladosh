# Security Policy

Mahalladosh holds something more sensitive than most social apps: the names, family
relationships, and home locations of real neighbours, many of them elderly. A leak here
is not an embarrassment, it is a safety problem for identifiable households. Security
reports are treated accordingly.

## Reporting a vulnerability

**Please do not open a public issue for a security problem.**

Report it privately via [GitHub Security Advisories](../../security/advisories/new), or
by email to **ergashaliyev000@gmail.com** with `SECURITY` in the subject.

Useful things to include, if you have them: what an attacker can reach that they should
not, the steps to get there, and whether it requires an authenticated account.

You will get an acknowledgement within **72 hours**. Since this is a pre-launch project
maintained by a very small team, please allow a reasonable window for a fix before
disclosing publicly — and tell us if you have a disclosure deadline, so we can plan
around it rather than miss it.

## Scope

The project is pre-launch and has no production users yet, so there is no bug bounty.
Reports that are nonetheless valuable:

- Access-control bypasses — reading or acting on another mahalla's or household's data
- Anything that defeats the family/lineage privacy gate for a non-verified viewer
- Authentication or session flaws, including Telegram login signature handling
- Escalation to `raisi` (mahalla head) or admin capability
- Moderation bypass — acting on the platform while banned
- Stored data exposure via uploads (EXIF, path traversal, content-type confusion)

Out of scope: findings that require a compromised device or physical access, automated
scanner output with no demonstrated impact, and missing hardening headers on the
development server.

## What we already do

- Authorization is centralised in one dependency module (`api/app/deps.py`) so it has a
  single place to be audited — see
  [ARCHITECTURE.md §2.1](docs/ARCHITECTURE.md#21-authorization-lives-in-depspy-on-purpose)
- Ban and account-deletion lockout is enforced **server-side on every authenticated
  route**, because stateless JWT sessions cannot be revoked by clearing a cookie
- Cross-mahalla lookups return `404` rather than `403`, so a foreign id is
  indistinguishable from a nonexistent one and cannot be used to enumerate people
- Family and lineage detail is gated to verified neighbours of the same mahalla
- Uploaded images are re-encoded through Pillow, which strips EXIF — including the GPS
  tags that would otherwise reveal exactly where a photographed house is
- Every confirmed finding from internal review has a **pinned regression test** in
  `api/tests/test_security.py`, named for what it prevents, so a later refactor that
  reopens the hole fails CI instead of shipping

## Known accepted risks

Documented rather than hidden — see
[ARCHITECTURE.md §6](docs/ARCHITECTURE.md#6-known-trade-offs) for the full list:

- **Sessions are stateless JWTs.** An individual token cannot be revoked before it
  expires; the server-side lockout check limits the impact but does not eliminate it.
- **No migration tooling yet**, which is a launch blocker tracked in
  [ROADMAP.md](docs/ROADMAP.md), not a permanent state.
