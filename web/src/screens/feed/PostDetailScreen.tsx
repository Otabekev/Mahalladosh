/** Post detail — full post, responses, respond box, author controls. Route: /app/posts/:id. */

import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Avatar,
  Button,
  Card,
  ErrorNote,
  Modal,
  Spinner,
  Textarea,
  TypePill,
  timeAgo,
} from '@/components/ui'
import { useAuth } from '@/core/stores/auth'
import { useClosePost, usePost, useResolve, useRespond } from '@/core/queries/posts'
import type { PostDetail, PostType } from '@/core/api/types'

function formatEventDate(iso: string): string {
  const d = new Date(iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z')
  return d.toLocaleDateString('uz', { day: 'numeric', month: 'long', year: 'numeric' }) +
    ', ' +
    d.toLocaleTimeString('uz', { hour: '2-digit', minute: '2-digit' })
}

const RESPOND_PLACEHOLDER: Partial<Record<PostType, string>> = {
  help: 'Qanday yordam bera olasiz?',
  newcomer: 'Xush kelibsiz deb yozing',
  event: 'Kelasizmi?',
}

function respondLabel(type: PostType): string {
  if (type === 'help') return '🤝 Yordam beraman'
  if (type === 'event') return '✅ Qatnashaman'
  if (type === 'newcomer') return '👋 Xush kelibsiz'
  return 'Javob berish'
}

function ResolveModal({
  post,
  open,
  onClose,
  postId,
}: {
  post: PostDetail
  open: boolean
  onClose: () => void
  postId: number
}) {
  const [helperId, setHelperId] = useState<number | null>(null)
  const resolve = useResolve(postId)

  // one row per unique responder
  const responders = post.responses.filter(
    (r, i, arr) => arr.findIndex((x) => x.user.id === r.user.id) === i,
  )

  const confirm = () => {
    if (helperId === null) return
    resolve.mutate(
      { helper_user_id: helperId },
      {
        onSuccess: () => {
          onClose()
          void useAuth.getState().refresh()
        },
      },
    )
  }

  return (
    <Modal open={open} onClose={onClose} title="Kim yordam berdi?">
      {resolve.error && <ErrorNote message={resolve.error.message} />}
      {responders.length === 0 && <p className="text-sm text-sub mb-4">Hali hech kim javob bermagan.</p>}
      {responders.map((r) => (
        <button
          key={r.user.id}
          type="button"
          onClick={() => setHelperId(r.user.id)}
          className={`w-full flex items-center gap-3 p-3 mb-2 text-left rounded-xl border border-line bg-card ${
            helperId === r.user.id ? 'ring-2 ring-brand' : ''
          }`}
        >
          <Avatar name={r.user.full_name} src={r.user.photo_url} size={32} />
          <span className="text-sm font-semibold text-ink">{r.user.full_name}</span>
        </button>
      ))}
      <p className="text-sm text-sub mb-3">Tanlangan qo'shni +10 ball oladi</p>
      <Button full onClick={confirm} disabled={helperId === null} loading={resolve.isPending}>
        Tasdiqlash
      </Button>
    </Modal>
  )
}

export default function PostDetailScreen() {
  const { id } = useParams()
  const postId = Number(id)
  const navigate = useNavigate()
  const me = useAuth((s) => s.me)

  const { data: post, isLoading, error } = usePost(Number.isFinite(postId) ? postId : undefined)
  const respond = useRespond(postId)
  const resolve = useResolve(postId)
  const closePost = useClosePost(postId)

  const [message, setMessage] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <Button variant="ghost" size="sm" className="mb-3" onClick={() => navigate(-1)}>
          ← Lenta
        </Button>
        <ErrorNote message={error.message} />
      </div>
    )
  }

  if (!post) return null

  const isAuthor = me !== null && post.author.id === me.user.id
  const canRespond = post.status === 'open' && me !== null && !isAuthor && !post.my_response

  const sendResponse = () => {
    respond.mutate(
      { message: message.trim() ? message.trim() : null },
      {
        onSuccess: () => {
          setMessage('')
          void useAuth.getState().refresh()
        },
      },
    )
  }

  const finishWithoutHelper = () => {
    resolve.mutate(
      {},
      {
        onSuccess: () => {
          void useAuth.getState().refresh()
        },
      },
    )
  }

  const close = () => {
    closePost.mutate(undefined, {
      onSuccess: () => {
        void useAuth.getState().refresh()
      },
    })
  }

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-3" onClick={() => navigate(-1)}>
        ← Lenta
      </Button>

      {/* status banner */}
      {post.status === 'resolved' && post.resolved_helper && (
        <div className="rounded-2xl bg-gold-soft border border-amber-200 shadow-card p-4 mb-3 text-sm font-semibold text-gold">
          🎉 {post.resolved_helper.full_name} yordam berdi — rahmat! (+10 ball)
        </div>
      )}

      {/* full post */}
      <Card className="p-4 mb-3">
        <div className="flex items-center justify-between gap-2 mb-2">
          <TypePill type={post.type} />
          {post.status === 'resolved' && !post.resolved_helper && (
            <span className="text-xs font-semibold text-good">✓ Bajarildi</span>
          )}
          {post.status === 'closed' && <span className="text-xs font-semibold text-sub">Yopilgan</span>}
        </div>
        <h1 className="text-lg font-bold text-ink">{post.title}</h1>
        {post.body && <p className="text-[15px] text-ink whitespace-pre-wrap mt-2">{post.body}</p>}
        {post.event_date && <p className="text-sm text-sub mt-2">📅 {formatEventDate(post.event_date)}</p>}
        {post.goal && <p className="text-sm text-sub mt-1">🎯 {post.goal}</p>}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-line">
          <Avatar name={post.author.full_name} src={post.author.photo_url} size={28} />
          <span className="text-sm font-semibold text-ink">{post.author.full_name}</span>
          <span className="text-xs text-sub ml-auto">{timeAgo(post.created_at)}</span>
        </div>
      </Card>

      {/* author controls */}
      {post.status === 'open' && isAuthor && (
        <div className="flex flex-col gap-2 mb-3">
          {resolve.error && <ErrorNote message={resolve.error.message} />}
          {closePost.error && <ErrorNote message={closePost.error.message} />}
          {post.type === 'help' ? (
            <Button variant="gold" full onClick={() => setModalOpen(true)}>
              ✓ Bajarildi deb belgilash
            </Button>
          ) : (
            <Button variant="secondary" full onClick={finishWithoutHelper} loading={resolve.isPending}>
              Yakunlash
            </Button>
          )}
          <Button variant="ghost" full onClick={close} loading={closePost.isPending}>
            Yopish
          </Button>
        </div>
      )}

      {/* responses */}
      <h2 className="font-bold text-ink mb-2">Javoblar ({post.responses.length})</h2>
      {post.responses.length > 0 && (
        <Card className="mb-3 divide-y divide-line">
          {post.responses.map((r) => (
            <div key={r.id} className="flex items-start gap-3 p-3">
              <Avatar name={r.user.full_name} src={r.user.photo_url} size={32} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-ink truncate">{r.user.full_name}</span>
                  <span className="text-xs text-sub shrink-0">{timeAgo(r.created_at)}</span>
                </div>
                {r.message && <p className="text-sm text-ink mt-0.5">{r.message}</p>}
              </div>
            </div>
          ))}
        </Card>
      )}
      {post.responses.length === 0 && <p className="text-sm text-sub mb-3">Hali javob yo'q.</p>}

      {/* respond box */}
      {canRespond && (
        <Card className="p-4">
          {respond.error && <ErrorNote message={respond.error.message} />}
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={RESPOND_PLACEHOLDER[post.type] ?? 'Fikringizni yozing (shart emas)'}
            maxLength={300}
          />
          {post.type === 'newcomer' && <p className="text-xs text-gold mt-1">+5 ball</p>}
          <Button full className="mt-3" onClick={sendResponse} loading={respond.isPending}>
            {respondLabel(post.type)}
          </Button>
        </Card>
      )}

      <ResolveModal post={post} postId={postId} open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
