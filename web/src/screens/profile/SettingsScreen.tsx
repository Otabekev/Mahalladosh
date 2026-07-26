/** Account basics (task #27): edit your display name, choose whether the bot may
 * write to you on Telegram, and a clearly-fenced "danger zone" — leave household,
 * leave mahalla, delete account. Each destructive action is gated behind a styled
 * confirm Modal (never window.confirm) that spells out, in plain elder-friendly
 * language, exactly what happens. */

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

/** Paper plane — the Telegram channel. */
function IconSend() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-accent)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      aria-hidden
    >
      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />
    </svg>
  )
}

/** Oversized on/off switch — thumb-sized for older eyes and hands. */
function BigSwitch({ on }: { on: boolean }) {
  return (
    <span
      className="relative w-[58px] h-[34px] rounded-full transition-colors shrink-0"
      style={{ background: on ? 'var(--color-good)' : 'var(--color-line)' }}
      aria-hidden
    >
      <span
        className="absolute top-[3px] w-[28px] h-[28px] rounded-full bg-white shadow transition-all"
        style={{ left: on ? '27px' : '3px' }}
      />
    </span>
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
  const updateDm = useUpdateMe() // own instance: the toggle must not disturb the name form
  const leaveHousehold = useLeaveHousehold()
  const leaveMahalla = useLeaveMahalla()
  const deleteAccount = useDeleteAccount()

  const [name, setName] = useState(me?.user.full_name ?? '')
  const [confirming, setConfirming] = useState<null | 'household' | 'mahalla' | 'delete'>(null)
  // Optimistic value while the PATCH is in flight; null = trust the server.
  const [dmDraft, setDmDraft] = useState<boolean | null>(null)

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

  // Default to on for a session cached before the field existed.
  const dmOn = dmDraft ?? me.user.tg_dm_enabled !== false

  function saveName(e: FormEvent) {
    e.preventDefault()
    if (!nameValid || !nameDirty || updateMe.isPending) return
    updateMe.mutate({ full_name: trimmed })
  }

  function toggleDm() {
    if (updateDm.isPending) return
    const next = !dmOn
    setDmDraft(next) // flip instantly — the request catches up
    updateDm.mutate(
      { tg_dm_enabled: next },
      {
        // Success: the refreshed session now carries it. Failure: fall back to
        // the server's value so the switch never lies about what was saved.
        onSettled: () => setDmDraft(null),
      },
    )
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

      {/* ----- Telegram messages ----- */}
      <h2 className="mb-1 px-1 text-[13px] font-semibold uppercase tracking-[0.08em] text-sub">{s.notifSectionTitle}</h2>
      <Card className="mb-6 p-0 overflow-hidden">
        {updateDm.isError && (
          <div className="px-4 pt-4">
            <ErrorNote message={s.tgDmFailed} />
          </div>
        )}
        <button
          type="button"
          role="switch"
          aria-checked={dmOn}
          onClick={toggleDm}
          className="w-full flex items-center gap-3.5 px-4 py-4 min-h-[72px] text-left transition hover:bg-black/[0.03]"
        >
          {updateDm.isPending ? <Spinner size={24} /> : <IconSend />}
          <span className="flex-1">
            <span className="block text-[17px] font-semibold text-ink">{s.tgDmLabel}</span>
            <span className="mt-1 block text-[14px] leading-snug text-sub">{s.tgDmHint}</span>
            <span className={`mt-1.5 block text-[13px] font-semibold ${dmOn ? 'text-good' : 'text-sub'}`}>
              {dmOn ? s.tgDmOn : s.tgDmOff}
            </span>
          </span>
          <BigSwitch on={dmOn} />
        </button>
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
