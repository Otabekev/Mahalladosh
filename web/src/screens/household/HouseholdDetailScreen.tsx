/** Another family's household page (plan §9-B) — the same warm read-mode album a
 * family sees of itself, plus neighbour vouching and the DingDong virtual doorbell. */

import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/core/stores/auth'
import { fmt, useStrings } from '@/core/i18n'
import { common } from '@/core/i18n/common'
import { householdStrings } from '@/core/i18n/household'
import { Badge, Button, Card, ErrorNote, Spinner } from '@/components/ui'
import { getPosition, useDingDong, useHousehold, useVouch } from '@/core/queries/households'
import type { Household } from '@/core/api/types'
import { AlbumStrip, GenerationsStat, HistoryProse, HouseholdHero, MembersRead } from './MyHouseholdScreen'

export default function HouseholdDetailScreen() {
  const s = useStrings(householdStrings)
  const c = useStrings(common)
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
  const mahalla = me?.mahalla ? fmt(c.mahallaSuffix, { name: me.mahalla.name }) : null

  return (
    <div>
      <HouseholdHero familyName={household.family_name} mahalla={mahalla} street={household.street} />

      {household.generations_here != null && <GenerationsStat generations={household.generations_here} />}

      <div className="mt-6 space-y-7">
        <AlbumStrip />
        <HistoryProse history={household.family_history} verified={verified} own={false} />
        <MembersRead members={household.members} />

        {!isMine && <DingDongRingCard household={household} />}

        {!isMine &&
          (household.my_vouch ? (
            <div>
              <Badge color="green">{s.youVouched}</Badge>
            </div>
          ) : (
            <Card className="p-4">
              {vouch.error && <ErrorNote message={vouch.error.message} />}
              <p className="mb-3 text-sm text-ink">{s.vouchQuestion}</p>
              <Button full variant="secondary" loading={vouch.isPending} onClick={() => vouch.mutate()}>
                {s.vouchButton}
              </Button>
              <p className="mt-2 text-xs text-sub">{fmt(s.vouchExplain, { n: household.vouch_count })}</p>
            </Card>
          ))}
      </div>
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
      <Card className="p-4">
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
    <Card className="p-5">
      {error && <ErrorNote message={error} />}
      {success && (
        <div className="mb-4 rounded-xl bg-good-soft px-4 py-3 text-sm font-semibold text-good">{success}</div>
      )}
      <Button full size="lg" loading={busy} onClick={ring}>
        {s.ringButton}
      </Button>
      <p className="mt-2 text-xs text-sub">{s.ringExplain}</p>
    </Card>
  )
}
