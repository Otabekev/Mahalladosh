/** Proposal detail — seconding progress, live vote, or final result. */

import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Avatar,
  Badge,
  Button,
  Card,
  ErrorNote,
  Spinner,
  timeAgo,
} from '@/components/ui'
import { useProposal, useSecond, useVote } from '@/core/queries/proposals'
import { useAuth } from '@/core/stores/auth'
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

/** Backend sends naive-UTC ISO strings — normalize like ui.tsx timeAgo does. */
function utcDate(iso: string): Date {
  return new Date(iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z')
}

function ResultBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-sm font-semibold text-ink w-10 shrink-0">{label}</span>
      <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%`, minWidth: count > 0 ? '0.5rem' : 0 }}
        />
      </div>
      <span className="text-sm text-sub w-16 text-right shrink-0">
        {count} · {pct}%
      </span>
    </div>
  )
}

export default function ProposalDetailScreen() {
  const navigate = useNavigate()
  const s = useStrings(proposalsStrings)
  const { id } = useParams()
  const pid = id !== undefined ? Number(id) : undefined
  const me = useAuth((st) => st.me)

  const { data: p, isLoading, error } = useProposal(pid)
  const second = useSecond(pid ?? 0)
  const vote = useVote(pid ?? 0)
  const [pendingChoice, setPendingChoice] = useState<boolean | null>(null)

  const castVote = (choice: boolean) => {
    setPendingChoice(choice)
    vote.mutate({ choice })
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    )
  }
  if (error) {
    return (
      <div>
        <Button variant="ghost" size="sm" className="mb-3" onClick={() => navigate(-1)}>
          {s.backToVotes}
        </Button>
        <ErrorNote message={error.message} />
      </div>
    )
  }
  if (!p) return null

  const isAuthor = me?.user.id === p.author.id
  const totalVotes = p.votes_yes + p.votes_no
  const secondsPct = Math.min(100, (p.seconds_count / Math.max(1, p.seconds_needed)) * 100)

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-3" onClick={() => navigate(-1)}>
        {s.backToVotes}
      </Button>

      <Card className="p-4 mb-3">
        <div className="flex items-center justify-between gap-2 mb-2">
          {p.kind === 'punitive' ? (
            <Badge color="red">{s.banProposalBadge}</Badge>
          ) : (
            <Badge color="blue">{s.proposalBadge}</Badge>
          )}
          <StatusBadge p={p} />
        </div>

        <h1 className="text-lg font-bold text-ink">{p.title}</h1>
        {p.description && <p className="text-sm text-ink mt-2 whitespace-pre-wrap">{p.description}</p>}

        <div className="flex items-center gap-2 mt-3">
          <Avatar name={p.author.full_name} src={p.author.photo_url} size={24} />
          <span className="text-xs text-sub">
            {p.author.full_name} · {timeAgo(p.created_at)}
          </span>
        </div>
      </Card>

      {p.target && (p.action === 'set_raisi' || p.action === 'ban_user') && (
        <Card className="p-4 mb-3 flex gap-3 items-center">
          <Avatar name={p.target.full_name} src={p.target.photo_url} size={40} />
          <div className="min-w-0">
            <div className="font-semibold text-ink truncate">{p.target.full_name}</div>
            <div className="text-xs text-sub">
              {p.action === 'set_raisi' ? s.targetRaisi : s.targetBan}
            </div>
          </div>
        </Card>
      )}

      {p.status === 'seconding' && (
        <Card className="p-4 mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-ink">{s.secondingHeading}</span>
            <span className="text-sm font-bold text-ink">
              {p.seconds_count}/{p.seconds_needed}
            </span>
          </div>
          <div className="bg-gray-100 h-3 rounded-full overflow-hidden">
            <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${secondsPct}%` }} />
          </div>
          <p className="text-sm text-sub mt-2">{s.secondingHint}</p>

          {second.error && (
            <div className="mt-3">
              <ErrorNote message={second.error.message} />
            </div>
          )}

          {isAuthor ? (
            <p className="text-sm text-sub mt-3">{s.yourProposal}</p>
          ) : p.my_second ? (
            <div className="mt-3">
              <Badge color="green">{s.youSeconded}</Badge>
            </div>
          ) : (
            <Button full className="mt-3" loading={second.isPending} onClick={() => second.mutate()}>
              {s.secondButton}
            </Button>
          )}
        </Card>
      )}

      {p.status === 'voting' && (
        <Card className="p-4 mb-3">
          {p.voting_closes_at && (
            <p className="text-sm text-sub mb-3">
              {fmt(s.votingCloses, { date: utcDate(p.voting_closes_at).toLocaleString('uz') })}
            </p>
          )}

          <ResultBar label={s.yes} count={p.votes_yes} total={totalVotes} color="bg-good" />
          <ResultBar label={s.no} count={p.votes_no} total={totalVotes} color="bg-danger" />

          {vote.error && (
            <div className="mt-3">
              <ErrorNote message={vote.error.message} />
            </div>
          )}

          {p.my_vote === null ? (
            <div className="grid grid-cols-2 gap-3 mt-3">
              <Button
                size="lg"
                className="bg-good! hover:opacity-90 text-white"
                loading={vote.isPending && pendingChoice === true}
                disabled={vote.isPending}
                onClick={() => castVote(true)}
              >
                {s.voteYes}
              </Button>
              <Button
                size="lg"
                variant="danger"
                loading={vote.isPending && pendingChoice === false}
                disabled={vote.isPending}
                onClick={() => castVote(false)}
              >
                {s.voteNo}
              </Button>
            </div>
          ) : (
            <div className="mt-3">
              <Badge color="green">{fmt(s.youVoted, { choice: p.my_vote ? s.yes : s.no })}</Badge>
            </div>
          )}

          <p className="text-xs text-sub mt-3">{fmt(s.quorumNote, { n: p.quorum })}</p>
        </Card>
      )}

      {p.status === 'passed' && (
        <Card className="p-4 mb-3 bg-good-soft border-green-200">
          <p className="font-semibold text-ink">
            {fmt(s.passedBanner, { yes: p.votes_yes, no: p.votes_no })}
          </p>
          {p.action === 'set_raisi' && <p className="text-sm text-sub mt-1">{s.newRaisi}</p>}
          {p.action === 'ban_user' && <p className="text-sm text-sub mt-1">{s.banned30}</p>}
        </Card>
      )}

      {p.status === 'rejected' && (
        <Card className="p-4 mb-3 bg-red-50 border-red-200">
          <p className="font-semibold text-danger">
            {fmt(s.rejectedBanner, { yes: p.votes_yes, no: p.votes_no })}
          </p>
        </Card>
      )}

      {p.status === 'expired' && (
        <Card className="p-4 mb-3 bg-gray-50">
          <p className="font-semibold text-sub">{s.expiredBanner}</p>
        </Card>
      )}
    </div>
  )
}
