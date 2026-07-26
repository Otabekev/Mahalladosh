/** My household (xonadon) page — the family page, core differentiator (plan §9-B).
 * CASE A: no household yet → warm 20-second create form.
 * CASE B: a calm READ mode that feels like a family album, with all the editing
 * forms tucked behind a "Tahrirlash" toggle. The read-mode pieces (hero, stat,
 * album strip, history prose, member rows) are exported and reused by the
 * neighbour-facing HouseholdDetailScreen. */

import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/core/stores/auth'
import { useConfirm } from '@/components/confirm'
import { fmt, useLang, useStrings } from '@/core/i18n'
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
  useApproveJoin,
  useCreateHousehold,
  useDeclineJoin,
  useHousehold,
  useJoinRequests,
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

// ---------- small line icons ----------

function IconChevronLeft() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

function IconBell() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  )
}

function IconPencil() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

// ---------- shared READ-mode pieces (reused by HouseholdDetailScreen) ----------

/** Terracotta ikat hero band — bleeds edge-to-edge out of the page padding. */
export function HouseholdHero({
  familyName,
  mahalla,
  street,
  actions,
}: {
  familyName: string
  mahalla?: string | null
  street?: string | null
  actions?: ReactNode
}) {
  const s = useStrings(householdStrings)
  const navigate = useNavigate()
  const location = [mahalla, street].filter(Boolean).join(' · ')

  return (
    <div
      className="relative -mx-4 -mt-4 overflow-hidden px-5 pt-5 pb-7 text-[#FBF3E2]"
      style={{ background: 'repeating-linear-gradient(90deg,#B23A28 0 3%,#c25a3f 4.5% 6%,#B23A28 7.5% 10%,#9c3020 11.5% 14%)' }}
    >
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(120,40,28,.25),rgba(120,40,28,.62))' }} />

      <div className="relative flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="-ml-1 flex items-center gap-1.5 py-1 text-[14px] font-semibold opacity-95">
          <IconChevronLeft />
          {s.heroBack}
        </button>
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>

      <h1 className="relative mt-3 font-display text-[29px] font-bold leading-[1.05] tracking-tight">
        {fmt(s.householdOf, { name: familyName })}
      </h1>
      {location && <p className="relative mt-1 text-[15px] opacity-90">{location}</p>}
    </div>
  )
}

/** Big "{n} avloddan beri shu ko'chada" card that overlaps up into the hero. */
export function GenerationsStat({ generations }: { generations: number }) {
  const s = useStrings(householdStrings)
  const lang = useLang((st) => st.lang)
  return (
    <div className="relative z-10 -mt-5 flex items-center gap-4 rounded-2xl border border-line bg-card px-5 py-4 shadow-pop">
      <div className="text-[46px] font-black leading-none text-brand tabular-nums">{generations}</div>
      <div className="text-[17px] font-semibold leading-[1.3] text-ink">
        {s.genStatLine}
        {lang !== 'en' && (
          <span className="mt-0.5 block text-[14px] font-normal text-sub">{fmt(s.genStatGloss, { n: generations })}</span>
        )}
      </div>
    </div>
  )
}

/** Oila albomi — a warm 4-tile strip. Real photo upload is a future task; for now
 * these are gentle cream placeholders so the album still feels present. */
export function AlbumStrip() {
  const s = useStrings(householdStrings)
  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between">
        <div className="text-[13px] font-semibold uppercase tracking-[0.08em] text-brand">{s.albumTitle}</div>
        <span className="text-[13px] text-sub">{s.albumSoon}</span>
      </div>
      <div className="flex gap-2.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="aspect-[3/4] flex-1 rounded-xl border border-line"
            style={{ background: 'repeating-linear-gradient(135deg,#E7D6B4,#E7D6B4 8px,#EEE1C4 8px,#EEE1C4 16px)' }}
          />
        ))}
      </div>
    </div>
  )
}

/** Bizning tariximiz — the moat, shown as large warm prose (never a textarea here). */
export function HistoryProse({
  history,
  verified,
  own,
}: {
  history: string | null
  verified: boolean
  own: boolean
}) {
  const s = useStrings(householdStrings)
  return (
    <div>
      <div className="mb-2.5 flex flex-wrap items-center gap-2">
        <div className="text-[13px] font-semibold uppercase tracking-[0.08em] text-brand">{s.ourHistory}</div>
        {verified && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#CFE3D6] bg-good-soft px-2.5 py-1 text-[12px] font-semibold text-good">
            <IconCheck />
            {s.vouchedPill}
          </span>
        )}
      </div>
      {history ? (
        <p className="whitespace-pre-wrap text-[18px] leading-relaxed text-ink" style={{ textWrap: 'pretty' }}>
          {history}
        </p>
      ) : (
        <p className="text-[16px] leading-relaxed text-sub">{own ? s.historyReadEmpty : s.emptyFamily}</p>
      )}
    </div>
  )
}

/** Xonadon a'zolari — member rows on cream cards; elders get the honour ring. */
export function MembersRead({ members }: { members: HouseholdMember[] }) {
  const s = useStrings(householdStrings)
  if (members.length === 0) return null
  return (
    <div>
      <h2 className="mb-3 font-display text-[21px] font-bold text-ink">{s.membersTitle}</h2>
      <div className="space-y-2.5">
        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-3.5 rounded-2xl border border-line bg-card px-3.5 py-3">
            <Avatar name={m.full_name} size={m.is_elder ? 58 : 52} honor={m.is_elder} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-bold text-ink" style={{ fontSize: m.is_elder ? 19 : 18 }}>
                {m.full_name}
              </div>
              {m.is_elder && <div className="text-[15px] font-semibold text-honor-deep">{s.elderBadge}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Qo'shilish so'rovlari — pending join requests, shown to any steward on their
 * own household page. Renders nothing when there are none. */
function JoinRequestsSection({ id }: { id: number }) {
  const s = useStrings(householdStrings)
  const query = useJoinRequests(id)
  const approve = useApproveJoin(id)
  const decline = useDeclineJoin(id)
  const requests = query.data ?? []
  if (requests.length === 0) return null

  return (
    <div>
      <h2 className="mb-3 font-display text-[21px] font-bold text-ink">{s.joinRequestsTitle}</h2>
      {approve.error && <ErrorNote message={approve.error.message} />}
      {decline.error && <ErrorNote message={decline.error.message} />}
      <div className="space-y-2.5">
        {requests.map((r) => (
          <Card key={r.id} className="flex items-center gap-3 p-3.5">
            <Avatar name={r.user.full_name} size={46} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-bold text-ink">{r.user.full_name}</div>
              <div className="truncate text-[13px] text-sub">
                {r.claim_member_name
                  ? `«${r.claim_member_name}» ${s.claimsToBe}`
                  : s.wantsToJoin}
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                size="sm"
                loading={approve.isPending && approve.variables === r.id}
                onClick={() => approve.mutate(r.id)}
              >
                {s.approve}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                loading={decline.isPending && decline.variables === r.id}
                onClick={() => decline.mutate(r.id)}
              >
                {s.decline}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
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
      <div className="mb-5 pt-2 text-center">
        <div className="mb-3 text-5xl">🏡</div>
        <h1 className="font-display text-[26px] font-bold leading-tight text-ink">{s.title}</h1>
        <p className="mx-auto mt-2 max-w-xs text-sm text-sub">{s.createIntro}</p>
      </div>

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
          <p className="mt-3 text-center text-xs text-sub">{s.createAnnounceNote}</p>
        </form>
      </Card>
    </div>
  )
}

// ---------- CASE B: my household ----------

function MyHouseholdView({ id }: { id: number }) {
  const s = useStrings(householdStrings)
  const query = useHousehold(id)
  const [edit, setEdit] = useState(false)

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

  return edit ? (
    <EditMode household={household} onDone={() => setEdit(false)} />
  ) : (
    <ReadMode household={household} onEdit={() => setEdit(true)} />
  )
}

// ---------- READ mode (own family album) ----------

function ReadMode({ household, onEdit }: { household: Household; onEdit: () => void }) {
  const s = useStrings(householdStrings)
  const c = useStrings(common)
  const mahalla = useAuth((st) => st.me?.mahalla?.name ?? null)
  const verified = household.verification_status === 'verified'

  const iconBtn = 'flex h-9 w-9 items-center justify-center rounded-[10px]'
  const iconBg = { background: 'rgba(251,243,226,0.18)' }

  return (
    <div>
      <HouseholdHero
        familyName={household.family_name}
        mahalla={mahalla ? fmt(c.mahallaSuffix, { name: mahalla }) : null}
        street={household.street}
        actions={
          <>
            <Link to="/app/notifications" aria-label={s.notificationsAria} className={`${iconBtn} text-[#FBF3E2]`} style={iconBg}>
              <IconBell />
            </Link>
            <button onClick={onEdit} aria-label={s.editButton} className={`${iconBtn} text-[#FBF3E2]`} style={iconBg}>
              <IconPencil />
            </button>
          </>
        }
      />

      {household.generations_here != null && <GenerationsStat generations={household.generations_here} />}

      <div className="mt-6 space-y-7">
        <AlbumStrip />
        <HistoryProse history={household.family_history} verified={verified} own />
        <MembersRead members={household.members} />
        <JoinRequestsSection id={household.id} />

        {!verified && (
          <Card className="p-4">
            <Badge color="gray">{fmt(s.awaitingVouch, { n: household.vouch_count })}</Badge>
            <p className="mt-2 text-xs text-sub">{s.vouchHint}</p>
          </Card>
        )}

        <Button variant="secondary" full onClick={onEdit}>
          ✎ {s.editButton}
        </Button>
      </div>
    </div>
  )
}

// ---------- EDIT mode (all the forms, tucked away) ----------

function EditMode({ household, onDone }: { household: Household; onDone: () => void }) {
  const s = useStrings(householdStrings)
  const c = useStrings(common)

  return (
    <div>
      <button onClick={onDone} className="-ml-1 mb-3 flex items-center gap-1.5 py-1 text-sm font-semibold text-brand">
        <IconChevronLeft />
        {c.back}
      </button>
      <PageTitle title={s.editTitle} />

      <BasicsCard household={household} />
      <HistoryCard household={household} />
      <MembersCard household={household} />
      <DingDongCard household={household} />
      <PrivacyCard household={household} />

      <Button full onClick={onDone}>
        {s.doneEditing}
      </Button>
    </div>
  )
}

// ---------- basics (family name + street) ----------

function BasicsCard({ household }: { household: Household }) {
  const s = useStrings(householdStrings)
  const c = useStrings(common)
  const update = useUpdateHousehold(household.id)
  const [familyName, setFamilyName] = useState(household.family_name)
  const [street, setStreet] = useState(household.street ?? '')

  function submit(e: FormEvent) {
    e.preventDefault()
    if (update.isPending || familyName.trim().length < 2) return
    update.mutate({ family_name: familyName.trim(), street: street.trim() || null })
  }

  return (
    <Card className="mb-4 p-5">
      <h3 className="mb-3 font-bold text-ink">{s.basicsTitle}</h3>
      {update.error && <ErrorNote message={update.error.message} />}
      <form onSubmit={submit}>
        <Field label={s.familyNameLabel}>
          <Input value={familyName} onChange={(e) => setFamilyName(e.target.value)} placeholder={s.familyNamePlaceholder} />
        </Field>
        <Field label={s.streetLabel}>
          <Input value={street} onChange={(e) => setStreet(e.target.value)} placeholder={s.streetPlaceholder} />
        </Field>
        <div className="flex items-center gap-3">
          <Button type="submit" loading={update.isPending} disabled={familyName.trim().length < 2}>
            {c.save}
          </Button>
          {update.isSuccess && !update.isPending && <Badge color="green">{s.saved}</Badge>}
        </div>
      </form>
    </Card>
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
    <Card className="mb-4 p-5">
      <h3 className="mb-3 font-bold text-ink">{s.dingdongTitle}</h3>

      {error && <ErrorNote message={error} />}

      {household.has_location ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Badge color="green">{s.locationSet}</Badge>
          <Button variant="secondary" size="sm" loading={busy} onClick={mark}>
            {s.setAgain}
          </Button>
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm text-sub">{s.setLocationExplain}</p>
          <Button full loading={busy} onClick={mark}>
            {s.markHere}
          </Button>
        </>
      )}

      <p className="mt-3 text-xs text-sub">{s.locationPrivacyNote}</p>
    </Card>
  )
}

// ---------- members ----------

function MembersCard({ household }: { household: Household }) {
  const s = useStrings(householdStrings)
  const c = useStrings(common)
  const confirm = useConfirm()
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

  async function remove(m: HouseholdMember) {
    if (await confirm({ title: c.remove, body: s.confirmRemove, confirmLabel: c.remove, danger: true }))
      removeMember.mutate(m.id)
  }

  return (
    <Card className="mb-4 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-bold text-ink">{s.membersTitle}</h3>
        <span className="text-sm text-sub">{household.members.length}</span>
      </div>

      {addMember.error && <ErrorNote message={addMember.error.message} />}
      {removeMember.error && <ErrorNote message={removeMember.error.message} />}

      {household.members.length === 0 && <p className="mb-2 text-sm text-sub">{s.noMembers}</p>}
      <div className="space-y-2">
        {household.members.map((m) => (
          <div key={m.id} className="flex items-center gap-3">
            <Avatar name={m.full_name} size={32} />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{m.full_name}</span>
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
        <form onSubmit={submit} className="mt-4 border-t border-line pt-4">
          <div className="mb-3">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={s.memberNamePlaceholder} />
          </div>
          <label className="mb-3 flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={elder}
              onChange={(e) => setElder(e.target.checked)}
              className="h-4 w-4 accent-black"
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

      <p className="mt-3 text-xs text-sub">{s.membersHint}</p>
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
    <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-bold text-ink">{s.historyTitle}</h3>
        {!hasHistory && <PointsBadge points={15} size="sm" />}
      </div>

      {!hasHistory && <p className="mb-3 text-sm text-sub">{s.historyEncourage}</p>}

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
    <Card className="mb-4 p-5">
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
      <p className="-mt-1 text-xs text-sub">{s.privacyFooter}</p>
    </Card>
  )
}
