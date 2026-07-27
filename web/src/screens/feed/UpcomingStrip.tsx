/** "Yaqin kunlarda" — the events that have not happened yet, soonest first.
 *
 *  A reverse-chronological feed buries an event the moment anything else is posted,
 *  which is exactly backwards for the one post type whose whole value is that it is
 *  still ahead. This strip is small and horizontal so it costs one line of the feed
 *  and disappears entirely when nothing is coming up.
 */

import { useNavigate } from 'react-router-dom'
import { fmt, useStrings } from '@/core/i18n'
import { feedStrings } from '@/core/i18n/feed'
import { daysUntil } from '@/components/ui'
import { useUpcoming } from '@/core/queries/posts'
import type { Post } from '@/core/api/types'

/** "Bugun" / "Ertaga" / "5 kundan keyin" — an elder reads a day, not a countdown. */
export function useWhenLabel(): (iso: string) => string {
  const s = useStrings(feedStrings)
  return (iso: string) => {
    const d = daysUntil(iso)
    if (d <= 0) return s.eventToday
    if (d === 1) return s.eventTomorrow
    return fmt(s.eventInDays, { n: d })
  }
}

function EventChip({ post, onOpen }: { post: Post; onOpen: () => void }) {
  const whenLabel = useWhenLabel()
  const soon = post.event_date ? daysUntil(post.event_date) <= 1 : false
  return (
    <button
      onClick={onOpen}
      className={`min-h-[64px] w-[190px] shrink-0 snap-start rounded-2xl border px-3.5 py-2.5 text-left transition active:scale-[0.98] ${
        soon ? 'border-brand bg-brand-soft' : 'border-line bg-card'
      }`}
    >
      <div className={`text-[12px] font-extrabold uppercase tracking-wide ${soon ? 'text-brand' : 'text-sub'}`}>
        🎉 {post.event_date && whenLabel(post.event_date)}
      </div>
      <div className="mt-0.5 line-clamp-2 text-[14px] font-bold leading-snug text-ink">{post.title}</div>
      {post.response_count > 0 && (
        // numerals + an icon: nothing to translate, so no dictionary entry
        <div className="mt-0.5 text-[11px] text-sub">👥 {post.response_count}</div>
      )}
    </button>
  )
}

export function UpcomingStrip() {
  const s = useStrings(feedStrings)
  const navigate = useNavigate()
  const { data } = useUpcoming()

  if (!data || data.length === 0) return null

  return (
    <section>
      <h2 className="mb-1.5 text-sm font-bold uppercase tracking-wide text-sub">{s.upcomingHeading}</h2>
      <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1">
        {data.map((post) => (
          <EventChip key={post.id} post={post} onOpen={() => navigate(`/app/posts/${post.id}`)} />
        ))}
      </div>
    </section>
  )
}
