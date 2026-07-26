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
  RowSkeleton,
  SkeletonList,
  timeAgo,
} from '@/components/ui'
import { useProposals } from '@/core/queries/proposals'
import { fmt, useStrings } from '@/core/i18n'
import { proposalsStrings } from '@/core/i18n/proposals'
import type { Proposal } from '@/core/api/types'

function StatusBadge({ p }: { p: Proposal }) {
  const s = useStrings(proposalsStrings)
  switch (p.status) {
    case 'seconding':
      return (
        <Badge color="gray">
          {fmt(s.statusSeconding, { n: p.seconds_count, m: p.seconds_needed })}
        </Badge>
      )
    case 'voting':
      return <Badge color="gold">{s.statusVoting}</Badge>
    case 'passed':
      return <Badge color="green">{s.statusPassed}</Badge>
    case 'rejected':
      return <Badge color="red">{s.statusRejected}</Badge>
    case 'expired':
      return <Badge color="gray">{s.statusExpired}</Badge>
  }
}

export default function ProposalsScreen() {
  const navigate = useNavigate()
  const s = useStrings(proposalsStrings)
  const [tab, setTab] = useState<'active' | 'done'>('active')
  const { data: proposals, isLoading, error } = useProposals(tab)

  return (
    <div>
      <PageTitle
        title={s.pageTitle}
        subtitle={s.pageSubtitle}
        action={
          <Button size="sm" onClick={() => navigate('/app/proposals/new')}>
            {s.newProposal}
          </Button>
        }
      />

      <div className="mb-4">
        <SegmentedTabs
          tabs={[
            { value: 'active' as const, label: s.tabActive },
            { value: 'done' as const, label: s.tabDone },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {isLoading && (
        <SkeletonList count={4}>
          <RowSkeleton />
        </SkeletonList>
      )}
      {error && <ErrorNote message={error.message} />}

      {proposals && proposals.length === 0 && (
        <EmptyState icon="🗳" title={s.emptyTitle} text={s.emptyText} />
      )}

      {proposals?.map((p) => {
        const totalVotes = p.votes_yes + p.votes_no
        const yesPct = totalVotes > 0 ? (p.votes_yes / totalVotes) * 100 : 0
        return (
          <Card key={p.id} className="p-4 mb-3" onClick={() => navigate(`/app/proposals/${p.id}`)}>
            <div className="flex items-center justify-between gap-2 mb-2">
              {p.kind === 'punitive' ? (
                <Badge color="red">{s.banProposalBadge}</Badge>
              ) : (
                <Badge color="blue">{s.proposalBadge}</Badge>
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
                  {fmt(s.voteCounts, { yes: p.votes_yes, no: p.votes_no })}
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
