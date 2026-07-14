/** TanStack Query hooks for the operator/admin console (plan §13). */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/core/api/client'
import type { AdminPetition, AdminStats } from '@/core/api/types'

export interface MfyIn {
  district_id: number
  name: string
}

export function useAdminPetitions() {
  return useQuery({
    queryKey: ['admin', 'petitions'],
    queryFn: () => api<AdminPetition[]>('/admin/petitions'),
  })
}

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => api<AdminStats>('/admin/stats'),
  })
}

export function useApprove() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (mahallaId: number) =>
      api<unknown>(`/admin/mahallas/${mahallaId}/approve`, { method: 'POST' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin'] })
      void qc.invalidateQueries({ queryKey: ['mahallas'] })
    },
  })
}

export function useReject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (mahallaId: number) =>
      api<unknown>(`/admin/mahallas/${mahallaId}/reject`, { method: 'POST' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin'] })
      void qc.invalidateQueries({ queryKey: ['mahallas'] })
    },
  })
}

export function useAddMfy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: MfyIn) => api<unknown>('/admin/mfy', { method: 'POST', body }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin'] })
      void qc.invalidateQueries({ queryKey: ['mahallas'] })
    },
  })
}
