/** Elder-guided "install this app" banner.
 *
 * Shows a warm card with the app mark, a plain-language reason, and — on
 * Android/Chrome — a single big Install button that fires the real native prompt.
 * On iOS Safari (no install event) it shows the Share → Add-to-Home-Screen hint
 * instead. Hidden entirely once installed (running standalone) or dismissed. */

import { Button } from '@/components/ui'
import { Logo } from '@/components/Logo'
import { useStrings } from '@/core/i18n'
import { installStrings } from '@/core/i18n/install'
import { useInstall } from '@/core/pwa'

function ShareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block align-text-bottom">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <path d="M12 2v14M8 6l4-4 4 4" />
    </svg>
  )
}

export function InstallPrompt() {
  const s = useStrings(installStrings)
  const { deferred, dismissed, standalone, ios, dismiss, install } = useInstall()

  if (standalone || dismissed) return null
  const canPrompt = deferred !== null
  if (!canPrompt && !ios) return null // desktop / unsupported browser — nothing to offer

  return (
    <div className="relative mb-3.5 flex items-start gap-3 rounded-2xl border border-line bg-card p-3.5 shadow-card">
      <Logo variant="icon" size={44} />
      <div className="min-w-0 flex-1">
        <h3 className="text-[16px] font-bold text-ink">{s.title}</h3>
        <p className="mt-0.5 text-[14px] leading-snug text-sub">{s.subtitle}</p>

        {canPrompt ? (
          <div className="mt-3 flex items-center gap-2">
            <Button onClick={() => void install()}>{s.install}</Button>
            <Button variant="ghost" onClick={dismiss}>
              {s.later}
            </Button>
          </div>
        ) : (
          // iOS: no button we can wire — spell out the manual steps.
          <p className="mt-2 text-[14px] leading-snug text-ink">
            <ShareIcon /> {s.iosHint}
          </p>
        )}
      </div>

      <button
        onClick={dismiss}
        aria-label={s.later}
        className="shrink-0 -mt-1 -mr-1 px-2 py-1 text-lg leading-none text-sub hover:text-ink"
      >
        ×
      </button>
    </div>
  )
}
