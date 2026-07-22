/** Mahalladosh mark — a girih (Islamic geometric) star-crest from the Uzbek
 * design system. `icon` = the terracotta app square for headers; `crest` = the
 * large gold girih star for the login hero; `star` = the bare 8-point mark. */

export function Logo({
  variant = 'icon',
  size,
}: {
  variant?: 'icon' | 'crest' | 'star'
  size?: number
}) {
  if (variant === 'crest') {
    const s = size ?? 118
    return (
      <div className="relative flex items-center justify-center" style={{ width: s, height: s }}>
        <div
          className="absolute inset-0 rounded-full"
          style={{ background: 'radial-gradient(closest-side, rgba(212,169,74,.4), transparent)' }}
        />
        <svg width={s} height={s} viewBox="0 0 118 118">
          <g fill="none" stroke="url(#md-crest)" strokeWidth="1.6">
            <circle cx="59" cy="59" r="52" />
            <circle cx="59" cy="59" r="43" />
            <rect x="30" y="30" width="58" height="58" />
            <rect x="30" y="30" width="58" height="58" transform="rotate(45 59 59)" />
            <circle cx="59" cy="59" r="17" />
          </g>
          <circle cx="59" cy="59" r="5" fill="#E7C67B" />
          <defs>
            <linearGradient id="md-crest" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#F6E3A9" />
              <stop offset=".5" stopColor="#D4A94A" />
              <stop offset="1" stopColor="#A8791F" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    )
  }

  if (variant === 'star') {
    const s = size ?? 20
    return (
      <svg width={s} height={s} viewBox="0 0 40 40" aria-hidden>
        <g fill="none" stroke="currentColor" strokeWidth="2.4">
          <rect x="10" y="10" width="20" height="20" />
          <rect x="10" y="10" width="20" height="20" transform="rotate(45 20 20)" />
        </g>
      </svg>
    )
  }

  // icon: terracotta rounded square with a cream girih star
  const box = size ?? 34
  const inner = Math.round(box * 0.62)
  return (
    <div
      className="rounded-[30%] bg-brand flex items-center justify-center shrink-0"
      style={{ width: box, height: box }}
    >
      <svg width={inner} height={inner} viewBox="0 0 40 40" aria-hidden>
        <g fill="none" stroke="#F6E4C0" strokeWidth="2.6">
          <rect x="10" y="10" width="20" height="20" />
          <rect x="10" y="10" width="20" height="20" transform="rotate(45 20 20)" />
        </g>
      </svg>
    </div>
  )
}
