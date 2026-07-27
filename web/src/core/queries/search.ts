/** In-mahalla search (#38). */

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '@/core/api/client'
import type { Post, Service } from '@/core/api/types'

export interface SearchResults {
  query: string
  posts: Post[]
  services: Service[]
}

export function useSearch(query: string) {
  const q = query.trim()
  return useQuery({
    queryKey: ['search', q],
    queryFn: () => api<SearchResults>(`/search?q=${encodeURIComponent(q)}`),
    enabled: q.length >= 2, // the server ignores shorter queries anyway
    // hold the previous results while the next ones load, so the list does not
    // blink empty on every keystroke
    placeholderData: keepPreviousData,
  })
}
