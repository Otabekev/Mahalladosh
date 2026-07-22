/** "BUGUN" briefing — a client-side daily digest for the Mahallam feed.
 *  No new API: it reads the already-loaded posts and surfaces open help + the next event.
 *  Renders nothing when there is nothing worth briefing. */

import type { ReactNode } from 'react'
import { useLang, useStrings } from '@/core/i18n'
import { feedStrings } from '@/core/i18n/feed'
import type { Post } from '@/core/api/types'

const DATE_LOCALE: Record<string, string> = { uz: 'uz', uzc: 'uz', ru: 'ru', en: 'en' }

function parseDate(iso: string): Date {
  return new Date(iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z')
}

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

/** Days from local midnight-today to the local day of `date` (0 = today, 1 = tomorrow). */
function daysUntil(date: Date): number {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - start.getTime()) / 86400000)
}

export function BugunCard({ posts }: { posts: Post[] }) {
  const s = useStrings(feedStrings)
  const lang = useLang((st) => st.lang)

  const helpCount = posts.filter((p) => p.type === 'help' && p.status === 'open').length

  const nextEvent = posts
    .filter((p): p is Post & { event_date: string } => p.type === 'event' && !!p.event_date)
    .map((p) => ({ post: p, date: parseDate(p.event_date) }))
    .filter((e) => daysUntil(e.date) >= 0)
    .sort((a, b) => a.date.getTime() - b.date.getTime())[0]

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
    const d = daysUntil(nextEvent.date)
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
