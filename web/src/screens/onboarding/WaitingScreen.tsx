/** Post-petition waiting room. Polls /auth/me every 10s; RootRedirect (and the
 * local active-check) move the user into /app once the mahalla opens. */

import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ApiError } from '@/core/api/client'
import { useAuth } from '@/core/stores/auth'
import { Badge, Button, Card, ErrorNote } from '@/components/ui'
import { useCancelPetition } from '@/core/queries/onboarding'
import { fmt, useStrings } from '@/core/i18n'
import { common } from '@/core/i18n/common'
import { onboardingStrings } from '@/core/i18n/onboarding'

export default function WaitingScreen() {
  const me = useAuth((state) => state.me)
  const navigate = useNavigate()
  const cancel = useCancelPetition()
  const [error, setError] = useState('')
  const s = useStrings(onboardingStrings)
  const sc = useStrings(common)

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
      setError(e instanceof ApiError ? e.message : sc.error)
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
          <p className="font-semibold text-sub">{fmt(sc.mahallaSuffix, { name: m.name })}</p>
          <h1 className="text-xl font-bold text-ink mt-1">{s.petitionAccepted}</h1>
          <p className="text-sm text-sub mt-2">{fmt(s.waitingText, { n: m.petition_threshold })}</p>

          <div className="mt-5">
            {m.status === 'pending' ? (
              <Badge color="gold">{s.awaitingAdmin}</Badge>
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
            <p className="text-xs text-sub mt-3">{s.autoRefresh}</p>
          </div>

          {error && (
            <div className="mt-4 text-left">
              <ErrorNote message={error} />
            </div>
          )}

          <div className="mt-6 flex flex-col gap-2">
            <Button variant="secondary" full loading={cancel.isPending} onClick={() => void changeMahalla()}>
              {s.chooseAnother}
            </Button>
            <Button variant="ghost" full onClick={() => void handleLogout()}>
              {sc.logout}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
