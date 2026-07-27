/** TanStack Query hooks for the feed (posts + responses + discover). */

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query'
import { api } from '@/core/api/client'
import type { Bugun, DiscoverScope, FeedPage, Poll, Post, PostDetail, PostIn } from '@/core/api/types'

/** Both feeds page the same way: the server hands back a cursor, and a null cursor
 *  is what means "that's everything" — never an item count. */
const pageOpts = {
  initialPageParam: null as string | null,
  getNextPageParam: (last: FeedPage) => last.next_cursor,
}

function withCursor(path: string, cursor: string | null) {
  if (!cursor) return path
  return `${path}${path.includes('?') ? '&' : '?'}cursor=${encodeURIComponent(cursor)}`
}

export function usePosts(type?: string) {
  const path = type ? `/posts?type=${encodeURIComponent(type)}` : '/posts'
  return useInfiniteQuery({
    queryKey: ['posts', type ?? 'all'],
    queryFn: ({ pageParam }) => api<FeedPage>(withCursor(path, pageParam)),
    ...pageOpts,
  })
}

/** People's share posts beyond the mahalla — the viewer picks the lens. */
export function useDiscover(scope: DiscoverScope) {
  return useInfiniteQuery({
    queryKey: ['discover', scope],
    queryFn: ({ pageParam }) => api<FeedPage>(withCursor(`/posts/discover?scope=${scope}`, pageParam)),
    ...pageOpts,
  })
}

/** The daily briefing. Counted server-side across the whole mahalla — deriving it
 *  from the loaded posts would quietly become "…on the first page". */
export function useBugun() {
  return useQuery({ queryKey: ['bugun'], queryFn: () => api<Bugun>('/posts/bugun') })
}

/** Flatten the pages a feed query returns into the list a screen renders. */
export function feedItems(data: InfiniteData<FeedPage> | undefined): Post[] {
  return data?.pages.flatMap((p) => p.items) ?? []
}

/** Anything that adds, resolves, closes or removes a post changes all three feed
 *  surfaces. Kept in one place so the Bugun card can't be the one that gets
 *  forgotten and goes on claiming help that is already handled. */
function invalidateFeeds(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: ['posts'] })
  void qc.invalidateQueries({ queryKey: ['discover'] })
  void qc.invalidateQueries({ queryKey: ['bugun'] })
  void qc.invalidateQueries({ queryKey: ['upcoming'] })
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
      invalidateFeeds(qc)
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
    // the feed caches hold pages, not a flat list, so patch inside each page
    const patch = (old: InfiniteData<FeedPage> | undefined) =>
      old && { ...old, pages: old.pages.map((pg) => ({ ...pg, items: pg.items.map(set) })) }
    qc.setQueriesData<InfiniteData<FeedPage>>({ queryKey: ['posts'] }, patch)
    qc.setQueriesData<InfiniteData<FeedPage>>({ queryKey: ['discover'] }, patch)
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
        for (const [, feed] of qc.getQueriesData<InfiniteData<FeedPage>>({ queryKey: ['posts'] })) {
          const found = feed?.pages.flatMap((pg) => pg.items).find((p) => p.id === id)
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
      invalidateFeeds(qc)
      void qc.invalidateQueries({ queryKey: ['post', id] })
    },
  })
}

/** Answer a quick poll. Optimistic, like Rahmat: the bars move on tap and the
 *  server's authoritative tallies replace the guess a moment later. */
export function useVote(postId: number) {
  const qc = useQueryClient()

  const write = (poll: Poll) => {
    const set = (p: Post) => (p.id === postId ? { ...p, poll } : p)
    const patch = (old: InfiniteData<FeedPage> | undefined) =>
      old && { ...old, pages: old.pages.map((pg) => ({ ...pg, items: pg.items.map(set) })) }
    qc.setQueriesData<InfiniteData<FeedPage>>({ queryKey: ['posts'] }, patch)
    qc.setQueryData<PostDetail>(['post', postId], (old) => old && { ...old, poll })
  }

  return useMutation({
    mutationFn: (optionId: number) =>
      api<Poll>(`/posts/${postId}/vote`, { method: 'POST', body: { option_id: optionId } }),
    onMutate: (optionId) => {
      const current =
        qc.getQueryData<PostDetail>(['post', postId])?.poll ??
        qc
          .getQueriesData<InfiniteData<FeedPage>>({ queryKey: ['posts'] })
          .flatMap(([, feed]) => feed?.pages.flatMap((pg) => pg.items) ?? [])
          .find((p) => p.id === postId)?.poll
      if (!current) return
      // moving a vote must not inflate the total — only a first vote adds to it
      const had = current.my_option_id
      write({
        ...current,
        my_option_id: optionId,
        total_votes: current.total_votes + (had === null ? 1 : 0),
        options: current.options.map((o) => ({
          ...o,
          votes: o.votes + (o.id === optionId ? 1 : 0) - (o.id === had ? 1 : 0),
        })),
      })
    },
    onSuccess: (poll) => write(poll),
    onError: () => {
      void qc.invalidateQueries({ queryKey: ['posts'] })
      void qc.invalidateQueries({ queryKey: ['post', postId] })
    },
  })
}

/** What is coming up, soonest first. Events sink in a reverse-chronological feed,
 *  which is backwards for the one post type whose value is that it hasn't happened. */
export function useUpcoming() {
  return useQuery({ queryKey: ['upcoming'], queryFn: () => api<Post[]>('/posts/upcoming') })
}

/** Take back "I'm coming". Events only — the server refuses on a help request,
 *  where the same row is the offer that resolution reads. */
export function useWithdrawRsvp(postId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api<PostDetail>(`/posts/${postId}/respond`, { method: 'DELETE' }),
    onSuccess: (detail) => {
      qc.setQueryData(['post', postId], detail)
      invalidateFeeds(qc)
      void qc.invalidateQueries({ queryKey: ['upcoming'] })
    },
  })
}

/** Report how much a collection has raised. Author-only on the server. */
export function useUpdateCharity(postId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (collected: number) =>
      api<PostDetail>(`/posts/${postId}/charity`, { method: 'PATCH', body: { collected } }),
    onSuccess: (detail) => {
      qc.setQueryData(['post', postId], detail)
      invalidateFeeds(qc)
    },
  })
}

export function useRespond(postId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { message?: string | null }) =>
      api<unknown>(`/posts/${postId}/respond`, { method: 'POST', body: input }),
    onSuccess: () => {
      invalidateFeeds(qc)
      void qc.invalidateQueries({ queryKey: ['post', postId] })
    },
  })
}

export function useUpdatePost(postId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { title?: string; body?: string }) =>
      api<PostDetail>(`/posts/${postId}`, { method: 'PATCH', body }),
    onSuccess: (detail) => {
      qc.setQueryData(['post', postId], detail)
      invalidateFeeds(qc)
    },
  })
}

export function useDeletePost(postId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api<void>(`/posts/${postId}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.removeQueries({ queryKey: ['post', postId] })
      invalidateFeeds(qc)
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
      invalidateFeeds(qc)
      void qc.invalidateQueries({ queryKey: ['post', postId] })
    },
  })
}

export function useClosePost(postId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api<unknown>(`/posts/${postId}/close`, { method: 'POST' }),
    onSuccess: () => {
      invalidateFeeds(qc)
      void qc.invalidateQueries({ queryKey: ['post', postId] })
    },
  })
}
