/** TanStack Query hooks for the feed (posts + responses + discover). */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/core/api/client'
import type { DiscoverScope, Post, PostDetail, PostIn } from '@/core/api/types'

export function usePosts(type?: string) {
  return useQuery({
    queryKey: ['posts', type ?? 'all'],
    queryFn: () => api<Post[]>(type ? `/posts?type=${encodeURIComponent(type)}` : '/posts'),
  })
}

/** People's share posts beyond the mahalla — the viewer picks the lens. */
export function useDiscover(scope: DiscoverScope) {
  return useQuery({
    queryKey: ['discover', scope],
    queryFn: () => api<Post[]>(`/posts/discover?scope=${scope}`),
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
      void qc.invalidateQueries({ queryKey: ['discover'] })
      void qc.invalidateQueries({ queryKey: ['post', post.id] })
    },
  })
}

/** Toggle 🤲 Rahmat on a post, optimistically. The button reacts on tap; the POST
 *  returns the authoritative {count, mine} which we then pin exactly. */
export function useToggleRahmat() {
  const qc = useQueryClient()

  const write = (id: number, mine: boolean, count: number) => {
    const set = (p: Post) => (p.id === id ? { ...p, my_rahmat: mine, rahmat_count: count } : p)
    qc.setQueriesData<Post[]>({ queryKey: ['posts'] }, (old) => old?.map(set))
    qc.setQueriesData<Post[]>({ queryKey: ['discover'] }, (old) => old?.map(set))
    qc.setQueryData<PostDetail>(['post', id], (old) =>
      old ? { ...old, my_rahmat: mine, rahmat_count: count } : old,
    )
  }

  return useMutation({
    mutationFn: (id: number) =>
      api<{ count: number; mine: boolean }>(`/posts/${id}/rahmat`, { method: 'POST' }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['post', id] })
      // read current state from whichever cache has this post
      let current: Post | PostDetail | undefined = qc.getQueryData<PostDetail>(['post', id])
      if (!current) {
        for (const [, list] of qc.getQueriesData<Post[]>({ queryKey: ['posts'] })) {
          const found = list?.find((p) => p.id === id)
          if (found) {
            current = found
            break
          }
        }
      }
      const mine = !(current?.my_rahmat ?? false)
      const count = Math.max(0, (current?.rahmat_count ?? 0) + (mine ? 1 : -1))
      write(id, mine, count)
    },
    // the server is the source of truth for the exact count (concurrent givers)
    onSuccess: (res, id) => write(id, res.mine, res.count),
    onError: (_err, id) => {
      // our optimistic guess may be wrong now — refetch the truth
      void qc.invalidateQueries({ queryKey: ['posts'] })
      void qc.invalidateQueries({ queryKey: ['discover'] })
      void qc.invalidateQueries({ queryKey: ['post', id] })
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
      void qc.invalidateQueries({ queryKey: ['discover'] })
      void qc.invalidateQueries({ queryKey: ['post', postId] })
    },
  })
}

export function useAddComment(postId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: string) =>
      api<PostDetail>(`/posts/${postId}/comments`, { method: 'POST', body: { body } }),
    onSuccess: (detail) => {
      qc.setQueryData(['post', postId], detail) // server returns the fresh thread
      void qc.invalidateQueries({ queryKey: ['posts'] }) // comment_count on the feed
    },
  })
}

export function useDeleteComment(postId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (commentId: number) =>
      api<PostDetail>(`/posts/${postId}/comments/${commentId}`, { method: 'DELETE' }),
    onSuccess: (detail) => {
      qc.setQueryData(['post', postId], detail)
      void qc.invalidateQueries({ queryKey: ['posts'] })
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
      void qc.invalidateQueries({ queryKey: ['discover'] })
      void qc.invalidateQueries({ queryKey: ['post', postId] })
    },
  })
}
