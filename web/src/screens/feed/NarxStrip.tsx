/** A one-line «Narx» preview on the feed.
 *
 *  A bare "Narxlar ›" link would be a navigation nobody takes. Three actual figures
 *  make the row worth reading on its own, and the tap is then for the rest of the
 *  basket rather than for finding out whether there is anything there at all.
 *
 *  It hides itself when the district has no prices yet: an empty strip advertising
 *  emptiness is worse than no strip, and the price board is a slow burn that should
 *  not take up feed space before it has something to say.
 */

import { Link } from 'react-router-dom'
import { Card } from '@/components/ui'
import { useStrings } from '@/core/i18n'
import { pricesStrings } from '@/core/i18n/prices'
import { formatSom, usePriceBoard } from '@/core/queries/prices'

type PriceKey = keyof typeof pricesStrings

/** The three people ask about. Bread is the daily one, meat is the one that hurts,
 *  petrol is the one that moves fastest. */
const HEADLINE = ['non', 'gosht_mol', 'benzin']

export function NarxStrip() {
  const s = useStrings(pricesStrings)
  const { data } = usePriceBoard()

  const shown = (data?.items ?? []).filter((r) => HEADLINE.includes(r.item) && r.som !== null)
  if (shown.length === 0) return null

  return (
    <Link to="/app/prices" className="block">
      <Card className="px-4 py-3">
        <div className="flex items-center gap-2 mb-1.5">
          <span aria-hidden>🛒</span>
          <span className="text-sm font-semibold text-ink">{s.title}</span>
          <span className="ml-auto text-sub/60" aria-hidden>
            ›
          </span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {shown.map((r) => (
            <span key={r.item} className="text-sm">
              <span className="text-sub">{s[r.item as PriceKey]} </span>
              <span className="font-semibold text-ink tabular-nums">{formatSom(r.som as number)}</span>
              {r.trend_pct !== null && r.trend_pct !== 0 && (
                // up is NOT green here — a rise in the price of food is bad news
                <span className={`ml-1 text-xs font-bold ${r.trend_pct > 0 ? 'text-brand' : 'text-good'}`}>
                  {r.trend_pct > 0 ? '▲' : '▼'}
                </span>
              )}
            </span>
          ))}
        </div>
      </Card>
    </Link>
  )
}
