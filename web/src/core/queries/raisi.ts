/** Raisi-panel mutations (api/app/routers/raisi.py). Gated server-side to the head
 *  of one's own mahalla; the UI only shows these to a user whose me.user.is_raisi. */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/core/api/client'

/** Pin a post to the top of the feed, or unpin the current one (postId = null). */
export function usePinPost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (postId: number | null) =>
      postId === null
        ? api<void>('/raisi/pinned', { method: 'DELETE' })
        : api<void>(`/raisi/pinned/${postId}`, { method: 'PUT' }),
    onSuccess: (_data, postId) => {
      void qc.invalidateQueries({ queryKey: ['posts'] })
      if (postId !== null) void qc.invalidateQueries({ queryKey: ['post', postId] })
    },
  })
}
