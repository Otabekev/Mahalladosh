import { create } from 'zustand'
import { api, ApiError } from '../api/client'
import type { Me } from '../api/types'

/** Last known session, kept so a network blip (village connectivity) doesn't
 * bounce an active user to the login screen. Cleared only on a real 401/logout. */
const ME_KEY = 'md_me'

function readCachedMe(): Me | null {
  try {
    const raw = localStorage.getItem(ME_KEY)
    return raw ? (JSON.parse(raw) as Me) : null
  } catch {
    return null
  }
}

function writeCachedMe(me: Me) {
  try {
    localStorage.setItem(ME_KEY, JSON.stringify(me))
  } catch {
    /* storage full or unavailable — offline fallback just won't work */
  }
}

function clearCachedMe() {
  try {
    localStorage.removeItem(ME_KEY)
  } catch {
    /* ignore */
  }
}

interface AuthState {
  me: Me | null
  status: 'loading' | 'ready'
  /** true when the last /auth/me attempt failed for a non-auth reason (network, 5xx). */
  offline: boolean
  refresh: () => Promise<void>
  logout: () => Promise<void>
  /** Merge fields into the cached user after a confirmed self-update (e.g. the
   *  language mirror). Keeps the cache honest so a stale copy can't drive a wrong
   *  decision — the language-sync bug where the server got stranded on the wrong
   *  language came from exactly this cache going stale. */
  mergeUser: (patch: Partial<Me['user']>) => void
}

export const useAuth = create<AuthState>((set, get) => ({
  // Hydrate synchronously so a cold offline start shows the app, not login;
  // status stays "loading" until the first refresh settles.
  me: readCachedMe(),
  status: 'loading',
  offline: false,
  refresh: async () => {
    try {
      const me = await api<Me>('/auth/me')
      writeCachedMe(me)
      set({ me, status: 'ready', offline: false })
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        // The server answered: the session is really gone.
        clearCachedMe()
        set({ me: null, status: 'ready', offline: false })
      } else {
        // Network failure (TypeError) or server error — keep the last known session.
        const me = get().me ?? readCachedMe()
        set({ me, status: 'ready', offline: true })
        throw e
      }
    }
  },
  logout: async () => {
    // Log out locally no matter what — a dead network must not trap the user.
    try {
      await api('/auth/logout', { method: 'POST' })
    } catch {
      /* server unreachable — still clear the local session below */
    } finally {
      clearCachedMe()
      set({ me: null, offline: false })
    }
  },
  mergeUser: (patch) => {
    const cur = get().me
    if (!cur) return
    const me = { ...cur, user: { ...cur.user, ...patch } }
    writeCachedMe(me)
    set({ me })
  },
}))

// Reflect real connectivity: the browser knows before a fetch fails. Going
// offline shows the banner immediately; coming back re-validates the session
// (which clears the flag on success).
if (typeof window !== 'undefined') {
  window.addEventListener('offline', () => useAuth.setState({ offline: true }))
  window.addEventListener('online', () => {
    useAuth.getState().refresh().catch(() => undefined)
  })
}
