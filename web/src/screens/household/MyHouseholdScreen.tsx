/** My household (xonadon) page — the family page, core differentiator (plan §9-B).
 * CASE A: no household yet → warm 20-second create form.
 * CASE B: manage members, family history (the moat) and privacy. */

import { useState, type FormEvent } from 'react'
import { useAuth } from '@/core/stores/auth'
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
  useAddMember,
  useCreateHousehold,
  useHousehold,
  useRemoveMember,
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
      <PageTitle title="Xonadoningiz" />

      <Card className="p-5 mb-4 text-center">
        <div className="text-4xl mb-2">🏠</div>
        <p className="text-sm text-ink">
          Xonadoningizni yarating — faqat familiya va nechta kishi yashashini kiriting. Qolganini
          xohlasangiz keyin to'ldirasiz.
        </p>
      </Card>

      <Card className="p-5">
        {create.error && <ErrorNote message={create.error.message} />}
        <form onSubmit={submit}>
          <Field label="Oila familiyasi">
            <Input
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              placeholder="Rustamovlar"
            />
          </Field>
          <Field label="Nechta kishi yashaydi?">
            <Input
              type="number"
              min={1}
              value={residents}
              onChange={(e) => setResidents(e.target.value)}
              placeholder="4"
            />
          </Field>
          <Field label="Ko'cha (shart emas)">
            <Input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Guliston ko'chasi" />
          </Field>
          <Button type="submit" full loading={create.isPending} disabled={!canSubmit}>
            Yaratish
          </Button>
          <p className="text-xs text-sub mt-3 text-center">
            Mahalla lentasida qo'shnilarga e'lon qilinadi 👋
          </p>
        </form>
      </Card>
    </div>
  )
}

// ---------- CASE B: my household ----------

function MyHouseholdView({ id }: { id: number }) {
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
        <PageTitle title="Xonadoningiz" />
        <ErrorNote message={query.error.message} />
      </div>
    )
  }
  if (!query.data) return null
  const household = query.data
  const verified = household.verification_status === 'verified'

  return (
    <div>
      <PageTitle title="Xonadoningiz" />

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
        {!verified && (
          <p className="text-xs text-sub mt-2">
            Qo'shnilaringiz sahifangizga kirib kafolat berishi mumkin.
          </p>
        )}
      </Card>

      <MembersCard household={household} />
      <HistoryCard household={household} />
      <PrivacyCard household={household} />
    </div>
  )
}

// ---------- members ----------

function MembersCard({ household }: { household: Household }) {
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
    if (window.confirm("O'chirilsinmi?")) removeMember.mutate(m.id)
  }

  return (
    <Card className="p-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-ink">Oila a'zolari</h3>
        <span className="text-sm text-sub">{household.members.length}</span>
      </div>

      {addMember.error && <ErrorNote message={addMember.error.message} />}
      {removeMember.error && <ErrorNote message={removeMember.error.message} />}

      {household.members.length === 0 && (
        <p className="text-sm text-sub mb-2">Hali a'zo qo'shilmagan.</p>
      )}
      <div className="space-y-2">
        {household.members.map((m) => (
          <div key={m.id} className="flex items-center gap-3">
            <Avatar name={m.full_name} size={32} />
            <span className="text-sm font-semibold text-ink flex-1 min-w-0 truncate">
              {m.full_name}
            </span>
            {m.is_elder && <Badge color="gold">Otaxon/Onaxon</Badge>}
            <Button
              variant="ghost"
              size="sm"
              aria-label="O'chirish"
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
              placeholder="Ismi va familiyasi"
            />
          </div>
          <label className="flex items-center gap-2 mb-3 text-sm text-ink">
            <input
              type="checkbox"
              checked={elder}
              onChange={(e) => setElder(e.target.checked)}
              className="w-4 h-4 accent-black"
            />
            Keksa avlod vakili
          </label>
          <div className="flex gap-2">
            <Button type="submit" size="sm" loading={addMember.isPending} disabled={name.trim().length < 2}>
              Qo'shish
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Bekor qilish
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-4">
          <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
            + A'zo qo'shish
          </Button>
        </div>
      )}

      <p className="text-xs text-sub mt-3">
        Telefoni yo'q keksalarni ham yozing — ular ham mahalla xotirasining bir qismi.
      </p>
    </Card>
  )
}

// ---------- family history (the moat) ----------

function HistoryCard({ household }: { household: Household }) {
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
        <h3 className="font-bold text-ink">📖 Oila tarixi</h3>
        {!hasHistory && <PointsBadge points={15} size="sm" />}
      </div>

      {!hasHistory && (
        <p className="text-sm text-sub mb-3">
          Keksalar xotirasi — mahallaning boyligi. Yozib qoldiring (+15 ball).
        </p>
      )}

      {update.error && <ErrorNote message={update.error.message} />}

      <form onSubmit={submit}>
        <Field label="Necha avloddan beri shu yerda yashaysiz?">
          <Input
            type="number"
            min={1}
            value={generations}
            onChange={(e) => setGenerations(e.target.value)}
            placeholder="3"
          />
        </Field>
        <Field label="Tarix">
          <Textarea
            rows={5}
            value={history}
            onChange={(e) => setHistory(e.target.value)}
            placeholder="Bobolaringiz qachon kelgan? Ko'chada kimlar yashagan? Keksalardan so'rab yozing..."
          />
        </Field>
        <div className="flex items-center gap-3">
          <Button type="submit" loading={update.isPending}>
            Saqlash
          </Button>
          {update.isSuccess && !update.isPending && <Badge color="green">✓ Saqlandi</Badge>}
        </div>
      </form>
    </div>
  )
}

// ---------- privacy ----------

function PrivacyCard({ household }: { household: Household }) {
  const update = useUpdateHousehold(household.id)

  return (
    <Card className="p-5 mb-4">
      {update.error && <ErrorNote message={update.error.message} />}
      <Field label="Kim ko'ra oladi?">
        <Select
          value={household.visibility}
          disabled={update.isPending}
          onChange={(e) => update.mutate({ visibility: e.target.value as HouseholdVisibility })}
        >
          <option value="neighbors">Tasdiqlangan qo'shnilar</option>
          <option value="family_only">Faqat oilamiz</option>
        </Select>
      </Field>
      <p className="text-xs text-sub -mt-1">
        Ma'lumotlaringiz faqat mahalla ichida. Hech qanday davlat tizimiga berilmaydi.
      </p>
    </Card>
  )
}
