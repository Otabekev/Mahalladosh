/** Mahalla screen — the "honor" ceremony: cobalt header, a gold faol-qo'shni
 * medallion, a real podium leaderboard, verify strip and your-rank row. */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/core/stores/auth'
import { fmt, useStrings } from '@/core/i18n'
import { common } from '@/core/i18n/common'
import { mahallaStrings } from '@/core/i18n/mahalla'
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorNote,
  PointsBadge,
  RankNumber,
  SegmentedTabs,
  Spinner,
} from '@/components/ui'
import { useLeaderboard, useMahallaDetail, useMembers } from '@/core/queries/mahalla'
import { useHouseholds } from '@/core/queries/households'
import type { Household, LeaderboardEntry, MahallaDetail, User } from '@/core/api/types'

type Tab = 'reyting' | 'qoshnilar' | 'xonadonlar'
type Period = 'month' | 'alltime'

/** Thousands separators, matching the mockup's "1,240". */
const nf = (n: number) => n.toLocaleString('en-US')

/** Faint white girih tilework wash for the gold medallion (the shared
 * `.tilework` class uses a gold stroke that vanishes on gold). */
const WHITE_GIRIH =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cg fill='none' stroke='%23ffffff' stroke-width='1' opacity='0.24'%3E%3Crect x='10' y='10' width='20' height='20'/%3E%3Crect x='10' y='10' width='20' height='20' transform='rotate(45 20 20)'/%3E%3C/g%3E%3C/svg%3E\")"

function CenterSpinner() {
  return (
    <div className="flex justify-center py-12">
      <Spinner />
    </div>
  )
}

/** Cobalt header with the girih wash, stats and the raisi chip. */
function MahallaHeader({ data }: { data: MahallaDetail }) {
  const s = useStrings(mahallaStrings)
  const c = useStrings(common)
  return (
    <div className="relative overflow-hidden rounded-3xl bg-cobalt px-5 pt-6 pb-9 text-[#FBF3E2] shadow-card">
      <div className="tilework absolute inset-0 pointer-events-none" aria-hidden />
      <div className="relative">
        <h1 className="font-bold text-[24px] leading-tight text-[#FBF3E2]">
          {fmt(c.mahallaSuffix, { name: data.name })}
        </h1>
        <p className="text-[15px] opacity-90 mt-0.5">
          {data.district_name} · {data.region_name}
        </p>
        <div className="flex items-center gap-6 mt-4">
          <div>
            <div className="font-bold text-[22px] leading-none">{nf(data.member_count)}</div>
            <div className="text-[13px] opacity-85 mt-1">{s.unitMembers}</div>
          </div>
          <div>
            <div className="font-bold text-[22px] leading-none">{nf(data.household_count)}</div>
            <div className="text-[13px] opacity-85 mt-1">{s.unitHouseholds}</div>
          </div>
          <div className="ml-auto min-w-0">
            {data.raisi ? (
              <div
                className="flex items-center gap-2 rounded-xl px-3 py-1.5"
                style={{ backgroundColor: 'rgba(251,243,226,0.14)' }}
              >
                <Avatar name={data.raisi.full_name} src={data.raisi.photo_url} size={32} honor />
                <div className="leading-tight min-w-0">
                  <div className="text-[13px] font-semibold truncate">{data.raisi.full_name}</div>
                  <div className="text-[12px] font-bold text-[#F4D89E]">{s.raisi}</div>
                </div>
              </div>
            ) : (
              <div
                className="rounded-xl px-3 py-1.5 text-[13px] opacity-85"
                style={{ backgroundColor: 'rgba(251,243,226,0.12)' }}
              >
                {s.noRaisiShort}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Gold medallion award card, overlapping the header. */
function FaolQoshniHero({ entry }: { entry: LeaderboardEntry }) {
  const s = useStrings(mahallaStrings)
  return (
    <div
      className="relative -mt-6 mx-1 rounded-[22px] overflow-hidden"
      style={{
        background: 'linear-gradient(160deg,#E8A62E,#C77E12)',
        boxShadow: '0 22px 46px -18px rgba(120,80,10,.6)',
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: WHITE_GIRIH }}
        aria-hidden
      />
      <div className="relative text-center px-6 py-5" style={{ color: '#4a2e05' }}>
        <div
          className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-bold uppercase tracking-wide"
          style={{ backgroundColor: 'rgba(74,46,5,.16)' }}
        >
          {s.faolQoshniPill}
        </div>
        <div className="relative mx-auto mt-3.5" style={{ width: 136, height: 136 }}>
          <svg viewBox="0 0 136 136" width="136" height="136" className="absolute inset-0">
            <g fill="none" stroke="#fff6e0" strokeWidth="2" opacity="0.95">
              <circle cx="68" cy="68" r="58" />
              <rect x="26" y="26" width="84" height="84" />
              <rect x="26" y="26" width="84" height="84" transform="rotate(45 68 68)" />
            </g>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-full" style={{ background: '#fff6e0', padding: 4 }}>
              <Avatar name={entry.user.full_name} src={entry.user.photo_url} size={94} honor />
            </div>
          </div>
        </div>
        <div className="font-bold text-[26px] mt-3" style={{ color: '#3a2404' }}>
          {entry.user.full_name}
        </div>
        <div
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 mt-2.5 font-bold text-[16px]"
          style={{ background: '#4a2e05', color: '#F6DFA6' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#F6DFA6">
            <path d="M12 2l2.9 6.3 6.9.6-5.2 4.6 1.6 6.8L12 17l-6.2 3.9 1.6-6.8L2.2 8.9l6.9-.6z" />
          </svg>
          {fmt(s.obroPoints, { n: nf(entry.points) })}
        </div>
        <div className="text-[13px] font-semibold mt-2.5" style={{ color: '#5a3a08' }}>
          {s.awardedByRaisi}
        </div>
      </div>
    </div>
  )
}

/** One podium column. #1 is tallest/centered with an honor avatar + gold bar. */
function PodiumSlot({ entry, place }: { entry: LeaderboardEntry; place: 1 | 2 | 3 }) {
  const isFirst = place === 1
  const barColor =
    place === 1 ? 'var(--color-honor)' : place === 2 ? 'var(--color-accent)' : 'var(--color-good)'
  const barHeight = place === 1 ? 78 : place === 2 ? 52 : 42
  return (
    <div className="flex-1 min-w-0 text-center">
      <div className="flex justify-center mb-1.5">
        <Avatar
          name={entry.user.full_name}
          src={entry.user.photo_url}
          size={isFirst ? 58 : 50}
          honor={isFirst}
        />
      </div>
      <div
        className={`font-bold leading-tight truncate text-ink ${isFirst ? 'text-[15px]' : 'text-[14px]'}`}
      >
        {entry.user.full_name}
      </div>
      <div className={`text-[13px] ${isFirst ? 'text-honor-deep font-bold' : 'text-sub'}`}>
        {nf(entry.points)}
      </div>
      <div
        className="mt-1.5 rounded-t-xl flex items-center justify-center font-bold"
        style={{
          height: barHeight,
          background: barColor,
          color: isFirst ? '#3a2408' : '#fff',
          fontSize: isFirst ? 24 : 20,
        }}
      >
        {place}
      </div>
    </div>
  )
}

/** Top-3 podium: #2 left, #1 center (tallest), #3 right. */
function Podium({ entries }: { entries: LeaderboardEntry[] }) {
  const [first, second, third] = entries
  return (
    <div className="flex items-end justify-center gap-2.5 px-2 pt-2">
      {second ? <PodiumSlot entry={second} place={2} /> : <div className="flex-1" />}
      {first && <PodiumSlot entry={first} place={1} />}
      {third ? <PodiumSlot entry={third} place={3} /> : <div className="flex-1" />}
    </div>
  )
}

/** Green strip prompting the raisi/desk to verify pending households. */
function VerifyStrip({ count, onView }: { count: number; onView: () => void }) {
  const s = useStrings(mahallaStrings)
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-good-soft border border-[#CFE3D6] px-4 py-3">
      <div className="w-9 h-9 rounded-xl bg-good flex items-center justify-center shrink-0">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </div>
      <div className="flex-1 text-[15px] leading-snug font-semibold" style={{ color: '#3f5c47' }}>
        {fmt(s.verifyPending, { n: count })}
      </div>
      <button
        onClick={onView}
        className="shrink-0 rounded-lg bg-good text-white text-[13px] font-bold px-3 py-2"
      >
        {s.seeAction}
      </button>
    </div>
  )
}

/** Highlighted "your rank" row with a "N more obro'" nudge. */
function YourRankRow({ entry, above }: { entry: LeaderboardEntry; above: LeaderboardEntry | null }) {
  const s = useStrings(mahallaStrings)
  const me = useAuth((state) => state.me)
  const name = me?.user.full_name ?? entry.user.full_name
  const hint = above
    ? fmt(s.yourRankHint, { n: nf(above.points - entry.points), rank: above.rank })
    : s.yourRankLeader
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-paper border-[1.5px] border-honor px-4 py-3">
      <div className="w-7 shrink-0 text-center font-bold text-[18px] text-brand">{entry.rank}</div>
      <Avatar name={name} src={me?.user.photo_url} size={44} />
      <div className="flex-1 min-w-0">
        <div className="font-bold text-[16px] text-ink truncate">
          {s.youLabel} · {name}
        </div>
        <div className="text-[13px] text-sub">{hint}</div>
      </div>
      <div className="shrink-0 font-bold text-[16px] text-brand">{nf(entry.points)}</div>
    </div>
  )
}

/** A rank-4+ leaderboard row (below the podium). */
function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  const s = useStrings(mahallaStrings)
  return (
    <div className="px-4 py-3 flex items-center gap-3">
      <RankNumber rank={entry.rank} />
      <Avatar name={entry.user.full_name} src={entry.user.photo_url} size={36} />
      <span className="font-semibold text-sm text-ink truncate">{entry.user.full_name}</span>
      {entry.user.is_raisi && <Badge color="gold">{s.raisi}</Badge>}
      <span className="ml-auto shrink-0">
        <PointsBadge points={entry.points} />
      </span>
    </div>
  )
}

function MemberRow({ user }: { user: User }) {
  const s = useStrings(mahallaStrings)
  return (
    <div className="px-4 py-3 flex items-center gap-3">
      <Avatar name={user.full_name} src={user.photo_url} size={36} honor={user.is_raisi} />
      <span className="font-semibold text-sm text-ink truncate">{user.full_name}</span>
      {user.is_raisi && <Badge color="gold">{s.raisi}</Badge>}
      <span className="ml-auto shrink-0">
        <PointsBadge size="sm" points={user.rep_month} />
      </span>
    </div>
  )
}

function ReytingTab({
  mahallaId,
  onViewHouseholds,
}: {
  mahallaId: number
  onViewHouseholds: () => void
}) {
  const s = useStrings(mahallaStrings)
  const me = useAuth((state) => state.me)
  const [period, setPeriod] = useState<Period>('month')
  const { data, isPending, error } = useLeaderboard(mahallaId)
  const { data: households } = useHouseholds(mahallaId)

  if (isPending) return <CenterSpinner />
  if (error) return <ErrorNote message={error.message} />

  const entries = period === 'month' ? data.month : data.alltime
  const rest = entries.slice(3)
  const pendingCount = households?.filter((h) => h.verification_status === 'pending').length ?? 0
  const myIndex = me ? entries.findIndex((e) => e.user.id === me.user.id) : -1
  const myEntry = myIndex >= 0 ? entries[myIndex] : null
  const above = myIndex > 0 ? entries[myIndex - 1] : null

  return (
    <div className="space-y-4">
      <SegmentedTabs<Period>
        tabs={[
          { value: 'month', label: s.periodMonth },
          { value: 'alltime', label: s.periodAllTime },
        ]}
        value={period}
        onChange={setPeriod}
      />

      {entries.length === 0 ? (
        <EmptyState
          icon="⭐"
          title={period === 'month' ? s.emptyRatingMonthTitle : s.emptyRatingAllTitle}
          text={s.emptyRatingText}
        />
      ) : (
        <>
          <Podium entries={entries} />
          {rest.length > 0 && (
            <Card className="p-0 divide-y divide-line">
              {rest.map((entry) => (
                <LeaderboardRow key={entry.user.id} entry={entry} />
              ))}
            </Card>
          )}
        </>
      )}

      {pendingCount > 0 && <VerifyStrip count={pendingCount} onView={onViewHouseholds} />}

      {myEntry && <YourRankRow entry={myEntry} above={above} />}
    </div>
  )
}

function QoshnilarTab({ mahallaId }: { mahallaId: number }) {
  const s = useStrings(mahallaStrings)
  const { data, isPending, error } = useMembers(mahallaId)

  if (isPending) return <CenterSpinner />
  if (error) return <ErrorNote message={error.message} />

  if (data.length === 0) {
    return <EmptyState icon="👋" title={s.emptyNeighborsTitle} text={s.emptyNeighborsText} />
  }

  return (
    <Card className="p-0 divide-y divide-line">
      {data.map((user) => (
        <MemberRow key={user.id} user={user} />
      ))}
    </Card>
  )
}

function XonadonlarTab({ mahallaId }: { mahallaId: number }) {
  const s = useStrings(mahallaStrings)
  const navigate = useNavigate()
  const me = useAuth((state) => state.me)
  const { data, isPending, error } = useHouseholds(mahallaId)

  if (isPending) return <CenterSpinner />
  if (error) return <ErrorNote message={error.message} />

  return (
    <div className="space-y-4">
      {me && me.household === null && (
        <Card className="bg-good-soft border-green-200 p-4 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-ink">{s.noHouseholdYet}</p>
          <Button size="sm" onClick={() => navigate('/app/household')}>
            {s.createHousehold}
          </Button>
        </Card>
      )}
      {data.length === 0 ? (
        <EmptyState icon="🏠" title={s.emptyHouseholdsTitle} text={s.emptyHouseholdsText} />
      ) : (
        <Card className="p-0 divide-y divide-line">
          {data.map((h: Household) => (
            <div
              key={h.id}
              onClick={() => navigate(`/app/households/${h.id}`)}
              className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-paper transition"
            >
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-ink truncate">
                  {fmt(s.householdOf, { name: h.family_name })}
                </div>
                <div className="text-xs text-sub">
                  {fmt(s.residents, { n: h.resident_count })}
                  {h.street ? ` · ${h.street}` : ''}
                </div>
              </div>
              {h.verification_status === 'verified' ? (
                <Badge color="green">{s.verifiedBadge}</Badge>
              ) : (
                <Badge color="gray">{s.pendingBadge}</Badge>
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}

export default function MahallaScreen() {
  const s = useStrings(mahallaStrings)
  const me = useAuth((state) => state.me)
  const mahallaId = me?.mahalla?.id
  const [tab, setTab] = useState<Tab>('reyting')
  const { data, isPending, error } = useMahallaDetail(mahallaId)

  if (mahallaId === undefined) return <ErrorNote message="Mahalla topilmadi" />
  if (isPending) return <CenterSpinner />
  if (error) return <ErrorNote message={error.message} />

  const tabItems: { value: Tab; label: string }[] = [
    { value: 'reyting', label: s.tabRating },
    { value: 'qoshnilar', label: s.tabNeighbors },
    { value: 'xonadonlar', label: s.tabHouseholds },
  ]

  return (
    <div>
      <MahallaHeader data={data} />

      {data.faol_qoshni && <FaolQoshniHero entry={data.faol_qoshni} />}

      <div className="mt-5 space-y-4">
        <div className="flex gap-2">
          {tabItems.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
                tab === t.value
                  ? 'bg-brand text-[#FBF3E2]'
                  : 'bg-card text-sub border border-line hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'reyting' && (
          <ReytingTab mahallaId={mahallaId} onViewHouseholds={() => setTab('xonadonlar')} />
        )}
        {tab === 'qoshnilar' && <QoshnilarTab mahallaId={mahallaId} />}
        {tab === 'xonadonlar' && <XonadonlarTab mahallaId={mahallaId} />}
      </div>
    </div>
  )
}
