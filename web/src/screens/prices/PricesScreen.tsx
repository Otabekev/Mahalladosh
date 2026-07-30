/** «Narx» — the district price board.
 *
 *  DESIGN INTENT. This is a table of numbers, and a table of numbers read on a phone
 *  in a bazaar has exactly two jobs: be scannable in one pass, and be trustworthy.
 *
 *  Scannable means tabular figures, one row per item, and the trend as a small
 *  coloured delta rather than a chart — a sparkline here would be decoration that
 *  costs vertical space an elder has to scroll past.
 *
 *  Trustworthy means every number is traceable. Tap a row and you see who said what,
 *  at which bazaar, and when. A median nobody can trace is a number nobody believes,
 *  and the fastest way to settle "that is not what I paid" is to show the receipts.
 */

import { useState, type FormEvent } from 'react'
import { Button, Card, ErrorNote, Field, Input, Modal, PageTitle, Skeleton } from '@/components/ui'
import { SectionHeading } from '@/components/Ornament'
import { fmt, useStrings } from '@/core/i18n'
import { common } from '@/core/i18n/common'
import { pricesStrings } from '@/core/i18n/prices'
import { formatSom, usePriceBoard, usePriceDetail, useReportPrice } from '@/core/queries/prices'
import type { PriceRow } from '@/core/api/types'

type PriceKey = keyof typeof pricesStrings

/** Which unit each basket item is priced in. Kept beside the screen rather than in
 *  the API for the same reason the names are: it is copy, not data. */
const UNIT: Record<string, PriceKey> = {
  non: 'unitDona',
  un: 'unitKg',
  guruch: 'unitKg',
  yog: 'unitLitr',
  shakar: 'unitKg',
  tuxum: 'unitTen',
  sut: 'unitLitr',
  kartoshka: 'unitKg',
  piyoz: 'unitKg',
  sabzi: 'unitKg',
  pomidor: 'unitKg',
  olma: 'unitKg',
  gosht_mol: 'unitKg',
  gosht_qoy: 'unitKg',
  benzin: 'unitLitr',
  gaz_ballon: 'unitDona',
}

/** A rise in the price of food is bad news, so it is NOT green. Every other trend
 *  indicator in software says up=good; here up means a household pays more. */
function Trend({ pct }: { pct: number }) {
  if (pct === 0) return null
  const up = pct > 0
  return (
    <span className={`text-xs font-bold tabular-nums ${up ? 'text-brand' : 'text-good'}`}>
      {up ? '▲' : '▼'} {Math.abs(pct)}%
    </span>
  )
}

function PriceRowView({ row, onTell, onOpen }: { row: PriceRow; onTell: () => void; onOpen: () => void }) {
  const s = useStrings(pricesStrings)
  const unit = s[UNIT[row.item] ?? 'unitKg']

  return (
    <li className="flex items-center gap-3 px-4 py-3 border-b border-line/50 last:border-0">
      <button onClick={onOpen} className="flex-1 min-w-0 text-left">
        <span className="block font-semibold text-ink truncate">{s[row.item as PriceKey]}</span>
        <span className="block text-xs text-sub">
          {unit}
          {row.reports > 0 && <> · {fmt(s.reportsCount, { n: row.reports })}</>}
        </span>
      </button>

      <button onClick={onOpen} className="text-right shrink-0">
        {row.som === null ? (
          <span className="text-sm text-sub/70">{s.noPrice}</span>
        ) : (
          <>
            <span className="block font-bold text-ink tabular-nums">{formatSom(row.som)}</span>
            {row.trend_pct !== null && <Trend pct={row.trend_pct} />}
          </>
        )}
      </button>

      <button
        type="button"
        onClick={onTell}
        aria-label={s.tellPrice}
        className={`shrink-0 min-w-[44px] min-h-[44px] rounded-xl border text-sm font-semibold transition active:scale-95 ${
          row.my_som !== null
            ? 'bg-accent-soft text-accent-deep border-accent/30'
            : 'bg-card text-sub border-line'
        }`}
      >
        {row.my_som !== null ? '✓' : '+'}
      </button>
    </li>
  )
}

/** Report or correct a price. Reporting again the same day replaces the earlier
 *  figure rather than adding a second vote — see the router. */
function TellPriceModal({ item, onClose }: { item: string | null; onClose: () => void }) {
  const s = useStrings(pricesStrings)
  const c = useStrings(common)
  const [som, setSom] = useState('')
  const [market, setMarket] = useState('')
  const report = useReportPrice()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const value = Number(som.replace(/\D/g, '') || '0')
    if (!item || value <= 0) return
    report.mutate(
      { item, som: value, market: market.trim() || null },
      {
        onSuccess: () => {
          setSom('')
          setMarket('')
          onClose()
        },
      },
    )
  }

  return (
    <Modal open={!!item} onClose={onClose} title={item ? s[item as PriceKey] : ''}>
      <form onSubmit={submit} className="space-y-3">
        <Field label={s.priceLabel}>
          <div className="relative">
            <Input
              inputMode="numeric"
              autoFocus
              value={som && formatSom(Number(som.replace(/\D/g, '') || '0'))}
              onChange={(e) => setSom(e.target.value)}
              placeholder="0"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-sub">
              {s.som}
            </span>
          </div>
        </Field>
        <Field label={s.marketLabel}>
          <Input
            value={market}
            onChange={(e) => setMarket(e.target.value)}
            placeholder={s.marketPlaceholder}
            maxLength={80}
          />
        </Field>
        {report.isError && <ErrorNote message={report.error.message || c.error} />}
        <Button type="submit" full loading={report.isPending}>
          {s.save}
        </Button>
      </form>
    </Modal>
  )
}

/** The receipts behind one median. */
function ItemDetailModal({ item, onClose }: { item: string | null; onClose: () => void }) {
  const s = useStrings(pricesStrings)
  const { data, isPending } = usePriceDetail(item)

  return (
    <Modal open={!!item} onClose={onClose} title={item ? s[item as PriceKey] : ''}>
      {isPending ? (
        <Skeleton className="h-24 w-full" />
      ) : !data || data.reports.length === 0 ? (
        <p className="text-sm text-sub">{s.emptyHint}</p>
      ) : (
        <>
          <p className="text-xs font-semibold uppercase tracking-wide text-sub mb-2">{s.whoSaid}</p>
          <ul className="space-y-2">
            {data.reports.map((r, i) => (
              <li key={i} className="flex items-baseline gap-2 text-sm">
                <span className="font-semibold text-ink tabular-nums">{formatSom(r.som)}</span>
                <span className="text-sub truncate">{r.by_name}</span>
                {r.market && <span className="text-sub/70 truncate">· {r.market}</span>}
                <span className="ml-auto shrink-0 text-xs text-sub/70">
                  {new Date(r.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-sub/85 leading-relaxed">{s.medianNote}</p>
        </>
      )}
    </Modal>
  )
}

export default function PricesScreen() {
  const s = useStrings(pricesStrings)
  const { data, isPending } = usePriceBoard()
  const [telling, setTelling] = useState<string | null>(null)
  const [opened, setOpened] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      <PageTitle title={s.title} subtitle={s.subtitle} />

      {isPending ? (
        <Skeleton className="h-96 w-full rounded-2xl" />
      ) : (
        <Card className="p-0 overflow-hidden">
          <ul>
            {(data?.items ?? []).map((row) => (
              <PriceRowView
                key={row.item}
                row={row}
                onTell={() => setTelling(row.item)}
                onOpen={() => setOpened(row.item)}
              />
            ))}
          </ul>
        </Card>
      )}

      <section>
        <SectionHeading>{s.tellPrice}</SectionHeading>
        <Card className="px-4 py-3">
          <p className="text-sm text-sub leading-relaxed">{s.emptyHint}</p>
        </Card>
      </section>

      <TellPriceModal item={telling} onClose={() => setTelling(null)} />
      <ItemDetailModal item={opened} onClose={() => setOpened(null)} />
    </div>
  )
}
