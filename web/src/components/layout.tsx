/** App shell: sticky header + content column + bottom tab bar (mobile-first PWA). */

import { useEffect, useRef } from 'react'
import { NavLink, Outlet, Link } from 'react-router-dom'
import { useAuth } from '@/core/stores/auth'
import { useNotifications } from '@/core/queries/notifications'
import { fmt, useStrings } from '@/core/i18n'
import { common } from '@/core/i18n/common'
import { Avatar } from './ui'
import { Logo } from './Logo'
import OfflineBanner from './OfflineBanner'

/** Two-tone "ding-dong" via WebAudio — no asset file needed. */
function playDingDong() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    const tone = (freq: number, start: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.001, ctx.currentTime + start)
      gain.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + 0.9)
      osc.connect(gain).connect(ctx.destination)
      osc.start(ctx.currentTime + start)
      osc.stop(ctx.currentTime + start + 1)
    }
    tone(784, 0) // G5 "ding"
    tone(659, 0.45) // E5 "dong"
    navigator.vibrate?.([300, 100, 300])
  } catch {
    /* audio unavailable (e.g. no user gesture yet) — the notification still shows */
  }
}

function NotificationBell() {
  const { data } = useNotifications()
  const unread = data?.unread ?? 0
  const initialized = useRef(false)
  const lastDingdongId = useRef(0)

  // ring audibly when a fresh unread dingdong arrives (poll-based, ~30s worst case);
  // only the very first FETCH is suppressed (don't replay pre-session rings) —
  // any ring that arrives on a later poll must sound
  useEffect(() => {
    if (!data) return
    const ding = data.items.find((n) => n.type === 'dingdong' && !n.read)
    if (!initialized.current) {
      initialized.current = true
      lastDingdongId.current = ding?.id ?? 0
      return
    }
    if (ding && ding.id > lastDingdongId.current) {
      lastDingdongId.current = ding.id
      playDingDong()
    }
  }, [data])
  return (
    <Link to="/app/notifications" className="relative p-1.5 text-sub hover:text-ink transition">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.7 21a2 2 0 0 1-3.4 0" />
      </svg>
      {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </Link>
  )
}

const NAV_ITEMS: { to: string; labelKey: keyof typeof common; icon: (active: boolean) => React.ReactNode; end?: boolean }[] = [
  {
    to: '/app',
    end: true,
    labelKey: 'navFeed' as const,
    icon: (a) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.4 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" />
      </svg>
    ),
  },
  {
    to: '/app/mahalla',
    labelKey: 'navMahalla' as const,
    icon: (a) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.4 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.2 3.4-5 6.5-5s5.7 1.8 6.5 5" /><circle cx="17" cy="9" r="2.5" /><path d="M17.5 14.5c2.2.4 3.7 1.8 4.2 4" />
      </svg>
    ),
  },
  {
    to: '/app/services',
    labelKey: 'navServices' as const,
    icon: (a) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.4 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </svg>
    ),
  },
  {
    to: '/app/proposals',
    labelKey: 'navVotes' as const,
    icon: (a) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.4 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 12l2 2 4-5" /><path d="M5 3h14l-1.5 18h-11z" />
      </svg>
    ),
  },
  {
    to: '/app/profile',
    labelKey: 'navProfile' as const,
    icon: (a) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.4 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6" />
      </svg>
    ),
  },
]

export default function AppLayout() {
  const me = useAuth((state) => state.me)
  const s = useStrings(common)

  return (
    <div className="min-h-dvh bg-bg">
      <header className="sticky top-0 z-40 bg-card/90 backdrop-blur border-b border-line">
        <div className="max-w-xl mx-auto flex items-center justify-between px-4 h-14">
          <Link to="/app" className="flex items-center gap-2.5">
            <Logo variant="icon" size={34} />
            <div className="leading-tight">
              <div className="font-extrabold text-[16px] text-ink">Mahalladosh</div>
              {me?.mahalla && <div className="text-[12px] text-sub -mt-0.5">{fmt(s.mahallaSuffix, { name: me.mahalla.name })}</div>}
            </div>
          </Link>
          {me && (
            <div className="flex items-center gap-2">
              <NotificationBell />
              <Link to="/app/profile">
                <Avatar name={me.user.full_name} src={me.user.photo_url} size={38} honor />
              </Link>
            </div>
          )}
        </div>
      </header>

      <OfflineBanner />

      <main className="max-w-xl mx-auto px-4 pt-4 pb-28">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-40 bg-card border-t border-line pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-xl mx-auto grid grid-cols-5">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition ${isActive ? 'text-brand' : 'text-sub/60'}`
              }
            >
              {({ isActive }) => (
                <>
                  {item.icon(isActive)}
                  <span>{s[item.labelKey]}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
