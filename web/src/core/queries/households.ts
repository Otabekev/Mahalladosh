/** Household (xonadon) data hooks — family pages (plan §9-B).
 * Endpoints follow api/app/schemas.py (HouseholdIn/HouseholdUpdate/MemberIn). */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/core/api/client'
import type { DingDongResult, Household, HouseholdIn, HouseholdMember, HouseholdUpdate, User } from '@/core/api/types'
import { useAuth } from '@/core/stores/auth'

/** Body for POST /households/{id}/members — mirrors backend MemberIn. */
export interface MemberIn {
  full_name: string
  is_elder: boolean
}

/** A single household read (GET /households/{id}) carries the viewer's own
 * pending-join flag on top of the shared Household shape (backend HouseholdOut). */
export interface HouseholdDetail extends Household {
  has_pending_join: boolean
}

/** A pending join request shown to stewards (backend JoinRequestOut).
 * claim_member_name is set when the requester is claiming a named row the family
 * listed (e.g. 'Alisher'), so the steward knows who they say they are. */
export interface JoinRequest {
  id: number
  user: User
  claim_member_name?: string | null
  created_at: string
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
    queryFn: () => api<HouseholdDetail>(`/households/${id}`),
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

export function useAddPhotos(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (urls: string[]) =>
      api<Household>(`/households/${id}/photos`, { method: 'POST', body: { urls } }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['households'] })
    },
  })
}

export function useDeletePhoto(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (imageId: number) =>
      api<Household>(`/households/${id}/photos/${imageId}`, { method: 'DELETE' }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['households'] })
    },
  })
}

// ---------- join / claim / stewardship ----------

/** POST /households/{id}/join-request — ask a family's stewards to let you in. */
export function useJoinRequest(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (note?: string) =>
      api<HouseholdDetail>(`/households/${id}/join-request`, {
        method: 'POST',
        body: { note: note ?? null },
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['households'] })
      await useAuth.getState().refresh()
    },
  })
}

/** GET /households/{id}/join-requests — pending requests, for stewards only. */
export function useJoinRequests(id: number, enabled = true) {
  return useQuery({
    queryKey: ['households', 'join-requests', id],
    queryFn: () => api<JoinRequest[]>(`/households/${id}/join-requests`),
    enabled: enabled && Number.isFinite(id),
  })
}

/** POST /households/{id}/join-requests/{reqId}/approve — steward accepts. */
export function useApproveJoin(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (reqId: number) =>
      api<Household>(`/households/${id}/join-requests/${reqId}/approve`, { method: 'POST' }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['households'] })
      await useAuth.getState().refresh()
    },
  })
}

/** POST /households/{id}/join-requests/{reqId}/decline — steward declines. */
export function useDeclineJoin(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (reqId: number) =>
      api<Household>(`/households/${id}/join-requests/${reqId}/decline`, { method: 'POST' }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['households'] })
      await useAuth.getState().refresh()
    },
  })
}

/** POST /households/{id}/claim — link yourself to a named member row the family
 * already added (no steward approval needed). */
export function useClaimMember(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (memberId: number) =>
      api<HouseholdDetail>(`/households/${id}/claim`, {
        method: 'POST',
        body: { member_id: memberId },
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['households'] })
      await useAuth.getState().refresh()
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
