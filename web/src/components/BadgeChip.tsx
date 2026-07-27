/** Earned badges — a pill beside a name, and a tile in the own-profile grid.
 *
 *  Elder rule throughout: icon AND label, never the icon alone. A 🌳 on its own
 *  means nothing to someone seeing it for the first time.
 */

import { useStrings } from '@/core/i18n'
import { profileStrings } from '@/core/i18n/profile'
import { BADGE_META, badgeNameKey, isBadgeCode, type BadgeCode } from '@/core/badges'

export function BadgeChip({
  code,
  count = 1,
  size = 'md',
}: {
  code: string
  count?: number
  size?: 'sm' | 'md'
}) {
  const p = useStrings(profileStrings)
  // an unknown code from a newer server renders as nothing, never a broken pill
  if (!isBadgeCode(code)) return null
  const meta = BADGE_META[code]
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-semibold ${
        size === 'sm' ? 'px-2 py-0.5 text-[12px]' : 'min-h-[28px] px-3 py-1 text-[13px]'
      }`}
      style={{ background: meta.bg, borderColor: meta.border, color: meta.fg }}
    >
      <span aria-hidden>{meta.emoji}</span>
      {p[badgeNameKey(code)]}
      {count > 1 && <span className="opacity-70">×{count}</span>}
    </span>
  )
}

/** A square tile for the own-profile grid. A locked tile is deliberately still
 *  shown, with what earns it — it is the only place the app says out loud what
 *  the community values. */
export function BadgeTile({
  code,
  count,
  earned,
}: {
  code: BadgeCode
  count: number
  earned: boolean
}) {
  const p = useStrings(profileStrings)
  const meta = BADGE_META[code]
  const how = p[`${badgeNameKey(code)}How` as keyof typeof p]

  return (
    <div
      title={earned ? undefined : how}
      className={`flex flex-col items-center justify-center rounded-2xl border px-2 py-3 text-center ${
        earned ? '' : 'border-line bg-card opacity-45'
      }`}
      style={earned ? { background: meta.bg, borderColor: meta.border } : undefined}
    >
      <span className="text-2xl leading-none" aria-hidden>
        {meta.emoji}
      </span>
      <span
        className="mt-1.5 text-xs font-bold leading-tight"
        style={earned ? { color: meta.fg } : undefined}
      >
        {p[badgeNameKey(code)]}
        {earned && count > 1 && ` ×${count}`}
      </span>
      {!earned && <span className="mt-0.5 text-[10px] leading-tight text-sub">{how}</span>}
    </div>
  )
}
