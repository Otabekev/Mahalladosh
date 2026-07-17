/** Feed — Mahallam / Viloyatim / O'zbekiston lenses, post cards, floating "new post" button. Route: /app (index). */

import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorNote,
  POST_TYPE_META,
  SegmentedTabs,
  Spinner,
  TypePill,
  timeAgo,
  usePostTypeLabel,
} from '@/components/ui'
import { useStrings } from '@/core/i18n'
import { feedStrings } from '@/core/i18n/feed'
import { useDiscover, usePosts } from '@/core/queries/posts'
import type { DiscoverScope, Post } from '@/core/api/types'

type FeedTab = 'mahalla' | DiscoverScope

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold transition ${
        active ? 'bg-brand text-white' : 'bg-card border border-line text-sub hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}

/** Structured mahalla post — type pill first, task-like. */
function PostCard({ post, onOpen }: { post: Post; onOpen: () => void }) {
  const s = useStrings(feedStrings)
  const helpOpen = post.type === 'help' && post.status === 'open'
  return (
    <Card className={`p-4 mb-3 ${helpOpen ? 'border-l-4 border-l-amber-400' : ''}`} onClick={onOpen}>
      <div className="flex items-center justify-between gap-2">
        <TypePill type={post.type} />
        <span className="text-xs text-sub shrink-0">{timeAgo(post.created_at)}</span>
      </div>
      <h3 className="font-bold text-ink mt-2">{post.title}</h3>
      {post.body && <p className="text-sm text-sub line-clamp-2 mt-0.5">{post.body}</p>}
      <div className="flex items-center justify-between gap-2 mt-3">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar name={post.author.full_name} src={post.author.photo_url} size={24} />
          <span className="text-xs text-ink truncate">{post.author.full_name}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-sub">💬 {post.response_count}</span>
          {post.status === 'resolved' && <Badge color="green">✓ {s.doneBadge}</Badge>}
          {post.status === 'closed' && <Badge color="gray">{s.closedBadge}</Badge>}
        </div>
      </div>
    </Card>
  )
}

/** Share post — author first, social-feed style (used in every lens). */
function ShareCard({ post, onOpen }: { post: Post; onOpen: () => void }) {
  return (
    <Card className="p-4 mb-3" onClick={onOpen}>
      <div className="flex items-center gap-3">
        <Avatar name={post.author.full_name} src={post.author.photo_url} size={36} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-ink truncate">{post.author.full_name}</span>
            <span className="text-xs text-sub shrink-0">{timeAgo(post.created_at)}</span>
          </div>
          {post.author_place && <div className="text-xs text-sub truncate">{post.author_place}</div>}
        </div>
      </div>
      {post.body && <p className="text-[15px] text-ink whitespace-pre-wrap line-clamp-4 mt-2">{post.body}</p>}
      {post.image_url && <img src={post.image_url} alt="" className="rounded-xl w-full max-h-80 object-cover mt-2" />}
      <div className="text-xs text-sub mt-3">💬 {post.response_count}</div>
    </Card>
  )
}

/** Mahallam lens — my mahalla's feed with type-filter chips. */
function MahallaFeed({ onOpen }: { onOpen: (id: number) => void }) {
  const navigate = useNavigate()
  const s = useStrings(feedStrings)
  const typeLabel = usePostTypeLabel()
  const [type, setType] = useState<string | undefined>(undefined)
  const { data: posts, isLoading, error } = usePosts(type)

  return (
    <div>
      <div className="no-scrollbar overflow-x-auto flex gap-2 mb-4 -mx-4 px-4">
        <Chip active={type === undefined} onClick={() => setType(undefined)}>
          {s.allTypes}
        </Chip>
        {Object.entries(POST_TYPE_META).map(([key, meta]) => (
          <Chip key={key} active={type === key} onClick={() => setType(key)}>
            {meta.icon} {typeLabel(key)}
          </Chip>
        ))}
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      )}
      {error && <ErrorNote message={error.message} />}

      {posts && posts.length === 0 && (
        <EmptyState
          icon="📭"
          title={s.emptyFeedTitle}
          action={<Button onClick={() => navigate('/app/new')}>{s.emptyFeedAction}</Button>}
        />
      )}

      {posts?.map((post) =>
        post.type === 'share' ? (
          <ShareCard key={post.id} post={post} onOpen={() => onOpen(post.id)} />
        ) : (
          <PostCard key={post.id} post={post} onOpen={() => onOpen(post.id)} />
        ),
      )}
    </div>
  )
}

/** Viloyatim / O'zbekiston lens — people's share posts only. */
function DiscoverFeed({ scope, onOpen }: { scope: DiscoverScope; onOpen: (id: number) => void }) {
  const s = useStrings(feedStrings)
  const { data: posts, isLoading, error } = useDiscover(scope)

  return (
    <div>
      {isLoading && (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      )}
      {error && <ErrorNote message={error.message} />}

      {posts && posts.length === 0 && (
        <EmptyState icon="🌅" title={s.emptyDiscoverTitle} text={s.emptyDiscoverText} />
      )}

      {posts?.map((post) => (
        <ShareCard key={post.id} post={post} onOpen={() => onOpen(post.id)} />
      ))}
    </div>
  )
}

export default function FeedScreen() {
  const navigate = useNavigate()
  const s = useStrings(feedStrings)
  const [tab, setTab] = useState<FeedTab>('mahalla')
  const openPost = (id: number) => navigate(`/app/posts/${id}`)

  const feedTabs: { value: FeedTab; label: string }[] = [
    { value: 'mahalla', label: s.tabMahalla },
    { value: 'region', label: s.tabRegion },
    { value: 'country', label: s.tabCountry },
  ]

  return (
    <div>
      <div className="mb-4">
        <SegmentedTabs tabs={feedTabs} value={tab} onChange={setTab} />
      </div>

      {tab === 'mahalla' ? <MahallaFeed onOpen={openPost} /> : <DiscoverFeed scope={tab} onOpen={openPost} />}

      <button
        onClick={() => navigate('/app/new')}
        aria-label={s.newPost}
        className="fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full bg-brand text-white text-2xl shadow-pop flex items-center justify-center active:scale-95 transition"
      >
        +
      </button>
    </div>
  )
}
