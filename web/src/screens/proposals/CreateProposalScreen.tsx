/** New proposal — pick type, (optionally) pick a neighbor, write title + description. */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Avatar,
  Button,
  Card,
  ErrorNote,
  Field,
  Input,
  PageTitle,
  Spinner,
  Textarea,
} from '@/components/ui'
import { useCreateProposal } from '@/core/queries/proposals'
import { useMembers } from '@/core/queries/mahalla'
import { useAuth } from '@/core/stores/auth'
import { fmt, useStrings } from '@/core/i18n'
import { common } from '@/core/i18n/common'
import { proposalsStrings } from '@/core/i18n/proposals'
import type { ProposalAction } from '@/core/api/types'

type StringKey = keyof typeof proposalsStrings

const TYPE_CARDS: { action: ProposalAction; icon: string; labelKey: StringKey; descKey: StringKey }[] = [
  { action: 'none', icon: '💡', labelKey: 'typeSimpleLabel', descKey: 'typeSimpleDesc' },
  { action: 'set_raisi', icon: '👑', labelKey: 'typeRaisiLabel', descKey: 'typeRaisiDesc' },
  { action: 'ban_user', icon: '⚠️', labelKey: 'typeBanLabel', descKey: 'typeBanDesc' },
]

export default function CreateProposalScreen() {
  const navigate = useNavigate()
  const s = useStrings(proposalsStrings)
  const c = useStrings(common)
  const me = useAuth((st) => st.me)
  const [action, setAction] = useState<ProposalAction | null>(null)
  const [targetId, setTargetId] = useState<number | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  const needsTarget = action === 'set_raisi' || action === 'ban_user'
  const members = useMembers(needsTarget ? me?.mahalla?.id : undefined)
  const create = useCreateProposal()

  const selectable = (members.data ?? []).filter(
    (u) => action !== 'ban_user' || u.id !== me?.user.id,
  )

  const secondsNeeded = action === 'ban_user' ? 5 : 3
  const canSubmit = title.trim().length >= 3 && (!needsTarget || targetId !== null)

  const submit = () => {
    if (action === null || !canSubmit) return
    create.mutate(
      {
        title: title.trim(),
        description: description.trim() === '' ? null : description.trim(),
        action,
        target_user_id: needsTarget ? targetId : null,
      },
      { onSuccess: (p) => navigate(`/app/proposals/${p.id}`, { replace: true }) },
    )
  }

  const chosen = TYPE_CARDS.find((t) => t.action === action)

  return (
    <div>
      <PageTitle title={s.createTitle} />

      {action === null ? (
        <div>
          <p className="text-sm text-sub mb-3">{s.pickType}</p>
          {TYPE_CARDS.map((t) => (
            <Card
              key={t.action}
              className={`p-4 mb-3 ${t.action === 'ban_user' ? 'border-red-200' : ''}`}
              onClick={() => {
                setAction(t.action)
                setTargetId(null)
              }}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{t.icon}</span>
                <div>
                  <div className="font-bold text-ink">{s[t.labelKey]}</div>
                  <div className="text-sm text-sub">{s[t.descKey]}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-ink">
              {chosen?.icon} {chosen && s[chosen.labelKey]}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setAction(null)
                setTargetId(null)
              }}
            >
              ← {c.back}
            </Button>
          </div>

          {needsTarget && (
            <div className="mb-4">
              <p className="text-sm font-semibold text-ink mb-1.5">{s.pickNeighbor}</p>
              {members.isLoading && (
                <div className="flex justify-center py-12">
                  <Spinner />
                </div>
              )}
              {members.error && <ErrorNote message={members.error.message} />}
              {selectable.map((u) => (
                <Card
                  key={u.id}
                  className={`p-3 mb-2 flex items-center gap-3 ${targetId === u.id ? 'ring-2 ring-brand' : ''}`}
                  onClick={() => setTargetId(u.id)}
                >
                  <Avatar name={u.full_name} src={u.photo_url} size={32} />
                  <span className="text-sm font-semibold text-ink truncate min-w-0">{u.full_name}</span>
                </Card>
              ))}
              {members.data && selectable.length === 0 && (
                <p className="text-sm text-sub">{s.noNeighbors}</p>
              )}
            </div>
          )}

          {action === 'ban_user' && (
            <Card className="p-4 mb-4 bg-red-50 border-red-200">
              <p className="text-sm text-ink">{s.banWarning}</p>
            </Card>
          )}

          <Field label={s.titleLabel}>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={s.titlePlaceholder}
              maxLength={200}
            />
          </Field>

          <Field label={s.descLabel}>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={s.descPlaceholder}
              maxLength={4000}
            />
          </Field>

          {create.error && <ErrorNote message={create.error.message} />}

          <Button full loading={create.isPending} disabled={!canSubmit} onClick={submit}>
            {c.send}
          </Button>

          <p className="text-xs text-sub mt-3">{fmt(s.secondingNote, { n: secondsNeeded })}</p>
        </div>
      )}
    </div>
  )
}
