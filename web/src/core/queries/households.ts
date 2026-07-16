/** Household (xonadon) data hooks — family pages (plan §9-B).
 * Endpoints follow api/app/schemas.py (HouseholdIn/HouseholdUpdate/MemberIn). */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/core/api/client'
import type { DingDongResult, Household, HouseholdIn, HouseholdMember, HouseholdUpdate } from '@/core/api/types'
import { useAuth } from '@/core/stores/auth'

/** Body for POST /households/{id}/members — mirrors backend MemberIn. */
export interface MemberIn {
  full_name: string
  is_elder: boolean
}

export function useHouseholds(mahallaId?: number) {
  return useQuery({
    queryKey: ['households', 'list', mahallaId ?? null],
    queryFn: () =>
      api<Household[]>(mahallaId != null ? `/households?mahalla_id=${mahallaId}` : '/households'),
  })
}

export function useHousehold(id?: number) {
  return useQuery({
    queryKey: ['households', 'detail', id ?? null],
    queryFn: () => api<Household>(`/households/${id}`),
    enabled: typeof id === 'number' && Number.isFinite(id),
  })
}

export function useCreateHousehold() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: HouseholdIn) => api<Household>('/households', { method: 'POST', body }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['households'] })
      await useAuth.getState().refresh()
    },
  })
}

export function useUpdateHousehold(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: HouseholdUpdate) =>
      api<Household>(`/households/${id}`, { method: 'PATCH', body }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['households'] })
      await useAuth.getState().refresh()
    },
  })
}

export function useAddMember(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: MemberIn) =>
      api<HouseholdMember>(`/households/${id}/members`, { method: 'POST', body }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['households'] })
    },
  })
}

export function useRemoveMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (memberId: number) =>
      api<void>(`/households/members/${memberId}`, { method: 'DELETE' }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['households'] })
    },
  })
}

export function useVouch(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api<Household>(`/households/${id}/vouch`, { method: 'POST' }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['households'] })
    },
  })
}

// ---------- DingDong (virtual doorbell) ----------

/** Reads the browser GPS position once. Rejects with an elder-friendly
 * Uzbek message — geolocation needs HTTPS (or localhost) to exist at all. */
export function getPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Joylashuv faqat xavfsiz ulanishda ishlaydi (HTTPS)'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => reject(new Error("Joylashuvni aniqlab bo'lmadi — GPS yoqilganini tekshiring")),
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  })
}

/** POST /households/{id}/location — set house coordinates while standing at home. */
export function useSetLocation(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { lat: number; lng: number }) =>
      api<Household>(`/households/${id}/location`, { method: 'POST', body }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['households'] })
      await useAuth.getState().refresh()
    },
  })
}

/** POST /households/{id}/dingdong — ring a neighbor's doorbell (GPS-checked server-side). */
export function useDingDong(id: number) {
  return useMutation({
    mutationFn: (body: { lat: number; lng: number }) =>
      api<DingDongResult>(`/households/${id}/dingdong`, { method: 'POST', body }),
  })
}
