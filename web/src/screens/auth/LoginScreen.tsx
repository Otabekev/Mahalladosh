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

const FEATURES = [
  { icon: '👨‍👩‍👧', title: 'Oila sahifalari', text: 'avlodlar tarixi' },
  { icon: '🤝', title: "Qo'shnilar yordami", text: "so'rang va yordam bering" },
  { icon: '⭐', title: "Obro'", text: "faol qo'shnilar e'zozlanadi" },
]

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
        onError(err instanceof ApiError ? err.message : 'Telegram kirish xatosi')
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
      setError('Ismingizni yozing')
      return
    }
    setLoading(true)
    setError('')
    try {
      await api<User>('/auth/dev-login', { method: 'POST', body: { full_name: name, is_admin: isAdmin } })
      await useAuth.getState().refresh()
      navigate('/')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Xatolik yuz berdi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-bg flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm flex flex-col items-center">
        {/* brand */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-brand text-white font-black flex items-center justify-center text-2xl">
            M
          </div>
          <span className="text-2xl font-extrabold text-ink">Mahalladosh</span>
        </div>
        <p className="text-sub mt-2 mb-8 text-center">Mahallangiz bilan bog'laning</p>

        {/* features */}
        <div className="w-full space-y-3 mb-8">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex items-center gap-3">
              <span className="text-2xl shrink-0">{f.icon}</span>
              <p className="text-sm">
                <span className="font-semibold text-ink">{f.title}</span>
                <span className="text-sub"> — {f.text}</span>
              </p>
            </div>
          ))}
        </div>

        <Card className="w-full p-5">
          <h2 className="text-lg font-bold text-ink mb-4">Kirish</h2>
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
                  placeholder="Ismingiz"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoFocus
                />
              </div>
              <label className="flex items-center gap-2 mb-4 text-sm text-sub cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAdmin}
                  onChange={(e) => setIsAdmin(e.target.checked)}
                  className="w-4 h-4 accent-black"
                />
                Admin sifatida kirish
              </label>
              <Button type="submit" full loading={loading}>
                Kirish
              </Button>
            </form>
          )}

          {config && !config.dev && !config.telegram_bot && (
            <p className="text-sm text-sub">Kirish hozircha sozlanmoqda — keyinroq urinib ko'ring.</p>
          )}
        </Card>

        <p className="text-xs text-sub mt-4 text-center">
          {config?.telegram_bot
            ? 'Telegram hisobingiz bilan xavfsiz kirasiz'
            : 'Telegram orqali kirish deploy bilan yoqiladi — hozircha dev rejim'}
        </p>
      </div>
    </div>
  )
}
