import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { useAuth } from '../stores/auth'
import type { Notifications } from '../api/types'

/** Polled from the app header — this is the hyperlocal retention loop (plan §9-H).
 * Keyed by user id so one user's cache never leaks to the next login, and
 * disabled entirely while logged out. */
export function useNotifications() {
  const userId = useAuth((s) => s.me?.user.id)
  return useQuery({
    queryKey: ['notifications', userId],
    queryFn: () => api<Notifications>('/notifications'),
    refetchInterval: 30_000,
    enabled: userId != null,
  })
}

export function useMarkAllRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api<void>('/notifications/read', { method: 'POST' }),
    // Optimistic: clear the unread badge the instant the screen opens, don't wait
    // for the round-trip. On a village connection that wait is exactly when the app
    // feels sluggish; the server call still runs and reconciles on settle.
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['notifications'] })
      const prev = qc.getQueriesData<Notifications>({ queryKey: ['notifications'] })
      qc.setQueriesData<Notifications>({ queryKey: ['notifications'] }, (old) =>
        old ? { ...old, unread: 0, items: old.items.map((n) => ({ ...n, read: true })) } : old,
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      // put the real state back if the server rejected us
      ctx?.prev?.forEach(([key, data]) => qc.setQueryData(key, data))
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
}
