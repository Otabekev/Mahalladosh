/** Account basics (task #27): edit your display name, and a clearly-fenced
 * "danger zone" — leave household, leave mahalla, delete account. Each
 * destructive action is gated behind a styled confirm Modal (never window.confirm)
 * that spells out, in plain elder-friendly language, exactly what happens. */

import { useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/core/stores/auth'
import { useStrings } from '@/core/i18n'
import { settingsStrings } from '@/core/i18n/settings'
import { Badge, Button, Card, ErrorNote, Field, Input, Modal, Spinner } from '@/components/ui'
import {
  useDeleteAccount,
  useLeaveHousehold,
  useLeaveMahalla,
  useUpdateMe,
} from '@/core/queries/me'

function IconChevronLeft() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

/** A styled confirm dialog for a single destructive action. */
function ConfirmModal({
  open,
  onClose,
  title,
  body,
  confirmLabel,
  onConfirm,
  loading,
  error,
}: {
  open: boolean
  onClose: () => void
  title: string
  body: string
  confirmLabel: string
  onConfirm: () => void
  loading?: boolean
  error?: string | null
}) {
  const s = useStrings(settingsStrings)
  return (
    <Modal open={open} onClose={onClose} title={title}>
      {error && <ErrorNote message={error} />}
      <p className="text-[15px] leading-relaxed text-ink">{body}</p>
      <div className="mt-5 flex gap-2.5">
        <Button variant="secondary" full onClick={onClose} disabled={loading}>
          {s.cancel}
        </Button>
        <Button variant="danger" full loading={loading} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}

/** One tappable row inside the danger-zone card. */
function DangerRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-4 py-[15px] min-h-[52px] text-left hover:bg-black/[0.03] transition"
    >
      <span className="text-[17px] font-semibold text-danger">{label}</span>
      <span className="text-danger/60 text-lg leading-none">›</span>
    </button>
  )
}

export default function SettingsScreen() {
  const s = useStrings(settingsStrings)
  const me = useAuth((state) => state.me)
  const navigate = useNavigate()

  const updateMe = useUpdateMe()
  const leaveHousehold = useLeaveHousehold()
  const leaveMahalla = useLeaveMahalla()
  const deleteAccount = useDeleteAccount()

  const [name, setName] = useState(me?.user.full_name ?? '')
  const [confirming, setConfirming] = useState<null | 'household' | 'mahalla' | 'delete'>(null)

  if (!me) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    )
  }

  const trimmed = name.trim()
  const nameDirty = trimmed !== me.user.full_name
  const nameValid = trimmed.length >= 2

  function saveName(e: FormEvent) {
    e.preventDefault()
    if (!nameValid || !nameDirty || updateMe.isPending) return
    updateMe.mutate({ full_name: trimmed })
  }

  const closeConfirm = () => {
    if (leaveHousehold.isPending || leaveMahalla.isPending || deleteAccount.isPending) return
    setConfirming(null)
  }

  const modals: ReactNode = (
    <>
      <ConfirmModal
        open={confirming === 'household'}
        onClose={closeConfirm}
        title={s.leaveHouseholdConfirmTitle}
        body={s.leaveHouseholdBody}
        confirmLabel={s.leaveHouseholdConfirm}
        loading={leaveHousehold.isPending}
        error={leaveHousehold.error?.message ?? null}
        onConfirm={() => leaveHousehold.mutate()}
      />
      <ConfirmModal
        open={confirming === 'mahalla'}
        onClose={closeConfirm}
        title={s.leaveMahallaConfirmTitle}
        body={s.leaveMahallaBody}
        confirmLabel={s.leaveMahallaConfirm}
        loading={leaveMahalla.isPending}
        error={leaveMahalla.error?.message ?? null}
        onConfirm={() => leaveMahalla.mutate()}
      />
      <ConfirmModal
        open={confirming === 'delete'}
        onClose={closeConfirm}
        title={s.deleteAccountConfirmTitle}
        body={s.deleteAccountBody}
        confirmLabel={s.deleteAccountConfirm}
        loading={deleteAccount.isPending}
        error={deleteAccount.error?.message ?? null}
        onConfirm={() => deleteAccount.mutate()}
      />
    </>
  )

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="-ml-1 mb-3 flex items-center gap-1.5 py-1 text-sm font-semibold text-brand"
      >
        <IconChevronLeft />
        {s.back}
      </button>

      <h1 className="mb-5 text-xl font-bold text-ink">{s.title}</h1>

      {/* ----- edit display name ----- */}
      <Card className="mb-6 p-5">
        <h2 className="mb-3 font-bold text-ink">{s.nameSectionTitle}</h2>
        {updateMe.error && <ErrorNote message={updateMe.error.message} />}
        <form onSubmit={saveName}>
          <Field label={s.nameLabel}>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={s.namePlaceholder} />
          </Field>
          <div className="flex items-center gap-3">
            <Button type="submit" loading={updateMe.isPending} disabled={!nameValid || !nameDirty}>
              {s.save}
            </Button>
            {updateMe.isSuccess && !nameDirty && !updateMe.isPending && <Badge color="green">{s.saved}</Badge>}
          </div>
        </form>
      </Card>

      {/* ----- danger zone ----- */}
      <h2 className="mb-1 px-1 text-[13px] font-semibold uppercase tracking-[0.08em] text-danger">{s.dangerTitle}</h2>
      <p className="mb-2.5 px-1 text-xs text-sub">{s.dangerHint}</p>
      <Card className="p-0 divide-y divide-line overflow-hidden border-red-100">
        {me.user.household_id != null && (
          <DangerRow label={s.leaveHousehold} onClick={() => setConfirming('household')} />
        )}
        <DangerRow label={s.leaveMahalla} onClick={() => setConfirming('mahalla')} />
        <DangerRow label={s.deleteAccount} onClick={() => setConfirming('delete')} />
      </Card>

      {modals}
    </div>
  )
}
