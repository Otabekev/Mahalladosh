/** TanStack Query hooks for the operator/admin console (plan §13, §10). */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/core/api/client'
import type { AdminPetition, AdminStats } from '@/core/api/types'
import type { Report } from '@/core/queries/reports'

export interface MfyIn {
  district_id: number
  name: string
}

export interface AdminUserRow {
  id: number
  full_name: string
  banned_until: string | null
  is_admin: boolean
}

export interface BanIn {
  userId: number
  days?: number | null
  reason?: string | null
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

// ---------- moderation: report queue + takedown/ban ----------

export function useReports() {
  return useQuery({
    queryKey: ['admin', 'reports'],
    queryFn: () => api<Report[]>('/admin/reports'),
  })
}

export function useResolveReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (reportId: number) =>
      api<Report>(`/admin/reports/${reportId}/resolve`, { method: 'POST' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'reports'] })
    },
  })
}

export function useDismissReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (reportId: number) =>
      api<Report>(`/admin/reports/${reportId}/dismiss`, { method: 'POST' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'reports'] })
    },
  })
}

export function useBanUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, days, reason }: BanIn) =>
      api<AdminUserRow>(`/admin/users/${userId}/ban`, {
        method: 'POST',
        body: { days: days ?? null, reason: reason ?? null },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin'] })
    },
  })
}

export function useUnbanUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: number) =>
      api<AdminUserRow>(`/admin/users/${userId}/unban`, { method: 'POST' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin'] })
    },
  })
}
