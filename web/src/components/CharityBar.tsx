/** A charity collection's progress — goal, collected, and how far along.
 *
 *  The app takes no payments, so `collected` is a figure the author types in. The
 *  design leans into that rather than hiding it: the bar always carries when it was
 *  last reported, so a number nobody has touched in three weeks reads as stale
 *  instead of as fact, and only the author can change it.
 */

import { useState } from 'react'
import { fmt, useStrings } from '@/core/i18n'
import { common } from '@/core/i18n/common'
import { feedStrings } from '@/core/i18n/feed'
import { Button, ErrorNote, Modal, timeAgo } from '@/components/ui'
import { useUpdateCharity } from '@/core/queries/posts'
import type { Post } from '@/core/api/types'

/** 1200000 → "1 200 000". Thin spaces, because 1,200,000 and 1.200.000 mean
 *  opposite things depending on where the reader learned to write numbers. */
export function formatSom(amount: number): string {
  return String(Math.round(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

export function CharityBar({ post, canReport }: { post: Post; canReport: boolean }) {
  const s = useStrings(feedStrings)
  const [open, setOpen] = useState(false)
  const hasGoal = (post.charity_goal_amount ?? 0) > 0

  return (
    <div className="mt-3" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[19px] font-extrabold leading-none text-good">
            {formatSom(post.charity_collected_amount)}
            <span className="ml-1 text-[13px] font-semibold text-sub">{s.som}</span>
          </div>
          {hasGoal && (
            <div className="mt-1 text-xs text-sub">
              {fmt(s.charityOfGoal, { goal: formatSom(post.charity_goal_amount ?? 0) })}
            </div>
          )}
        </div>
        {hasGoal && (
          <div className="shrink-0 text-[19px] font-extrabold leading-none text-good">
            {post.charity_percent}%
          </div>
        )}
      </div>

      {hasGoal && (
        <div
          className="mt-2 h-3 w-full overflow-hidden rounded-full bg-line/60"
          role="progressbar"
          aria-valuenow={post.charity_percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-good transition-[width] duration-700"
            style={{ width: `${post.charity_percent}%` }}
          />
        </div>
      )}

      <div className="mt-1.5 flex items-center justify-between gap-2">
        <p className="text-xs text-sub">
          {post.charity_updated_at
            ? fmt(s.charityReported, { when: timeAgo(post.charity_updated_at) })
            : s.charityNotReported}
        </p>
        {canReport && (
          <button
            onClick={() => setOpen(true)}
            className="min-h-[44px] shrink-0 px-1 text-sm font-semibold text-brand"
          >
            {s.charityReport}
          </button>
        )}
      </div>

      {canReport && <ReportModal post={post} open={open} onClose={() => setOpen(false)} />}
    </div>
  )
}

function ReportModal({ post, open, onClose }: { post: Post; open: boolean; onClose: () => void }) {
  const s = useStrings(feedStrings)
  const c = useStrings(common)
  const update = useUpdateCharity(post.id)
  const [text, setText] = useState(String(post.charity_collected_amount))

  // digits only — this is money, and a stray letter should never reach the server
  const amount = Number(text.replace(/\D/g, '') || '0')

  return (
    <Modal open={open} onClose={onClose} title={s.charityReportTitle}>
      {update.error && <ErrorNote message={update.error.message} />}
      <p className="mb-3 text-sm text-sub">{s.charityReportHint}</p>
      <label className="mb-4 block">
        <span className="mb-1.5 block text-sm font-semibold text-ink">{s.charityCollected}</span>
        <div className="relative">
          <input
            inputMode="numeric"
            value={formatSom(amount)}
            onChange={(e) => setText(e.target.value)}
            className="w-full rounded-xl border border-line bg-card px-3.5 py-3 pr-16 text-[18px] font-bold text-ink focus:border-brand/40 focus:outline-none focus:ring-2 focus:ring-brand/25"
          />
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-sub">
            {s.som}
          </span>
        </div>
      </label>
      <Button
        full
        loading={update.isPending}
        onClick={() => update.mutate(amount, { onSuccess: onClose })}
      >
        {c.save}
      </Button>
    </Modal>
  )
}
