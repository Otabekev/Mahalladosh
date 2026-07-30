/** The ornament layer.
 *
 *  Every piece here follows the same rule, stated once in index.css: ornament is
 *  texture and structure UNDER a clean modern grid, never decoration on top of it.
 *  Girih works for this because it is geometric — at a few percent opacity a
 *  khatam lattice reads like a considered pattern, not like folklore, while still
 *  being unmistakably Samarkand to anyone who grew up with it.
 *
 *  If you are adding to this file and the result looks "traditional", it is almost
 *  always one of: too much opacity, more than one hue, or a stroke over 1.1px.
 */

/** The 8-point khatam star — the single motif this design system repeats.
 *  Used as a rule ornament, an empty-state mark, and a section marker. */
export function StarMark({ size = 14, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      aria-hidden
      className={className}
    >
      <rect x="5" y="5" width="14" height="14" />
      <rect x="5" y="5" width="14" height="14" transform="rotate(45 12 12)" />
    </svg>
  )
}

/** A section divider: a hairline that carries one small star at its centre.
 *  Sparse enough to read as typography rather than trim — this is what replaces
 *  a plain <hr> without making the page feel like a certificate. */
export function GirihRule({ className = '' }: { className?: string }) {
  return (
    <div className={`girih-rule ${className}`} aria-hidden>
      <StarMark size={12} className="shrink-0 text-line" />
    </div>
  )
}

/** A titled section heading with the rule built in. Keeps the heading rhythm
 *  identical everywhere instead of each screen inventing its own. */
export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <h2 className="shrink-0 text-[15px] font-bold text-ink">{children}</h2>
      <span className="h-px flex-1 bg-line" aria-hidden />
      <StarMark size={12} className="shrink-0 text-line" />
    </div>
  )
}

/** A faint girih wash for hero surfaces. `tone="gold"` over dark grounds,
 *  `tone="teal"` over light ones. Absolutely-positioned; the parent must be
 *  `relative` and `overflow-hidden`. */
export function GirihWash({ tone = 'teal' }: { tone?: 'teal' | 'gold' }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 ${tone === 'gold' ? 'girih-gold' : 'girih'}`}
    />
  )
}
