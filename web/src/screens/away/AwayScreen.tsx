/** The away member's screen — the whole app, for someone abroad.
 *
 *  Deliberately OUTSIDE the app shell: no bottom tab bar, no header search, no
 *  navigation into the mahalla. There is nowhere else for them to go, and offering
 *  tabs that all 403 would be worse than offering none.
 *
 *  Three states, in the order a person meets them:
 *    join    — they followed a link their family sent
 *    pending — they claimed it and the family has not confirmed yet
 *    active  — the family, and the news
 */

import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card, ErrorNote, Field, Input, Skeleton, Spinner } from '@/components/ui'
import { GirihRule, SectionHeading } from '@/components/Ornament'
import { useConfirm } from '@/components/confirm'
import { useAuth } from '@/core/stores/auth'
import { fmt, useStrings } from '@/core/i18n'
import { common } from '@/core/i18n/common'
import { awayStrings } from '@/core/i18n/away'
import { broadcastStrings } from '@/core/i18n/broadcast'
import { useAwayHome, useJoinAway, useLeaveAway } from '@/core/queries/away'
import type { AwayPost } from '@/core/api/types'

const TYPE_ICON: Record<string, string> = {
  announcement: '📢',
  taziya: '🕊',
  event: '🎉',
  charity: '❤️',
}

function shortDate(iso: string): string {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}`
}

/** One item of news. A ta'ziya keeps its quiet treatment here too — someone abroad
 *  reading that a neighbour has died deserves the same care as someone at home. */
function NewsItem({ post }: { post: AwayPost }) {
  const b = useStrings(broadcastStrings)
  const isTaziya = post.type === 'taziya'

  return (
    <Card className={`px-4 py-3 ${isTaziya ? 'bg-paper text-center' : ''}`}>
      <div className={`flex items-baseline gap-2 ${isTaziya ? 'justify-center' : ''}`}>
        <span aria-hidden>{TYPE_ICON[post.type] ?? '📌'}</span>
        <h3 className={isTaziya ? 'font-display text-[20px] text-ink' : 'font-semibold text-ink'}>
          {post.title}
        </h3>
        {!isTaziya && <span className="ml-auto text-xs text-sub">{shortDate(post.created_at)}</span>}
      </div>
      {post.event_date && (
        <p className="mt-1 text-sm text-sub">
          {isTaziya ? fmt(b.janozaAt, { when: shortDate(post.event_date) }) : `📅 ${shortDate(post.event_date)}`}
        </p>
      )}
      {post.place && <p className="text-sm text-sub">{post.place}</p>}
      {post.body && (
        <p className="mt-1.5 text-[15px] leading-relaxed text-sub whitespace-pre-wrap line-clamp-4">
          {post.body}
        </p>
      )}
      {isTaziya && <p className="mt-2 font-display text-[16px] text-sub/90">{b.condolence}</p>}
    </Card>
  )
}

/** Step 1: they followed the link their family sent. */
export function AwayJoinScreen() {
  const { token } = useParams()
  const s = useStrings(awayStrings)
  const navigate = useNavigate()
  const [country, setCountry] = useState('')
  const join = useJoinAway()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!token) return
    join.mutate({ token, country: country.trim() || null }, { onSuccess: () => navigate('/away') })
  }

  return (
    <div className="min-h-screen bg-bg px-4 py-10">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2" aria-hidden>
            ✈️
          </div>
          <h1 className="font-display text-[28px] text-ink">{s.joinTitle}</h1>
          <p className="mt-1 text-sm text-sub">{s.joinBody}</p>
        </div>
        <Card className="p-5">
          <form onSubmit={submit} className="space-y-3">
            <Field label={s.countryLabel}>
              <Input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder={s.countryPlaceholder}
                maxLength={60}
                autoFocus
              />
            </Field>
            {join.isError && <ErrorNote message={s.joinBadToken} />}
            <Button type="submit" full loading={join.isPending}>
              {s.joinAction}
            </Button>
          </form>
        </Card>
        <p className="mt-4 text-center text-xs text-sub/85 leading-relaxed">{s.approvalNote}</p>
      </div>
    </div>
  )
}

export default function AwayScreen() {
  const s = useStrings(awayStrings)
  const c = useStrings(common)
  const me = useAuth((st) => st.me)
  const confirm = useConfirm()
  const navigate = useNavigate()
  const leave = useLeaveAway()
  const active = me?.away_status === 'active'
  const { data, isPending } = useAwayHome()

  // Step 2: claimed, not yet confirmed by the family.
  if (!active) {
    return (
      <div className="min-h-screen bg-bg px-4 py-10">
        <div className="max-w-md mx-auto text-center">
          <div className="text-4xl mb-3" aria-hidden>
            🕰
          </div>
          <h1 className="font-display text-[26px] text-ink">{s.pendingTitle}</h1>
          <p className="mt-2 text-sm text-sub leading-relaxed">{s.pendingBody}</p>
          <div className="mt-6 flex justify-center">
            <Spinner size={22} />
          </div>
        </div>
      </div>
    )
  }

  // Step 3: the family, and the news.
  return (
    <div className="min-h-screen bg-bg pb-16">
      <header className="bg-paper border-b border-line px-4 py-5 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-sub">{s.title}</p>
        {data && (
          <h1 className="mt-1 font-display text-[26px] leading-tight text-ink">
            {fmt(s.greeting, { family: data.family_name, mahalla: data.mahalla_name })}
          </h1>
        )}
        {data?.country && <p className="mt-0.5 text-sm text-sub">✈️ {data.country}</p>}
      </header>

      <div className="max-w-xl mx-auto px-4 py-4 space-y-5">
        {isPending ? (
          <Skeleton className="h-40 w-full rounded-2xl" />
        ) : !data ? (
          <ErrorNote message={c.error} />
        ) : (
          <>
            {/* the family album — theirs already, wherever they are */}
            {data.photo_urls.length > 0 && (
              <div className="grid grid-cols-3 gap-1.5">
                {data.photo_urls.slice(0, 6).map((url) => (
                  <img key={url} src={url} alt="" className="aspect-square w-full rounded-lg object-cover" />
                ))}
              </div>
            )}

            <section>
              <SectionHeading>{s.familyTitle}</SectionHeading>
              <Card className="px-4 py-4">
                <ul className="space-y-1.5">
                  {data.members.map((m) => (
                    <li key={m.full_name} className="flex items-center gap-2 text-[15px]">
                      <span className="text-ink">{m.full_name}</span>
                      {m.is_elder && (
                        <span className="text-[11px] font-bold uppercase tracking-wide text-honor-deep bg-gold-soft border border-amber-200 rounded-full px-2 py-0.5">
                          {s.elder}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                {data.family_history && (
                  <>
                    <div className="my-3">
                      <GirihRule />
                    </div>
                    <p className="text-[15px] leading-relaxed text-sub whitespace-pre-wrap">
                      {data.family_history}
                    </p>
                  </>
                )}
                {data.generations_here ? (
                  <p className="mt-2 text-xs text-sub/85">
                    {fmt(s.generations, { n: data.generations_here })}
                  </p>
                ) : null}
              </Card>
            </section>

            <section>
              <SectionHeading>{s.newsTitle}</SectionHeading>
              {data.news.length === 0 ? (
                <Card className="px-4 py-6 text-center text-sm text-sub">{s.noNews}</Card>
              ) : (
                <div className="space-y-2.5">
                  {data.news.map((p) => (
                    <NewsItem key={p.id} post={p} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        <Button
          variant="ghost"
          full
          onClick={async () => {
            const ok = await confirm({ title: s.leaveConfirm, confirmLabel: s.leave, danger: true })
            if (ok) leave.mutate(undefined, { onSuccess: () => navigate('/') })
          }}
        >
          {s.leave}
        </Button>
      </div>
    </div>
  )
}
