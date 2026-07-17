/** Admin panel — operator console: approve/reject mahalla petitions, seed MFY list, stats (plan §13). */

import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/core/stores/auth'
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  ErrorNote,
  Field,
  Input,
  PageTitle,
  SegmentedTabs,
  Select,
  Spinner,
} from '@/components/ui'
import { useAddMfy, useAdminPetitions, useAdminStats, useApprove, useReject } from '@/core/queries/admin'
import { useDistricts, useRegions } from '@/core/queries/onboarding'
import { fmt, useStrings } from '@/core/i18n'
import { common } from '@/core/i18n/common'
import { servicesStrings } from '@/core/i18n/services'

type Tab = 'petitions' | 'mfy' | 'stats'

// ---------- So'rovlar: pending mahalla petitions ----------

function PetitionsTab() {
  const s = useStrings(servicesStrings)
  const c = useStrings(common)
  const petitions = useAdminPetitions()
  const approve = useApprove()
  const reject = useReject()

  if (petitions.isPending) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    )
  }
  if (petitions.error) return <ErrorNote message={petitions.error.message} />
  if (!petitions.data || petitions.data.length === 0) {
    return <EmptyState icon="✅" title={s.petitionsEmptyTitle} text={s.petitionsEmptyText} />
  }

  return (
    <div>
      {(approve.error ?? reject.error) && (
        <ErrorNote message={(approve.error ?? reject.error)?.message ?? c.error} />
      )}
      {petitions.data.map((p) => (
        <Card key={p.mahalla.id} className="p-4 mb-3">
          <div className="text-[15px] font-bold text-ink">{fmt(c.mahallaSuffix, { name: p.mahalla.name })}</div>
          <div className="text-xs text-sub mt-0.5">
            {p.district_name}, {p.region_name}
            {p.mahalla.estimated_households != null &&
              ` · ${fmt(s.householdsApprox, { n: p.mahalla.estimated_households })}`}
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {p.petitioners.map((u) => (
              <div key={u.id} className="flex items-center gap-1.5">
                <Avatar name={u.full_name} src={u.photo_url} size={24} />
                <span className="text-xs text-ink">{u.full_name}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <Button
              className="bg-good! hover:opacity-90 text-white"
              loading={approve.isPending && approve.variables === p.mahalla.id}
              onClick={() => {
                if (window.confirm(s.confirmApprove)) {
                  approve.mutate(p.mahalla.id, {
                    onSuccess: () => {
                      void useAuth.getState().refresh()
                    },
                  })
                }
              }}
            >
              {s.approve}
            </Button>
            <Button
              variant="danger"
              loading={reject.isPending && reject.variables === p.mahalla.id}
              onClick={() => {
                if (window.confirm(s.confirmReject)) reject.mutate(p.mahalla.id)
              }}
            >
              {s.reject}
            </Button>
          </div>
          <p className="text-xs text-sub mt-2">{s.approveHint}</p>
        </Card>
      ))}
    </div>
  )
}

// ---------- MFY qo'shish: seed the pre-entered MFY list ----------

function MfyTab() {
  const s = useStrings(servicesStrings)
  const c = useStrings(common)
  const regions = useRegions()
  const [regionId, setRegionId] = useState<number | ''>('')
  const districts = useDistricts(regionId === '' ? undefined : regionId)
  const [districtId, setDistrictId] = useState<number | ''>('')
  const [name, setName] = useState('')
  const [done, setDone] = useState(false)
  const addMfy = useAddMfy()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (districtId === '' || name.trim().length < 2) return
    addMfy.mutate(
      { district_id: districtId, name: name.trim() },
      {
        onSuccess: () => {
          setName('')
          setDone(true)
          window.setTimeout(() => setDone(false), 2500)
        },
      },
    )
  }

  return (
    <Card className="p-4">
      <form onSubmit={submit}>
        {addMfy.error && <ErrorNote message={addMfy.error.message} />}
        {done && (
          <div className="rounded-xl bg-good-soft text-good text-sm font-semibold px-4 py-3 mb-4">
            {s.addedOk}
          </div>
        )}
        <Field label={s.region}>
          <Select
            value={regionId}
            onChange={(e) => {
              setRegionId(e.target.value === '' ? '' : Number(e.target.value))
              setDistrictId('')
            }}
          >
            <option value="">{s.choose}</option>
            {(regions.data ?? []).map((r) => (
              <option key={r.id} value={r.id}>
                {r.name_uz}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={s.district}>
          <Select
            value={districtId}
            onChange={(e) => setDistrictId(e.target.value === '' ? '' : Number(e.target.value))}
            disabled={regionId === ''}
          >
            <option value="">{s.choose}</option>
            {(districts.data ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name_uz}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={s.mfyName}>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Yoshlik" required />
        </Field>
        <Button
          type="submit"
          full
          loading={addMfy.isPending}
          disabled={districtId === '' || name.trim().length < 2}
        >
          {c.add}
        </Button>
        <p className="text-xs text-sub mt-3">{s.mfyHint}</p>
      </form>
    </Card>
  )
}

// ---------- Statistika ----------

function StatsTab() {
  const s = useStrings(servicesStrings)
  const stats = useAdminStats()

  if (stats.isPending) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    )
  }
  if (stats.error) return <ErrorNote message={stats.error.message} />
  if (!stats.data) return null

  const items: { label: string; value: number }[] = [
    { label: s.statUsers, value: stats.data.users },
    { label: s.statActiveMahallas, value: stats.data.mahallas_active },
    { label: s.statPending, value: stats.data.mahallas_pending },
    { label: s.statForming, value: stats.data.mahallas_forming },
    { label: s.statHouseholds, value: stats.data.households },
    { label: s.statPosts, value: stats.data.posts },
  ]

  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((it) => (
        <Card key={it.label} className="p-4 text-center">
          <div className="text-2xl font-extrabold text-ink">{it.value}</div>
          <div className="text-xs text-sub mt-1">{it.label}</div>
        </Card>
      ))}
    </div>
  )
}

// ---------- screen ----------

export default function AdminScreen() {
  const s = useStrings(servicesStrings)
  const me = useAuth((state) => state.me)
  const [tab, setTab] = useState<Tab>('petitions')

  if (!me?.user.is_admin) return <Navigate to="/app" replace />

  return (
    <div>
      <PageTitle title={s.adminTitle} subtitle={s.adminSubtitle} />
      <div className="mb-4">
        <SegmentedTabs<Tab>
          tabs={[
            { value: 'petitions', label: s.tabPetitions },
            { value: 'mfy', label: s.tabMfy },
            { value: 'stats', label: s.tabStats },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>
      {tab === 'petitions' && <PetitionsTab />}
      {tab === 'mfy' && <MfyTab />}
      {tab === 'stats' && <StatsTab />}
    </div>
  )
}
