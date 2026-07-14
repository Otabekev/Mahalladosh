/** TanStack Query hooks for the services directory (plan §9-G). */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/core/api/client'
import { useAuth } from '@/core/stores/auth'
import type { Service, ServiceIn, ServiceUpdate } from '@/core/api/types'

export function useServices(category?: string) {
  return useQuery({
    queryKey: ['services', category ?? 'all'],
    queryFn: () =>
      api<Service[]>(`/services${category ? `?category=${encodeURIComponent(category)}` : ''}`),
  })
}

export function useMyServices() {
  const householdId = useAuth((s) => s.me?.user.household_id ?? null)
  return useQuery({
    queryKey: ['services', 'mine'],
    queryFn: () => api<Service[]>('/services/mine'),
    enabled: householdId !== null,
  })
}

export function useCreateService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: ServiceIn) => api<Service>('/services', { method: 'POST', body }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['services'] })
    },
  })
}

export function useUpdateService(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: ServiceUpdate) => api<Service>(`/services/${id}`, { method: 'PATCH', body }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['services'] })
    },
  })
}

export function useDeleteService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api<void>(`/services/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['services'] })
    },
  })
}
