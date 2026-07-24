#!/usr/bin/env bash
#
# One-time GitHub project setup: repo description + topics, labels, milestones,
# and a backlog of issues for the planned roadmap (see docs/ROADMAP.md).
#
# Prerequisites:
#   1. Install GitHub CLI:  https://cli.github.com
#   2. Authenticate:        gh auth login
#   3. Run from the repo:    bash scripts/seed_github.sh
#
# Safe to read before running. It only creates things; it deletes nothing.
# Re-running will create duplicate issues, so run it once.

set -euo pipefail

REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner)"
echo "Setting up $REPO …"

# ---- repo metadata ----
gh repo edit "$REPO" \
  --description "A social platform for the Uzbek mahalla — family pages, mutual aid with honour, and community governance. Elder-first PWA, four languages." \
  --add-topic uzbekistan --add-topic mahalla --add-topic community \
  --add-topic pwa --add-topic fastapi --add-topic react --add-topic i18n \
  --add-topic social-network

# ---- labels ----
label() { gh label create "$1" --color "$2" --description "$3" --force >/dev/null 2>&1 || true; }
label "type:feat"     "b23a28" "New capability"
label "type:fix"      "d73a4a" "Bug fix"
label "type:security" "5319e7" "Security / trust"
label "type:infra"    "0e8a16" "Tooling / CI / deploy"
label "type:docs"     "0075ca" "Documentation"
label "area:backend"  "157c84" "FastAPI / DB"
label "area:frontend" "1d76db" "React PWA"
label "area:i18n"     "d89a2a" "Translations (uz/uzc/ru/en)"
label "area:design"   "e99695" "Design system / UX"
label "area:growth"   "fbca04" "Acquisition / retention"
label "priority:high" "b60205" "Do next"

# ---- milestones ----
milestone() {
  gh api "repos/$REPO/milestones" -f title="$1" -f description="$2" >/dev/null 2>&1 \
    || echo "  (milestone '$1' already exists)"
}
milestone "Phase 3 — Daily Pull"      "Retention: the reason to open it every morning."
milestone "Phase 4 — Identity & Feel" "Elder-first polish and app-feel."
milestone "Phase 5 — Social layer"    "Comments, reactions, profiles, albums, invites."
milestone "Phase 6 — Depth"           "Levels, badges, events, polls, search."
milestone "Phase 7 — Scale & GTM"     "Diaspora, admin metrics, monetisation surface, deploy."

# ---- issues ----
issue() { # title  body  milestone  labels
  gh issue create --repo "$REPO" --title "$1" --body "$2" --milestone "$3" --label "$4" >/dev/null
  echo "  + $1"
}

echo "Creating backlog issues…"
issue "feat: Telegram bot DM channel — the pilot's push notifications" \
  "Deliver in-app notifications as Telegram DMs. The pilot's primary re-engagement loop." \
  "Phase 3 — Daily Pull" "type:feat,area:backend,priority:high"
issue "feat: Onboarding checklist card (activation driver)" \
  "A home-screen card guiding a new neighbour through the first high-value actions (household, history, first help)." \
  "Phase 3 — Daily Pull" "type:feat,area:frontend,priority:high"
issue "feat: Weekly digest notification" \
  "A once-a-week summary of the mahalla (new neighbours, help given, upcoming events)." \
  "Phase 3 — Daily Pull" "type:feat,area:backend"
issue "refactor: notification i18n — store type+params, render client-side" \
  "Stop persisting pre-rendered Uzbek strings; store a type + params and render per the viewer's language." \
  "Phase 3 — Daily Pull" "type:feat,area:i18n"
issue "feat: friendlier time formatting (Bugun/Kecha + date separators)" \
  "Human relative dates across the feed and notifications, in all four languages." \
  "Phase 3 — Daily Pull" "type:feat,area:i18n"

issue "feat: elder-UX pass — larger-text mode + navigation audit" \
  "A global large-text toggle and a ≤2-tap audit of every core action." \
  "Phase 4 — Identity & Feel" "type:feat,area:design"
issue "feat: app-feel round — no shell flash, real Back, optimistic UI, motion" \
  "Make the PWA feel native: persistent shell, real back navigation, optimistic mutations, tasteful motion." \
  "Phase 4 — Identity & Feel" "type:feat,area:frontend"
issue "feat: raisi panel — daily tools for the mahalla head" \
  "A dashboard giving the elected raisi real, bounded powers and a daily view." \
  "Phase 4 — Identity & Feel" "type:feat,area:frontend"

issue "feat: comments on all post types" \
  "Threaded replies on help/announcement/event/charity/share posts." \
  "Phase 5 — Social layer" "type:feat,area:backend"
issue "feat: one-tap 🤲 Rahmat reactions" \
  "Lightweight appreciation on posts and comments (distinct from the help-loop points)." \
  "Phase 5 — Social layer" "type:feat,area:frontend"
issue "feat: tappable public profiles" \
  "A person page: honour, level, badges, their household." \
  "Phase 5 — Social layer" "type:feat,area:frontend"
issue "feat: multi-photo posts + fullscreen lightbox" \
  "Several images per post with a swipeable lightbox." \
  "Phase 5 — Social layer" "type:feat,area:frontend"
issue "feat: family albums (opt-in household photos)" \
  "A private-by-default photo album on the household page." \
  "Phase 5 — Social layer" "type:feat,area:frontend"
issue "feat: edit/delete own posts and comments" \
  "Author controls with an audit-safe soft delete." \
  "Phase 5 — Social layer" "type:feat,area:backend"
issue "feat: mahalla invite link + QR (growth)" \
  "A shareable invite that drops a newcomer straight into the right mahalla." \
  "Phase 5 — Social layer" "type:feat,area:growth,priority:high"

issue "feat: levels from all-time points (Skool-style)" \
  "Surface the computeLevel tiers with names in four languages." \
  "Phase 6 — Depth" "type:feat,area:frontend"
issue "feat: badges (Asoschi, Faol qo'shni, Tarixchi, Mehmondo'st…)" \
  "Earned badges shown on profiles and cards." \
  "Phase 6 — Depth" "type:feat,area:backend"
issue "feat: events with RSVP + day-before reminder" \
  "Proper event posts: attendee list, upcoming section, reminder." \
  "Phase 6 — Depth" "type:feat,area:backend"
issue "feat: charity progress bar (goal vs collected)" \
  "Show progress toward a charity post's goal." \
  "Phase 6 — Depth" "type:feat,area:frontend"
issue "feat: quick polls (separate from proposals)" \
  "Lightweight single-question polls for a mahalla." \
  "Phase 6 — Depth" "type:feat,area:backend"
issue "feat: mahalla contacts page (raisi, clinic, emergencies)" \
  "A quick-reference contacts card — critical for elders." \
  "Phase 6 — Depth" "type:feat,area:frontend"
issue "feat: service photos" \
  "Photos on service-directory listings." \
  "Phase 6 — Depth" "type:feat,area:frontend"
issue "feat: content lifecycle + in-mahalla search" \
  "Archive stale content and let neighbours search within their mahalla." \
  "Phase 6 — Depth" "type:feat,area:backend"
issue "feat: feed pagination + pull-to-refresh" \
  "Paginate the feed and add pull-to-refresh." \
  "Phase 6 — Depth" "type:feat,area:frontend"

issue "feat: diaspora follower mode (future paid tier, free today)" \
  "Let people who moved away follow their home mahalla." \
  "Phase 7 — Scale & GTM" "type:feat,area:backend"
issue "feat: admin metrics dashboard (per-day, per-mahalla)" \
  "Operator view of DAU/retention/activation health." \
  "Phase 7 — Scale & GTM" "type:feat,area:backend"
issue "feat: services commercial surface (views + contact-taps)" \
  "Count listing views and contact-taps to prove commercial value." \
  "Phase 7 — Scale & GTM" "type:feat,area:backend"
issue "chore: free-tier deploy + investor demo kit" \
  "Deploy backend+frontend on free tiers; assemble a demo script and screenshots." \
  "Phase 7 — Scale & GTM" "type:infra,priority:high"

echo "Done. Open: https://github.com/$REPO/issues"
