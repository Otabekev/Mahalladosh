/** Fullscreen photo viewer. One image at a time on a black backdrop, with prev/next
 *  (arrows, swipe, or ← →), a counter, and a big close target. Shared by post
 *  galleries and the family album. */

import { useEffect, useRef, useState } from 'react'

export function Lightbox({
  images,
  startIndex = 0,
  onClose,
}: {
  images: string[]
  startIndex?: number
  onClose: () => void
}) {
  const [i, setI] = useState(startIndex)
  const touchX = useRef<number | null>(null)
  const many = images.length > 1

  const prev = () => setI((n) => (n - 1 + images.length) % images.length)
  const next = () => setI((n) => (n + 1) % images.length)

  // arrow keys + Esc, and lock body scroll while open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft' && many) prev()
      else if (e.key === 'ArrowRight' && many) next()
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.length])

  if (images.length === 0) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95"
      onClick={onClose}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null || !many) return
        const dx = e.changedTouches[0].clientX - touchX.current
        if (dx > 50) prev()
        else if (dx < -50) next()
        touchX.current = null
      }}
    >
      <button
        onClick={onClose}
        aria-label="×"
        className="absolute top-3 right-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-2xl text-white"
      >
        ×
      </button>

      {/* stop propagation so tapping the photo itself doesn't close */}
      <img
        src={images[i]}
        alt=""
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88dvh] max-w-full object-contain"
      />

      {many && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation()
              prev()
            }}
            aria-label="‹"
            className="absolute left-2 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-3xl text-white"
          >
            ‹
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              next()
            }}
            aria-label="›"
            className="absolute right-2 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-3xl text-white"
          >
            ›
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-white tabular-nums">
            {i + 1} / {images.length}
          </div>
        </>
      )}
    </div>
  )
}
