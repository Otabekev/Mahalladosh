/** The two «Xabar bering» cards.
 *
 *  They are deliberate opposites, because the two things they announce are opposites.
 *
 *  TA'ZIYA is the quietest card in the app. No author byline, no colour, no
 *  timestamp shouting "3 soat oldin", no photo. The deceased's name is the only
 *  thing set large, in the display serif rather than the UI sans, and the ornament
 *  is a single hairline rule. Everything else in this feed competes for attention;
 *  this one has to visibly refuse to. What it does carry is the two facts a
 *  neighbour needs in order to fulfil an obligation: when the janoza is, and where.
 *
 *  SHOSHILINCH is the loudest. Red bar, siren, the kind of emergency named before
 *  anything else, and a live badge while it is open. When it is closed it drops back
 *  to the ordinary card, because a resolved emergency should stop shouting.
 */

import { useNavigate } from 'react-router-dom'
import type { MouseEvent } from 'react'
import { Card, timeAgo } from '@/components/ui'
import { GirihRule } from '@/components/Ornament'
import { RahmatButton } from '@/components/RahmatButton'
import { fmt, useStrings } from '@/core/i18n'
import { broadcastStrings } from '@/core/i18n/broadcast'
import type { Post } from '@/core/api/types'

const EMERGENCY_LABEL: Record<string, keyof typeof broadcastStrings> = {
  fire: 'catFire',
  medical: 'catMedical',
  missing: 'catMissing',
  livestock: 'catLivestock',
  other: 'catOther',
}

/** "30.07, 09:00" in the reader's own timezone. */
function when(iso: string): string {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}, ${p(d.getHours())}:${p(d.getMinutes())}`
}

/** Whether the house is still inside the three days of open gates. */
function gatesStillOpen(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() < 3 * 24 * 3600 * 1000
}

export function TaziyaCard({ post, onOpen }: { post: Post; onOpen: () => void }) {
  const b = useStrings(broadcastStrings)

  return (
    <Card className="p-0 overflow-hidden bg-paper" onClick={onOpen}>
      <div className="px-5 pt-5 pb-4 text-center">
        <div className="text-2xl leading-none mb-2" aria-hidden>
          🕊
        </div>
        <h3 className="font-display text-[26px] leading-tight text-ink">{post.title}</h3>

        <div className="my-3.5 px-6">
          <GirihRule />
        </div>

        {/* the two facts an obligation actually needs */}
        {post.event_date && (
          <p className="text-[15px] font-semibold text-ink">
            {fmt(b.janozaAt, { when: when(post.event_date) })}
          </p>
        )}
        {post.place && <p className="text-[15px] text-sub">{post.place}</p>}

        {gatesStillOpen(post.created_at) && (
          <p className="mt-2 text-sm text-sub">{b.gatesOpen}</p>
        )}

        {post.body && (
          <p className="mt-3 text-[15px] leading-relaxed text-sub whitespace-pre-wrap line-clamp-4">
            {post.body}
          </p>
        )}

        <p className="mt-3.5 font-display text-[17px] text-sub/90">{b.condolence}</p>
      </div>

      {/* 🤲 here reads "Duo qildim", never "Rahmat" — see RahmatButton */}
      <div className="flex justify-center border-t border-line/60 py-1.5">
        <RahmatButton post={post} size="sm" />
      </div>
    </Card>
  )
}

export function EmergencyCard({ post, onOpen }: { post: Post; onOpen: () => void }) {
  const b = useStrings(broadcastStrings)
  const navigate = useNavigate()
  const openAuthor = (e: MouseEvent) => {
    e.stopPropagation()
    navigate(`/app/u/${post.author.id}`)
  }
  const kindKey = post.category ? EMERGENCY_LABEL[post.category] : undefined

  return (
    <div
      onClick={onOpen}
      className="relative overflow-hidden bg-brand-soft border-[1.5px] border-brand/50 rounded-2xl p-4 shadow-card cursor-pointer"
    >
      <div className="absolute top-0 inset-x-0 h-[5px] bg-brand" />

      <div className="flex items-center gap-2 mb-2.5">
        <span className="inline-flex items-center gap-1.5 bg-brand text-[#FBF3E2] font-bold text-[13px] rounded-full px-3 py-1.5">
          🚨 {kindKey ? b[kindKey] : b.sectionTitle}
        </span>
        <span className="text-[12px] font-bold uppercase tracking-wide text-brand-deep">
          {b.emergencyLive}
        </span>
        <span className="ml-auto text-xs text-sub">{timeAgo(post.created_at)}</span>
      </div>

      {/* the WHAT before the WHO — nobody reading this needs the byline first */}
      <h3 className="font-bold text-[19px] leading-snug text-ink">{post.title}</h3>
      {post.body && (
        <p className="mt-1.5 text-[16px] leading-relaxed text-ink whitespace-pre-wrap line-clamp-4">
          {post.body}
        </p>
      )}

      <button
        onClick={openAuthor}
        className="mt-3 text-sm font-semibold text-brand-deep underline underline-offset-2"
      >
        {post.author.full_name}
      </button>
    </div>
  )
}
