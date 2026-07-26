/** "Real Back" — a back handler that stays inside the app.
 *
 * navigate(-1) walks the browser history blindly: land on a shared /app/posts/5
 * link and Back exits Mahalladosh (or bounces to whatever referred you). React
 * Router stamps each in-app entry with an incrementing `idx` in history.state, so
 * idx === 0 means "this is the first page of the session" — nothing of ours to go
 * back to. In that case we go to a sensible parent instead of leaving. */

import { useNavigate } from 'react-router-dom'

export function useBack(fallback = '/app'): () => void {
  const navigate = useNavigate()
  return () => {
    const idx = (window.history.state?.idx as number | undefined) ?? 0
    if (idx > 0) navigate(-1)
    else navigate(fallback, { replace: true })
  }
}
