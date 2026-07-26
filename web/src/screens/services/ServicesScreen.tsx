/** Xizmatlar — neighbor services directory. Discovery only: contact, no booking (plan §9-G). */

import { useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/core/stores/auth'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorNote,
  Field,
  Input,
  Modal,
  PageTitle,
  Select,
  RowSkeleton,
  SkeletonList,
  Textarea,
} from '@/components/ui'
import {
  useCreateService,
  useDeleteService,
  useMyServices,
  useServices,
  useUpdateService,
} from '@/core/queries/services'
import { useReport, type ReportReason } from '@/core/queries/reports'
import { useConfirm } from '@/components/confirm'
import { fmt, useStrings } from '@/core/i18n'
import { common } from '@/core/i18n/common'
import { servicesStrings } from '@/core/i18n/services'
import type { Service, ServiceCategory } from '@/core/api/types'

type SvcKey = keyof typeof servicesStrings

const REPORT_REASONS: { value: ReportReason; key: SvcKey }[] = [
  { value: 'spam', key: 'reasonSpam' },
  { value: 'abuse', key: 'reasonAbuse' },
  { value: 'fake', key: 'reasonFake' },
  { value: 'other', key: 'reasonOther' },
]

/** Report an offering — reason radios + optional note. Not shown on your own. */
function ReportServiceModal({
  open,
  onClose,
  serviceId,
}: {
  open: boolean
  onClose: () => void
  serviceId: number
}) {
  const s = useStrings(servicesStrings)
  const c = useStrings(common)
  const report = useReport()
  const [reason, setReason] = useState<ReportReason>('spam')
  const [note, setNote] = useState('')
  const [sent, setSent] = useState(false)

  const close = () => {
    setSent(false)
    setReason('spam')
    setNote('')
    report.reset()
    onClose()
  }

  const submit = () => {
    report.mutate(
      { target_type: 'service', target_id: serviceId, reason, note: note.trim() || null },
      { onSuccess: () => setSent(true) },
    )
  }

  return (
    <Modal open={open} onClose={close} title={s.reportTitle}>
      {sent ? (
        <div>
          <div className="rounded-xl bg-good-soft text-good text-sm font-semibold px-4 py-3 mb-4">
            {s.reportSent}
          </div>
          <Button full onClick={close}>
            {c.close}
          </Button>
        </div>
      ) : (
        <>
          {report.error && <ErrorNote message={report.error.message} />}
          <div className="mb-4">
            <span className="block text-sm font-semibold text-ink mb-2">{s.reportReasonHeading}</span>
            <div className="flex flex-col gap-2">
              {REPORT_REASONS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setReason(r.value)}
                  className={`w-full flex items-center gap-3 p-3 text-left rounded-xl border bg-card ${
                    reason === r.value ? 'border-brand ring-2 ring-brand/30' : 'border-line'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full border-2 shrink-0 ${
                      reason === r.value ? 'border-brand bg-brand' : 'border-line'
                    }`}
                  />
                  <span className="text-sm font-semibold text-ink">{s[r.key]}</span>
                </button>
              ))}
            </div>
          </div>
          <Field label={s.reportNoteLabel}>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={s.reportNotePh}
              maxLength={300}
            />
          </Field>
          <Button full onClick={submit} loading={report.isPending}>
            {s.reportSend}
          </Button>
        </>
      )}
    </Modal>
  )
}

const CATEGORIES: { value: ServiceCategory; key: keyof typeof servicesStrings; emoji: string }[] = [
  { value: 'food', key: 'catFood', emoji: '🥚' },
  { value: 'goods', key: 'catGoods', emoji: '📦' },
  { value: 'rental', key: 'catRental', emoji: '🔧' },
  { value: 'service', key: 'catService', emoji: '🛠' },
  { value: 'skill', key: 'catSkill', emoji: '🎨' },
]

function categoryMeta(cat: string) {
  return CATEGORIES.find((c) => c.value === cat)
}

// ---------- category chips (same style as feed) ----------

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold transition ${
        active ? 'bg-brand text-white' : 'bg-card border border-line text-sub hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}

// ---------- contact button: tel: link for phones, clipboard copy otherwise ----------

function ContactButton({ contact }: { contact: string }) {
  const s = useStrings(servicesStrings)
  const [copied, setCopied] = useState(false)
  const trimmed = contact.trim()

  if (/^[+\d]/.test(trimmed)) {
    return (
      <a
        href={`tel:${trimmed.replace(/[^+\d]/g, '')}`}
        className="inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all bg-white text-ink border border-line hover:bg-gray-50 active:scale-[0.98] px-3 py-1.5 text-sm"
      >
        {s.contact}
      </a>
    )
  }
  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={() => {
        navigator.clipboard.writeText(trimmed).catch(() => undefined)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1500)
      }}
    >
      {copied ? s.copied : s.contact}
    </Button>
  )
}

// ---------- directory card ----------

function ServiceCard({ service }: { service: Service }) {
  const s = useStrings(servicesStrings)
  const myHouseholdId = useAuth((st) => st.me?.user.household_id ?? null)
  const [reportOpen, setReportOpen] = useState(false)
  const meta = categoryMeta(service.category)
  // you don't report your own household's listing
  const canReport = myHouseholdId === null || service.household_id !== myHouseholdId
  return (
    <Card className="p-4 mb-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[15px] font-bold text-ink line-clamp-2 min-w-0">{service.title}</h3>
        {meta && (
          <span className="shrink-0">
            <Badge>
              {meta.emoji} {s[meta.key]}
            </Badge>
          </span>
        )}
      </div>
      <div className="text-xs text-sub mt-0.5">{fmt(s.householdSuffix, { name: service.household_name })}</div>
      {service.description && <p className="text-sm text-ink mt-2 line-clamp-3">{service.description}</p>}
      {(service.price || service.contact) && (
        <div className="flex items-center justify-between gap-2 mt-3">
          <span className="font-semibold text-good text-sm">{service.price ?? ''}</span>
          {service.contact && <ContactButton contact={service.contact} />}
        </div>
      )}
      {canReport && (
        <div className="flex justify-end mt-2 -mb-1">
          <button
            onClick={() => setReportOpen(true)}
            className="text-xs text-sub hover:text-danger inline-flex items-center gap-1"
          >
            ⚑ {s.reportBtn}
          </button>
        </div>
      )}
      <ReportServiceModal open={reportOpen} onClose={() => setReportOpen(false)} serviceId={service.id} />
    </Card>
  )
}

// ---------- my services row: hide/show + delete ----------

function MyServiceRow({ service }: { service: Service }) {
  const s = useStrings(servicesStrings)
  const c = useStrings(common)
  const confirm = useConfirm()
  const update = useUpdateService(service.id)
  const del = useDeleteService()
  const meta = categoryMeta(service.category)
  return (
    <div className="flex items-center justify-between gap-2 py-3">
      <div className={`flex-1 min-w-0 text-sm font-semibold truncate ${service.active ? 'text-ink' : 'text-sub'}`}>
        {meta?.emoji} {service.title}
        {!service.active && <span className="text-xs font-normal text-sub"> · {s.hiddenTag}</span>}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          size="sm"
          variant="ghost"
          loading={update.isPending}
          onClick={() => update.mutate({ active: !service.active })}
        >
          {service.active ? s.hide : s.show}
        </Button>
        <button
          aria-label={c.remove}
          className="w-11 h-11 -my-2 -mr-2 flex items-center justify-center text-sub hover:text-danger text-xl leading-none"
          onClick={async () => {
            if (await confirm({ title: c.remove, body: s.confirmDeleteService, confirmLabel: c.remove, danger: true }))
              del.mutate(service.id)
          }}
        >
          ×
        </button>
      </div>
    </div>
  )
}

// ---------- create form modal ----------

function CreateServiceModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useStrings(servicesStrings)
  const c = useStrings(common)
  const create = useCreateService()
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<ServiceCategory>('food')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [contact, setContact] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (title.trim().length < 2) return
    create.mutate(
      {
        title: title.trim(),
        category,
        description: description.trim() || null,
        price: price.trim() || null,
        contact: contact.trim() || null,
      },
      {
        onSuccess: () => {
          setTitle('')
          setCategory('food')
          setDescription('')
          setPrice('')
          setContact('')
          onClose()
        },
      },
    )
  }

  return (
    <Modal open={open} onClose={onClose} title={s.addServiceTitle}>
      <form onSubmit={submit}>
        {create.error && <ErrorNote message={create.error.message} />}
        <Field label={s.fieldName}>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={s.phTitle} required />
        </Field>
        <Field label={s.fieldType}>
          <Select value={category} onChange={(e) => setCategory(e.target.value as ServiceCategory)}>
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.emoji} {s[cat.key]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={s.fieldDesc}>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Field label={s.fieldPrice}>
          <Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder={s.phPrice} />
        </Field>
        <Field label={s.fieldPhone}>
          <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="+998 90 123 45 67" />
        </Field>
        <Button type="submit" full loading={create.isPending} disabled={title.trim().length < 2}>
          {c.add}
        </Button>
      </form>
    </Modal>
  )
}

// ---------- screen ----------

export default function ServicesScreen() {
  const s = useStrings(servicesStrings)
  const c = useStrings(common)
  const me = useAuth((state) => state.me)
  const navigate = useNavigate()
  const [category, setCategory] = useState<ServiceCategory | 'all'>('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [noHouseholdOpen, setNoHouseholdOpen] = useState(false)

  const services = useServices(category === 'all' ? undefined : category)
  const mine = useMyServices()

  const openAdd = () => {
    if (!me?.user.household_id) setNoHouseholdOpen(true)
    else setCreateOpen(true)
  }

  return (
    <div>
      <PageTitle
        title={c.navServices}
        subtitle={s.svcSubtitle}
        action={
          <Button size="sm" onClick={openAdd}>
            {s.addBtn}
          </Button>
        }
      />

      {mine.data && mine.data.length > 0 && (
        <div className="mb-4">
          <h2 className="text-[15px] font-bold text-ink mb-2">{s.myServices}</h2>
          <Card className="px-4 divide-y divide-line">
            {mine.data.map((sv) => (
              <MyServiceRow key={sv.id} service={sv} />
            ))}
          </Card>
        </div>
      )}

      <div className="no-scrollbar overflow-x-auto flex gap-2 mb-4 -mx-4 px-4">
        <Chip active={category === 'all'} onClick={() => setCategory('all')}>
          {s.allChip}
        </Chip>
        {CATEGORIES.map((cat) => (
          <Chip key={cat.value} active={category === cat.value} onClick={() => setCategory(cat.value)}>
            {cat.emoji} {s[cat.key]}
          </Chip>
        ))}
      </div>

      {services.isPending && (
        <SkeletonList count={4}>
          <RowSkeleton />
        </SkeletonList>
      )}
      {services.error && <ErrorNote message={services.error.message} />}
      {services.data && services.data.length === 0 && (
        <EmptyState icon="🧺" title={s.svcEmptyTitle} text={s.svcEmptyText} />
      )}
      {services.data?.map((sv) => (
        <ServiceCard key={sv.id} service={sv} />
      ))}

      <CreateServiceModal open={createOpen} onClose={() => setCreateOpen(false)} />

      <Modal open={noHouseholdOpen} onClose={() => setNoHouseholdOpen(false)} title={s.needHouseholdTitle}>
        <p className="text-sm text-ink mb-4">{s.needHouseholdText}</p>
        <Button full onClick={() => navigate('/app/household')}>
          {s.createHousehold}
        </Button>
      </Modal>
    </div>
  )
}
