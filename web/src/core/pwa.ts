/** PWA install state (UI-free, core/).
 *
 * On Android/Chrome the browser fires `beforeinstallprompt` once, early — often
 * before React has mounted — so we capture and stash it here at module load and
 * let the UI trigger the real prompt later with a single tap. iOS Safari has no
 * such event; installing is a manual Share → "Add to Home Screen", so there we
 * surface a short instruction instead. If the app is already installed (running
 * standalone) we never prompt.
 */

import { create } from 'zustand'

const DISMISS_KEY = 'md_install_dismissed'

/** The non-standard event Chrome fires; typed locally since lib.dom omits it. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

function isIos(): boolean {
  if (typeof window === 'undefined') return false
  const ua = window.navigator.userAgent
  // only Safari offers Add-to-Home-Screen; Chrome/Firefox on iOS cannot install
  return /iphone|ipad|ipod/i.test(ua) && !/crios|fxios/i.test(ua)
}

function persistDismissed() {
  try {
    localStorage.setItem(DISMISS_KEY, '1')
  } catch {
    /* storage unavailable — the banner will just reappear next session */
  }
}

interface InstallState {
  deferred: BeforeInstallPromptEvent | null
  dismissed: boolean
  standalone: boolean
  ios: boolean
  dismiss: () => void
  install: () => Promise<void>
}

export const useInstall = create<InstallState>((set, get) => ({
  deferred: null,
  dismissed: typeof localStorage !== 'undefined' && localStorage.getItem(DISMISS_KEY) === '1',
  standalone: isStandalone(),
  ios: isIos(),
  dismiss: () => {
    persistDismissed()
    set({ dismissed: true })
  },
  install: async () => {
    const event = get().deferred
    if (!event) return
    try {
      await event.prompt()
      await event.userChoice
    } catch {
      /* user backed out of the native sheet */
    }
    // the captured event is single-use; drop it and don't nag again
    persistDismissed()
    set({ deferred: null, dismissed: true })
  },
}))

// Capture at import (main.tsx imports this for its side effect). preventDefault
// keeps the event ours to replay from the Install button.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    useInstall.setState({ deferred: e as BeforeInstallPromptEvent })
  })
  window.addEventListener('appinstalled', () => {
    useInstall.setState({ deferred: null, standalone: true })
  })
}
