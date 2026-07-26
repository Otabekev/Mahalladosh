/** /join/:id — the landing an invite link opens. It joins the opener to the
 *  invited mahalla, threading through login if they aren't signed in yet.
 *
 *  - not signed in  → remember the mahalla, send to login (RootRedirect resumes here)
 *  - already in one → just go home (you can only belong to one mahalla)
 *  - signed in, free → join, then land on the feed */

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, FullScreenSpinner } from '@/components/ui'
import { useStrings } from '@/core/i18n'
import { inviteStrings } from '@/core/i18n/invite'
import { useAuth } from '@/core/stores/auth'
import { useJoinMahalla } from '@/core/queries/onboarding'

export const PENDING_JOIN_KEY = 'md_pending_join'

export default function JoinScreen() {
  const { id } = useParams()
  const mahallaId = Number(id)
  const navigate = useNavigate()
  const s = useStrings(inviteStrings)
  const { me, status } = useAuth()
  const join = useJoinMahalla()
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!Number.isFinite(mahallaId)) {
      navigate('/', { replace: true })
      return
    }
    if (!me) {
      // bounce through login, then RootRedirect brings us back here
      try {
        localStorage.setItem(PENDING_JOIN_KEY, String(mahallaId))
      } catch {
        /* storage blocked — they can re-open the link after logging in */
      }
      navigate('/login', { replace: true })
      return
    }
    try {
      localStorage.removeItem(PENDING_JOIN_KEY)
    } catch {
      /* ignore */
    }
    if (me.user.mahalla_id != null) {
      navigate('/app', { replace: true }) // already in a mahalla
      return
    }
    join.mutate(mahallaId, {
      onSuccess: async () => {
        await useAuth.getState().refresh()
        navigate('/app', { replace: true })
      },
      onError: () => setFailed(true),
    })
    // run once when auth settles for this id
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, me?.user.id, mahallaId])

  if (failed) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 bg-bg px-6 text-center">
        <p className="text-ink">{s.joinFailed}</p>
        <Button onClick={() => navigate('/', { replace: true })}>{s.goHome}</Button>
      </div>
    )
  }
  return <FullScreenSpinner />
}
