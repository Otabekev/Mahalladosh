/** A neighbour's public person page (#5). Reached by tapping any author name or
 *  avatar. Shows who they are in the mahalla — honour, level, family — and nothing
 *  private. Scoped server-side to the viewer's own mahalla. */

import { useNavigate, useParams } from 'react-router-dom'
import { Avatar, Button, Card, EmptyState, RowSkeleton, SkeletonList } from '@/components/ui'
import { useBack } from '@/components/useBack'
import { fmt, useLang, useStrings, type Lang } from '@/core/i18n'
import { common, monthNames } from '@/core/i18n/common'
import { profileStrings } from '@/core/i18n/profile'
import { computeLevel, levelName } from '@/core/levels'
import { useProfile } from '@/core/queries/users'

function joinedLabel(iso: string, lang: Lang): string {
  const d = new Date(iso.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + 'Z')
  if (!Number.isFinite(d.getTime())) return ''
  return `${(monthNames[lang] ?? monthNames.uz)[d.getMonth()]} ${d.getFullYear()}`
}

export default function PublicProfileScreen() {
  const { id } = useParams()
  const userId = Number(id)
  const back = useBack()
  const navigate = useNavigate()
  const s = useStrings(profileStrings)
  const c = useStrings(common)
  const lang = useLang((st) => st.lang)
  const { data: u, isLoading, error } = useProfile(Number.isFinite(userId) ? userId : undefined)

  const daraja = u ? computeLevel(u.rep_alltime) : null

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-3" onClick={back}>
        ← {c.back}
      </Button>

      {isLoading && (
        <SkeletonList count={3}>
          <RowSkeleton />
        </SkeletonList>
      )}
      {error && <EmptyState icon="🤷" title={s.profileNotFound} />}

      {u && daraja && (
        <>
          <Card className="flex flex-col items-center p-6 text-center">
            <Avatar name={u.full_name} src={u.photo_url} size={92} honor={daraja.level >= 6} />
            <h1 className="mt-3 text-[22px] font-bold text-ink">{u.full_name}</h1>
            <div className="mt-1.5 flex flex-wrap items-center justify-center gap-2">
              {u.is_raisi && (
                <span className="rounded-full bg-gold-soft px-3 py-1 text-[13px] font-bold text-honor-deep">
                  👑 {s.raisiTag}
                </span>
              )}
              <span className="rounded-full bg-brand-soft px-3 py-1 text-[13px] font-semibold text-brand">
                {fmt(s.darajaPill, { level: daraja.level, name: levelName(daraja.level, lang) })}
              </span>
            </div>
            {joinedLabel(u.created_at, lang) && (
              <p className="mt-2 text-[13px] text-sub">
                {fmt(s.memberSince, { date: joinedLabel(u.created_at, lang) })}
              </p>
            )}
          </Card>

          <div className="mt-3 grid grid-cols-3 gap-2.5">
            <Card className="p-3 text-center">
              <div className="text-[22px] font-black leading-none text-brand">{u.rep_month}</div>
              <div className="mt-1 text-[12px] text-sub">{s.monthPoints}</div>
            </Card>
            <Card className="p-3 text-center">
              <div className="text-[22px] font-black leading-none text-honor-deep">
                {u.rep_alltime.toLocaleString()}
              </div>
              <div className="mt-1 text-[12px] text-sub">{s.totalRep}</div>
            </Card>
            <Card className="p-3 text-center">
              <div className="text-[22px] font-black leading-none text-ink">{u.post_count}</div>
              <div className="mt-1 text-[12px] text-sub">{fmt(s.postsCount, { n: '' }).trim()}</div>
            </Card>
          </div>

          {u.household_id && u.household_name && (
            <button
              onClick={() => navigate(`/app/households/${u.household_id}`)}
              className="mt-3 w-full flex items-center gap-3 rounded-2xl border border-line bg-card p-3.5 text-left active:scale-[0.99] transition"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-2xl">🏠</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold text-ink">{u.household_name}</span>
                <span className="block text-[13px] text-sub">{s.viewFamily}</span>
              </span>
              <span className="shrink-0 text-sub">›</span>
            </button>
          )}
        </>
      )}
    </div>
  )
}
