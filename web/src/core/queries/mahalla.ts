/** Mahalla queries: detail, members, leaderboard. */

import { useQuery } from '@tanstack/react-query'
import { api } from '@/core/api/client'
import type { Leaderboard, MahallaDetail, User } from '@/core/api/types'

export function useMahallaDetail(id?: number) {
  return useQuery({
    queryKey: ['mahallas', id],
    queryFn: () => api<MahallaDetail>(`/mahallas/${id}`),
    enabled: id !== undefined,
  })
}

export function useMembers(mahallaId?: number) {
  return useQuery({
    queryKey: ['mahallas', mahallaId, 'members'],
    queryFn: () => api<User[]>(`/mahallas/${mahallaId}/members`),
    enabled: mahallaId !== undefined,
  })
}

export function useLeaderboard(mahallaId?: number) {
  return useQuery({
    queryKey: ['mahallas', mahallaId, 'leaderboard'],
    queryFn: () => api<Leaderboard>(`/mahallas/${mahallaId}/leaderboard`),
    enabled: mahallaId !== undefined,
  })
}
