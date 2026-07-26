/** Device preferences + the language→server bridge.
 *
 * 1. The elder-first "Katta shrift" (large-text) mode, wired to the
 *    `:root[data-textsize="large"]` rule in index.css. Applied on import so a
 *    saved choice survives a reload.
 * 2. Best-effort language sync. The language itself stays a *local* choice
 *    (instant, offline-proof — see core/i18n). This module only mirrors it to
 *    the account so the backend can address the user in the right language
 *    (Telegram DMs, reminders). The mirror never blocks, never reverts the UI
 *    and fails silently on a bad village connection.
 *
 * Imported for its side effects from main.tsx, so both run at boot.
 */

import { create } from 'zustand'
import { useLang, type Lang } from '@/core/i18n'
import { api } from '@/core/api/client'
import { useAuth } from '@/core/stores/auth'

const STORAGE_KEY = 'md_textsize'

/** Reflect the choice onto the document root (drives the CSS in index.css). */
function applyTextSize(large: boolean) {
  document.documentElement.dataset.textsize = large ? 'large' : ''
}

function initialLargeText(): boolean {
  return localStorage.getItem(STORAGE_KEY) === 'large'
}

// Init on import: apply the persisted choice as early as this module loads.
applyTextSize(initialLargeText())

interface PrefsState {
  largeText: boolean
  setLargeText: (v: boolean) => void
  toggleLargeText: () => void
}

export const usePrefs = create<PrefsState>((set, get) => ({
  largeText: initialLargeText(),
  setLargeText: (v) => {
    localStorage.setItem(STORAGE_KEY, v ? 'large' : '')
    applyTextSize(v)
    set({ largeText: v })
  },
  toggleLargeText: () => get().setLargeText(!get().largeText),
}))

// ---------- language → server (best effort, never blocking) ----------

/** Last value we know the account carries. null = "not confirmed yet, try again". */
let syncedLang: Lang | null = null
let inFlight = false

/**
 * Mirror the active language onto the account with PATCH /me {lang}.
 *
 * Fire-and-forget by design: callers never await it, a failure is swallowed
 * (the local choice already applied and must stay), and a retry only happens on
 * the next natural trigger — another language change, a session refresh, or the
 * device coming back online. Never touches the UI.
 */
export function syncLangToServer(): void {
  void pushLang()
}

// A hung PATCH must not disable sync for the whole session; abort well before
// then so `inFlight` always resets. Villages have slow links, not infinite ones.
const SYNC_TIMEOUT_MS = 10_000

async function pushLang(): Promise<void> {
  if (inFlight) return
  const lang = useLang.getState().lang
  if (lang === syncedLang) return

  // Only meaningful for a signed-in account.
  const me = useAuth.getState().me
  if (!me) return

  // Already what the account says — nothing to send. (mergeUser below keeps this
  // cache honest; when it went stale the server got stranded on the old language.)
  if (me.user.lang === lang) {
    syncedLang = lang
    return
  }

  // Known-offline: skip the doomed request, a later trigger retries.
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return

  inFlight = true
  try {
    await api('/me', { method: 'PATCH', body: { lang }, timeoutMs: SYNC_TIMEOUT_MS })
    syncedLang = lang
    // Reflect the confirmed change in the cached account, so a later switch-back
    // is compared against the truth instead of a stale value.
    useAuth.getState().mergeUser({ lang })
  } catch {
    // Offline, 5xx, timeout, anything: the user keeps their language, retry later.
  } finally {
    inFlight = false
    // Chase only a NEWER choice than the one just attempted. Comparing against the
    // attempted `lang` (not syncedLang) means a repeated failure of the same value
    // waits for a real trigger instead of hot-looping against a down server, while
    // a switch made mid-flight is still sent immediately.
    if (useLang.getState().lang !== lang) void pushLang()
  }
}

// The user switched language — mirror it (after the instant local switch).
useLang.subscribe((state, prev) => {
  if (state.lang !== prev.lang) syncLangToServer()
})

// A session appeared/changed (login, boot refresh, back online). A different
// account must not inherit the previous one's "already synced" marker.
useAuth.subscribe((state, prev) => {
  const uid = state.me?.user.id ?? null
  const prevUid = prev.me?.user.id ?? null
  if (uid !== prevUid) syncedLang = null
  if (uid !== null) syncLangToServer()
})

// Cold start with a cached session: reconcile once, quietly.
syncLangToServer()
