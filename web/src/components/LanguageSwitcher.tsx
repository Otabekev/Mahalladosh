/** Language switcher — big and obvious (elders must find it without help).
 * variant "chips": compact row for the login screen header.
 * variant "list": full-width rows for the profile settings. */

import { LANGS, useLang } from '@/core/i18n'

export default function LanguageSwitcher({ variant = 'chips' }: { variant?: 'chips' | 'list' }) {
  const lang = useLang((s) => s.lang)
  const setLang = useLang((s) => s.setLang)

  if (variant === 'list') {
    return (
      <div className="divide-y divide-line">
        {LANGS.map((l) => (
          <button
            key={l.value}
            onClick={() => setLang(l.value)}
            className="w-full flex items-center justify-between px-4 py-3.5 min-h-[44px] text-left hover:bg-gray-50 transition"
          >
            <span className={`text-[15px] ${lang === l.value ? 'font-bold text-ink' : 'text-ink'}`}>
              {l.label}
            </span>
            {lang === l.value && <span className="text-good font-bold">✓</span>}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="flex gap-1.5">
      {LANGS.map((l) => (
        <button
          key={l.value}
          onClick={() => setLang(l.value)}
          className={`rounded-full px-3 py-1.5 min-h-[36px] text-sm font-semibold transition ${
            lang === l.value ? 'bg-brand text-white' : 'bg-card border border-line text-sub hover:text-ink'
          }`}
        >
          {l.short}
        </button>
      ))}
    </div>
  )
}
