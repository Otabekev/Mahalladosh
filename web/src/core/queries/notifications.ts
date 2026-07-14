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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
}
