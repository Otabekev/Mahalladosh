/** Away members — the family working abroad.
 *
 *  Note there is exactly one read hook for the away member's own view. That is a
 *  security property, not a convenience: their entire readable surface is a single
 *  endpoint, so nothing can be added to it by accident from the client side. */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/core/api/client'
import { useAuth } from '@/core/stores/auth'
import type { AwayHome, AwayRequest } from '@/core/api/types'

export function useAwayHome() {
  return useQuery({ queryKey: ['away', 'home'], queryFn: () => api<AwayHome>('/away/home') })
}

/** Steward side: who has asked to be linked, and who already is. */
export function useAwayRequests() {
  return useQuery({
    queryKey: ['away', 'requests'],
    queryFn: () => api<AwayRequest[]>('/away/requests'),
  })
}

export function useCreateAwayInvite() {
  return useMutation({
    mutationFn: () => api<{ token: string; expires_hours: number }>('/away/invite', { method: 'POST' }),
  })
}

export function useJoinAway() {
  const refresh = useAuth((s) => s.refresh)
  return useMutation({
    mutationFn: (v: { token: string; country?: string | null }) =>
      api<{ status: string }>('/away/join', { method: 'POST', body: v }),
    // /auth/me carries away_status, and the router reads it to decide where to send
    // someone — so it has to be re-read before we navigate
    onSuccess: () => refresh(),
  })
}

export function useApproveAway() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api(`/away/requests/${id}/approve`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['away'] }),
  })
}

export function useRevokeAway() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api<void>(`/away/requests/${id}/revoke`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['away'] }),
  })
}

export function useLeaveAway() {
  const refresh = useAuth((s) => s.refresh)
  return useMutation({
    mutationFn: () => api<void>('/away/link', { method: 'DELETE' }),
    onSuccess: () => refresh(),
  })
}
