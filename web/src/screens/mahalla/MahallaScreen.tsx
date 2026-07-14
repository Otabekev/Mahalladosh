/** Mahalla screen: header stats, faol qo'shni honor, reyting / qo'shnilar / xonadonlar tabs. */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/core/stores/auth'
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
import type { Household, LeaderboardEntry, User } from '@/core/api/types'

type Tab = 'reyting' | 'qoshnilar' | 'xonadonlar'
type Period = 'month' | 'alltime'

function CenterSpinner() {
  return (
    <div className="flex justify-center py-10">
      <Spinner />
    </div>
  )
}

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  return (
    <div className="px-4 py-3 flex items-center gap-3">
      <RankNumber rank={entry.rank} />
      <Avatar name={entry.user.full_name} src={entry.user.photo_url} size={36} />
      <span className="font-semibold text-sm text-ink truncate">{entry.user.full_name}</span>
      {entry.user.is_raisi && <Badge color="gold">Raisi</Badge>}
      <span className="ml-auto shrink-0">
        <PointsBadge points={entry.points} />
      </span>
    </div>
  )
}

function MemberRow({ user }: { user: User }) {
  return (
    <div className="px-4 py-3 flex items-center gap-3">
      <Avatar name={user.full_name} src={user.photo_url} size={36} />
      <span className="font-semibold text-sm text-ink truncate">{user.full_name}</span>
      {user.is_raisi && <Badge color="gold">Raisi</Badge>}
      <span className="ml-auto shrink-0">
        <PointsBadge size="sm" points={user.rep_month} />
      </span>
    </div>
  )
}

function ReytingTab({ mahallaId }: { mahallaId: number }) {
  const [period, setPeriod] = useState<Period>('month')
  const { data, isPending, error } = useLeaderboard(mahallaId)

  if (isPending) return <CenterSpinner />
  if (error) return <ErrorNote message={error.message} />

  const entries = period === 'month' ? data.month : data.alltime

  return (
    <div className="space-y-3">
      <SegmentedTabs<Period>
        tabs={[
          { value: 'month', label: 'Bu oy' },
          { value: 'alltime', label: 'Umumiy' },
        ]}
        value={period}
        onChange={setPeriod}
      />
      {entries.length === 0 ? (
        <Card>
          <EmptyState
            icon="⭐"
            title={period === 'month' ? "Bu oy hali ball yig'ilmagan" : "Hali ball yig'ilmagan"}
            text="Qo'shnilarga yordam bering — birinchi bo'ling!"
          />
        </Card>
      ) : (
        <Card className="p-0 divide-y divide-line">
          {entries.map((entry) => (
            <LeaderboardRow key={entry.user.id} entry={entry} />
          ))}
        </Card>
      )}
    </div>
  )
}

function QoshnilarTab({ mahallaId }: { mahallaId: number }) {
  const { data, isPending, error } = useMembers(mahallaId)

  if (isPending) return <CenterSpinner />
  if (error) return <ErrorNote message={error.message} />

  if (data.length === 0) {
    return (
      <Card>
        <EmptyState icon="👋" title="Hali qo'shnilar yo'q" />
      </Card>
    )
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
  const navigate = useNavigate()
  const me = useAuth((s) => s.me)
  const { data, isPending, error } = useHouseholds(mahallaId)

  if (isPending) return <CenterSpinner />
  if (error) return <ErrorNote message={error.message} />

  return (
    <div className="space-y-3">
      {me && me.household === null && (
        <Card className="bg-good-soft border-green-200 p-4 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-ink">Xonadoningiz hali yo'q</p>
          <Button size="sm" onClick={() => navigate('/app/household')}>
            Xonadon yaratish
          </Button>
        </Card>
      )}
      {data.length === 0 ? (
        <Card>
          <EmptyState icon="🏠" title="Hali xonadonlar yo'q" text="Birinchi xonadonni siz yarating!" />
        </Card>
      ) : (
        <Card className="p-0 divide-y divide-line">
          {data.map((h: Household) => (
            <div
              key={h.id}
              onClick={() => navigate(`/app/households/${h.id}`)}
              className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition"
            >
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-ink truncate">{h.family_name} xonadoni</div>
                <div className="text-xs text-sub">
                  {h.resident_count} kishi
                  {h.street ? ` · ${h.street}` : ''}
                </div>
              </div>
              {h.verification_status === 'verified' ? (
                <Badge color="green">✓ Tasdiqlangan</Badge>
              ) : (
                <Badge color="gray">Kutilmoqda</Badge>
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}

export default function MahallaScreen() {
  const me = useAuth((s) => s.me)
  const mahallaId = me?.mahalla?.id
  const [tab, setTab] = useState<Tab>('reyting')
  const { data, isPending, error } = useMahallaDetail(mahallaId)

  if (mahallaId === undefined) return <ErrorNote message="Mahalla topilmadi" />
  if (isPending) return <CenterSpinner />
  if (error) return <ErrorNote message={error.message} />

  return (
    <div className="space-y-3">
      <Card className="p-5">
        <h1 className="text-xl font-extrabold text-ink">{data.name} mahallasi</h1>
        <p className="text-sm text-sub">
          {data.district_name}, {data.region_name}
        </p>
        <div className="flex gap-4 mt-3">
          <div>
            <div className="font-bold text-ink">{data.member_count}</div>
            <div className="text-xs text-sub">a'zo</div>
          </div>
          <div>
            <div className="font-bold text-ink">{data.household_count}</div>
            <div className="text-xs text-sub">xonadon</div>
          </div>
        </div>
        <div className="mt-4">
          {data.raisi ? (
            <div className="flex items-center gap-3">
              <Avatar name={data.raisi.full_name} src={data.raisi.photo_url} size={36} />
              <span className="font-semibold text-sm text-ink truncate">{data.raisi.full_name}</span>
              <Badge color="gold">Raisi</Badge>
            </div>
          ) : (
            <p className="text-sm text-sub">Raisi hali saylanmagan — Ovozlar bo'limida taklif qiling</p>
          )}
        </div>
      </Card>

      {data.faol_qoshni && (
        <Card className="bg-gold-soft border-amber-200 p-4 flex items-center gap-3">
          <span className="text-2xl">🏆</span>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-gold font-semibold">O'tgan oyning faol qo'shnisi</div>
            <div className="font-bold text-ink truncate">{data.faol_qoshni.user.full_name}</div>
          </div>
          <span className="shrink-0">
            <PointsBadge size="sm" points={data.faol_qoshni.points} />
          </span>
        </Card>
      )}

      <SegmentedTabs<Tab>
        tabs={[
          { value: 'reyting', label: 'Reyting' },
          { value: 'qoshnilar', label: "Qo'shnilar" },
          { value: 'xonadonlar', label: 'Xonadonlar' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'reyting' && <ReytingTab mahallaId={mahallaId} />}
      {tab === 'qoshnilar' && <QoshnilarTab mahallaId={mahallaId} />}
      {tab === 'xonadonlar' && <XonadonlarTab mahallaId={mahallaId} />}
    </div>
  )
}
