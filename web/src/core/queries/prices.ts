/** «Narx» — the district price board. */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/core/api/client'
import type { PriceBoard, PriceDetail } from '@/core/api/types'

/** Prices move over days, not seconds — unlike the utility board, a few minutes of
 *  staleness here costs nothing and a refetch loop on a village connection does. */
const HOUR = 3600_000

export function usePriceBoard() {
  return useQuery({
    queryKey: ['prices', 'board'],
    queryFn: () => api<PriceBoard>('/prices'),
    staleTime: HOUR,
  })
}

export function usePriceDetail(item: string | null) {
  return useQuery({
    queryKey: ['prices', 'item', item],
    queryFn: () => api<PriceDetail>(`/prices/${item}`),
    enabled: !!item,
  })
}

export function useReportPrice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { item: string; som: number; market?: string | null }) =>
      api<PriceBoard>('/prices', { method: 'POST', body: v }),
    // the server returns the recomputed board, so there is nothing to guess at —
    // a median cannot be updated optimistically without knowing everyone's numbers
    onSuccess: (board, v) => {
      qc.setQueryData(['prices', 'board'], board)
      void qc.invalidateQueries({ queryKey: ['prices', 'item', v.item] })
    },
  })
}

/** "12 000" — thin spaces would break tabular alignment on Android, so plain ones. */
export function formatSom(n: number): string {
  return n.toLocaleString('ru-RU').replace(/\u00a0/g, ' ')
}
