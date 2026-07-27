/** A quick poll's options and tallies — one tap to answer, from the feed card or
 *  the post page.
 *
 *  Before you vote you see the choices; after you vote the same rows become bars.
 *  That is deliberate: showing the running result first would anchor people to the
 *  leading answer, which is exactly what a poll about "which Saturday suits you"
 *  should not do. Tapping a different option moves your vote — no undo button.
 */

import { fmt, useStrings } from '@/core/i18n'
import { feedStrings } from '@/core/i18n/feed'
import { useVote } from '@/core/queries/posts'
import type { Poll } from '@/core/api/types'

export function PollCard({
  postId,
  poll,
  closed = false,
}: {
  postId: number
  poll: Poll
  closed?: boolean
}) {
  const s = useStrings(feedStrings)
  const vote = useVote(postId)
  const voted = poll.my_option_id !== null
  const showResults = voted || closed

  return (
    <div className="mt-3" onClick={(e) => e.stopPropagation()}>
      <div className="flex flex-col gap-2">
        {poll.options.map((o) => {
          const mine = o.id === poll.my_option_id
          const share = poll.total_votes > 0 ? Math.round((o.votes / poll.total_votes) * 100) : 0

          if (!showResults) {
            return (
              <button
                key={o.id}
                type="button"
                disabled={vote.isPending}
                onClick={() => vote.mutate(o.id)}
                className="min-h-[48px] w-full rounded-xl border border-line bg-card px-4 py-3 text-left text-[15px] font-semibold text-ink transition active:scale-[0.99] hover:border-brand/40 hover:bg-brand-soft/40 disabled:opacity-60"
              >
                {o.text}
              </button>
            )
          }

          return (
            <button
              key={o.id}
              type="button"
              disabled={closed || vote.isPending}
              onClick={() => !closed && vote.mutate(o.id)}
              aria-label={`${o.text} — ${share}%`}
              className={`relative min-h-[48px] w-full overflow-hidden rounded-xl border px-4 py-3 text-left transition disabled:cursor-default ${
                mine ? 'border-brand bg-card' : 'border-line bg-card'
              }`}
            >
              {/* the filled portion sits behind the label, never over it */}
              <span
                aria-hidden
                className={`absolute inset-y-0 left-0 transition-[width] duration-500 ${
                  mine ? 'bg-brand-soft' : 'bg-line/50'
                }`}
                style={{ width: `${share}%` }}
              />
              <span className="relative flex items-center justify-between gap-3">
                <span className={`text-[15px] ${mine ? 'font-bold text-brand' : 'font-semibold text-ink'}`}>
                  {mine && '✓ '}
                  {o.text}
                </span>
                <span className="shrink-0 text-sm font-bold text-sub">{share}%</span>
              </span>
            </button>
          )
        })}
      </div>

      <p className="mt-2 text-xs text-sub">
        {closed
          ? s.pollClosed
          : poll.total_votes === 0
            ? s.pollNoVotes
            : fmt(s.pollVotes, { n: poll.total_votes })}
      </p>
    </div>
  )
}
