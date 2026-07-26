/** The raisi panel (#36) — the mahalla head's daily tools in one place: the
 *  moderation queue and the member roster. Pinning lives on posts, contacts on
 *  their own page; this hub holds the two that need a dedicated surface.
 *
 *  Guarded twice: the route only shows for a raisi, and every action is enforced
 *  server-side (raisi of your own mahalla), so the UI gate is convenience, not
 *  security. */

import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useBack } from '@/components/useBack'
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  ErrorNote,
  PageTitle,
  RowSkeleton,
  SkeletonList,
  timeAgo,
} from '@/components/ui'
import { useConfirm } from '@/components/confirm'
import { fmt, useStrings } from '@/core/i18n'
import { common } from '@/core/i18n/common'
import { raisiStrings } from '@/core/i18n/raisi'
import { useAuth } from '@/core/stores/auth'
import {
  useBanMember,
  useRaisiReports,
  useResolveRaisiReport,
  useRoster,
} from '@/core/queries/raisi'
import type { Report } from '@/core/queries/reports'

function useReasonLabel() {
  const s = useStrings(raisiStrings)
  return (reason: string) =>
    reason === 'spam'
      ? s.reasonSpam
      : reason === 'abuse'
        ? s.reasonAbuse
        : reason === 'fake'
          ? s.reasonFake
          : s.reasonOther
}

function ReportCard({ report, onBan }: { report: Report; onBan: (id: number, name: string) => void }) {
  const s = useStrings(raisiStrings)
  const reasonLabel = useReasonLabel()
  const act = useResolveRaisiReport()

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[16px] font-bold text-ink">{report.target_label || `#${report.target_id}`}</div>
          <div className="mt-0.5 inline-block rounded-full bg-brand-soft px-2.5 py-0.5 text-[12px] font-semibold text-brand">
            {reasonLabel(report.reason)}
          </div>
        </div>
        <span className="shrink-0 text-xs text-sub">{timeAgo(report.created_at)}</span>
      </div>
      {report.note && <p className="mt-2 text-[14px] leading-relaxed text-ink">{report.note}</p>}
      <div className="mt-1 text-[13px] text-sub">
        {s.reportedBy}: {report.reporter.full_name}
      </div>

      <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
        <Button
          size="sm"
          variant="secondary"
          loading={act.isPending}
          onClick={() => act.mutate({ id: report.id, action: 'resolve' })}
        >
          ✓ {s.resolve}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          loading={act.isPending}
          onClick={() => act.mutate({ id: report.id, action: 'dismiss' })}
        >
          {s.dismiss}
        </Button>
        {report.target_type === 'user' && (
          <Button size="sm" variant="danger" onClick={() => onBan(report.target_id, report.target_label)}>
            {s.ban}
          </Button>
        )}
      </div>
    </Card>
  )
}

function ReportsSection({ onBan }: { onBan: (id: number, name: string) => void }) {
  const s = useStrings(raisiStrings)
  const { data, isLoading, error } = useRaisiReports()

  if (isLoading)
    return (
      <SkeletonList count={3}>
        <RowSkeleton />
      </SkeletonList>
    )
  if (error) return <ErrorNote message={error.message} />
  if (!data || data.length === 0) return <EmptyState icon="🕊️" title={s.reportsEmpty} />

  return (
    <div className="space-y-2.5">
      {data.map((r) => (
        <ReportCard key={r.id} report={r} onBan={onBan} />
      ))}
    </div>
  )
}

function MembersSection({ onBan }: { onBan: (id: number, name: string) => void }) {
  const s = useStrings(raisiStrings)
  const { data, isLoading, error } = useRoster()

  if (isLoading)
    return (
      <SkeletonList count={5}>
        <RowSkeleton />
      </SkeletonList>
    )
  if (error) return <ErrorNote message={error.message} />
  if (!data || data.length === 0) return <EmptyState icon="🏘️" title={s.membersEmpty} />

  return (
    <div className="space-y-2">
      {data.map((m) => (
        <Card key={m.id} className="flex items-center gap-3 p-3">
          <Avatar name={m.full_name} src={m.photo_url} size={40} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-semibold text-ink">{m.full_name}</div>
            <div className="text-[13px] text-sub">⭐ {m.rep_alltime}</div>
          </div>
          {m.is_raisi ? (
            <span className="shrink-0 rounded-full bg-gold-soft px-2.5 py-1 text-[12px] font-bold text-honor-deep">
              {s.raisiTag}
            </span>
          ) : m.banned ? (
            <span className="shrink-0 rounded-full bg-red-50 px-2.5 py-1 text-[12px] font-bold text-danger">
              {s.bannedTag}
            </span>
          ) : (
            <Button size="sm" variant="ghost" className="text-danger" onClick={() => onBan(m.id, m.full_name)}>
              {s.ban}
            </Button>
          )}
        </Card>
      ))}
    </div>
  )
}

export default function RaisiScreen() {
  const s = useStrings(raisiStrings)
  const c = useStrings(common)
  const back = useBack()
  const me = useAuth((st) => st.me)
  const confirm = useConfirm()
  const ban = useBanMember()
  const [tab, setTab] = useState<'reports' | 'members'>('reports')

  // Not the raisi? This page isn't for you — bounce home. (The API refuses too.)
  if (me && !me.user.is_raisi) return <Navigate to="/app" replace />

  const onBan = async (id: number, name: string) => {
    if (await confirm({ title: s.ban, body: fmt(s.banConfirm, { name }), confirmLabel: s.ban, danger: true }))
      ban.mutate(id)
  }

  const tabs: { value: 'reports' | 'members'; label: string }[] = [
    { value: 'reports', label: s.tabReports },
    { value: 'members', label: s.tabMembers },
  ]

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-3" onClick={back}>
        ← {c.back}
      </Button>
      <PageTitle title={s.panelTitle} subtitle={s.panelSubtitle} />

      {ban.error && <ErrorNote message={ban.error.message} />}

      <div className="mb-4 flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`flex-1 min-h-[44px] rounded-xl text-[15px] font-semibold transition ${
              tab === t.value ? 'bg-brand text-[#FBF3E2]' : 'bg-card text-sub border border-line hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'reports' ? <ReportsSection onBan={onBan} /> : <MembersSection onBan={onBan} />}
    </div>
  )
}
