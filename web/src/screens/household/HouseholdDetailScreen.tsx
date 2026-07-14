/** Another family's household page (plan §9-B) — read-only view + neighbor vouching. */

import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/core/stores/auth'
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorNote,
  Spinner,
} from '@/components/ui'
import { useHousehold, useVouch } from '@/core/queries/households'

export default function HouseholdDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const me = useAuth((s) => s.me)
  const householdId = Number(id)
  const query = useHousehold(Number.isFinite(householdId) ? householdId : undefined)
  const vouch = useVouch(householdId)

  const back = (
    <Button variant="ghost" size="sm" className="mb-2 -ml-2" onClick={() => navigate(-1)}>
      ← Mahalla
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
        <h2 className="text-lg font-extrabold text-ink">{household.family_name} xonadoni</h2>
        <p className="text-sm text-sub">
          {household.resident_count} kishi
          {household.street ? ` · ${household.street}` : ''}
        </p>
        <div className="mt-2">
          {verified ? (
            <Badge color="green">✓ Qo'shnilar tasdiqlagan</Badge>
          ) : (
            <Badge color="gray">Kafolat kutilmoqda ({household.vouch_count}/2)</Badge>
          )}
        </div>
      </Card>

      {isEmpty ? (
        <Card className="mb-4">
          <EmptyState icon="🌱" title="Bu oila hali ma'lumot kiritmagan" />
        </Card>
      ) : (
        <>
          {household.members.length > 0 && (
            <Card className="p-5 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-ink">Oila a'zolari</h3>
                <span className="text-sm text-sub">{household.members.length}</span>
              </div>
              <div className="space-y-2">
                {household.members.map((m) => (
                  <div key={m.id} className="flex items-center gap-3">
                    <Avatar name={m.full_name} size={32} />
                    <span className="text-sm font-semibold text-ink flex-1 min-w-0 truncate">
                      {m.full_name}
                    </span>
                    {m.is_elder && <Badge color="gold">Otaxon/Onaxon</Badge>}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {household.family_history && (
            <div className="bg-amber-50/50 border border-amber-200 rounded-2xl shadow-card p-5 mb-4">
              <h3 className="font-bold text-ink mb-2">📖 Oila tarixi</h3>
              {household.generations_here != null && (
                <p className="text-sm font-semibold text-ink mb-2">
                  🏠 {household.generations_here} avloddan beri shu mahallada
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
            <Badge color="green">✓ Siz kafolat bergansiz</Badge>
          </div>
        ) : (
          <Card className="p-4 mb-4">
            {vouch.error && <ErrorNote message={vouch.error.message} />}
            <p className="text-sm text-ink mb-3">Bu oila haqiqatan mahallangizda yashaydimi?</p>
            <Button full variant="secondary" loading={vouch.isPending} onClick={() => vouch.mutate()}>
              🤝 Kafolat beraman
            </Button>
            <p className="text-xs text-sub mt-2">
              Kafolat — qo'shnichilik ishonchi. {household.vouch_count}/2 to'planganda oila
              tasdiqlanadi.
            </p>
          </Card>
        ))}
    </div>
  )
}
