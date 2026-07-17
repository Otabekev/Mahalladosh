/** My household (xonadon) page — the family page, core differentiator (plan §9-B).
 * CASE A: no household yet → warm 20-second create form.
 * CASE B: manage members, family history (the moat) and privacy. */

import { useState, type FormEvent } from 'react'
import { useAuth } from '@/core/stores/auth'
import { fmt, useStrings } from '@/core/i18n'
import { common } from '@/core/i18n/common'
import { householdStrings } from '@/core/i18n/household'
import {
  Avatar,
  Badge,
  Button,
  Card,
  ErrorNote,
  Field,
  Input,
  PageTitle,
  PointsBadge,
  Select,
  Spinner,
  Textarea,
} from '@/components/ui'
import {
  getPosition,
  useAddMember,
  useCreateHousehold,
  useHousehold,
  useRemoveMember,
  useSetLocation,
  useUpdateHousehold,
} from '@/core/queries/households'
import type { Household, HouseholdMember, HouseholdVisibility } from '@/core/api/types'

export default function MyHouseholdScreen() {
  const me = useAuth((s) => s.me)
  if (!me) return null
  if (me.user.household_id == null) return <CreateHouseholdView />
  return <MyHouseholdView id={me.user.household_id} />
}

// ---------- CASE A: create ----------

function CreateHouseholdView() {
  const s = useStrings(householdStrings)
  const create = useCreateHousehold()
  const [familyName, setFamilyName] = useState('')
  const [residents, setResidents] = useState('')
  const [street, setStreet] = useState('')

  const canSubmit = familyName.trim().length >= 2 && Number(residents) >= 1

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit || create.isPending) return
    create.mutate({
      family_name: familyName.trim(),
      resident_count: Math.floor(Number(residents)),
      street: street.trim() || null,
    })
  }

  return (
    <div>
      <PageTitle title={s.title} />

      <Card className="p-5 mb-4 text-center">
        <div className="text-4xl mb-2">🏠</div>
        <p className="text-sm text-ink">{s.createIntro}</p>
      </Card>

      <Card className="p-5">
        {create.error && <ErrorNote message={create.error.message} />}
        <form onSubmit={submit}>
          <Field label={s.familyNameLabel}>
            <Input
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              placeholder={s.familyNamePlaceholder}
            />
          </Field>
          <Field label={s.residentsLabel}>
            <Input
              type="number"
              min={1}
              value={residents}
              onChange={(e) => setResidents(e.target.value)}
              placeholder="4"
            />
          </Field>
          <Field label={s.streetLabel}>
            <Input value={street} onChange={(e) => setStreet(e.target.value)} placeholder={s.streetPlaceholder} />
          </Field>
          <Button type="submit" full loading={create.isPending} disabled={!canSubmit}>
            {s.create}
          </Button>
          <p className="text-xs text-sub mt-3 text-center">{s.createAnnounceNote}</p>
        </form>
      </Card>
    </div>
  )
}

// ---------- CASE B: my household ----------

function MyHouseholdView({ id }: { id: number }) {
  const s = useStrings(householdStrings)
  const query = useHousehold(id)

  if (query.isPending) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    )
  }
  if (query.error) {
    return (
      <div>
        <PageTitle title={s.title} />
        <ErrorNote message={query.error.message} />
      </div>
    )
  }
  if (!query.data) return null
  const household = query.data
  const verified = household.verification_status === 'verified'

  return (
    <div>
      <PageTitle title={s.title} />

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
        {!verified && <p className="text-xs text-sub mt-2">{s.vouchHint}</p>}
      </Card>

      <DingDongCard household={household} />
      <MembersCard household={household} />
      <HistoryCard household={household} />
      <PrivacyCard household={household} />
    </div>
  )
}

// ---------- DingDong (virtual doorbell) ----------

function DingDongCard({ household }: { household: Household }) {
  const s = useStrings(householdStrings)
  const setLocation = useSetLocation(household.id)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function mark() {
    if (busy) return
    setError(null)
    setBusy(true)
    try {
      const pos = await getPosition()
      await setLocation.mutateAsync(pos)
    } catch (err) {
      setError(err instanceof Error ? err.message : s.locationFail)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="p-5 mb-4">
      <h3 className="font-bold text-ink mb-3">{s.dingdongTitle}</h3>

      {error && <ErrorNote message={error} />}

      {household.has_location ? (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Badge color="green">{s.locationSet}</Badge>
          <Button variant="secondary" size="sm" loading={busy} onClick={mark}>
            {s.setAgain}
          </Button>
        </div>
      ) : (
        <>
          <p className="text-sm text-sub mb-3">{s.setLocationExplain}</p>
          <Button full loading={busy} onClick={mark}>
            {s.markHere}
          </Button>
        </>
      )}

      <p className="text-xs text-sub mt-3">{s.locationPrivacyNote}</p>
    </Card>
  )
}

// ---------- members ----------

function MembersCard({ household }: { household: Household }) {
  const s = useStrings(householdStrings)
  const c = useStrings(common)
  const addMember = useAddMember(household.id)
  const removeMember = useRemoveMember()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [elder, setElder] = useState(false)

  function submit(e: FormEvent) {
    e.preventDefault()
    if (name.trim().length < 2 || addMember.isPending) return
    addMember.mutate(
      { full_name: name.trim(), is_elder: elder },
      {
        onSuccess: () => {
          setName('')
          setElder(false)
          setOpen(false)
        },
      },
    )
  }

  function remove(m: HouseholdMember) {
    if (window.confirm(s.confirmRemove)) removeMember.mutate(m.id)
  }

  return (
    <Card className="p-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-ink">{s.membersTitle}</h3>
        <span className="text-sm text-sub">{household.members.length}</span>
      </div>

      {addMember.error && <ErrorNote message={addMember.error.message} />}
      {removeMember.error && <ErrorNote message={removeMember.error.message} />}

      {household.members.length === 0 && (
        <p className="text-sm text-sub mb-2">{s.noMembers}</p>
      )}
      <div className="space-y-2">
        {household.members.map((m) => (
          <div key={m.id} className="flex items-center gap-3">
            <Avatar name={m.full_name} size={32} />
            <span className="text-sm font-semibold text-ink flex-1 min-w-0 truncate">
              {m.full_name}
            </span>
            {m.is_elder && <Badge color="gold">{s.elderBadge}</Badge>}
            <Button
              variant="ghost"
              size="sm"
              aria-label={c.remove}
              onClick={() => remove(m)}
              loading={removeMember.isPending && removeMember.variables === m.id}
            >
              ×
            </Button>
          </div>
        ))}
      </div>

      {open ? (
        <form onSubmit={submit} className="mt-4 pt-4 border-t border-line">
          <div className="mb-3">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={s.memberNamePlaceholder}
            />
          </div>
          <label className="flex items-center gap-2 mb-3 text-sm text-ink">
            <input
              type="checkbox"
              checked={elder}
              onChange={(e) => setElder(e.target.checked)}
              className="w-4 h-4 accent-black"
            />
            {s.elderCheckbox}
          </label>
          <div className="flex gap-2">
            <Button type="submit" size="sm" loading={addMember.isPending} disabled={name.trim().length < 2}>
              {c.add}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              {c.cancel}
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-4">
          <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
            {s.addMember}
          </Button>
        </div>
      )}

      <p className="text-xs text-sub mt-3">{s.membersHint}</p>
    </Card>
  )
}

// ---------- family history (the moat) ----------

function HistoryCard({ household }: { household: Household }) {
  const s = useStrings(householdStrings)
  const c = useStrings(common)
  const update = useUpdateHousehold(household.id)
  const [generations, setGenerations] = useState(household.generations_here?.toString() ?? '')
  const [history, setHistory] = useState(household.family_history ?? '')

  const hasHistory = !!household.family_history

  function submit(e: FormEvent) {
    e.preventDefault()
    if (update.isPending) return
    const g = Math.floor(Number(generations))
    update.mutate({
      family_history: history.trim() || null,
      generations_here: generations.trim() !== '' && Number.isFinite(g) && g >= 1 ? g : null,
    })
  }

  return (
    <div className="bg-amber-50/50 border border-amber-200 rounded-2xl shadow-card p-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-ink">{s.historyTitle}</h3>
        {!hasHistory && <PointsBadge points={15} size="sm" />}
      </div>

      {!hasHistory && <p className="text-sm text-sub mb-3">{s.historyEncourage}</p>}

      {update.error && <ErrorNote message={update.error.message} />}

      <form onSubmit={submit}>
        <Field label={s.generationsLabel}>
          <Input
            type="number"
            min={1}
            value={generations}
            onChange={(e) => setGenerations(e.target.value)}
            placeholder="3"
          />
        </Field>
        <Field label={s.historyLabel}>
          <Textarea
            rows={5}
            value={history}
            onChange={(e) => setHistory(e.target.value)}
            placeholder={s.historyPlaceholder}
          />
        </Field>
        <div className="flex items-center gap-3">
          <Button type="submit" loading={update.isPending}>
            {c.save}
          </Button>
          {update.isSuccess && !update.isPending && <Badge color="green">{s.saved}</Badge>}
        </div>
      </form>
    </div>
  )
}

// ---------- privacy ----------

function PrivacyCard({ household }: { household: Household }) {
  const s = useStrings(householdStrings)
  const update = useUpdateHousehold(household.id)

  return (
    <Card className="p-5 mb-4">
      {update.error && <ErrorNote message={update.error.message} />}
      <Field label={s.privacyLabel}>
        <Select
          value={household.visibility}
          disabled={update.isPending}
          onChange={(e) => update.mutate({ visibility: e.target.value as HouseholdVisibility })}
        >
          <option value="neighbors">{s.visNeighbors}</option>
          <option value="family_only">{s.visFamily}</option>
        </Select>
      </Field>
      <p className="text-xs text-sub -mt-1">{s.privacyFooter}</p>
    </Card>
  )
}
