/** Post-petition waiting room. Polls /auth/me every 10s; RootRedirect (and the
 * local active-check) move the user into /app once the mahalla opens. */

import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ApiError } from '@/core/api/client'
import { useAuth } from '@/core/stores/auth'
import { Badge, Button, Card, ErrorNote } from '@/components/ui'
import { useCancelPetition } from '@/core/queries/onboarding'

export default function WaitingScreen() {
  const me = useAuth((s) => s.me)
  const navigate = useNavigate()
  const cancel = useCancelPetition()
  const [error, setError] = useState('')

  useEffect(() => {
    const id = setInterval(() => {
      useAuth
        .getState()
        .refresh()
        .catch(() => undefined)
    }, 10_000)
    return () => clearInterval(id)
  }, [])

  if (me?.mahalla?.status === 'active') return <Navigate to="/app" replace />
  if (!me?.petition) return <Navigate to="/onboarding" replace />

  const m = me.petition.mahalla
  const pct = Math.min(100, Math.round((m.petition_count / Math.max(1, m.petition_threshold)) * 100))

  const changeMahalla = async () => {
    setError('')
    try {
      await cancel.mutateAsync(m.id)
      await useAuth.getState().refresh()
      navigate('/onboarding')
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Xatolik yuz berdi')
    }
  }

  const handleLogout = async () => {
    await useAuth.getState().logout()
    navigate('/login')
  }

  return (
    <div className="min-h-dvh bg-bg flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Card className="p-5 text-center">
          <div className="text-5xl mb-3">🏘</div>
          <p className="font-semibold text-sub">{m.name} mahallasi</p>
          <h1 className="text-xl font-bold text-ink mt-1">So'rovingiz qabul qilindi!</h1>
          <p className="text-sm text-sub mt-2">
            Qo'shnilaringiz ham so'rov yuborishini kutamiz. {m.petition_threshold} ta so'rov yig'ilganda mahalla
            ochiladi.
          </p>

          <div className="mt-5">
            {m.status === 'pending' ? (
              <Badge color="gold">Admin tasdiqlashini kutmoqda</Badge>
            ) : (
              <>
                <div className="bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div className="bg-good h-3 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-sm font-bold text-ink mt-2">
                  {m.petition_count}/{m.petition_threshold}
                </p>
              </>
            )}
            <p className="text-xs text-sub mt-3">Sahifa o'zi yangilanib turadi</p>
          </div>

          {error && (
            <div className="mt-4 text-left">
              <ErrorNote message={error} />
            </div>
          )}

          <div className="mt-6 flex flex-col gap-2">
            <Button variant="secondary" full loading={cancel.isPending} onClick={() => void changeMahalla()}>
              Boshqa mahalla tanlash
            </Button>
            <Button variant="ghost" full onClick={() => void handleLogout()}>
              Chiqish
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
