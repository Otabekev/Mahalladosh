/** TanStack Query hooks for the feed (posts + responses). */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/core/api/client'
import type { Post, PostDetail, PostIn } from '@/core/api/types'

export function usePosts(type?: string) {
  return useQuery({
    queryKey: ['posts', type ?? 'all'],
    queryFn: () => api<Post[]>(type ? `/posts?type=${encodeURIComponent(type)}` : '/posts'),
  })
}

export function usePost(id?: number) {
  return useQuery({
    queryKey: ['post', id],
    queryFn: () => api<PostDetail>(`/posts/${id}`),
    enabled: typeof id === 'number' && Number.isFinite(id),
  })
}

export function useCreatePost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: PostIn) => api<Post>('/posts', { method: 'POST', body: input }),
    onSuccess: (post) => {
      void qc.invalidateQueries({ queryKey: ['posts'] })
      void qc.invalidateQueries({ queryKey: ['post', post.id] })
    },
  })
}

export function useRespond(postId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { message?: string | null }) =>
      api<unknown>(`/posts/${postId}/respond`, { method: 'POST', body: input }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['posts'] })
      void qc.invalidateQueries({ queryKey: ['post', postId] })
    },
  })
}

export function useResolve(postId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { helper_user_id?: number | null }) =>
      api<unknown>(`/posts/${postId}/resolve`, { method: 'POST', body: input }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['posts'] })
      void qc.invalidateQueries({ queryKey: ['post', postId] })
    },
  })
}

export function useClosePost(postId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api<unknown>(`/posts/${postId}/close`, { method: 'POST' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['posts'] })
      void qc.invalidateQueries({ queryKey: ['post', postId] })
    },
  })
}
