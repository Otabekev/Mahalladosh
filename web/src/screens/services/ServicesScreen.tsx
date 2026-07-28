/** Xizmatlar — neighbor services directory. Discovery only: contact, no booking (plan §9-G). */

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
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
  MultiImagePicker,
  PageTitle,
  Select,
  RowSkeleton,
  SkeletonList,
  Textarea,
} from '@/components/ui'
import { Lightbox } from '@/components/Lightbox'
import {
  useCreateService,
  useMyServiceStats,
  useRecordContact,
  useRecordViews,
  type ServiceStats,
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

/** Mirrors SERVICE_PHOTO_CAP in api/app/schemas.py — a 2x2 grid on the card. */
const SERVICE_PHOTO_MAX = 4

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

function ContactButton({ contact, serviceId }: { contact: string; serviceId: number }) {
  const s = useStrings(servicesStrings)
  const record = useRecordContact()
  const [copied, setCopied] = useState(false)
  const trimmed = contact.trim()
  // fire-and-forget: a failed count must never interrupt someone placing a call
  const tapped = () => record.mutate(serviceId)

  if (/^[+\d]/.test(trimmed)) {
    return (
      <a
        onClick={tapped}
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
        tapped()
        navigator.clipboard.writeText(trimmed).catch(() => undefined)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1500)
      }}
    >
      {copied ? s.copied : s.contact}
    </Button>
  )
}

/** Report an offering as SEEN once its card is genuinely on screen.
 *
 *  A listing that returned twenty offerings nobody scrolled to is not twenty views,
 *  so this observes the card rather than counting what the API served. Ids are
 *  collected and flushed as one batch: a request per card would be a request per
 *  scroll on a village connection. The server dedupes per person per day anyway,
 *  so a repeat flush is harmless.
 */
function useViewReporter() {
  const record = useRecordViews()
  const pending = useRef<Set<number>>(new Set())
  const timer = useRef<number | null>(null)

  const flush = useCallback(() => {
    const ids = [...pending.current].slice(0, 20)
    pending.current.clear()
    if (ids.length) record.mutate(ids)
  }, [record])

  useEffect(() => () => {
    if (timer.current != null) window.clearTimeout(timer.current)
  }, [])

  return useCallback(
    (id: number) => {
      pending.current.add(id)
      if (timer.current != null) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(flush, 1200)
    },
    [flush],
  )
}

/** Calls `onSeen` once, when at least half the card has been on screen. */
function useSeen(id: number, onSeen: (id: number) => void) {
  const ref = useRef<HTMLDivElement | null>(null)
  const fired = useRef(false)
  useEffect(() => {
    const el = ref.current
    if (!el || fired.current || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !fired.current) {
          fired.current = true
          onSeen(id)
          io.disconnect()
        }
      },
      { threshold: 0.5 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [id, onSeen])
  return ref
}

// ---------- directory card ----------

/** Photos of the work — the thing that turns a line of text into a reason to call.
 *  A single photo gets the full width; several tile, and any of them opens the
 *  shared fullscreen Lightbox. */
function ServicePhotos({ urls, title }: { urls: string[]; title: string }) {
  const [at, setAt] = useState<number | null>(null)
  if (urls.length === 0) return null
  return (
    <>
      <div className={`mt-3 grid gap-1.5 ${urls.length === 1 ? 'grid-cols-1' : 'grid-cols-3'}`}>
        {urls.map((url, i) => (
          <button
            key={url}
            type="button"
            onClick={() => setAt(i)}
            aria-label={title}
            className={`overflow-hidden rounded-xl border border-line ${
              urls.length === 1 ? 'aspect-[16/10]' : 'aspect-square'
            }`}
          >
            <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
      {at !== null && <Lightbox images={urls} startIndex={at} onClose={() => setAt(null)} />}
    </>
  )
}

function ServiceCard({ service, onSeen }: { service: Service; onSeen: (id: number) => void }) {
  const s = useStrings(servicesStrings)
  const myHouseholdId = useAuth((st) => st.me?.user.household_id ?? null)
  const [reportOpen, setReportOpen] = useState(false)
  const meta = categoryMeta(service.category)
  // you don't report your own household's listing
  const canReport = myHouseholdId === null || service.household_id !== myHouseholdId
  // a plain wrapper carries the observer ref — Card is used everywhere and does not
  // need forwardRef for one screen's telemetry
  const seenRef = useSeen(service.id, onSeen)
  return (
    <div ref={seenRef}>
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
      <ServicePhotos urls={service.image_urls} title={service.title} />
      {service.description && <p className="text-sm text-ink mt-2 line-clamp-3">{service.description}</p>}
      {(service.price || service.contact) && (
        <div className="flex items-center justify-between gap-2 mt-3">
          <span className="font-semibold text-good text-sm">{service.price ?? ''}</span>
          {service.contact && <ContactButton contact={service.contact} serviceId={service.id} />}
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
    </div>
  )
}

// ---------- my services row: hide/show + delete ----------

/** The owner's photo editor. Photos are saved as a whole set, so this is just the
 *  picker plus Save — removing one is saving without it, and no photo endpoint of
 *  its own is needed. */
function EditPhotosModal({
  service,
  open,
  onClose,
}: {
  service: Service
  open: boolean
  onClose: () => void
}) {
  const s = useStrings(servicesStrings)
  const c = useStrings(common)
  const update = useUpdateService(service.id)
  const [photos, setPhotos] = useState<string[]>(service.image_urls)

  // reopening after a save elsewhere should show what the server has
  useEffect(() => {
    if (open) setPhotos(service.image_urls)
  }, [open, service.image_urls])

  return (
    <Modal open={open} onClose={onClose} title={s.editPhotosTitle}>
      {update.error && <ErrorNote message={update.error.message} />}
      <p className="mb-3 text-sm text-sub">{s.photosHint}</p>
      <MultiImagePicker value={photos} onChange={setPhotos} max={SERVICE_PHOTO_MAX} />
      <Button
        full
        loading={update.isPending}
        onClick={() => update.mutate({ image_urls: photos }, { onSuccess: onClose })}
      >
        {c.save}
      </Button>
    </Modal>
  )
}

function MyServiceRow({ service, stats }: { service: Service; stats?: ServiceStats }) {
  const s = useStrings(servicesStrings)
  const c = useStrings(common)
  const confirm = useConfirm()
  const update = useUpdateService(service.id)
  const del = useDeleteService()
  const meta = categoryMeta(service.category)
  const [photosOpen, setPhotosOpen] = useState(false)
  return (
    <div className="flex items-center justify-between gap-2 py-3">
      <div className={`flex-1 min-w-0 text-sm font-semibold truncate ${service.active ? 'text-ink' : 'text-sub'}`}>
        {meta?.emoji} {service.title}
        {!service.active && <span className="text-xs font-normal text-sub"> · {s.hiddenTag}</span>}
        <span className="block text-xs font-normal text-sub">
          {fmt(s.photoCount, { n: service.image_urls.length })}
          {stats && (
            <>
              {' · '}
              {stats.views} {s.svcStatsViews}
              {' · '}
              {stats.contacts} {s.svcStatsContacts}
            </>
          )}
        </span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button size="sm" variant="ghost" onClick={() => setPhotosOpen(true)}>
          📷 {s.editPhotos}
        </Button>
        <EditPhotosModal service={service} open={photosOpen} onClose={() => setPhotosOpen(false)} />
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
  const [photos, setPhotos] = useState<string[]>([])

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
        image_urls: photos,
      },
      {
        onSuccess: () => {
          setTitle('')
          setCategory('food')
          setDescription('')
          setPrice('')
          setContact('')
          setPhotos([])
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
        <Field label={s.fieldPhotos} hint={s.photosHint}>
          <MultiImagePicker value={photos} onChange={setPhotos} max={SERVICE_PHOTO_MAX} />
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
  const stats = useMyServiceStats()
  const statsById = new Map((stats.data ?? []).map((r) => [r.service_id, r]))
  const reportSeen = useViewReporter()

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
              <MyServiceRow key={sv.id} service={sv} stats={statsById.get(sv.id)} />
            ))}
          </Card>
          <p className="mt-1.5 text-xs text-sub">{s.svcStatsHint}</p>
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
        <ServiceCard key={sv.id} service={sv} onSeen={reportSeen} />
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
