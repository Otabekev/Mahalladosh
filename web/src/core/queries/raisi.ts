/** Raisi-panel hooks (api/app/routers/raisi.py). Gated server-side to the head of
 *  one's own mahalla; the UI only shows these to a user whose me.user.is_raisi. */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/core/api/client'
import type { Report } from '@/core/queries/reports'
import type { PostDetail } from '@/core/api/types'

export interface MemberRow {
  id: number
  full_name: string
  photo_url: string | null
  rep_month: number
  rep_alltime: number
  is_raisi: boolean
  banned: boolean
}

/** Pin a post to the top of the feed, or unpin the current one (postId = null). */
export function usePinPost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (postId: number | null) =>
      postId === null
        ? api<void>('/raisi/pinned', { method: 'DELETE' })
        : api<void>(`/raisi/pinned/${postId}`, { method: 'PUT' }),
    // Optimistically flip the detail so the Pin button reacts on tap. (Only the pin
    // case — unpin passes null and the feed reorder is left to the refetch.)
    onMutate: async (postId) => {
      if (postId === null) return
      const key = ['post', postId]
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<PostDetail>(key)
      qc.setQueryData<PostDetail>(key, (old) => (old ? { ...old, pinned: true } : old))
      return { key, prev }
    },
    onError: (_err, _postId, ctx) => {
      if (ctx?.key) qc.setQueryData(ctx.key, ctx.prev)
    },
    onSettled: (_data, _err, postId) => {
      void qc.invalidateQueries({ queryKey: ['posts'] })
      if (postId !== null) void qc.invalidateQueries({ queryKey: ['post', postId] })
    },
  })
}

// ---------- moderation queue ----------

export function useRaisiReports() {
  return useQuery({
    queryKey: ['raisi', 'reports'],
    queryFn: () => api<Report[]>('/raisi/reports'),
  })
}

export function useResolveRaisiReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, action }: { id: number; action: 'resolve' | 'dismiss' }) =>
      api<Report>(`/raisi/reports/${id}/${action}`, { method: 'POST' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['raisi', 'reports'] }),
  })
}

// ---------- roster ----------

export function useRoster() {
  return useQuery({
    queryKey: ['raisi', 'members'],
    queryFn: () => api<MemberRow[]>('/raisi/members'),
  })
}

export function useBanMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: number) => api<MemberRow>(`/raisi/members/${userId}/ban`, { method: 'POST' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['raisi', 'members'] })
      void qc.invalidateQueries({ queryKey: ['raisi', 'reports'] })
    },
  })
}
