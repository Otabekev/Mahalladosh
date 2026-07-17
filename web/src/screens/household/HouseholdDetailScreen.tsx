/** Another family's household page (plan §9-B) — read-only view, neighbor
 * vouching and the DingDong virtual doorbell. */

import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/core/stores/auth'
import { fmt, useStrings } from '@/core/i18n'
import { householdStrings } from '@/core/i18n/household'
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorNote,
  Spinner,
} from '@/components/ui'
import { getPosition, useDingDong, useHousehold, useVouch } from '@/core/queries/households'
import type { Household } from '@/core/api/types'

export default function HouseholdDetailScreen() {
  const s = useStrings(householdStrings)
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const me = useAuth((st) => st.me)
  const householdId = Number(id)
  const query = useHousehold(Number.isFinite(householdId) ? householdId : undefined)
  const vouch = useVouch(householdId)

  const back = (
    <Button variant="ghost" size="sm" className="mb-2 -ml-2" onClick={() => navigate(-1)}>
      {s.backToMahalla}
    </Button>
  )

  if (query.isPending) {
    return (
      <div>
        {back}
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      </div>
    )
  }
  if (query.error) {
    return (
      <div>
        {back}
        <ErrorNote message={query.error.message} />
      </div>
    )
  }
  if (!query.data) return null
  const household = query.data
  const verified = household.verification_status === 'verified'
  const isMine = me != null && household.id === me.user.household_id
  const isEmpty = household.members.length === 0 && !household.family_history

  return (
    <div>
      {back}

      <Card className="p-5 mb-4">
        <h2 className="text-lg font-extrabold text-ink">{fmt(s.householdOf, { name: household.family_name })}</h2>
        <p className="text-sm text-sub">
          {fmt(s.nPeople, { n: household.resident_count })}
          {household.street ? ` · ${household.street}` : ''}
        </p>
        <div className="mt-2">
          {verified ? (
            <Badge color="green">{s.verifiedBadge}</Badge>
          ) : (
            <Badge color="gray">{fmt(s.awaitingVouch, { n: household.vouch_count })}</Badge>
          )}
        </div>
      </Card>

      {!isMine && <DingDongRingCard household={household} />}

      {isEmpty ? (
        <Card className="mb-4">
          <EmptyState icon="🌱" title={s.emptyFamily} />
        </Card>
      ) : (
        <>
          {household.members.length > 0 && (
            <Card className="p-5 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-ink">{s.membersTitle}</h3>
                <span className="text-sm text-sub">{household.members.length}</span>
              </div>
              <div className="space-y-2">
                {household.members.map((m) => (
                  <div key={m.id} className="flex items-center gap-3">
                    <Avatar name={m.full_name} size={32} />
                    <span className="text-sm font-semibold text-ink flex-1 min-w-0 truncate">
                      {m.full_name}
                    </span>
                    {m.is_elder && <Badge color="gold">{s.elderBadge}</Badge>}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {household.family_history && (
            <div className="bg-amber-50/50 border border-amber-200 rounded-2xl shadow-card p-5 mb-4">
              <h3 className="font-bold text-ink mb-2">{s.historyTitle}</h3>
              {household.generations_here != null && (
                <p className="text-sm font-semibold text-ink mb-2">
                  {fmt(s.generationsHere, { n: household.generations_here })}
                </p>
              )}
              <p className="text-sm text-ink whitespace-pre-wrap">{household.family_history}</p>
            </div>
          )}
        </>
      )}

      {!isMine &&
        (household.my_vouch ? (
          <div className="mb-4">
            <Badge color="green">{s.youVouched}</Badge>
          </div>
        ) : (
          <Card className="p-4 mb-4">
            {vouch.error && <ErrorNote message={vouch.error.message} />}
            <p className="text-sm text-ink mb-3">{s.vouchQuestion}</p>
            <Button full variant="secondary" loading={vouch.isPending} onClick={() => vouch.mutate()}>
              {s.vouchButton}
            </Button>
            <p className="text-xs text-sub mt-2">{fmt(s.vouchExplain, { n: household.vouch_count })}</p>
          </Card>
        ))}
    </div>
  )
}

// ---------- DingDong (virtual doorbell) ----------

function DingDongRingCard({ household }: { household: Household }) {
  const s = useStrings(householdStrings)
  const dingdong = useDingDong(household.id)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const timer = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (timer.current != null) window.clearTimeout(timer.current)
    },
    [],
  )

  if (!household.has_location) {
    return (
      <Card className="p-4 mb-4">
        <p className="text-sm text-sub">{s.noBell}</p>
      </Card>
    )
  }

  async function ring() {
    if (busy) return
    setError(null)
    setSuccess(null)
    setBusy(true)
    try {
      const pos = await getPosition()
      const result = await dingdong.mutateAsync(pos)
      setSuccess(result.message)
      if (timer.current != null) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setSuccess(null), 6000)
    } catch (err) {
      setError(err instanceof Error ? err.message : s.ringFail)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="p-5 mb-4">
      {error && <ErrorNote message={error} />}
      {success && (
        <div className="rounded-xl bg-good-soft text-good text-sm font-semibold px-4 py-3 mb-4">
          {success}
        </div>
      )}
      <Button full size="lg" loading={busy} onClick={ring}>
        {s.ringButton}
      </Button>
      <p className="text-xs text-sub mt-2">{s.ringExplain}</p>
    </Card>
  )
}
