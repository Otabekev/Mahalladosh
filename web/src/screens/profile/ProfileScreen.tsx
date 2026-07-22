/** Profile screen — pixel-faithful to the Uzbek design mockup (screen 5 · PROFILE):
 * teal girih-washed hero with honor-ring avatar + daraja pill, two overlapping
 * stat cards, a Nishonlar (badges) grid, and an elder-first settings list
 * (household, language, large-text toggle, homeland tie, admin, logout). */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/core/stores/auth'
import { usePrefs } from '@/core/stores/prefs'
import { fmt, LANGS, useLang, useStrings } from '@/core/i18n'
import { common } from '@/core/i18n/common'
import { mahallaStrings } from '@/core/i18n/mahalla'
import { profileStrings } from '@/core/i18n/profile'
import { computeLevel, levelName } from '@/core/levels'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { Avatar, Card, Spinner } from '@/components/ui'

// ---------- little inline icons (stroke-crafted, matching the mockup) ----------

function RowIcon({ path, stroke = 'var(--color-ink)' }: { path: string; stroke?: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      <path d={path} />
    </svg>
  )
}

function Chevron({ open = false }: { open?: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-sub)"
      strokeWidth="2"
      strokeLinecap="round"
      className="shrink-0 transition-transform"
      style={{ transform: open ? 'rotate(90deg)' : 'none' }}
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}

const ICON_HOME = 'M3 10l9-7 9 7v9a1 1 0 0 1-1 1h-4v-6h-8v6H4a1 1 0 0 1-1-1z'
const ICON_GLOBE = 'M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18'
const ICON_FONT = 'M4 7V5h16v2M9 20h6M12 5v15'
const ICON_SHIELD = 'M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z'
const ICON_SLIDERS = 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6'
const ICON_LOGOUT = 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9'

const ROW = 'w-full flex items-center gap-3.5 px-4 py-[15px] min-h-[52px] text-left'

export default function ProfileScreen() {
  const s = useStrings(mahallaStrings)
  const c = useStrings(common)
  const p = useStrings(profileStrings)
  const lang = useLang((state) => state.lang)
  const me = useAuth((state) => state.me)
  const largeText = usePrefs((state) => state.largeText)
  const toggleLargeText = usePrefs((state) => state.toggleLargeText)
  const navigate = useNavigate()
  const [langOpen, setLangOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  if (!me) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    )
  }

  const u = me.user
  const daraja = computeLevel(u.rep_alltime)
  const ringPct = daraja.atMax ? 100 : Math.round(daraja.progress * 100)
  const activeN = Math.max(1, daraja.level)

  const subtitle = [u.username ? `@${u.username}` : null, me.mahalla ? fmt(c.mahallaSuffix, { name: me.mahalla.name }) : null]
    .filter(Boolean)
    .join(' · ')

  const currentLangLabel = LANGS.find((l) => l.value === lang)?.label ?? ''

  // Earned honours. No badges API yet — a faithful demo set derived from what we
  // do know (level → Faol multiplier); ready to swap for a real feed later.
  const badges = [
    { label: p.badgeFounder, bg: '#FBEDE0', border: '#EBD3BE', stroke: 'var(--color-brand)', path: 'M4 21V5a2 2 0 0 1 2-2h9l-2 4 2 4H6' },
    {
      label: activeN > 1 ? `${p.badgeActive} ×${activeN}` : p.badgeActive,
      bg: '#FBF0D8',
      border: '#EDD8A6',
      stroke: 'var(--color-honor-deep)',
      path: 'M6 4h12v3a6 6 0 0 1-12 0zM9 15v3h6v-3M8 21h8',
    },
    { label: p.badgeHistorian, bg: '#E3F0F0', border: '#C8E0E0', stroke: 'var(--color-accent)', path: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM19 3v18' },
    { label: p.badgeHost, bg: '#EAF2EE', border: '#CFE3D6', stroke: 'var(--color-good)', path: 'M18 8h1a3 3 0 0 1 0 6h-1M4 8h14v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4zM7 3v2M11 3v2M15 3v2' },
  ]

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await useAuth.getState().logout()
    } catch {
      /* even if the server call fails, send the user to login */
    }
    navigate('/login')
  }

  return (
    // bleed to the content-column edges and flush under the sticky app bar
    <div className="-mx-4 -mt-4">
      {/* ===== HERO ===== */}
      <div className="relative overflow-hidden bg-accent text-paper px-5 pt-9 pb-7 text-center rounded-b-[32px]">
        <div className="tilework absolute inset-0 pointer-events-none" aria-hidden />
        <div className="relative">
          {/* honor ring — conic gold arc shows progress into the next daraja */}
          <div
            className="mx-auto w-[104px] h-[104px] rounded-full p-1"
            style={{ background: `conic-gradient(var(--color-honor) ${ringPct}%, rgba(251,243,226,.35) 0)` }}
          >
            <div
              className="w-full h-full rounded-full flex items-center justify-center"
              style={{ border: '3px solid var(--color-accent)' }}
            >
              <Avatar name={u.full_name} src={u.photo_url} size={86} />
            </div>
          </div>
          <h1 className="font-extrabold text-[27px] leading-tight mt-3">{u.full_name}</h1>
          {subtitle && <p className="text-[15px] text-paper/90 mt-0.5">{subtitle}</p>}
          <div className="inline-flex items-center gap-2 rounded-full bg-black/20 px-4 py-2 mt-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#F4D89E">
              <path d="M12 2l2.9 6.3 6.9.6-5.2 4.6 1.6 6.8L12 17l-6.2 3.9 1.6-6.8L2.2 8.9l6.9-.6z" />
            </svg>
            <span className="font-bold text-[16px]">
              {fmt(p.darajaPill, { level: daraja.level, name: levelName(daraja.level, lang) })}
            </span>
          </div>
        </div>
      </div>

      {/* ===== STAT CARDS (overlap the hero) ===== */}
      <div className="relative px-4 -mt-4 flex gap-3">
        <div className="flex-1 bg-card border border-line rounded-2xl shadow-card p-3.5 text-center">
          <div className="font-black text-[28px] text-brand leading-none">{u.rep_month}</div>
          <div className="text-sm text-sub mt-1.5">{p.monthPoints}</div>
        </div>
        <div className="flex-1 bg-card border border-line rounded-2xl shadow-card p-3.5 text-center">
          <div className="font-black text-[28px] text-honor-deep leading-none">{u.rep_alltime.toLocaleString()}</div>
          <div className="text-sm text-sub mt-1.5">{p.totalRep}</div>
        </div>
      </div>

      {/* ===== CONTENT ===== */}
      <div className="px-4 pt-6 space-y-5">
        {/* Nishonlar */}
        <section>
          <h2 className="text-[19px] font-semibold text-ink mb-3">{p.badgesTitle}</h2>
          <div className="grid grid-cols-4 gap-2.5">
            {badges.map((b) => (
              <div key={b.label} className="text-center">
                <div
                  className="w-full aspect-square rounded-2xl border flex items-center justify-center"
                  style={{ background: b.bg, borderColor: b.border }}
                >
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={b.stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={b.path} />
                  </svg>
                </div>
                <div className="text-xs text-sub font-semibold mt-1.5">{b.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Settings list */}
        <Card className="p-0 divide-y divide-line overflow-hidden">
          <button onClick={() => navigate('/app/household')} className={`${ROW} hover:bg-black/[0.03] transition`}>
            <RowIcon path={ICON_HOME} />
            <span className="flex-1 text-[17px] font-semibold text-ink">{s.myHousehold}</span>
            <Chevron />
          </button>

          {/* Language — inline expand */}
          <div>
            <button onClick={() => setLangOpen((v) => !v)} className={`${ROW} hover:bg-black/[0.03] transition`}>
              <RowIcon path={ICON_GLOBE} />
              <span className="flex-1 text-[17px] font-semibold text-ink">
                {c.language} · {currentLangLabel}
              </span>
              <Chevron open={langOpen} />
            </button>
            {langOpen && (
              <div className="border-t border-line bg-paper/40">
                <LanguageSwitcher variant="list" />
              </div>
            )}
          </div>

          {/* Katta shrift — real toggle */}
          <button
            type="button"
            role="switch"
            aria-checked={largeText}
            onClick={toggleLargeText}
            className={`${ROW} hover:bg-black/[0.03] transition`}
          >
            <RowIcon path={ICON_FONT} />
            <span className="flex-1 text-[17px] font-semibold text-ink">{p.largeText}</span>
            <span
              className="relative w-[46px] h-[27px] rounded-full transition-colors shrink-0"
              style={{ background: largeText ? 'var(--color-good)' : 'var(--color-line)' }}
            >
              <span
                className="absolute top-[2.5px] w-[22px] h-[22px] rounded-full bg-white shadow transition-all"
                style={{ left: largeText ? '21.5px' : '2.5px' }}
              />
            </span>
          </button>

          {/* Vatan bilan aloqa — diaspora placeholder (non-navigating) */}
          <div className={ROW}>
            <RowIcon path={ICON_SHIELD} stroke="var(--color-brand)" />
            <span className="flex-1 text-[17px] font-semibold text-brand">{p.homelandTie}</span>
            <span className="text-[13px] text-sub">{p.homelandHint}</span>
          </div>

          {u.is_admin && (
            <button onClick={() => navigate('/app/admin')} className={`${ROW} hover:bg-black/[0.03] transition`}>
              <RowIcon path={ICON_SLIDERS} />
              <span className="flex-1 text-[17px] font-semibold text-ink">{s.adminPanel}</span>
              <Chevron />
            </button>
          )}
        </Card>

        {/* Logout */}
        <Card className="p-0 overflow-hidden">
          <button onClick={handleLogout} className={`${ROW} hover:bg-black/[0.03] transition`}>
            {loggingOut ? <Spinner size={22} /> : <RowIcon path={ICON_LOGOUT} stroke="var(--color-danger)" />}
            <span className="flex-1 text-[17px] font-semibold text-danger">{c.logout}</span>
          </button>
        </Card>
      </div>
    </div>
  )
}
