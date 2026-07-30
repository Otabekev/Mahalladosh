/** Landing + login. Full-screen, outside the app shell.
 * Login methods come from GET /auth/config: the Telegram Login Widget when a
 * bot is configured (production), the dev name-form in dev mode.
 *
 * Visual: "Ostona · the front door" — a golden-hour mahalla street hero over a
 * cream card, matching the approved Uzbek design mockup. Auth logic unchanged. */

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, ApiError } from '@/core/api/client'
import type { AuthConfig, User } from '@/core/api/types'
import { useAuth } from '@/core/stores/auth'
import { ErrorNote, FullScreenSpinner, Input, Spinner } from '@/components/ui'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { Logo } from '@/components/Logo'
import { pick, useStrings } from '@/core/i18n'
import { common } from '@/core/i18n/common'
import { onboardingStrings } from '@/core/i18n/onboarding'

interface TelegramAuthPayload {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramAuthPayload) => void
  }
}

/** Renders the official Telegram Login Widget for the configured bot. */
function TelegramLoginButton({ bot, onError }: { bot: string; onError: (msg: string) => void }) {
  const navigate = useNavigate()
  const holder = useRef<HTMLDivElement>(null)

  useEffect(() => {
    window.onTelegramAuth = async (payload: TelegramAuthPayload) => {
      try {
        await api<User>('/auth/telegram', { method: 'POST', body: payload })
        await useAuth.getState().refresh()
        navigate('/')
      } catch (err) {
        onError(err instanceof ApiError ? err.message : pick(onboardingStrings.tgLoginError))
      }
    }
    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.async = true
    script.setAttribute('data-telegram-login', bot)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-radius', '12')
    script.setAttribute('data-onauth', 'onTelegramAuth(user)')
    script.setAttribute('data-request-access', 'write')
    holder.current?.appendChild(script)
    return () => {
      window.onTelegramAuth = undefined
      if (holder.current) holder.current.innerHTML = ''
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bot])

  return <div ref={holder} className="flex justify-center" />
}

/** Telegram paper-plane glyph (path from the design mockup). */
function PaperPlane() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M21.5 4.3 2.9 11.4c-1 .4-1 1.8.1 2.1l4.7 1.5 1.8 5.6c.3.9 1.4 1 2 .3l2.6-2.7 4.7 3.5c.7.5 1.7.1 1.9-.7L23.9 5.3c.2-1-.8-1.7-1.7-1z" />
    </svg>
  )
}

export default function LoginScreen() {
  const { me, status } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const s = useStrings(onboardingStrings)
  const sc = useStrings(common)

  const { data: config } = useQuery({
    queryKey: ['auth-config'],
    queryFn: () => api<AuthConfig>('/auth/config'),
    staleTime: Infinity,
  })

  if (status === 'loading') return <FullScreenSpinner />
  if (me) return <Navigate to="/" replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const name = fullName.trim()
    if (name.length < 2) {
      setError(s.nameRequired)
      return
    }
    setLoading(true)
    setError('')
    try {
      await api<User>('/auth/dev-login', { method: 'POST', body: { full_name: name } })
      await useAuth.getState().refresh()
      navigate('/')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : sc.error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-bg flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        {/* language first — elders pick theirs before anything else */}
        <div className="flex justify-center mb-5">
          <LanguageSwitcher />
        </div>

        {/* card: golden-hour hero + cream body */}
        <div className="rounded-[30px] rounded-b-[20px] bg-paper border border-line shadow-pop overflow-hidden">
          {/* ===== HERO — mahalla street at golden hour ===== */}
          <div
            className="relative h-[200px] overflow-hidden"
            style={{ background: 'linear-gradient(180deg,#E9A94A 0%,#D98A3A 42%,#B96B37 74%,#9A5A34 100%)' }}
          >
            {/* suzani ikat strip across the very top */}
            <div className="ikat-border absolute top-0 inset-x-0 h-[7px] z-20" />

            {/* Girih lattice instead of a literal street.
                Hand-built CSS scenery — a brick wall from repeating gradients, a
                bush from a radial blob — is the fastest way to make a careful app
                look amateur. Geometry is not: a khatam lattice over the golden hour
                is unmistakably Samarkand AND unmistakably modern, which is the
                whole brief. The arch below carries the place; this carries the craft. */}
            <div className="girih-gold absolute inset-0" aria-hidden />

            {/* horizon — one hairline where the light meets the ground */}
            <div
              className="absolute inset-x-0 bottom-[52px] h-px"
              style={{ background: 'rgba(94,48,22,.35)' }}
              aria-hidden
            />
            <div
              className="absolute inset-x-0 bottom-0 h-[52px]"
              style={{ background: 'linear-gradient(180deg,#9A5A34 0%,#7A4327 100%)' }}
              aria-hidden
            />

            {/* peshtoq arch silhouette (path from the mockup) */}
            <svg
              width="92"
              height="115"
              viewBox="0 0 120 150"
              className="absolute bottom-0 left-1/2 -translate-x-1/2"
              aria-hidden
            >
              <path
                d="M14 150 L14 66 Q18 20 60 12 Q102 20 106 66 L106 150 Z"
                fill="#7A4327"
                stroke="#5E3016"
                strokeWidth="3"
              />
              <path d="M30 150 L30 74 Q34 40 60 34 Q86 40 90 74 L90 150 Z" fill="#3A2414" />
            </svg>

            {/* caption chip */}
            <span className="absolute bottom-8 left-3 z-20 text-[11px] text-white/85 bg-black/30 rounded-lg px-2.5 py-1">
              {s.heroCaption}
            </span>
          </div>

          {/* ===== BODY — overlaps the hero upward ===== */}
          <div className="relative -mt-6 bg-paper rounded-t-[28px] px-6 pt-6 pb-7 text-center">
            {/* brand */}
            <div className="flex items-center justify-center gap-3">
              <Logo variant="icon" size={44} />
              <span className="font-sans font-black text-[34px] leading-none tracking-[-0.02em] text-ink">
                Mahalladosh
              </span>
            </div>

            {/* welcome */}
            <p className="text-[19px] leading-[1.5] text-ink mt-3.5 text-balance">
              {s.welcomeLine1}
              <br />
              {s.welcomeLine2}
            </p>

            {error && (
              <div className="mt-4 text-left">
                <ErrorNote message={error} />
              </div>
            )}

            {/* login controls */}
            <div className="mt-5 text-left">
              {config?.telegram_bot && (
                <div className="flex justify-center py-1">
                  <TelegramLoginButton bot={config.telegram_bot} onError={setError} />
                </div>
              )}

              {config?.dev && (
                <form onSubmit={submit}>
                  <Input
                    placeholder={s.namePlaceholder}
                    aria-label={s.namePlaceholder}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-[58px] mt-2 rounded-2xl bg-brand text-[#FBF3E2] font-bold text-[19px] flex items-center justify-center gap-3 shadow-[0_12px_26px_-10px_rgba(142,42,30,0.6)] transition-transform active:scale-[0.99] disabled:opacity-60 disabled:pointer-events-none"
                  >
                    {loading && <Spinner size={20} light />}
                    {sc.login}
                  </button>
                </form>
              )}

              {config && !config.dev && !config.telegram_bot && (
                <p className="text-sm text-sub text-center">{s.loginUnavailable}</p>
              )}
            </div>

            {/* trust — neighbours only, never the state */}
            <div className="mt-4 flex items-center gap-2.5 bg-good-soft border border-[#CFE3D6] rounded-xl px-3 py-2.5 text-left">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-good)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0"
                aria-hidden
              >
                <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
              <div className="text-[14px] leading-[1.35] text-[#3F5C47]">
                {s.trustLine1}
                <br />
                <span className="font-semibold">{s.trustLine2}</span>
              </div>
            </div>
          </div>
        </div>

        {/* footer */}
        <p className="text-xs text-sub mt-4 text-center px-4">
          {config?.telegram_bot ? s.footerTelegram : s.footerDev}
        </p>
      </div>
    </div>
  )
}
