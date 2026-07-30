/** «Chiroq bormi?» — the live light / gas / water board.
 *
 *  DESIGN INTENT. This screen gets opened one-handed, in the dark, by someone who
 *  wants an answer in about two seconds. So the hierarchy is strictly: what is the
 *  situation → is it only me → when does it come back. Everything decorative is
 *  subordinate to that, and the ornament stays as texture (see index.css: never
 *  behind body text, one hue at a time).
 *
 *  The two answer buttons are oversized on purpose. Elder-first UX puts the floor at
 *  48px; these are taller, because this is the one control in the app that gets used
 *  by touch in bad light with cold hands.
 */

import { useState, type FormEvent } from 'react'
import { Button, Card, ErrorNote, Field, Input, Modal, PageTitle, Select, Skeleton } from '@/components/ui'
import { GirihRule, SectionHeading } from '@/components/Ornament'
import { useConfirm } from '@/components/confirm'
import { useAuth } from '@/core/stores/auth'
import { fmt, useStrings } from '@/core/i18n'
import { common } from '@/core/i18n/common'
import { utilityStrings } from '@/core/i18n/utility'
import {
  statusFor,
  useAddUtilityWindow,
  useDeleteUtilityWindow,
  useReportUtility,
  useUtilityBoard,
  useUtilityLog,
} from '@/core/queries/utility'
import type { UtilityKind, UtilityStatus, UtilityWindow } from '@/core/api/types'

const KINDS: UtilityKind[] = ['light', 'gas', 'water']

const ICON: Record<UtilityKind, string> = { light: '💡', gas: '🔥', water: '💧' }

/** Local HH:MM for a UTC ISO string — the server speaks UTC, people do not. */
function clock(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function dayMonth(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** One utility: the tally, the two taps, and the street breakdown underneath. */
function UtilityBlock({ kind }: { kind: UtilityKind }) {
  const s = useStrings(utilityStrings)
  const { data: board } = useUtilityBoard()
  const report = useReportUtility()
  const status = statusFor(board, kind)

  const anyOut = status.out > 0
  const nobodyAnswered = status.answered === 0

  // The one line that decides whether someone gets out of their chair: if the only
  // dark house on the street is theirs, it is a fuse, not an outage.
  const streetOfMine = status.streets.find((st) => st.out > 0)
  const onlyMe = status.my_state === 'out' && status.out === 1 && status.answered > 1

  return (
    <Card className={`overflow-hidden ${anyOut ? 'ring-1 ring-brand/25' : ''}`}>
      <div className={`px-4 py-3 flex items-baseline gap-2 ${anyOut ? 'bg-brand-soft' : 'bg-paper'}`}>
        <span className="text-xl leading-none" aria-hidden>
          {ICON[kind]}
        </span>
        <h3 className="font-semibold text-ink">{s[kind]}</h3>
        <span className="ml-auto text-sm font-medium text-sub">
          {nobodyAnswered
            ? s.nobodySaid
            : anyOut
              ? fmt(s.outCount, { out: status.out })
              : s.allFine}
        </span>
      </div>

      <div className="px-4 pt-3 pb-4">
        {/* the situation, in one sentence, before any control */}
        {anyOut && (
          <p className="text-sm text-sub mb-3">
            {onlyMe ? (
              <span className="text-ink font-medium">{s.onlyYou}</span>
            ) : (
              <>
                {fmt(s.onCount, { on: status.on })}
                {status.since && <> · {fmt(s.sinceLabel, { time: clock(status.since) })}</>}
              </>
            )}
          </p>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => report.mutate({ kind, is_out: true })}
            aria-pressed={status.my_state === 'out'}
            className={`min-h-[60px] rounded-xl border font-semibold text-[15px] transition active:scale-[0.98] ${
              status.my_state === 'out'
                ? 'bg-brand text-[#FBF3E2] border-brand'
                : 'bg-card text-ink border-line hover:bg-paper'
            }`}
          >
            {s.iHaveNone}
          </button>
          <button
            type="button"
            onClick={() => report.mutate({ kind, is_out: false })}
            aria-pressed={status.my_state === 'on'}
            className={`min-h-[60px] rounded-xl border font-semibold text-[15px] transition active:scale-[0.98] ${
              status.my_state === 'on'
                ? 'bg-good text-white border-good'
                : 'bg-card text-ink border-line hover:bg-paper'
            }`}
          >
            {s.iHaveIt}
          </button>
        </div>

        {status.my_reported_at && (
          <p className="mt-2 text-xs text-sub/80 text-center">
            {s.youSaid} · {clock(status.my_reported_at)}
          </p>
        )}

        {status.streets.length > 0 && (
          <div className="mt-4">
            <GirihRule />
            <p className="mt-3 mb-1.5 text-xs font-semibold tracking-wide text-sub uppercase">
              {s.streetsTitle}
            </p>
            <ul className="space-y-1">
              {status.streets.map((st) => (
                <li key={st.street} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 truncate text-ink">{st.street}</span>
                  {st.out > 0 && (
                    <span className="text-brand font-medium">{fmt(s.streetOut, { out: st.out })}</span>
                  )}
                  {st.on > 0 && (
                    <span className="text-good font-medium">{fmt(s.streetOn, { on: st.on })}</span>
                  )}
                </li>
              ))}
            </ul>
            {streetOfMine && streetOfMine.on === 0 && streetOfMine.out > 1 && (
              <p className="mt-2 text-xs text-brand font-medium">{s.wholeStreet}</p>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}

/** Announced cuts. A window that is running right now is the most useful row here —
 *  it is the explanation for the dark house, so it is marked and sorted first. */
function PlannedWindows({ windows }: { windows: UtilityWindow[] }) {
  const s = useStrings(utilityStrings)
  const c = useStrings(common)
  const { me } = useAuth()
  const confirm = useConfirm()
  const remove = useDeleteUtilityWindow()
  const now = Date.now()

  if (windows.length === 0) return null

  return (
    <section>
      <SectionHeading>{s.plannedTitle}</SectionHeading>
      <div className="space-y-2">
        {windows.map((w) => {
          const running = new Date(w.starts_at).getTime() <= now
          return (
            <Card key={w.id} className={`px-4 py-3 ${running ? 'ring-1 ring-honor/40' : ''}`}>
              <div className="flex items-center gap-2.5">
                <span className="text-lg" aria-hidden>
                  {ICON[w.kind]}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink">
                    {s[w.kind]} · {dayMonth(w.starts_at)} {clock(w.starts_at)}–{clock(w.ends_at)}
                  </p>
                  {w.note && <p className="text-xs text-sub truncate">{w.note}</p>}
                </div>
                {running && (
                  <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-honor-deep bg-gold-soft border border-amber-200 rounded-full px-2 py-0.5">
                    {s.plannedNow}
                  </span>
                )}
                {me?.user.is_raisi && (
                  <button
                    type="button"
                    aria-label={c.remove}
                    onClick={async () => {
                      const ok = await confirm({
                        title: s.windowDelete,
                        confirmLabel: c.remove,
                        danger: true,
                      })
                      if (ok) remove.mutate(w.id)
                    }}
                    className="shrink-0 p-2 -mr-2 text-sub hover:text-danger transition"
                  >
                    ✕
                  </button>
                )}
              </div>
            </Card>
          )
        })}
      </div>
    </section>
  )
}

/** The raisi re-types a region-wide utility announcement at mahalla scope. This is
 *  the manual bridge from the utility's Telegram channel to the people it is about. */
function AnnounceWindow() {
  const s = useStrings(utilityStrings)
  const c = useStrings(common)
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<UtilityKind>('light')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [note, setNote] = useState('')
  const add = useAddUtilityWindow()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!from || !to) return
    // <input type="datetime-local"> yields local wall time; send it as a real instant
    add.mutate(
      {
        kind,
        starts_at: new Date(from).toISOString(),
        ends_at: new Date(to).toISOString(),
        note: note.trim() || undefined,
      },
      {
        onSuccess: () => {
          setOpen(false)
          setFrom('')
          setTo('')
          setNote('')
        },
      },
    )
  }

  return (
    <>
      <Button variant="secondary" full onClick={() => setOpen(true)}>
        {s.addWindow}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={s.addWindow}>
        <form onSubmit={submit} className="space-y-3">
          <Field label={s.windowKind}>
            <Select value={kind} onChange={(e) => setKind(e.target.value as UtilityKind)}>
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {s[k]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={s.windowFrom}>
            <Input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} required />
          </Field>
          <Field label={s.windowTo}>
            <Input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} required />
          </Field>
          <Field label={s.windowNote}>
            <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
          </Field>
          {add.isError && <ErrorNote message={c.error} />}
          <Button type="submit" full loading={add.isPending}>
            {s.windowSave}
          </Button>
        </form>
      </Modal>
    </>
  )
}

/** Your own outage history. The half of this feature that is worth something with
 *  zero neighbours on the app — and the thing people screenshot into Telegram. */
function MyLog() {
  const s = useStrings(utilityStrings)
  const [kind, setKind] = useState<UtilityKind>('light')
  const { data, isPending } = useUtilityLog(kind)

  return (
    <section>
      <SectionHeading>{s.logTitle}</SectionHeading>
      <Card className="px-4 py-4">
        <div className="flex gap-1.5 mb-3">
          {KINDS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`min-h-[40px] flex-1 rounded-lg text-sm font-semibold border transition ${
                kind === k ? 'bg-accent-soft text-accent-deep border-accent/30' : 'bg-card text-sub border-line'
              }`}
            >
              <span aria-hidden>{ICON[k]}</span> {s[k]}
            </button>
          ))}
        </div>

        {isPending ? (
          <Skeleton className="h-16 w-full" />
        ) : !data || data.cuts === 0 ? (
          <p className="text-sm text-sub">{s.logEmpty}</p>
        ) : (
          <>
            <p className="text-ink font-semibold">
              {fmt(s.logSummary, { cuts: data.cuts, hours: data.hours })}
            </p>
            <ul className="mt-3 space-y-1.5">
              {data.sessions.slice(0, 8).map((sess) => (
                <li key={sess.start} className="flex items-center gap-2 text-sm">
                  <span className="text-sub tabular-nums">{dayMonth(sess.start)}</span>
                  <span className="text-ink tabular-nums">
                    {clock(sess.start)}–{clock(sess.end)}
                  </span>
                  <span className="ml-auto text-sub">
                    {sess.minutes < 60
                      ? fmt(s.minutes, { n: sess.minutes })
                      : fmt(s.hoursShort, { n: Math.round((sess.minutes / 60) * 10) / 10 })}
                    {sess.estimated && <span className="ml-1 text-xs opacity-70">({s.estimated})</span>}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}

        <p className="mt-3 text-xs text-sub/85 leading-relaxed">{s.logHint}</p>
      </Card>
    </section>
  )
}

export default function UtilityScreen() {
  const s = useStrings(utilityStrings)
  const { me } = useAuth()
  const { data: board, isPending } = useUtilityBoard()

  return (
    <div className="space-y-5">
      <PageTitle title={s.title} subtitle={s.subtitle} />

      {isPending ? (
        <div className="space-y-3">
          {KINDS.map((k) => (
            <Skeleton key={k} className="h-40 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {KINDS.map((k) => (
            <UtilityBlock key={k} kind={k} />
          ))}
        </div>
      )}

      <PlannedWindows windows={board?.windows ?? []} />
      {me?.user.is_raisi && <AnnounceWindow />}

      <MyLog />

      {/* the answer to the question every new user asks in the first minute */}
      <Card className="px-4 py-4 bg-paper">
        <p className="font-display text-lg text-ink">{s.whyTitle}</p>
        <p className="mt-1 text-sm text-sub leading-relaxed">{s.whyBody}</p>
      </Card>
    </div>
  )
}

export type { UtilityStatus }
