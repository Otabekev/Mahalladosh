/** Landing + dev login. Full-screen, outside the app shell. */

import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { api, ApiError } from '@/core/api/client'
import type { User } from '@/core/api/types'
import { useAuth } from '@/core/stores/auth'
import { Button, Card, ErrorNote, FullScreenSpinner, Input } from '@/components/ui'

const FEATURES = [
  { icon: '👨‍👩‍👧', title: 'Oila sahifalari', text: 'avlodlar tarixi' },
  { icon: '🤝', title: "Qo'shnilar yordami", text: "so'rang va yordam bering" },
  { icon: '⭐', title: "Obro'", text: "faol qo'shnilar e'zozlanadi" },
]

export default function LoginScreen() {
  const { me, status } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

        {/* dev login */}
        <Card className="w-full p-5">
          <h2 className="text-lg font-bold text-ink mb-4">Kirish</h2>
          {error && <ErrorNote message={error} />}
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
        </Card>

        <p className="text-xs text-sub mt-4 text-center">Telegram orqali kirish tez orada — hozircha dev rejim</p>
      </div>
    </div>
  )
}
