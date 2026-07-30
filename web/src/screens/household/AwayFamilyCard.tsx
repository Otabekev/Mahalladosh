/** The steward's side of the away link, on the family page.
 *
 *  It belongs here rather than anywhere in the mahalla UI because the decision is a
 *  family one: only this household can invite its own relatives, and only this
 *  household approves them. Putting it on the mahalla page would imply the raisi or
 *  the neighbours have a say, and they do not.
 */

import { useState } from 'react'
import { Button, Card, Input } from '@/components/ui'
import { SectionHeading } from '@/components/Ornament'
import { useConfirm } from '@/components/confirm'
import { fmt, useStrings } from '@/core/i18n'
import { common } from '@/core/i18n/common'
import { awayStrings } from '@/core/i18n/away'
import {
  useApproveAway,
  useAwayRequests,
  useCreateAwayInvite,
  useRevokeAway,
} from '@/core/queries/away'
import type { AwayStatus } from '@/core/api/types'

const STATUS_KEY: Record<string, keyof typeof awayStrings> = {
  pending: 'statusPending',
  active: 'statusActive',
  revoked: 'statusRevoked',
}

export function AwayFamilyCard() {
  const s = useStrings(awayStrings)
  const c = useStrings(common)
  const confirm = useConfirm()
  const { data: rows } = useAwayRequests()
  const invite = useCreateAwayInvite()
  const approve = useApproveAway()
  const revoke = useRevokeAway()
  const [copied, setCopied] = useState(false)

  const url = invite.data ? `${window.location.origin}/away/join/${invite.data.token}` : ''

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard is blocked on some in-app browsers; the input below is selectable
    }
  }

  return (
    <section>
      <SectionHeading>{s.stewardTitle}</SectionHeading>
      <Card className="px-4 py-4">
        <p className="text-sm text-sub leading-relaxed">{s.stewardBody}</p>

        {url ? (
          <div className="mt-3">
            {/* readOnly and selectable: the copy button fails silently inside some
                in-app browsers, and a link nobody can select is a dead end */}
            <Input readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
            <div className="mt-2 flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={copy}>
                {copied ? s.copied : s.copy}
              </Button>
              <span className="text-xs text-sub">
                {fmt(s.inviteReady, { hours: invite.data?.expires_hours ?? 48 })}
              </span>
            </div>
          </div>
        ) : (
          <Button
            className="mt-3"
            variant="secondary"
            full
            loading={invite.isPending}
            onClick={() => invite.mutate()}
          >
            {s.makeInvite}
          </Button>
        )}

        {rows && rows.length > 0 && (
          <ul className="mt-4 space-y-2 border-t border-line/60 pt-3">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink truncate">{r.user.full_name}</p>
                  <p className="text-xs text-sub">
                    {r.country ? `✈️ ${r.country} · ` : ''}
                    {s[STATUS_KEY[r.status as AwayStatus] ?? 'statusPending']}
                  </p>
                </div>
                {r.status === 'pending' && (
                  <Button size="sm" loading={approve.isPending} onClick={() => approve.mutate(r.id)}>
                    {s.approve}
                  </Button>
                )}
                {r.status === 'active' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      const ok = await confirm({
                        title: s.revokeConfirm,
                        confirmLabel: s.revoke,
                        danger: true,
                      })
                      if (ok) revoke.mutate(r.id)
                    }}
                  >
                    {c.remove}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}

        <p className="mt-3 text-xs text-sub/85 leading-relaxed">{s.approvalNote}</p>
      </Card>
    </section>
  )
}
