/** Pull down at the top of the feed to refresh it.
 *
 *  An installed PWA has no browser chrome, so the platform's own pull-to-refresh
 *  is gone and the app has to provide it. Two deliberate limits:
 *
 *  - `overscroll-behavior-y: contain` is set on THIS element only, never on
 *    <html>. A global rule would disable the native gesture on every screen in
 *    order to replace it on one.
 *  - The gesture only arms when the page is already scrolled to the very top, so
 *    it can never fight a normal scroll through the feed.
 *
 *  It is an addition, not the only way through: the feed still refetches when the
 *  window regains focus, which is how most people will actually get fresh posts.
 */

import { useRef, useState, type ReactNode } from 'react'

const ARM_AT = 70 // px of pull before the release actually refreshes
const MAX_PULL = 110 // resistance ceiling, so it feels elastic rather than loose

export function PullToRefresh({
  onRefresh,
  refreshing,
  children,
}: {
  onRefresh: () => void
  refreshing: boolean
  children: ReactNode
}) {
  const [pull, setPull] = useState(0)
  const startY = useRef<number | null>(null)

  const atTop = () => window.scrollY <= 0

  const onTouchStart = (e: React.TouchEvent) => {
    startY.current = atTop() ? e.touches[0].clientY : null
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (startY.current === null) return
    const dy = e.touches[0].clientY - startY.current
    if (dy <= 0) {
      setPull(0)
      return
    }
    // square-root resistance: the further you pull, the less it gives
    setPull(Math.min(MAX_PULL, Math.sqrt(dy) * 7))
  }

  const onTouchEnd = () => {
    if (pull >= ARM_AT && !refreshing) onRefresh()
    startY.current = null
    setPull(0)
  }

  const armed = pull >= ARM_AT
  const visible = refreshing ? ARM_AT : pull

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      style={{ overscrollBehaviorY: 'contain' }}
    >
      <div
        aria-hidden={visible === 0}
        className="flex items-center justify-center overflow-hidden text-sub"
        style={{
          height: visible,
          transition: startY.current === null ? 'height 200ms ease-out' : undefined,
        }}
      >
        <span
          className={`text-xl ${refreshing ? 'animate-spin' : ''}`}
          style={{ transform: armed && !refreshing ? 'rotate(180deg)' : undefined }}
        >
          {refreshing ? '◌' : '↓'}
        </span>
      </div>
      {children}
    </div>
  )
}
