/** Design system — Uzbek: warm cream "paper" surfaces, terracotta actions,
 * teal accents, gold reserved for honor. All screens build from these. */

import { useState, type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes } from 'react'
import { fmt, pick, useLang } from '@/core/i18n'
import { common, monthNames, postTypeLabels, time } from '@/core/i18n/common'
import { translateBackend } from '@/core/i18n/backend'

// ---------- buttons ----------

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold' | 'accent'

const buttonStyles: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-[#FBF3E2] hover:bg-brand-deep active:scale-[0.98]',
  secondary: 'bg-card text-ink border border-line hover:bg-paper active:scale-[0.98]',
  ghost: 'bg-transparent text-sub hover:bg-black/5',
  danger: 'bg-danger text-white hover:opacity-90 active:scale-[0.98]',
  gold: 'bg-gold-soft text-honor-deep border border-amber-200 hover:brightness-95',
  accent: 'bg-accent text-white hover:bg-accent-deep active:scale-[0.98]',
}

export function Button({
  variant = 'primary',
  size = 'md',
  full,
  loading,
  className = '',
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: 'sm' | 'md' | 'lg'
  full?: boolean
  loading?: boolean
}) {
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2.5 text-sm', lg: 'px-5 py-3 text-base' }
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:pointer-events-none ${buttonStyles[variant]} ${sizes[size]} ${full ? 'w-full' : ''} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Spinner size={16} light={variant === 'primary' || variant === 'danger'} />}
      {children}
    </button>
  )
}

// ---------- surfaces ----------

export function Card({ className = '', children, onClick }: { className?: string; children: ReactNode; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`bg-card border border-line rounded-2xl shadow-card ${onClick ? 'cursor-pointer hover:shadow-pop transition-shadow' : ''} ${className}`}
    >
      {children}
    </div>
  )
}

export function PageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div>
        <h1 className="text-xl font-bold text-ink">{title}</h1>
        {subtitle && <p className="text-sm text-sub mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

// ---------- forms ----------

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="block mb-4">
      <span className="block text-sm font-semibold text-ink mb-1.5">{label}</span>
      {children}
      {hint && !error && <span className="block text-xs text-sub mt-1">{hint}</span>}
      {error && <span className="block text-xs text-danger mt-1">{error}</span>}
    </label>
  )
}

const inputBase =
  'w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-[16px] text-ink placeholder:text-sub/60 focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand/40 transition'

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputBase} ${props.className ?? ''}`} />
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={`${inputBase} resize-none ${props.className ?? ''}`} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputBase} appearance-none ${props.className ?? ''}`} />
}

// ---------- identity ----------

// warm palette drawn from the design system (terracotta / teal / honor / cobalt / clay)
const AVATAR_COLORS = [
  '#B23A28', '#157C84', '#D89A2A', '#1B4B8A', '#9A5A34', '#5E7F3D', '#8E2A1E', '#0E5E66',
]

/** Avatar. `honor` wraps it in the gold obro' ring (elders, the header, top ranks). */
export function Avatar({
  name,
  src,
  size = 40,
  honor = false,
}: {
  name: string
  src?: string | null
  size?: number
  honor?: boolean
}) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  const color = AVATAR_COLORS[name.length % AVATAR_COLORS.length]
  const inner = src ? (
    <img src={src} alt={name} className="rounded-full object-cover w-full h-full" />
  ) : (
    <div
      className="rounded-full text-white font-bold flex items-center justify-center w-full h-full"
      style={{ backgroundColor: color, fontSize: size * 0.38 }}
    >
      {initials}
    </div>
  )
  if (honor) {
    return (
      <div
        className="rounded-full shrink-0"
        style={{ width: size, height: size, padding: Math.max(2, size * 0.06), background: 'var(--color-honor)' }}
      >
        <div className="rounded-full w-full h-full" style={{ boxShadow: '0 0 0 2px var(--color-card) inset' }}>
          {inner}
        </div>
      </div>
    )
  }
  return (
    <div className="rounded-full overflow-hidden shrink-0" style={{ width: size, height: size }}>
      {inner}
    </div>
  )
}

export function PointsBadge({ points, size = 'md' }: { points: number; size?: 'sm' | 'md' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-gold-soft text-gold font-bold ${size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'}`}
    >
      ★ {points}
    </span>
  )
}

// ---------- badges & chips ----------

const badgeColors: Record<string, string> = {
  gray: 'bg-gray-100 text-gray-600',
  gold: 'bg-gold-soft text-gold',
  green: 'bg-good-soft text-good',
  blue: 'bg-blue-50 text-accent',
  red: 'bg-red-50 text-danger',
  violet: 'bg-violet-50 text-violet-600',
  rose: 'bg-rose-50 text-rose-600',
}

export function Badge({ color = 'gray', children }: { color?: string; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeColors[color] ?? badgeColors.gray}`}>
      {children}
    </span>
  )
}

/** Post-type chip — one color per structured type (plan §8).
 * Labels are localized: use usePostTypeLabel() in screens, never a raw label. */
export const POST_TYPE_META: Record<string, { color: string; icon: string }> = {
  help: { color: 'gold', icon: '🤝' },
  announcement: { color: 'blue', icon: '📢' },
  charity: { color: 'rose', icon: '❤️' },
  event: { color: 'violet', icon: '🎉' },
  newcomer: { color: 'green', icon: '👋' },
  share: { color: 'gray', icon: '📷' },
  poll: { color: 'blue', icon: '📊' },
  // A ta'ziya is grey on purpose. Every other pill competes for attention; this one
  // must not — the card around it already carries the weight, and a bright badge on
  // a death notice reads as decoration.
  taziya: { color: 'gray', icon: '🕊' },
  shoshilinch: { color: 'rose', icon: '🚨' },
}

/** Returns a resolver for localized post-type labels (re-renders on language change). */
export function usePostTypeLabel(): (type: string) => string {
  const lang = useLang((s) => s.lang)
  return (type: string) => postTypeLabels[type]?.[lang] ?? postTypeLabels[type]?.uz ?? type
}

export function TypePill({ type }: { type: string }) {
  const label = usePostTypeLabel()
  const meta = POST_TYPE_META[type] ?? { color: 'gray', icon: '' }
  return (
    <Badge color={meta.color}>
      <span>{meta.icon}</span> {label(type)}
    </Badge>
  )
}

// ---------- tabs ----------

export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
            value === t.value ? 'bg-white text-ink shadow-card' : 'text-sub hover:text-ink'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ---------- feedback ----------

export function Spinner({ size = 24, light }: { size?: number; light?: boolean }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 ${light ? 'border-white/30 border-t-white' : 'border-gray-300 border-t-gray-700'}`}
      style={{ width: size, height: size }}
    />
  )
}

export function FullScreenSpinner() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-bg">
      <Spinner size={32} />
    </div>
  )
}

// ---------- skeleton loaders ----------

/** A shimmering placeholder block. Prefer content-shaped skeletons over a lone
 *  centred spinner: they hold the layout so the screen fills in instead of
 *  flashing blank then popping — which reads much calmer on a slow connection. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-line/70 ${className}`} />
}

/** The shape of one warm feed card, used while posts load. */
export function PostCardSkeleton() {
  return (
    <div className="bg-card border border-line rounded-2xl p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-11 h-11 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <div className="mt-3.5 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  )
}

/** The shape of one notification / list row. */
export function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-1 py-3">
      <Skeleton className="w-10 h-10 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-2/3" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  )
}

/** Repeat a skeleton row/card `count` times — the standard loading body. */
export function SkeletonList({ count = 4, children }: { count?: number; children: ReactNode }) {
  return (
    <div className="space-y-3.5" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i}>{children}</div>
      ))}
    </div>
  )
}

export function EmptyState({ icon, title, text, action }: { icon: string; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="text-center py-12 px-6">
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="font-bold text-ink">{title}</h3>
      {text && <p className="text-sm text-sub mt-1 max-w-xs mx-auto">{text}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}

export function ErrorNote({ message }: { message: string }) {
  // backend errors arrive in Uzbek — localize them; unknown strings pass through
  useLang((s) => s.lang) // re-render on language change
  return (
    <div className="rounded-xl bg-red-50 border border-red-100 text-danger text-sm px-4 py-3 mb-4">
      {translateBackend(message)}
    </div>
  )
}

// ---------- modal ----------

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-card w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-pop max-h-[85dvh] overflow-y-auto">
        <div className="sticky top-0 bg-card flex items-center justify-between px-5 py-4 border-b border-line">
          <h3 className="font-bold text-ink">{title}</h3>
          <button
            onClick={onClose}
            aria-label="×"
            className="-mr-2 flex h-11 w-11 items-center justify-center text-2xl leading-none text-sub hover:text-ink"
          >
            ×
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  )
}

// ---------- image upload ----------

/** Uploads an image file to the API; returns its served URL. */
export async function uploadImage(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch('/api/uploads', { method: 'POST', body: form, credentials: 'include' })
  if (!res.ok) {
    let detail = 'Rasm yuklanmadi'
    try {
      const data = await res.json()
      if (typeof data.detail === 'string') detail = data.detail
    } catch {
      /* non-JSON body */
    }
    throw new Error(detail)
  }
  const data = (await res.json()) as { url: string }
  return data.url
}

/** Photo picker with preview — used by the share-post form. */
export function ImagePicker({
  value,
  onChange,
  onError,
}: {
  value: string | null
  onChange: (url: string | null) => void
  onError?: (msg: string) => void
}) {
  const [busy, setBusy] = useState(false)

  const pickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      onChange(await uploadImage(file))
    } catch (err) {
      onError?.(err instanceof Error ? err.message : pick(common.uploadFailed))
    } finally {
      setBusy(false)
    }
  }

  const lang = useLang((s) => s.lang)

  if (value) {
    return (
      <div className="relative rounded-xl overflow-hidden border border-line mb-4">
        <img src={value} alt="" className="w-full max-h-72 object-cover" />
        <button
          type="button"
          onClick={() => onChange(null)}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white text-lg leading-none"
        >
          ×
        </button>
      </div>
    )
  }

  return (
    <label className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line bg-gray-50 py-8 mb-4 cursor-pointer hover:bg-gray-100 transition">
      {busy ? (
        <Spinner />
      ) : (
        <>
          <span className="text-2xl">📷</span>
          <span className="text-sm font-semibold text-sub">{common.addPhoto[lang]}</span>
        </>
      )}
      <input type="file" accept="image/*" className="hidden" onChange={pickFile} disabled={busy} />
    </label>
  )
}

/** Multi-photo picker — a grid of thumbnails plus an add tile, up to `max`. Each
 *  file is uploaded as it is picked; the value is the list of served URLs. */
export function MultiImagePicker({
  value,
  onChange,
  max = 6,
  onError,
}: {
  value: string[]
  onChange: (urls: string[]) => void
  max?: number
  onError?: (msg: string) => void
}) {
  const [busy, setBusy] = useState(false)
  const lang = useLang((s) => s.lang)

  const pickFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) return
    setBusy(true)
    try {
      const room = Math.max(0, max - value.length)
      const uploaded: string[] = []
      for (const file of files.slice(0, room)) uploaded.push(await uploadImage(file))
      onChange([...value, ...uploaded])
    } catch (err) {
      onError?.(err instanceof Error ? err.message : pick(common.uploadFailed))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mb-4 grid grid-cols-3 gap-2">
      {value.map((url, i) => (
        <div key={url} className="relative aspect-square overflow-hidden rounded-xl border border-line">
          <img src={url} alt="" className="h-full w-full object-cover" />
          <button
            type="button"
            aria-label="×"
            onClick={() => onChange(value.filter((_, j) => j !== i))}
            className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-base leading-none text-white"
          >
            ×
          </button>
        </div>
      ))}
      {value.length < max && (
        <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line bg-gray-50 hover:bg-gray-100">
          {busy ? (
            <Spinner />
          ) : (
            <>
              <span className="text-2xl">📷</span>
              <span className="text-[11px] font-semibold text-sub">{common.addPhoto[lang]}</span>
            </>
          )}
          <input type="file" accept="image/*" multiple className="hidden" onChange={pickFiles} disabled={busy} />
        </label>
      )}
    </div>
  )
}

// ---------- misc ----------

/** Backend timestamps are naive UTC ("2026-07-26T09:15:00"); anything already
 * carrying Z or a ±HH:MM offset is left alone. */
const HAS_TZ = /(?:Z|[+-]\d{2}:?\d{2})$/

const pad2 = (n: number) => (n < 10 ? `0${n}` : String(n))

/** Same calendar day in the device's own timezone. */
function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  )
}

/**
 * Friendly, localized timestamp: "Hozir" → "Bugun 14:30" → "Kecha 14:30" →
 * "12-iyul". Elders read a clock and a date far quicker than "17 soat oldin".
 *
 * Signature is deliberately unchanged — screens call timeAgo(post.created_at).
 * Language comes from the store via pick(), same as before, so it also works
 * outside React (the calling component re-renders on a language switch).
 */
/** Parse a server timestamp. The API sends naive UTC, so a bare string would be
 *  read as local time and land hours off. */
export function parseDate(iso: string): Date {
  return new Date(iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z')
}

/** Whole days from local midnight today to the local day of `iso`
 *  (0 = today, 1 = tomorrow, negative = past).
 *
 *  Lives here because the Bugun card and the Upcoming strip both answer "is the
 *  to'y today?" and must never answer it differently. Compare DAYS, not hours: an
 *  event at 09:00 tomorrow is "tomorrow" even when it is 20 hours away. */
export function daysUntil(iso: string): number {
  const target = parseDate(iso)
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - start.getTime()) / 86400000)
}

export function timeAgo(iso: string): string {
  const then = new Date(HAS_TZ.test(iso) ? iso : iso + 'Z')
  const ms = then.getTime()
  if (!Number.isFinite(ms)) return '' // unparseable — show nothing, never "Invalid Date"

  const now = new Date()
  const diffMs = now.getTime() - ms
  if (diffMs < 60_000) return pick(time.now) // also covers small clock skew (negative diff)

  const clock = `${pad2(then.getHours())}:${pad2(then.getMinutes())}`
  if (sameDay(then, now)) return fmt(pick(time.today), { t: clock })

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (sameDay(then, yesterday)) return fmt(pick(time.yesterday), { t: clock })

  const lang = useLang.getState().lang
  const month = (monthNames[lang] ?? monthNames.uz)[then.getMonth()]
  const sameYear = then.getFullYear() === now.getFullYear()
  return fmt(pick(sameYear ? time.dateShort : time.dateFull), {
    d: then.getDate(),
    mon: month,
    y: then.getFullYear(),
  })
}

export function RankNumber({ rank }: { rank: number }) {
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null
  return medal ? (
    <span className="text-xl w-8 text-center shrink-0">{medal}</span>
  ) : (
    <span className="text-sm font-bold text-sub w-8 text-center shrink-0">{rank}</span>
  )
}
