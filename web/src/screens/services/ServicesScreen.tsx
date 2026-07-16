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
  Spinner,
  Textarea,
} from '@/components/ui'
import {
  useCreateService,
  useDeleteService,
  useMyServices,
  useServices,
  useUpdateService,
} from '@/core/queries/services'
import type { Service, ServiceCategory } from '@/core/api/types'

const CATEGORIES: { value: ServiceCategory; label: string; emoji: string }[] = [
  { value: 'food', label: 'Oziq-ovqat', emoji: '🥚' },
  { value: 'goods', label: 'Buyumlar', emoji: '📦' },
  { value: 'rental', label: 'Ijara', emoji: '🔧' },
  { value: 'service', label: 'Xizmat', emoji: '🛠' },
  { value: 'skill', label: 'Hunar', emoji: '🎨' },
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
  const [copied, setCopied] = useState(false)
  const trimmed = contact.trim()

  if (/^[+\d]/.test(trimmed)) {
    return (
      <a
        href={`tel:${trimmed.replace(/[^+\d]/g, '')}`}
        className="inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all bg-white text-ink border border-line hover:bg-gray-50 active:scale-[0.98] px-3 py-1.5 text-sm"
      >
        {"📞 Bog'lanish"}
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
      {copied ? 'Nusxalandi ✓' : "📞 Bog'lanish"}
    </Button>
  )
}

// ---------- directory card ----------

function ServiceCard({ service }: { service: Service }) {
  const meta = categoryMeta(service.category)
  return (
    <Card className="p-4 mb-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[15px] font-bold text-ink line-clamp-2 min-w-0">{service.title}</h3>
        {meta && (
          <span className="shrink-0">
            <Badge>
              {meta.emoji} {meta.label}
            </Badge>
          </span>
        )}
      </div>
      <div className="text-xs text-sub mt-0.5">{service.household_name} xonadoni</div>
      {service.description && <p className="text-sm text-ink mt-2 line-clamp-3">{service.description}</p>}
      {(service.price || service.contact) && (
        <div className="flex items-center justify-between gap-2 mt-3">
          <span className="font-semibold text-good text-sm">{service.price ?? ''}</span>
          {service.contact && <ContactButton contact={service.contact} />}
        </div>
      )}
    </Card>
  )
}

// ---------- my services row: hide/show + delete ----------

function MyServiceRow({ service }: { service: Service }) {
  const update = useUpdateService(service.id)
  const del = useDeleteService()
  const meta = categoryMeta(service.category)
  return (
    <div className="flex items-center justify-between gap-2 py-3">
      <div className={`flex-1 min-w-0 text-sm font-semibold truncate ${service.active ? 'text-ink' : 'text-sub'}`}>
        {meta?.emoji} {service.title}
        {!service.active && <span className="text-xs font-normal text-sub"> · yashirin</span>}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          size="sm"
          variant="ghost"
          loading={update.isPending}
          onClick={() => update.mutate({ active: !service.active })}
        >
          {service.active ? 'Yashirish' : "Ko'rsatish"}
        </Button>
        <button
          aria-label="O'chirish"
          className="w-11 h-11 -my-2 -mr-2 flex items-center justify-center text-sub hover:text-danger text-xl leading-none"
          onClick={() => {
            if (window.confirm("Bu xizmat o'chirilsinmi?")) del.mutate(service.id)
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
    <Modal open={open} onClose={onClose} title="Xizmat qo'shish">
      <form onSubmit={submit}>
        {create.error && <ErrorNote message={create.error.message} />}
        <Field label="Nomi">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Uy tuxumi" required />
        </Field>
        <Field label="Turi">
          <Select value={category} onChange={(e) => setCategory(e.target.value as ServiceCategory)}>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.emoji} {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Tavsif (shart emas)">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Field label="Narx (shart emas)">
          <Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="10 000 so'm / dona" />
        </Field>
        <Field label="Telefon (shart emas)">
          <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="+998 90 123 45 67" />
        </Field>
        <Button type="submit" full loading={create.isPending} disabled={title.trim().length < 2}>
          {"Qo'shish"}
        </Button>
      </form>
    </Modal>
  )
}

// ---------- screen ----------

export default function ServicesScreen() {
  const me = useAuth((s) => s.me)
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
        title="Xizmatlar"
        subtitle="Qo'shnilar nima taklif qiladi"
        action={
          <Button size="sm" onClick={openAdd}>
            {"+ Qo'shish"}
          </Button>
        }
      />

      {mine.data && mine.data.length > 0 && (
        <div className="mb-4">
          <h2 className="text-[15px] font-bold text-ink mb-2">Mening xizmatlarim</h2>
          <Card className="px-4 divide-y divide-line">
            {mine.data.map((s) => (
              <MyServiceRow key={s.id} service={s} />
            ))}
          </Card>
        </div>
      )}

      <div className="no-scrollbar overflow-x-auto flex gap-2 mb-4 -mx-4 px-4">
        <Chip active={category === 'all'} onClick={() => setCategory('all')}>
          Hammasi
        </Chip>
        {CATEGORIES.map((c) => (
          <Chip key={c.value} active={category === c.value} onClick={() => setCategory(c.value)}>
            {c.emoji} {c.label}
          </Chip>
        ))}
      </div>

      {services.isPending && (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      )}
      {services.error && <ErrorNote message={services.error.message} />}
      {services.data && services.data.length === 0 && (
        <EmptyState
          icon="🧺"
          title="Hozircha xizmatlar yo'q"
          text="Tuxum sotasizmi? Asbob ijaraga berasizmi? Birinchi bo'lib qo'shing!"
        />
      )}
      {services.data?.map((s) => (
        <ServiceCard key={s.id} service={s} />
      ))}

      <CreateServiceModal open={createOpen} onClose={() => setCreateOpen(false)} />

      <Modal open={noHouseholdOpen} onClose={() => setNoHouseholdOpen(false)} title="Xonadon kerak">
        <p className="text-sm text-ink mb-4">{"Xizmat qo'shish uchun avval xonadoningizni yarating"}</p>
        <Button full onClick={() => navigate('/app/household')}>
          Xonadon yaratish
        </Button>
      </Modal>
    </div>
  )
}
