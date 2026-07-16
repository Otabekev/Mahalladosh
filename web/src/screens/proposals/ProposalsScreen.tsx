/** Proposals list — active vs finished community votes. */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorNote,
  PageTitle,
  SegmentedTabs,
  Spinner,
  timeAgo,
} from '@/components/ui'
import { useProposals } from '@/core/queries/proposals'
import type { Proposal } from '@/core/api/types'

function StatusBadge({ p }: { p: Proposal }) {
  switch (p.status) {
    case 'seconding':
      return (
        <Badge color="gray">
          Qo'llab-quvvatlash {p.seconds_count}/{p.seconds_needed}
        </Badge>
      )
    case 'voting':
      return <Badge color="gold">🗳 Ovoz berilmoqda</Badge>
    case 'passed':
      return <Badge color="green">✓ Qabul qilindi</Badge>
    case 'rejected':
      return <Badge color="red">Rad etildi</Badge>
    case 'expired':
      return <Badge color="gray">Kvorum yetmadi</Badge>
  }
}

export default function ProposalsScreen() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'active' | 'done'>('active')
  const { data: proposals, isLoading, error } = useProposals(tab)

  return (
    <div>
      <PageTitle
        title="Ovoz berish"
        subtitle="Mahalla qarorlari birgalikda — adolatli ovoz bilan"
        action={
          <Button size="sm" onClick={() => navigate('/app/proposals/new')}>
            + Taklif
          </Button>
        }
      />

      <div className="mb-4">
        <SegmentedTabs
          tabs={[
            { value: 'active' as const, label: 'Faol' },
            { value: 'done' as const, label: 'Yakunlangan' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      )}
      {error && <ErrorNote message={error.message} />}

      {proposals && proposals.length === 0 && (
        <EmptyState
          icon="🗳"
          title="Hozircha takliflar yo'q"
          text="Mahalla uchun g'oyangiz bormi? Birinchi taklifni kiriting."
        />
      )}

      {proposals?.map((p) => {
        const totalVotes = p.votes_yes + p.votes_no
        const yesPct = totalVotes > 0 ? (p.votes_yes / totalVotes) * 100 : 0
        return (
          <Card key={p.id} className="p-4 mb-3" onClick={() => navigate(`/app/proposals/${p.id}`)}>
            <div className="flex items-center justify-between gap-2 mb-2">
              {p.kind === 'punitive' ? (
                <Badge color="red">⚠️ Chetlatish taklifi</Badge>
              ) : (
                <Badge color="blue">Taklif</Badge>
              )}
              <StatusBadge p={p} />
            </div>

            <h3 className="text-[15px] font-bold text-ink line-clamp-2">{p.title}</h3>

            <div className="flex items-center gap-2 mt-2">
              <Avatar name={p.author.full_name} src={p.author.photo_url} size={24} />
              <span className="text-xs text-sub">
                {p.author.full_name} · {timeAgo(p.created_at)}
              </span>
            </div>

            {p.status === 'voting' && (
              <div className="mt-2">
                <div className="text-xs text-sub mb-1">
                  Ha {p.votes_yes} · Yo'q {p.votes_no}
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-good rounded-full" style={{ width: `${yesPct}%` }} />
                </div>
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}
