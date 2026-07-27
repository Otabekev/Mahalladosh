/** The badge catalog — the sibling of core/levels.ts.
 *
 *  The backend returns facts only (code + count); everything about how a badge
 *  looks and reads lives here, next to the rest of the honour presentation. That
 *  is also why an unknown code renders as nothing rather than as a broken chip:
 *  a newer server must never be able to put a blank pill on an elder's profile.
 */

export type BadgeCode = 'faol' | 'asoschi' | 'mehmondost' | 'tarixchi'

export interface EarnedBadge {
  code: string
  count: number
}

/** Display order, rarest first — mirrors PRIORITY in api/app/badges.py. */
export const BADGE_ORDER: BadgeCode[] = ['faol', 'asoschi', 'mehmondost', 'tarixchi']

/** Colours are index.css @theme tokens, never raw hex. */
export const BADGE_META: Record<BadgeCode, { emoji: string; bg: string; border: string; fg: string }> = {
  // 🏆 matches the honour wording already used in the notification catalog
  faol: {
    emoji: '🏆',
    bg: 'var(--color-gold-soft)',
    border: 'var(--color-honor)',
    fg: 'var(--color-honor-deep)',
  },
  // 🌳 not 🌱: a seedling reads as "beginner", and this is the opposite — the
  // person who was here when the mahalla opened
  asoschi: {
    emoji: '🌳',
    bg: 'var(--color-brand-soft)',
    border: 'var(--color-brand)',
    fg: 'var(--color-brand)',
  },
  mehmondost: {
    emoji: '🤝',
    bg: 'var(--color-good-soft)',
    border: 'var(--color-good)',
    fg: 'var(--color-good)',
  },
  tarixchi: {
    emoji: '📜',
    bg: 'var(--color-accent-soft)',
    border: 'var(--color-accent)',
    fg: 'var(--color-accent)',
  },
}

export function isBadgeCode(value: string): value is BadgeCode {
  return value in BADGE_META
}

/** The i18n key holding this badge's name, so screens index the dictionary
 *  without a switch that could drift from BADGE_ORDER. */
export function badgeNameKey(code: BadgeCode): 'badgeFaol' | 'badgeAsoschi' | 'badgeMehmondost' | 'badgeTarixchi' {
  const map = {
    faol: 'badgeFaol',
    asoschi: 'badgeAsoschi',
    mehmondost: 'badgeMehmondost',
    tarixchi: 'badgeTarixchi',
  } as const
  return map[code]
}
