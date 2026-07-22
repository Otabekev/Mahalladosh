/** Feed — Mahallam / Viloyatim / O'zbekiston lenses. A "Bugun" digest, a composer strip,
 *  and one warm author-first card style (open help gets the urgent treatment). Route: /app (index). */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  ErrorNote,
  Spinner,
  TypePill,
  timeAgo,
} from '@/components/ui'
import { fmt, useStrings } from '@/core/i18n'
import { feedStrings } from '@/core/i18n/feed'
import { useDiscover, usePosts } from '@/core/queries/posts'
import { useAuth } from '@/core/stores/auth'
import type { DiscoverScope, Post } from '@/core/api/types'
import { BugunCard } from './BugunCard'

type FeedTab = 'mahalla' | DiscoverScope

// ---------- small inline icons (match the mockup) ----------

function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FBF3E2" strokeWidth="2.2" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function CommentIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function HeartIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s-7-4.5-9.5-9A5 5 0 0 1 12 6a5 5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z" />
    </svg>
  )
}

// ---------- scope tabs (Mahallam / Viloyatim / O'zbekiston) ----------

function ScopeTabs({
  tabs,
  value,
  onChange,
}: {
  tabs: { value: FeedTab; label: string }[]
  value: FeedTab
  onChange: (v: FeedTab) => void
}) {
  return (
    <div className="flex gap-2">
      {tabs.map((t) => {
        const active = t.value === value
        return (
          <button
            key={t.value}
            onClick={() => onChange(t.value)}
            className={`flex-1 min-h-[44px] flex items-center justify-center rounded-xl px-2 text-[15px] whitespace-nowrap transition ${
              active
                ? 'bg-brand text-[#FBF3E2] font-bold shadow-card'
                : 'bg-card text-sub border border-line font-semibold hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

// ---------- composer strip (primary "new post" affordance) ----------

function Composer() {
  const navigate = useNavigate()
  const s = useStrings(feedStrings)
  const me = useAuth((st) => st.me)
  const fullName = me?.user.full_name ?? ''
  const firstName = fullName.split(' ')[0] || fullName

  return (
    <button
      onClick={() => navigate('/app/new')}
      className="w-full flex items-center gap-3 bg-card border border-line rounded-2xl px-3.5 py-3 text-left active:scale-[0.99] transition"
    >
      <Avatar name={fullName || '?'} src={me?.user.photo_url} size={42} />
      <span className="flex-1 min-w-0 truncate text-[16px] text-sub">{fmt(s.composerPrompt, { name: firstName })}</span>
      <span className="w-11 h-11 rounded-xl bg-brand flex items-center justify-center shrink-0">
        <PlusIcon />
      </span>
    </button>
  )
}

// ---------- warm card — one author-first style for every post ----------

function WarmCard({ post, onOpen }: { post: Post; onOpen: () => void }) {
  const showTitle = post.type !== 'share' && !!post.title

  return (
    <Card className="p-0 overflow-hidden" onClick={onOpen}>
      <div className="flex items-center gap-3 px-4 pt-3.5 pb-3">
        <Avatar name={post.author.full_name} src={post.author.photo_url} size={46} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-[16px] text-ink truncate">{post.author.full_name}</span>
            <span className="text-xs text-sub shrink-0">{timeAgo(post.created_at)}</span>
          </div>
          {post.author_place && <div className="text-xs text-sub truncate">{post.author_place}</div>}
        </div>
      </div>

      {post.image_url && <img src={post.image_url} alt="" className="w-full aspect-[16/10] object-cover" />}

      <div className={`px-4 pb-3.5 ${post.image_url ? 'pt-3' : ''}`}>
        {showTitle && (
          <>
            <div className="mb-1.5">
              <TypePill type={post.type} />
            </div>
            <h3 className="font-bold text-[17px] leading-snug text-ink">{post.title}</h3>
          </>
        )}
        {post.body && (
          <p className="mt-1 text-[16px] leading-relaxed text-ink whitespace-pre-wrap line-clamp-6">{post.body}</p>
        )}
        <div className="mt-3 flex items-center gap-1.5 text-sub">
          <CommentIcon />
          <span className="text-[15px] font-semibold">{post.response_count}</span>
        </div>
      </div>
    </Card>
  )
}

// ---------- open-help card — the urgent, mutual-aid treatment ----------

function HelpCard({ post, onOpen }: { post: Post; onOpen: () => void }) {
  const s = useStrings(feedStrings)

  return (
    <div
      onClick={onOpen}
      className="relative overflow-hidden bg-brand-soft border-[1.5px] border-[#E7B79E] rounded-2xl p-4 shadow-card cursor-pointer"
    >
      <div className="absolute top-0 inset-x-0 h-[5px] bg-brand" />
      <span className="inline-flex items-center gap-1.5 bg-brand text-[#FBF3E2] font-bold text-[13px] rounded-full px-3 py-1.5 mb-3">
        <HeartIcon /> {s.helpRequesting}
      </span>

      <div className="flex items-center gap-3">
        <Avatar name={post.author.full_name} src={post.author.photo_url} size={46} />
        <div className="min-w-0 flex-1">
          <div className="font-bold text-[16px] text-ink truncate">{post.author.full_name}</div>
          <div className="text-xs text-sub truncate">
            {post.author_place ? `${post.author_place} · ` : ''}
            {timeAgo(post.created_at)}
          </div>
        </div>
      </div>

      <p className="mt-3 text-[17px] leading-relaxed text-ink">{post.title}</p>
      {post.body && <p className="mt-1 text-[16px] leading-relaxed text-ink/80 whitespace-pre-wrap line-clamp-4">{post.body}</p>}

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onOpen()
        }}
        className="w-full h-12 rounded-xl bg-brand text-[#FBF3E2] font-bold text-[16px] mt-3 active:scale-[0.99] transition"
      >
        {s.iWillHelp}
      </button>
    </div>
  )
}

function FeedCard({ post, onOpen }: { post: Post; onOpen: () => void }) {
  return post.type === 'help' && post.status === 'open' ? (
    <HelpCard post={post} onOpen={onOpen} />
  ) : (
    <WarmCard post={post} onOpen={onOpen} />
  )
}

// ---------- Mahallam lens — Bugun digest + composer + warm cards ----------

function MahallaFeed({ onOpen }: { onOpen: (id: number) => void }) {
  const navigate = useNavigate()
  const s = useStrings(feedStrings)
  const { data: posts, isLoading, error } = usePosts()

  return (
    <div className="space-y-3.5">
      <BugunCard posts={posts ?? []} />
      <Composer />

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

      {posts?.map((post) => <FeedCard key={post.id} post={post} onOpen={() => onOpen(post.id)} />)}
    </div>
  )
}

// ---------- Viloyatim / O'zbekiston lens — people's share posts ----------

function DiscoverFeed({ scope, onOpen }: { scope: DiscoverScope; onOpen: (id: number) => void }) {
  const s = useStrings(feedStrings)
  const { data: posts, isLoading, error } = useDiscover(scope)

  return (
    <div className="space-y-3.5">
      {isLoading && (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      )}
      {error && <ErrorNote message={error.message} />}

      {posts && posts.length === 0 && <EmptyState icon="🌅" title={s.emptyDiscoverTitle} text={s.emptyDiscoverText} />}

      {posts?.map((post) => <WarmCard key={post.id} post={post} onOpen={() => onOpen(post.id)} />)}
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
      <div className="mb-3.5">
        <ScopeTabs tabs={feedTabs} value={tab} onChange={setTab} />
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
