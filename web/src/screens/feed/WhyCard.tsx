/** "Nega Mahalladosh?" — shown on a feed that is still empty.
 *
 *  Two problems, one card, because they are really the same problem.
 *
 *  (1) Every Uzbek will ask why this instead of the mahalla's Telegram group,
 *  and the honest answer is not a feature list — it is that a group chat has no
 *  memory. A ladder someone needed is under two hundred messages by Thursday.
 *  So the card does not argue; it shows the contrast in three lines and moves on.
 *
 *  (2) The cold-start killer: the first neighbour arrives, nobody else is there,
 *  the feed is empty, they leave and never come back. So the bottom half is
 *  strictly things that WORK ALONE — your family page, the mahalla's phone
 *  numbers, an invite. Nothing here needs a second person to be worth doing.
 *
 *  It disappears the moment the feed has anything in it, because by then the
 *  mahalla is answering the question by itself.
 */

import { useNavigate } from 'react-router-dom'
import { useStrings } from '@/core/i18n'
import { activationStrings } from '@/core/i18n/activation'
import { Card } from '@/components/ui'
import { StarMark } from '@/components/Ornament'

function ContrastRow({ before, after }: { before: string; after: string }) {
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <span className="mt-[3px] w-[92px] shrink-0 text-[13px] leading-snug text-sub line-through decoration-sub/40">
        {before}
      </span>
      <span aria-hidden className="mt-[2px] shrink-0 text-sub">
        →
      </span>
      <span className="text-[15px] font-semibold leading-snug text-ink">{after}</span>
    </div>
  )
}

function SoloAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex min-h-[48px] w-full items-center gap-3 rounded-xl border border-line bg-paper px-3.5 py-2.5 text-left transition active:scale-[0.99] hover:border-brand/40"
    >
      <StarMark size={13} className="shrink-0 text-brand" />
      <span className="flex-1 text-[15px] font-semibold text-ink">{label}</span>
      <span aria-hidden className="text-sub">
        ›
      </span>
    </button>
  )
}

export function WhyCard() {
  const s = useStrings(activationStrings)
  const navigate = useNavigate()

  return (
    <Card className="relative overflow-hidden rounded-2xl rounded-t-[26px] p-0">
      <div className="girih pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative p-5">
        <h2 className="font-display text-[24px] font-bold leading-tight text-ink">{s.whyTitle}</h2>
        <p className="mt-1 text-[15px] leading-snug text-sub">{s.whyLead}</p>

        <div className="mt-3.5 border-t border-line pt-2.5">
          <ContrastRow before={s.whyBefore1} after={s.whyAfter1} />
          <ContrastRow before={s.whyBefore2} after={s.whyAfter2} />
          <ContrastRow before={s.whyBefore3} after={s.whyAfter3} />
        </div>

        <div className="mt-4 border-t border-line pt-3.5">
          <h3 className="mb-2 text-[13px] font-bold uppercase tracking-wide text-sub">
            {s.whyStartNow}
          </h3>
          <div className="space-y-2">
            <SoloAction label={s.whySoloFamily} onClick={() => navigate('/app/household')} />
            <SoloAction label={s.whySoloNumbers} onClick={() => navigate('/app/contacts')} />
            <SoloAction label={s.whySoloInvite} onClick={() => navigate('/app/mahalla')} />
          </div>
        </div>
      </div>
    </Card>
  )
}
