/** Proposals (governance) data hooks — list, detail, create, second, vote. */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/core/api/client'
import { useAuth } from '@/core/stores/auth'
import type { Proposal, ProposalIn } from '@/core/api/types'

export function useProposals(filter?: 'active' | 'done') {
  return useQuery({
    queryKey: ['proposals', filter ?? 'all'],
    queryFn: () => api<Proposal[]>(filter ? `/proposals?status=${filter}` : '/proposals'),
  })
}

export function useProposal(id?: number) {
  return useQuery({
    queryKey: ['proposals', id],
    queryFn: () => api<Proposal>(`/proposals/${id}`),
    enabled: id !== undefined && Number.isFinite(id),
  })
}

export function useCreateProposal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: ProposalIn) => api<Proposal>('/proposals', { method: 'POST', body }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['proposals'] })
    },
  })
}

export function useSecond(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api<Proposal>(`/proposals/${id}/second`, { method: 'POST' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['proposals'] })
    },
  })
}

export function useVote(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { choice: boolean }) => api<Proposal>(`/proposals/${id}/vote`, { method: 'POST', body }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['proposals'] })
      // A closing vote can apply set_raisi / ban_user — refresh my membership state.
      useAuth
        .getState()
        .refresh()
        .catch(() => undefined)
    },
  })
}
