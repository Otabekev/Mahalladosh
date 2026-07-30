/** «Chiroq bormi?» — the live utility board.
 *
 *  Refetch policy is deliberately more aggressive than anywhere else in the app.
 *  This screen answers a question about *right now*, and a cached tally from twenty
 *  minutes ago is worse than no tally: it would tell someone the street is fine
 *  while they sit in the dark. Everything else here can be stale; this cannot.
 */

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { api } from '@/core/api/client'
import type { UtilityBoard, UtilityKind, UtilityLog, UtilityStatus } from '@/core/api/types'

/** Live for one minute. Long enough to survive a screen re-mount, short enough that
 *  a neighbour tapping "menda bor" shows up before anyone gives up waiting. */
const LIVE_MS = 60_000

export function useUtilityBoard() {
  return useQuery({
    queryKey: ['utility', 'board'],
    queryFn: () => api<UtilityBoard>('/utility/board'),
    staleTime: LIVE_MS,
    refetchInterval: LIVE_MS,
    // village connections drop constantly; coming back to the app must re-ask
    refetchOnWindowFocus: true,
  })
}

export function useUtilityLog(kind: UtilityKind, month?: string) {
  const q = month ? `&month=${month}` : ''
  return useQuery({
    queryKey: ['utility', 'log', kind, month ?? 'current'],
    queryFn: () => api<UtilityLog>(`/utility/log?kind=${kind}${q}`),
  })
}

export function statusFor(board: UtilityBoard | undefined, kind: UtilityKind): UtilityStatus {
  return (
    board?.statuses.find((s) => s.kind === kind) ?? {
      kind,
      out: 0,
      on: 0,
      answered: 0,
      my_state: null,
      my_reported_at: null,
      since: null,
      streets: [],
    }
  )
}

/** What the tally becomes the instant you tap, before the server answers.
 *
 *  Pure and exported so it can be tested: the subtle rule is that re-tapping the
 *  state you already reported must change nothing, and switching states must MOVE
 *  your vote rather than add a second one. Getting that wrong does not look like a
 *  bug — the numbers stay plausible and simply drift. */
export function applyMyReport(status: UtilityStatus, isOut: boolean): UtilityStatus {
  const was = status.my_state
  const next = isOut ? 'out' : 'on'
  if (was === next) return status
  return {
    ...status,
    my_state: next,
    out: Math.max(0, status.out + (isOut ? 1 : 0) - (was === 'out' ? 1 : 0)),
    on: Math.max(0, status.on + (isOut ? 0 : 1) - (was === 'on' ? 1 : 0)),
    answered: was === null ? status.answered + 1 : status.answered,
  }
}

export function useReportUtility() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { kind: UtilityKind; is_out: boolean }) =>
      api<UtilityBoard>('/utility/report', { method: 'POST', body: v }),
    onMutate: ({ kind, is_out }) => {
      // the tap must feel instant — this screen is used while standing in the dark
      qc.setQueryData<UtilityBoard>(['utility', 'board'], (old) =>
        old
          ? {
              ...old,
              statuses: old.statuses.map((s) => (s.kind === kind ? applyMyReport(s, is_out) : s)),
            }
          : old,
      )
    },
    // the server returns the authoritative board (other people reported meanwhile)
    onSuccess: (board) => qc.setQueryData(['utility', 'board'], board),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['utility', 'log'] })
    },
    onError: () => {
      void qc.invalidateQueries({ queryKey: ['utility', 'board'] })
    },
  })
}

function invalidateBoard(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: ['utility'] })
  void qc.invalidateQueries({ queryKey: ['notifications'] })
}

export function useAddUtilityWindow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { kind: UtilityKind; starts_at: string; ends_at: string; note?: string }) =>
      api('/utility/windows', { method: 'POST', body: v }),
    onSuccess: () => invalidateBoard(qc),
  })
}

export function useDeleteUtilityWindow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api<void>(`/utility/windows/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidateBoard(qc),
  })
}
