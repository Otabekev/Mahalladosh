/** Search inside your own mahalla — posts and services. Route: /app/search.
 *
 *  Typing is debounced rather than searched on every keystroke: these are phones on
 *  village connections, and a request per letter is unkind to both ends. */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBack } from '@/components/useBack'
import { fmt, useStrings } from '@/core/i18n'
import { common } from '@/core/i18n/common'
import { searchStrings } from '@/core/i18n/search'
import { servicesStrings } from '@/core/i18n/services'
import { Badge, Button, Card, EmptyState, ErrorNote, PageTitle, RowSkeleton, SkeletonList, TypePill, timeAgo } from '@/components/ui'
import { useSearch } from '@/core/queries/search'
import type { Post, Service } from '@/core/api/types'

const DEBOUNCE_MS = 350

function SearchInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const s = useStrings(searchStrings)
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sub">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </span>
      <input
        autoFocus
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={s.placeholder}
        aria-label={s.title}
        className="w-full min-h-[52px] rounded-xl border border-line bg-card pl-11 pr-4 py-3 text-[16px] text-ink placeholder:text-sub/60 focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand/40 transition"
      />
    </div>
  )
}

function PostHit({ post, onOpen }: { post: Post; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="w-full text-left">
      <Card className="mb-2 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 text-[15px] font-bold text-ink line-clamp-2">{post.title}</h3>
          <span className="shrink-0">
            <TypePill type={post.type} />
          </span>
        </div>
        {post.body && <p className="mt-1 text-sm text-sub line-clamp-2">{post.body}</p>}
        <div className="mt-1.5 text-xs text-sub">
          {post.author.full_name} · {timeAgo(post.created_at)}
        </div>
      </Card>
    </button>
  )
}

function ServiceHit({ service }: { service: Service }) {
  const sv = useStrings(servicesStrings)
  return (
    <Card className="mb-2 p-3.5">
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 text-[15px] font-bold text-ink line-clamp-2">{service.title}</h3>
        {service.price && <span className="shrink-0 text-sm font-semibold text-good">{service.price}</span>}
      </div>
      <div className="mt-0.5 text-xs text-sub">
        {fmt(sv.householdSuffix, { name: service.household_name })}
      </div>
      {service.description && <p className="mt-1 text-sm text-sub line-clamp-2">{service.description}</p>}
      {service.contact && (
        <a
          href={`tel:${service.contact.replace(/[^+\d]/g, '')}`}
          className="mt-2 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-line bg-white px-3 py-1.5 text-sm font-semibold text-ink transition-all hover:bg-gray-50 active:scale-[0.98]"
        >
          📞 {sv.contact}
        </a>
      )}
    </Card>
  )
}

function Section({ label, count, children }: { label: string; count: number; children: React.ReactNode }) {
  if (count === 0) return null
  return (
    <section className="mb-5">
      <div className="mb-2 flex items-center gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-sub">{label}</h2>
        <Badge>{count}</Badge>
      </div>
      {children}
    </section>
  )
}

export default function SearchScreen() {
  const s = useStrings(searchStrings)
  const c = useStrings(common)
  const navigate = useNavigate()
  const goBack = useBack()
  const [text, setText] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    const t = window.setTimeout(() => setQuery(text), DEBOUNCE_MS)
    return () => window.clearTimeout(t)
  }, [text])

  const { data, isFetching, error } = useSearch(query)
  const asked = query.trim().length >= 2
  const nothing = asked && data && data.posts.length === 0 && data.services.length === 0

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-2 -ml-2" onClick={goBack}>
        {c.back}
      </Button>
      <PageTitle title={s.title} subtitle={s.hint} />

      <div className="mb-4">
        <SearchInput value={text} onChange={setText} />
      </div>

      {error && <ErrorNote message={error.message} />}

      {!asked && <EmptyState icon="🔍" title={s.startTitle} text={s.startText} />}

      {asked && isFetching && !data && (
        <SkeletonList count={3}>
          <RowSkeleton />
        </SkeletonList>
      )}

      {nothing && <EmptyState icon="🤷" title={s.emptyTitle} text={s.emptyText} />}

      {data && (
        <>
          <Section label={s.sectionPosts} count={data.posts.length}>
            {data.posts.map((p) => (
              <PostHit key={p.id} post={p} onOpen={() => navigate(`/app/posts/${p.id}`)} />
            ))}
          </Section>
          <Section label={s.sectionServices} count={data.services.length}>
            {data.services.map((sv) => (
              <ServiceHit key={sv.id} service={sv} />
            ))}
          </Section>
        </>
      )}
    </div>
  )
}
