/** Mahalla contacts — the important-numbers page (roadmap #17 / raisi tool #2).
 *  Everyone sees a tappable list; the raisi gets add / edit / delete. Elder-first:
 *  big Call buttons that open the dialer, plain labels, one number per card. */

import { useState } from 'react'
import { useBack } from '@/components/useBack'
import {
  Button,
  Card,
  EmptyState,
  ErrorNote,
  Field,
  Input,
  Modal,
  PageTitle,
  RowSkeleton,
  SkeletonList,
} from '@/components/ui'
import { useConfirm } from '@/components/confirm'
import { useStrings } from '@/core/i18n'
import { common } from '@/core/i18n/common'
import { contactsStrings } from '@/core/i18n/contacts'
import { useAuth } from '@/core/stores/auth'
import {
  useAddContact,
  useContacts,
  useDeleteContact,
  useEditContact,
  type Contact,
} from '@/core/queries/contacts'

function PhoneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.6a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.5-1.2a2 2 0 0 1 2.1-.5c.8.3 1.7.6 2.6.7a2 2 0 0 1 1.7 2z" />
    </svg>
  )
}

function ContactCard({
  contact,
  isRaisi,
  onEdit,
  onDelete,
}: {
  contact: Contact
  isRaisi: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const s = useStrings(contactsStrings)
  const c = useStrings(common)
  const tel = `tel:${contact.phone.replace(/\s+/g, '')}`

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[16px] font-bold text-ink">{contact.label}</div>
          {contact.name && <div className="text-sm text-sub">{contact.name}</div>}
          <div className="mt-0.5 text-[15px] text-ink">{contact.phone}</div>
        </div>
        <a
          href={tel}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-accent px-4 py-3 text-[15px] font-semibold text-white active:scale-[0.98]"
        >
          <PhoneIcon /> {s.call}
        </a>
      </div>
      {isRaisi && (
        <div className="mt-2.5 flex gap-4 border-t border-line pt-2.5 text-[14px] font-semibold">
          <button onClick={onEdit} className="text-sub hover:text-ink">
            {c.edit}
          </button>
          <button onClick={onDelete} className="text-danger">
            {c.remove}
          </button>
        </div>
      )}
    </Card>
  )
}

function ContactForm({ initial, onClose }: { initial: Contact | null; onClose: () => void }) {
  const s = useStrings(contactsStrings)
  const c = useStrings(common)
  const add = useAddContact()
  const edit = useEditContact()
  const [label, setLabel] = useState(initial?.label ?? '')
  const [name, setName] = useState(initial?.name ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')

  const busy = add.isPending || edit.isPending
  const valid = label.trim().length > 0 && phone.trim().length >= 3
  const error = add.error || edit.error

  const submit = () => {
    const body = { label: label.trim(), name: name.trim() || null, phone: phone.trim() }
    if (initial) edit.mutate({ id: initial.id, body }, { onSuccess: onClose })
    else add.mutate(body, { onSuccess: onClose })
  }

  return (
    <Modal open onClose={onClose} title={initial ? c.edit : s.add}>
      {error && <ErrorNote message={error.message} />}
      <div className="space-y-3">
        <Field label={s.label}>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={60} />
        </Field>
        <Field label={s.name}>
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
        </Field>
        <Field label={s.phone}>
          <Input value={phone} inputMode="tel" onChange={(e) => setPhone(e.target.value)} maxLength={40} />
        </Field>
        <Button full loading={busy} disabled={!valid} onClick={submit}>
          {c.save}
        </Button>
      </div>
    </Modal>
  )
}

export default function ContactsScreen() {
  const back = useBack()
  const s = useStrings(contactsStrings)
  const c = useStrings(common)
  const me = useAuth((st) => st.me)
  const isRaisi = me?.user.is_raisi ?? false
  const mahallaId = me?.mahalla?.id
  const { data, isLoading, error } = useContacts(mahallaId)
  const confirm = useConfirm()
  const del = useDeleteContact()

  // null = closed; 'new' = add form; a Contact = edit that one
  const [editing, setEditing] = useState<Contact | 'new' | null>(null)

  const remove = async (contact: Contact) => {
    if (await confirm({ title: contact.label, body: s.deleteConfirm, confirmLabel: c.remove, danger: true }))
      del.mutate(contact.id)
  }

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-3" onClick={back}>
        ← {c.back}
      </Button>

      <PageTitle
        title={s.title}
        subtitle={s.subtitle}
        action={
          isRaisi ? (
            <Button size="sm" onClick={() => setEditing('new')}>
              {s.add}
            </Button>
          ) : undefined
        }
      />

      {isLoading && (
        <SkeletonList count={4}>
          <RowSkeleton />
        </SkeletonList>
      )}
      {error && <ErrorNote message={error.message} />}

      {data && data.length === 0 && (
        <EmptyState
          icon="📞"
          title={s.emptyTitle}
          text={isRaisi ? s.emptyRaisi : undefined}
          action={
            isRaisi ? <Button onClick={() => setEditing('new')}>{s.add}</Button> : undefined
          }
        />
      )}

      <div className="space-y-2.5">
        {data?.map((contact) => (
          <ContactCard
            key={contact.id}
            contact={contact}
            isRaisi={isRaisi}
            onEdit={() => setEditing(contact)}
            onDelete={() => remove(contact)}
          />
        ))}
      </div>

      {editing !== null && (
        <ContactForm initial={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}
