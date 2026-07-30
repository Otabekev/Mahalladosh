/** i18n core — 4 languages. Default uz-Latin; elders often read Cyrillic best.
 * Usage: const s = useStrings(dict) → s.someKey in the active language.
 * Dictionaries live per feature (core/i18n/<feature>.ts) to avoid collisions. */

import { useMemo } from 'react'
import { create } from 'zustand'

export type Lang = 'uz' | 'uzc' | 'ru' | 'en'

export const LANGS: { value: Lang; label: string; short: string }[] = [
  { value: 'uz', label: "O'zbekcha", short: "O'z" },
  { value: 'uzc', label: 'Ўзбекча', short: 'Ўз' },
  { value: 'ru', label: 'Русский', short: 'Ру' },
  { value: 'en', label: 'English', short: 'En' },
]

export type Entry = Record<Lang, string>
export type Dict = Record<string, Entry>
export type Resolved<D extends Dict> = { [K in keyof D]: string }

const STORAGE_KEY = 'md_lang'

/** `core/` is the UI-free layer a native rewrite is meant to reuse, so nothing in
 *  it may ASSUME a browser. These two guards are what let the module be imported
 *  by a test runner, a server renderer, or anything else without a DOM — it used
 *  to throw at import time on `localStorage`, which is a poor property for the
 *  layer that exists to be portable. */
const hasWindow = typeof window !== 'undefined'

function initialLang(): Lang {
  if (!hasWindow) return 'uz'
  const saved = window.localStorage.getItem(STORAGE_KEY)
  if (saved === 'uz' || saved === 'uzc' || saved === 'ru' || saved === 'en') return saved
  return 'uz'
}

function rememberLang(lang: Lang) {
  if (!hasWindow) return
  window.localStorage.setItem(STORAGE_KEY, lang)
  document.documentElement.lang = lang === 'uzc' ? 'uz-Cyrl' : lang
}

interface LangState {
  lang: Lang
  setLang: (lang: Lang) => void
}

export const useLang = create<LangState>((set) => ({
  lang: initialLang(),
  setLang: (lang) => {
    rememberLang(lang)
    set({ lang })
  },
}))

if (hasWindow) rememberLang(initialLang())

/** Resolve a dictionary into plain strings for the active language. */
export function useStrings<D extends Dict>(dict: D): Resolved<D> {
  const lang = useLang((s) => s.lang)
  return useMemo(() => {
    const out: Record<string, string> = {}
    for (const key in dict) out[key] = dict[key][lang] ?? dict[key].uz
    return out as Resolved<D>
  }, [dict, lang])
}

/** Non-hook lookup for plain functions (e.g. timeAgo). */
export function pick(entry: Entry): string {
  const lang = useLang.getState().lang
  return entry[lang] ?? entry.uz
}

/** "{n} kishi" → "5 kishi" */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`))
}
