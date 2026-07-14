/** Design system — Skool-inspired: white cards on light gray, near-black
 * actions, gold for points/honor. All screens build from these. */

import { type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes } from 'react'

// ---------- buttons ----------

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold'

const buttonStyles: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-white hover:bg-black active:scale-[0.98]',
  secondary: 'bg-white text-ink border border-line hover:bg-gray-50 active:scale-[0.98]',
  ghost: 'bg-transparent text-sub hover:bg-gray-100',
  danger: 'bg-danger text-white hover:bg-red-700 active:scale-[0.98]',
  gold: 'bg-gold-soft text-gold border border-amber-200 hover:bg-amber-100',
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
  'w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-[15px] text-ink placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-gray-400 transition'

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

const AVATAR_COLORS = [
  'bg-amber-500', 'bg-emerald-500', 'bg-blue-500', 'bg-violet-500',
  'bg-rose-500', 'bg-teal-500', 'bg-orange-500', 'bg-indigo-500',
]

export function Avatar({ name, src, size = 40 }: { name: string; src?: string | null; size?: number }) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  const color = AVATAR_COLORS[name.length % AVATAR_COLORS.length]
  if (src) {
    return <img src={src} alt={name} className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />
  }
  return (
    <div
      className={`rounded-full ${color} text-white font-bold flex items-center justify-center shrink-0`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
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

/** Post-type chip — one color per structured type (plan §8). */
export const POST_TYPE_META: Record<string, { label: string; color: string; icon: string }> = {
  help: { label: 'Yordam kerak', color: 'gold', icon: '🤝' },
  announcement: { label: "E'lon", color: 'blue', icon: '📢' },
  charity: { label: 'Xayriya', color: 'rose', icon: '❤️' },
  event: { label: "To'y-marosim", color: 'violet', icon: '🎉' },
  newcomer: { label: "Yangi qo'shni", color: 'green', icon: '👋' },
}

export function TypePill({ type }: { type: string }) {
  const meta = POST_TYPE_META[type] ?? { label: type, color: 'gray', icon: '' }
  return (
    <Badge color={meta.color}>
      <span>{meta.icon}</span> {meta.label}
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
  return <div className="rounded-xl bg-red-50 border border-red-100 text-danger text-sm px-4 py-3 mb-4">{message}</div>
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
          <button onClick={onClose} className="text-sub hover:text-ink text-xl leading-none px-1">×</button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  )
}

// ---------- misc ----------

export function timeAgo(iso: string): string {
  const then = new Date(iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z').getTime()
  const mins = Math.floor((Date.now() - then) / 60000)
  if (mins < 1) return 'hozir'
  if (mins < 60) return `${mins} daqiqa oldin`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} soat oldin`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} kun oldin`
  return new Date(then).toLocaleDateString('uz')
}

export function RankNumber({ rank }: { rank: number }) {
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null
  return medal ? (
    <span className="text-xl w-8 text-center shrink-0">{medal}</span>
  ) : (
    <span className="text-sm font-bold text-sub w-8 text-center shrink-0">{rank}</span>
  )
}
