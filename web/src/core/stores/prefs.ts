/** Local UI preferences (device-scoped, no backend). Currently: the elder-first
 * "Katta shrift" (large-text) mode, wired to the `:root[data-textsize="large"]`
 * rule in index.css. Applied on import so a saved choice survives a reload. */

import { create } from 'zustand'

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
