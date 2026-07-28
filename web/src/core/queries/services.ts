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

// ---------- how an offering is doing (#42) ----------

export interface ServiceStats {
  service_id: number
  views: number
  contacts: number
}

/** Your OWN offerings' numbers. There is no route that returns anyone else's:
 *  publishing "3 views" under a neighbour's listing would tell the whole mahalla
 *  nobody wanted it, which is a cruelty a village directory cannot afford. */
export function useMyServiceStats() {
  const me = useAuth((s) => s.me)
  return useQuery({
    queryKey: ['services', 'stats'],
    queryFn: () => api<ServiceStats[]>('/services/mine/stats'),
    enabled: me?.user.household_id != null,
  })
}

/** Report that offerings were actually on screen. Fire-and-forget: telemetry must
 *  never surface an error to a neighbour who just opened a page. */
export function useRecordViews() {
  return useMutation({
    mutationFn: (ids: number[]) =>
      api<void>('/services/views', { method: 'POST', body: { ids } }),
    onError: () => undefined,
  })
}

/** The neighbour pressed the call button. */
export function useRecordContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api<void>(`/services/${id}/contact`, { method: 'POST' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['services', 'stats'] }),
    onError: () => undefined,
  })
}
