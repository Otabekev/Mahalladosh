/** Public person pages (api/app/routers/users.py). Scoped server-side to the
 *  viewer's own mahalla; a foreign/missing id is a 404. */

import { useQuery } from '@tanstack/react-query'
import type { EarnedBadge } from '@/core/badges'
import { api } from '@/core/api/client'

export interface PublicProfile {
  id: number
  full_name: string
  photo_url: string | null
  is_raisi: boolean
  rep_month: number
  rep_alltime: number
  created_at: string
  household_id: number | null
  household_name: string | null
  post_count: number
  badges: EarnedBadge[]
}

export function useProfile(id?: number) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => api<PublicProfile>(`/users/${id}`),
    enabled: id != null && Number.isFinite(id),
  })
}
