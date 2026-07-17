/** Landing + login. Full-screen, outside the app shell.
 * Login methods come from GET /auth/config: the Telegram Login Widget when a
 * bot is configured (production), the dev name-form in dev mode. */

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, ApiError } from '@/core/api/client'
import type { AuthConfig, User } from '@/core/api/types'
import { useAuth } from '@/core/stores/auth'
import { Button, Card, ErrorNote, FullScreenSpinner, Input } from '@/components/ui'
import LanguageSwitcher from '@/components/LanguageSwitcher'
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

export default function LoginScreen() {
  const { me, status } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
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

  const features = [
    { icon: '👨‍👩‍👧', title: s.featFamilyTitle, text: s.featFamilyText },
    { icon: '🤝', title: s.featHelpTitle, text: s.featHelpText },
    { icon: '⭐', title: s.featHonorTitle, text: s.featHonorText },
  ]

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
      await api<User>('/auth/dev-login', { method: 'POST', body: { full_name: name, is_admin: isAdmin } })
      await useAuth.getState().refresh()
      navigate('/')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : sc.error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-bg flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm flex flex-col items-center">
        {/* language first — elders pick theirs before anything else */}
        <div className="mb-6">
          <LanguageSwitcher />
        </div>

        {/* brand */}
        <div className="w-16 h-16 rounded-2xl bg-brand text-white font-black flex items-center justify-center text-3xl shadow-card">
          M
        </div>
        <h1 className="text-[26px] font-extrabold text-ink mt-4">Mahalladosh</h1>
        <p className="text-sm text-sub mt-1 text-center">{s.tagline}</p>

        {/* features */}
        <div className="w-full space-y-2.5 mt-8 mb-8">
          {features.map((f) => (
            <div key={f.title} className="flex items-center gap-3">
              <span className="text-xl w-8 text-center shrink-0">{f.icon}</span>
              <p className="text-sm leading-snug">
                <span className="font-semibold text-ink">{f.title}</span>
                <span className="text-sub"> — {f.text}</span>
              </p>
            </div>
          ))}
        </div>

        <Card className="w-full p-5">
          <h2 className="text-[15px] font-bold text-ink mb-4">{sc.login}</h2>
          {error && <ErrorNote message={error} />}

          {config?.telegram_bot && (
            <div className="mb-4">
              <TelegramLoginButton bot={config.telegram_bot} onError={setError} />
            </div>
          )}

          {config?.dev && (
            <form onSubmit={submit}>
              <div className="mb-3">
                <Input
                  placeholder={s.namePlaceholder}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoFocus
                />
              </div>
              <label className="flex items-center gap-2 mb-2 min-h-[44px] text-sm text-sub cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAdmin}
                  onChange={(e) => setIsAdmin(e.target.checked)}
                  className="w-4 h-4 accent-black"
                />
                {s.adminCheckbox}
              </label>
              <Button type="submit" size="lg" full loading={loading}>
                {sc.login}
              </Button>
            </form>
          )}

          {config && !config.dev && !config.telegram_bot && (
            <p className="text-sm text-sub">{s.loginUnavailable}</p>
          )}
        </Card>

        <p className="text-xs text-sub mt-4 text-center">
          {config?.telegram_bot ? s.footerTelegram : s.footerDev}
        </p>
      </div>
    </div>
  )
}
