/** The «Chiroq bormi?» strip at the top of the feed.
 *
 *  WHY IT IS HERE AND NOT IN THE TAB BAR. This is the feature people come back for
 *  daily through the winter, so it has to be on the screen they land on — but the
 *  tab bar is five slots of elder-first 54px targets and a sixth would cramp all of
 *  them. A card at the top of the feed gets top billing without shrinking anything.
 *
 *  It shows ONE line and, when something is out, one tap. The full board is a tap
 *  away; the job of this card is to answer the question without a navigation.
 */

import { Link } from 'react-router-dom'
import { Card } from '@/components/ui'
import { fmt, useStrings } from '@/core/i18n'
import { utilityStrings } from '@/core/i18n/utility'
import { statusFor, useReportUtility, useUtilityBoard } from '@/core/queries/utility'
import type { UtilityKind } from '@/core/api/types'

const KINDS: UtilityKind[] = ['light', 'gas', 'water']
const ICON: Record<UtilityKind, string> = { light: '💡', gas: '🔥', water: '💧' }

export function ChiroqCard() {
  const s = useStrings(utilityStrings)
  const { data: board } = useUtilityBoard()
  const report = useReportUtility()

  // Nothing to show before the first load — a placeholder here would push the feed
  // down and then snap it back, which is worse than appearing a moment later.
  if (!board) return null

  const statuses = KINDS.map((k) => statusFor(board, k))
  const troubled = statuses.filter((st) => st.out > 0)
  const running = board.windows.find((w) => new Date(w.starts_at).getTime() <= Date.now())

  // The quiet case: everything is fine and nobody needs a card shouting about it.
  // One low line that still invites the tap that seeds tonight's data.
  if (troubled.length === 0 && !running) {
    return (
      <Link to="/app/utility" className="block">
        <Card className="px-4 py-3 flex items-center gap-2.5">
          <span aria-hidden>💡</span>
          <span className="text-sm font-medium text-ink">{s.title}</span>
          <span className="ml-auto text-sm text-sub">
            {statuses.some((st) => st.answered > 0) ? s.allFine : s.nobodySaid}
          </span>
          <span className="text-sub/60" aria-hidden>
            ›
          </span>
        </Card>
      </Link>
    )
  }

  return (
    <Card className="overflow-hidden ring-1 ring-brand/25">
      <Link to="/app/utility" className="block px-4 py-3 bg-brand-soft">
        <div className="flex items-center gap-2">
          <span className="text-lg leading-none" aria-hidden>
            {troubled[0] ? ICON[troubled[0].kind] : '🕐'}
          </span>
          <span className="font-semibold text-ink">
            {troubled.length > 0
              ? troubled.map((st) => s[st.kind]).join(' · ')
              : s.plannedTitle}
          </span>
          <span className="ml-auto text-sm font-medium text-brand-deep">
            {troubled[0] ? fmt(s.outCount, { out: troubled[0].out }) : s.plannedNow}
          </span>
        </div>
      </Link>

      {/* one tap, on the feed, for the utility that is actually out */}
      {troubled[0] && (
        <div className="px-4 py-3 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => report.mutate({ kind: troubled[0].kind, is_out: true })}
            aria-pressed={troubled[0].my_state === 'out'}
            className={`min-h-[52px] rounded-xl border font-semibold text-sm transition active:scale-[0.98] ${
              troubled[0].my_state === 'out'
                ? 'bg-brand text-[#FBF3E2] border-brand'
                : 'bg-card text-ink border-line'
            }`}
          >
            {s.iHaveNone}
          </button>
          <button
            type="button"
            onClick={() => report.mutate({ kind: troubled[0].kind, is_out: false })}
            aria-pressed={troubled[0].my_state === 'on'}
            className={`min-h-[52px] rounded-xl border font-semibold text-sm transition active:scale-[0.98] ${
              troubled[0].my_state === 'on'
                ? 'bg-good text-white border-good'
                : 'bg-card text-ink border-line'
            }`}
          >
            {s.iHaveIt}
          </button>
        </div>
      )}
    </Card>
  )
}
