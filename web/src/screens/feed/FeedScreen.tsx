/** Feed — filter chips + post cards + floating "new post" button. Route: /app (index). */

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
  Spinner,
  TypePill,
  timeAgo,
} from '@/components/ui'
import { usePosts } from '@/core/queries/posts'
import type { Post } from '@/core/api/types'

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

function PostCard({ post, onOpen }: { post: Post; onOpen: () => void }) {
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
          {post.status === 'resolved' && <Badge color="green">✓ Bajarildi</Badge>}
          {post.status === 'closed' && <Badge color="gray">Yopilgan</Badge>}
        </div>
      </div>
    </Card>
  )
}

export default function FeedScreen() {
  const navigate = useNavigate()
  const [type, setType] = useState<string | undefined>(undefined)
  const { data: posts, isLoading, error } = usePosts(type)

  return (
    <div>
      <div className="no-scrollbar overflow-x-auto flex gap-2 mb-4 -mx-4 px-4">
        <Chip active={type === undefined} onClick={() => setType(undefined)}>
          Hammasi
        </Chip>
        {Object.entries(POST_TYPE_META).map(([key, meta]) => (
          <Chip key={key} active={type === key} onClick={() => setType(key)}>
            {meta.icon} {meta.label}
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
          title="Hozircha e'lonlar yo'q"
          action={<Button onClick={() => navigate('/app/new')}>Birinchi bo'lib yozing</Button>}
        />
      )}

      {posts?.map((post) => (
        <PostCard key={post.id} post={post} onOpen={() => navigate(`/app/posts/${post.id}`)} />
      ))}

      <button
        onClick={() => navigate('/app/new')}
        aria-label="Yangi e'lon"
        className="fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full bg-brand text-white text-2xl shadow-pop flex items-center justify-center active:scale-95 transition"
      >
        +
      </button>
    </div>
  )
}
