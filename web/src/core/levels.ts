/** Daraja (level) derived purely from all-time obro' — no backend needed.
 * Lives in core/ (UI-free, transferable). Level names are 4-language. */

import type { Dict, Lang } from './i18n'

const THRESHOLDS = [0, 500, 1500, 3500, 7000, 12000, 20000] // level 1..7

export interface Daraja {
  level: number // 1..7
  into: number // points earned into the current level
  span: number // points from this level to the next (0 at max)
  progress: number // 0..1 toward next level (1 at max)
  atMax: boolean
}

export function computeLevel(alltime: number): Daraja {
  let level = 1
  for (let i = 0; i < THRESHOLDS.length; i++) {
    if (alltime >= THRESHOLDS[i]) level = i + 1
  }
  const atMax = level >= THRESHOLDS.length
  const base = THRESHOLDS[level - 1]
  const next = atMax ? base : THRESHOLDS[level]
  const span = atMax ? 0 : next - base
  const into = alltime - base
  return { level, into, span, progress: atMax ? 1 : into / span, atMax }
}

/** Level titles, 4 languages. Index 0 unused (levels are 1-based). */
export const LEVEL_NAMES: Dict = {
  l1: { uz: 'Yangi qo‘shni', uzc: 'Янги қўшни', ru: 'Новый сосед', en: 'New neighbor' },
  l2: { uz: 'Qo‘shni', uzc: 'Қўшни', ru: 'Сосед', en: 'Neighbor' },
  l3: { uz: 'Yaqin qo‘shni', uzc: 'Яқин қўшни', ru: 'Близкий сосед', en: 'Close neighbor' },
  l4: { uz: 'Mahalla ustuni', uzc: 'Маҳалла устуни', ru: 'Опора махалли', en: 'Pillar of the mahalla' },
  l5: { uz: 'Mahalla faxri', uzc: 'Маҳалла фахри', ru: 'Гордость махалли', en: 'Pride of the mahalla' },
  l6: { uz: 'Oqsoqol', uzc: 'Оқсоқол', ru: 'Аксакал', en: 'Elder' },
  l7: { uz: 'Mahalla afsonasi', uzc: 'Маҳалла афсонаси', ru: 'Легенда махалли', en: 'Mahalla legend' },
}

export function levelName(level: number, lang: Lang): string {
  const entry = LEVEL_NAMES[`l${Math.min(Math.max(level, 1), 7)}`]
  return entry[lang] ?? entry.uz
}
