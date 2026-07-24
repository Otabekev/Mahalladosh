/** TanStack Query hook for community reporting (plan §10 moderation). */

import { useMutation } from '@tanstack/react-query'
import { api } from '@/core/api/client'
import type { User } from '@/core/api/types'

export type ReportTargetType = 'post' | 'service' | 'household' | 'user'
export type ReportReason = 'spam' | 'abuse' | 'fake' | 'other'

export interface ReportIn {
  target_type: ReportTargetType
  target_id: number
  reason: ReportReason
  note?: string | null
}

export interface Report {
  id: number
  reporter: User
  target_type: ReportTargetType
  target_id: number
  reason: ReportReason
  note: string | null
  status: string
  created_at: string
  target_label: string
}

/** File a report. Nothing to invalidate — the reporter sees only a thank-you. */
export function useReport() {
  return useMutation({
    mutationFn: (body: ReportIn) => api<Report>('/reports', { method: 'POST', body }),
  })
}
