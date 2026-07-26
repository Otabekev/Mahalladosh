/** Admin panel — operator console: approve/reject mahalla petitions, seed MFY list, stats (plan §13). */

import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/core/stores/auth'
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorNote,
  Field,
  Input,
  Modal,
  PageTitle,
  SegmentedTabs,
  Select,
  Spinner,
  Textarea,
} from '@/components/ui'
import {
  useAddMfy,
  useAdminPetitions,
  useAdminStats,
  useApprove,
  useBanUser,
  useDismissReport,
  useReject,
  useReports,
  useResolveReport,
} from '@/core/queries/admin'
import { useDistricts, useRegions } from '@/core/queries/onboarding'
import { useConfirm } from '@/components/confirm'
import { fmt, useStrings } from '@/core/i18n'
import { common } from '@/core/i18n/common'
import { servicesStrings } from '@/core/i18n/services'
import type { Report } from '@/core/queries/reports'

type Tab = 'petitions' | 'reports' | 'mfy' | 'stats'

// ---------- So'rovlar: pending mahalla petitions ----------

function PetitionsTab() {
  const s = useStrings(servicesStrings)
  const c = useStrings(common)
  const confirm = useConfirm()
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
              onClick={async () => {
                if (await confirm({ title: s.approve, body: s.confirmApprove, confirmLabel: s.approve })) {
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
              onClick={async () => {
                if (await confirm({ title: s.reject, body: s.confirmReject, confirmLabel: s.reject, danger: true }))
                  reject.mutate(p.mahalla.id)
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

// ---------- Shikoyatlar: moderation queue (plan §10) ----------

function BanModal({ report, onClose }: { report: Report | null; onClose: () => void }) {
  const s = useStrings(servicesStrings)
  const c = useStrings(common)
  const ban = useBanUser()
  const [reason, setReason] = useState('')

  const close = () => {
    setReason('')
    ban.reset()
    onClose()
  }

  const submit = () => {
    if (!report) return
    ban.mutate(
      { userId: report.target_id, reason: reason.trim() || null },
      { onSuccess: close },
    )
  }

  return (
    <Modal open={report !== null} onClose={close} title={s.banTitle}>
      {ban.error && <ErrorNote message={ban.error.message} />}
      <p className="text-[15px] font-bold text-ink mb-1">{report?.target_label}</p>
      <p className="text-sm text-sub mb-4">{s.banExplain}</p>
      <Field label={s.banReasonLabel}>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="ghost" onClick={close}>
          {c.cancel}
        </Button>
        <Button variant="danger" loading={ban.isPending} onClick={submit}>
          {s.banBtn}
        </Button>
      </div>
    </Modal>
  )
}

function ReportsTab() {
  const s = useStrings(servicesStrings)
  const c = useStrings(common)
  const reports = useReports()
  const resolve = useResolveReport()
  const dismiss = useDismissReport()
  const [banTarget, setBanTarget] = useState<Report | null>(null)

  if (reports.isPending) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    )
  }
  if (reports.error) return <ErrorNote message={reports.error.message} />
  if (!reports.data || reports.data.length === 0) {
    return <EmptyState icon="🛡️" title={s.reportsEmptyTitle} text={s.reportsEmptyText} />
  }

  const typeLabel = (t: string) =>
    t === 'post' ? s.rtPost : t === 'service' ? s.rtService : t === 'household' ? s.rtHousehold : s.rtUser
  const reasonLabel = (r: string) =>
    r === 'spam' ? s.reasonSpam : r === 'abuse' ? s.reasonAbuse : r === 'fake' ? s.reasonFake : s.reasonOther

  return (
    <div>
      {(resolve.error ?? dismiss.error) && (
        <ErrorNote message={(resolve.error ?? dismiss.error)?.message ?? c.error} />
      )}
      {reports.data.map((r) => (
        <Card key={r.id} className="p-4 mb-3">
          <div className="flex items-center justify-between gap-2">
            <Badge>{typeLabel(r.target_type)}</Badge>
            <span className="text-xs font-semibold text-sub">{reasonLabel(r.reason)}</span>
          </div>
          <div className="text-[15px] font-bold text-ink mt-1.5 break-words">{r.target_label || '—'}</div>
          {r.note && <p className="text-sm text-ink mt-1 whitespace-pre-wrap">{r.note}</p>}
          <div className="text-xs text-sub mt-1">{fmt(s.reportedBy, { name: r.reporter.full_name })}</div>
          <div className="flex flex-wrap gap-2 mt-3">
            <Button
              size="sm"
              className="bg-good! text-white hover:opacity-90"
              loading={resolve.isPending && resolve.variables === r.id}
              onClick={() => resolve.mutate(r.id)}
            >
              ✓ {s.reportResolve}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              loading={dismiss.isPending && dismiss.variables === r.id}
              onClick={() => dismiss.mutate(r.id)}
            >
              {s.reportDismiss}
            </Button>
            {r.target_type === 'user' && (
              <Button size="sm" variant="danger" onClick={() => setBanTarget(r)}>
                {s.banBtn}
              </Button>
            )}
          </div>
        </Card>
      ))}
      <BanModal report={banTarget} onClose={() => setBanTarget(null)} />
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
            { value: 'reports', label: s.tabReports },
            { value: 'mfy', label: s.tabMfy },
            { value: 'stats', label: s.tabStats },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>
      {tab === 'petitions' && <PetitionsTab />}
      {tab === 'reports' && <ReportsTab />}
      {tab === 'mfy' && <MfyTab />}
      {tab === 'stats' && <StatsTab />}
    </div>
  )
}
