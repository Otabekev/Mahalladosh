/** "BUGUN" briefing — the daily anchor on the Mahallam feed: open help and the next
 *  event. The numbers come from the server (GET /posts/bugun) and count the whole
 *  mahalla; deriving them from the loaded posts, as this once did, quietly became
 *  "…on the first page" as soon as the feed was paged.
 *  Renders nothing when there is nothing worth briefing. */

import type { ReactNode } from 'react'
import { useLang, useStrings } from '@/core/i18n'
import { feedStrings } from '@/core/i18n/feed'
import { daysUntil, parseDate } from '@/components/ui'
import type { Bugun } from '@/core/api/types'

const DATE_LOCALE: Record<string, string> = { uz: 'uz', uzc: 'uz', ru: 'ru', en: 'en' }

function HeartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F4D89E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s-7-4.5-9.5-9A5 5 0 0 1 12 6a5 5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F4D89E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8h16M6 8V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2M8 8v12M16 8v12M4 20h16" />
    </svg>
  )
}

function Row({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 text-[16px]">
      <span className="shrink-0">{icon}</span>
      <span>{children}</span>
    </div>
  )
}

export function BugunCard({ bugun }: { bugun: Bugun | undefined }) {
  const s = useStrings(feedStrings)
  const lang = useLang((st) => st.lang)

  const helpCount = bugun?.open_help_count ?? 0
  const event = bugun?.next_event
  const nextEvent =
    event?.event_date
      ? { post: event, iso: event.event_date, date: parseDate(event.event_date) }
      : null

  const rows: ReactNode[] = []

  if (helpCount > 0) {
    const [before, after] = s.bugunHelp.split('{n}')
    rows.push(
      <Row key="help" icon={<HeartIcon />}>
        {before}
        <b className="font-bold">{helpCount}</b>
        {after}
      </Row>,
    )
  }

  if (nextEvent) {
    const d = daysUntil(nextEvent.iso)
    const prefix =
      d === 0
        ? s.todayLabel
        : d === 1
          ? s.tomorrowLabel
          : nextEvent.date.toLocaleDateString(DATE_LOCALE[lang], { day: 'numeric', month: 'long' })
    rows.push(
      <Row key="event" icon={<CalendarIcon />}>
        {prefix} <b className="font-bold">{nextEvent.post.title}</b>
      </Row>,
    )
  }

  if (rows.length === 0) return null

  return (
    <div className="relative overflow-hidden rounded-2xl p-4 text-[#EAF6F6] shadow-pop bg-[linear-gradient(160deg,#1a8892,#0e5e66)]">
      {/* faint girih tilework, top-right corner */}
      <svg
        width="90"
        height="90"
        viewBox="0 0 60 60"
        aria-hidden
        className="absolute pointer-events-none"
        style={{ top: -20, right: -18, opacity: 0.28 }}
      >
        <g fill="none" stroke="#F4DFA8" strokeWidth="1.6">
          <circle cx="30" cy="30" r="24" />
          <rect x="14" y="14" width="32" height="32" />
          <rect x="14" y="14" width="32" height="32" transform="rotate(45 30 30)" />
        </g>
      </svg>
      <div className="font-extrabold text-[14px] uppercase tracking-[2px] opacity-90">{s.bugunHeading}</div>
      <div className="relative mt-3 flex flex-col gap-2.5">{rows}</div>
    </div>
  )
}
