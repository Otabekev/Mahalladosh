/** Slim banner shown under the app header while the auth store is in offline
 * fallback mode (network blip / server unreachable). The integrator wires this
 * into the layout — this file only renders it. */

import { useAuth } from '@/core/stores/auth'
import { useStrings } from '@/core/i18n'
import { common } from '@/core/i18n/common'

export default function OfflineBanner() {
  const offline = useAuth((s) => s.offline)
  const s = useStrings(common)

  if (!offline) return null

  return (
    <div className="fixed top-14 inset-x-0 z-40 bg-[#FBF0D6] border-b border-[#EDD8A6] text-[#B07310]">
      <div className="max-w-xl mx-auto flex items-center gap-2 px-4 py-1.5 text-[12px] font-semibold">
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0"
          aria-hidden="true"
        >
          <line x1="1" y1="1" x2="23" y2="23" />
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
          <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <line x1="12" y1="20" x2="12.01" y2="20" />
        </svg>
        <span>{s.offline}</span>
      </div>
    </div>
  )
}
