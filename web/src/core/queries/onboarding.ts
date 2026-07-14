/** Onboarding data hooks: geo lookups, mahalla search, petition + join mutations. */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/core/api/client'
import type { District, Mahalla, PetitionStatus, Region } from '@/core/api/types'

export function useRegions() {
  return useQuery({
    queryKey: ['geo', 'regions'],
    queryFn: () => api<Region[]>('/geo/regions'),
  })
}

export function useDistricts(regionId?: number) {
  return useQuery({
    queryKey: ['geo', 'districts', regionId ?? null],
    queryFn: () => api<District[]>(`/geo/districts?region_id=${regionId}`),
    enabled: regionId != null,
  })
}

export function useMahallaSearch(districtId?: number, q?: string) {
  const query = (q ?? '').trim()
  return useQuery({
    queryKey: ['mahallas', 'search', districtId ?? null, query],
    queryFn: () => {
      const params = new URLSearchParams({ district_id: String(districtId) })
      if (query) params.set('q', query)
      return api<Mahalla[]>(`/mahallas/search?${params.toString()}`)
    },
    enabled: districtId != null,
  })
}

export function usePetition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ mahallaId, estimated_households }: { mahallaId: number; estimated_households?: number }) =>
      api<PetitionStatus>(`/mahallas/${mahallaId}/petition`, {
        method: 'POST',
        body: { estimated_households: estimated_households ?? null },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['mahallas'] })
    },
  })
}

export function useCancelPetition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (mahallaId: number) => api<void>(`/mahallas/${mahallaId}/petition`, { method: 'DELETE' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['mahallas'] })
    },
  })
}

export function useJoinMahalla() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (mahallaId: number) => api<unknown>(`/mahallas/${mahallaId}/join`, { method: 'POST' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['mahallas'] })
    },
  })
}
