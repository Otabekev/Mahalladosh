/** Mahalla contacts. Reads are open to any member; writes hit the raisi router and
 *  the server enforces raisi-only (the UI just hides the controls for others). */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/core/api/client'

export interface Contact {
  id: number
  label: string
  name: string | null
  phone: string
}

export interface ContactIn {
  label: string
  name?: string | null
  phone: string
}

export function useContacts(mahallaId?: number) {
  return useQuery({
    queryKey: ['contacts', mahallaId],
    queryFn: () => api<Contact[]>(`/mahallas/${mahallaId}/contacts`),
    enabled: mahallaId !== undefined,
  })
}

export function useAddContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: ContactIn) => api<Contact>('/raisi/contacts', { method: 'POST', body }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['contacts'] }),
  })
}

export function useEditContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: ContactIn }) =>
      api<Contact>(`/raisi/contacts/${id}`, { method: 'PUT', body }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['contacts'] }),
  })
}

export function useDeleteContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api<void>(`/raisi/contacts/${id}`, { method: 'DELETE' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['contacts'] }),
  })
}
