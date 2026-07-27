/** Post detail — full post, responses, respond box, author controls. Route: /app/posts/:id. */

import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Avatar,
  Button,
  Card,
  ErrorNote,
  Field,
  Modal,
  Spinner,
  Textarea,
  TypePill,
  timeAgo,
} from '@/components/ui'
import { fmt, useStrings } from '@/core/i18n'
import { common } from '@/core/i18n/common'
import { feedStrings } from '@/core/i18n/feed'
import { raisiStrings } from '@/core/i18n/raisi'
import { useConfirm } from '@/components/confirm'
import { useBack } from '@/components/useBack'
import { RahmatButton } from '@/components/RahmatButton'
import { Lightbox } from '@/components/Lightbox'
import { PollCard } from '@/components/PollCard'
import { CharityBar } from '@/components/CharityBar'
import { useAuth } from '@/core/stores/auth'
import {
  useAddComment,
  useClosePost,
  useDeleteComment,
  useDeletePost,
  usePost,
  useResolve,
  useRespond,
  useUpdatePost,
} from '@/core/queries/posts'
import { usePinPost } from '@/core/queries/raisi'
import { useReport, type ReportReason } from '@/core/queries/reports'
import type { PostDetail, PostType } from '@/core/api/types'

type FeedKey = keyof typeof feedStrings

const REPORT_REASONS: { value: ReportReason; key: FeedKey }[] = [
  { value: 'spam', key: 'reasonSpam' },
  { value: 'abuse', key: 'reasonAbuse' },
  { value: 'fake', key: 'reasonFake' },
  { value: 'other', key: 'reasonOther' },
]

/** Report a post — reason radios + optional note. Shown to non-authors. */
function ReportModal({
  open,
  onClose,
  postId,
}: {
  open: boolean
  onClose: () => void
  postId: number
}) {
  const s = useStrings(feedStrings)
  const c = useStrings(common)
  const report = useReport()
  const [reason, setReason] = useState<ReportReason>('spam')
  const [note, setNote] = useState('')
  const [sent, setSent] = useState(false)

  const close = () => {
    setSent(false)
    setReason('spam')
    setNote('')
    report.reset()
    onClose()
  }

  const submit = () => {
    report.mutate(
      { target_type: 'post', target_id: postId, reason, note: note.trim() || null },
      { onSuccess: () => setSent(true) },
    )
  }

  return (
    <Modal open={open} onClose={close} title={s.reportTitle}>
      {sent ? (
        <div>
          <div className="rounded-xl bg-good-soft text-good text-sm font-semibold px-4 py-3 mb-4">
            {s.reportSent}
          </div>
          <Button full onClick={close}>
            {c.close}
          </Button>
        </div>
      ) : (
        <>
          {report.error && <ErrorNote message={report.error.message} />}
          <div className="mb-4">
            <span className="block text-sm font-semibold text-ink mb-2">{s.reportReasonHeading}</span>
            <div className="flex flex-col gap-2">
              {REPORT_REASONS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setReason(r.value)}
                  className={`w-full flex items-center gap-3 p-3 text-left rounded-xl border bg-card ${
                    reason === r.value ? 'border-brand ring-2 ring-brand/30' : 'border-line'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full border-2 shrink-0 ${
                      reason === r.value ? 'border-brand bg-brand' : 'border-line'
                    }`}
                  />
                  <span className="text-sm font-semibold text-ink">{s[r.key]}</span>
                </button>
              ))}
            </div>
          </div>
          <Field label={s.reportNoteLabel}>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={s.reportNotePh}
              maxLength={300}
            />
          </Field>
          <Button full onClick={submit} loading={report.isPending}>
            {s.reportSend}
          </Button>
        </>
      )}
    </Modal>
  )
}

function formatEventDate(iso: string): string {
  const d = new Date(iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z')
  return d.toLocaleDateString('uz', { day: 'numeric', month: 'long', year: 'numeric' }) +
    ', ' +
    d.toLocaleTimeString('uz', { hour: '2-digit', minute: '2-digit' })
}

const RESPOND_PLACEHOLDER_KEYS: Partial<Record<PostType, FeedKey>> = {
  help: 'respondPlaceholderHelp',
  newcomer: 'respondPlaceholderNewcomer',
  event: 'respondPlaceholderEvent',
  share: 'respondPlaceholderShare',
}

const RESPOND_LABEL_KEYS: Partial<Record<PostType, FeedKey>> = {
  help: 'respondHelp',
  event: 'respondEvent',
  newcomer: 'respondNewcomer',
  share: 'respondShare',
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
  const s = useStrings(feedStrings)
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
    <Modal open={open} onClose={onClose} title={s.resolveTitle}>
      {resolve.error && <ErrorNote message={resolve.error.message} />}
      {responders.length === 0 && <p className="text-sm text-sub mb-4">{s.noRespondersYet}</p>}
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
      <p className="text-sm text-sub mb-3">{s.helperGetsPoints}</p>
      <Button full onClick={confirm} disabled={helperId === null} loading={resolve.isPending}>
        {s.confirm}
      </Button>
    </Modal>
  )
}

/** Author edits their own post — title (unless a share, whose title tracks the
 *  body) and body. */
function EditPostModal({ post, open, onClose }: { post: PostDetail; open: boolean; onClose: () => void }) {
  const s = useStrings(feedStrings)
  const c = useStrings(common)
  const update = useUpdatePost(post.id)
  const isShare = post.type === 'share'
  const [title, setTitle] = useState(post.title)
  const [body, setBody] = useState(post.body ?? '')

  const save = () => {
    update.mutate(
      { ...(isShare ? {} : { title: title.trim() }), body: body.trim() },
      { onSuccess: onClose },
    )
  }

  return (
    <Modal open={open} onClose={onClose} title={s.editPostTitle}>
      {update.error && <ErrorNote message={update.error.message} />}
      <div className="space-y-3">
        {!isShare && (
          <Field label={s.titleLabel}>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              className="w-full rounded-xl border border-line bg-card px-3 py-2.5 text-ink"
            />
          </Field>
        )}
        <Field label={s.bodyLabel}>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} />
        </Field>
        <Button full loading={update.isPending} disabled={!isShare && title.trim().length < 3} onClick={save}>
          {c.save}
        </Button>
      </div>
    </Modal>
  )
}

/** The discussion thread — free-form comments on every post type. */
function CommentsSection({ post }: { post: PostDetail }) {
  const s = useStrings(feedStrings)
  const c = useStrings(common)
  const navigate = useNavigate()
  const confirm = useConfirm()
  const add = useAddComment(post.id)
  const del = useDeleteComment(post.id)
  const [text, setText] = useState('')

  const submit = () => {
    const body = text.trim()
    if (!body) return
    add.mutate(body, { onSuccess: () => setText('') })
  }
  const remove = async (id: number) => {
    if (await confirm({ title: c.remove, body: s.deleteCommentConfirm, confirmLabel: c.remove, danger: true }))
      del.mutate(id)
  }

  return (
    <div className="mt-4">
      <h2 className="font-bold text-ink mb-2">{fmt(s.commentsHeading, { n: post.comments.length })}</h2>

      {post.comments.length === 0 && <p className="text-sm text-sub mb-3">{s.noCommentsYet}</p>}

      {post.comments.length > 0 && (
        <Card className="mb-3 divide-y divide-line">
          {post.comments.map((cm) => (
            <div key={cm.id} className="flex items-start gap-3 p-3">
              <button onClick={() => navigate(`/app/u/${cm.user.id}`)} className="shrink-0 rounded-full">
                <Avatar name={cm.user.full_name} src={cm.user.photo_url} size={32} />
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => navigate(`/app/u/${cm.user.id}`)}
                    className="text-sm font-semibold text-ink truncate text-left"
                  >
                    {cm.user.full_name}
                  </button>
                  <span className="text-xs text-sub shrink-0">{timeAgo(cm.created_at)}</span>
                </div>
                <p className="text-[15px] text-ink mt-0.5 whitespace-pre-wrap">{cm.body}</p>
                {cm.can_delete && (
                  <button onClick={() => remove(cm.id)} className="mt-1 min-h-[32px] text-[13px] font-semibold text-danger">
                    {c.remove}
                  </button>
                )}
              </div>
            </div>
          ))}
        </Card>
      )}

      <Card className="p-3">
        {add.error && <ErrorNote message={add.error.message} />}
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={s.commentPlaceholder}
          maxLength={500}
        />
        <Button full className="mt-3" onClick={submit} loading={add.isPending} disabled={!text.trim()}>
          {c.send}
        </Button>
      </Card>
    </div>
  )
}

export default function PostDetailScreen() {
  const { id } = useParams()
  const postId = Number(id)
  const me = useAuth((s) => s.me)
  const s = useStrings(feedStrings)
  const c = useStrings(common)
  const r = useStrings(raisiStrings)
  const confirm = useConfirm()
  const back = useBack()
  const navigate = useNavigate()
  const goProfile = (uid: number) => navigate(`/app/u/${uid}`)

  const { data: post, isLoading, error } = usePost(Number.isFinite(postId) ? postId : undefined)
  const respond = useRespond(postId)
  const resolve = useResolve(postId)
  const closePost = useClosePost(postId)
  const pin = usePinPost()
  const del = useDeletePost(postId)

  const [message, setMessage] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [lightbox, setLightbox] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)

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
        <Button variant="ghost" size="sm" className="mb-3" onClick={back}>
          ← {c.navFeed}
        </Button>
        <ErrorNote message={error.message} />
      </div>
    )
  }

  if (!post) return null

  const isAuthor = me !== null && post.author.id === me.user.id
  const isShare = post.type === 'share'
  // structured responses ("I'll help / I'll come / welcome") only make sense for
  // these types; every other type discusses through comments instead of a second box
  const RESPOND_TYPES: PostType[] = ['help', 'event', 'newcomer']
  const canRespond =
    RESPOND_TYPES.includes(post.type) &&
    post.status === 'open' &&
    me !== null &&
    !isAuthor &&
    !post.my_response

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
      <Button variant="ghost" size="sm" className="mb-3" onClick={back}>
        ← {c.navFeed}
      </Button>

      {/* status banner */}
      {post.status === 'resolved' && post.resolved_helper && (
        <div className="rounded-2xl bg-gold-soft border border-amber-200 shadow-card p-4 mb-3 text-sm font-semibold text-gold">
          {fmt(s.resolvedBanner, { name: post.resolved_helper.full_name })}
        </div>
      )}

      {/* raisi-only: pin this post to the top of the mahalla feed */}
      {me?.user.is_raisi && (
        <div className="mb-3">
          {post.pinned ? (
            <Button variant="secondary" size="sm" loading={pin.isPending} onClick={() => pin.mutate(null)}>
              📌 {r.unpin}
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              loading={pin.isPending}
              onClick={async () => {
                if (await confirm({ title: r.pin, body: r.pinConfirm, confirmLabel: r.pin }))
                  pin.mutate(post.id)
              }}
            >
              📌 {r.pin}
            </Button>
          )}
        </div>
      )}

      {/* full post — share posts render social-style: no pill/status/title */}
      <Card className="p-4 mb-3">
        {!isShare && (
          <div className="flex items-center justify-between gap-2 mb-2">
            <TypePill type={post.type} />
            {post.status === 'resolved' && !post.resolved_helper && (
              <span className="text-xs font-semibold text-good">✓ {s.doneBadge}</span>
            )}
            {post.status === 'closed' && <span className="text-xs font-semibold text-sub">{s.closedBadge}</span>}
          </div>
        )}
        {!isShare && <h1 className="text-lg font-bold text-ink">{post.title}</h1>}
        {post.body && (
          <p className={`text-[15px] text-ink whitespace-pre-wrap ${isShare ? '' : 'mt-2'}`}>{post.body}</p>
        )}
        {post.poll && <PollCard postId={post.id} poll={post.poll} closed={post.status !== 'open'} />}
        {post.type === 'charity' && <CharityBar post={post} canReport={isAuthor} />}
        {post.image_urls.length > 0 && (
          <div className={`mt-3 grid gap-1.5 ${post.image_urls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {post.image_urls.map((url, idx) => (
              <button
                key={url}
                onClick={() => setLightbox(idx)}
                className={`overflow-hidden rounded-xl ${
                  post.image_urls.length === 1 ? '' : 'aspect-square'
                }`}
              >
                <img
                  src={url}
                  alt=""
                  className={post.image_urls.length === 1 ? 'w-full rounded-xl' : 'h-full w-full object-cover'}
                />
              </button>
            ))}
          </div>
        )}
        {post.event_date && <p className="text-sm text-sub mt-2">📅 {formatEventDate(post.event_date)}</p>}
        {post.goal && <p className="text-sm text-sub mt-1">🎯 {post.goal}</p>}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-line">
          <button onClick={() => goProfile(post.author.id)} className="shrink-0 rounded-full">
            <Avatar name={post.author.full_name} src={post.author.photo_url} size={28} />
          </button>
          <div className="min-w-0">
            <button
              onClick={() => goProfile(post.author.id)}
              className="text-sm font-semibold text-ink truncate text-left"
            >
              {post.author.full_name}
            </button>
            {isShare && post.author_place && (
              <div className="text-xs text-sub truncate">{post.author_place}</div>
            )}
          </div>
          <span className="text-xs text-sub ml-auto shrink-0">{timeAgo(post.created_at)}</span>
        </div>
      </Card>

      {/* 🤲 Rahmat — a light acknowledgement, on every post type */}
      <div className="mb-3">
        <RahmatButton post={post} />
      </div>

      {/* report — neighbors flag bad content; not shown on your own post */}
      {me !== null && !isAuthor && (
        <div className="flex justify-end mb-3">
          <Button variant="ghost" size="sm" onClick={() => setReportOpen(true)}>
            ⚑ {s.reportBtn}
          </Button>
        </div>
      )}

      {/* author's own edit / delete */}
      {isAuthor && (
        <div className="flex justify-end gap-2 mb-3">
          <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)}>
            ✏️ {s.editPost}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-danger"
            loading={del.isPending}
            onClick={async () => {
              if (await confirm({ title: c.remove, body: s.deletePostConfirm, confirmLabel: c.remove, danger: true }))
                del.mutate(undefined, { onSuccess: () => navigate('/app') })
            }}
          >
            🗑 {c.remove}
          </Button>
        </div>
      )}

      {/* author controls */}
      {post.status === 'open' && isAuthor && (
        <div className="flex flex-col gap-2 mb-3">
          {resolve.error && <ErrorNote message={resolve.error.message} />}
          {closePost.error && <ErrorNote message={closePost.error.message} />}
          {post.type === 'help' ? (
            <Button variant="gold" full onClick={() => setModalOpen(true)}>
              {s.markResolved}
            </Button>
          ) : (
            <Button variant="secondary" full onClick={finishWithoutHelper} loading={resolve.isPending}>
              {s.finish}
            </Button>
          )}
          <Button variant="ghost" full onClick={close} loading={closePost.isPending}>
            {c.close}
          </Button>
        </div>
      )}

      {/* responses */}
      <h2 className="font-bold text-ink mb-2">{fmt(s.responsesHeading, { n: post.responses.length })}</h2>
      {post.responses.length > 0 && (
        <Card className="mb-3 divide-y divide-line">
          {post.responses.map((r) => (
            <div key={r.id} className="flex items-start gap-3 p-3">
              <button onClick={() => goProfile(r.user.id)} className="shrink-0 rounded-full">
                <Avatar name={r.user.full_name} src={r.user.photo_url} size={32} />
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => goProfile(r.user.id)}
                    className="text-sm font-semibold text-ink truncate text-left"
                  >
                    {r.user.full_name}
                  </button>
                  <span className="text-xs text-sub shrink-0">{timeAgo(r.created_at)}</span>
                </div>
                {r.message && <p className="text-sm text-ink mt-0.5">{r.message}</p>}
              </div>
            </div>
          ))}
        </Card>
      )}
      {post.responses.length === 0 && <p className="text-sm text-sub mb-3">{s.noResponsesYet}</p>}

      {/* respond box */}
      {canRespond && (
        <Card className="p-4">
          {respond.error && <ErrorNote message={respond.error.message} />}
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={s[RESPOND_PLACEHOLDER_KEYS[post.type] ?? 'respondPlaceholderDefault']}
            maxLength={300}
          />
          {post.type === 'newcomer' && <p className="text-xs text-gold mt-1">{s.newcomerPoints}</p>}
          <Button full className="mt-3" onClick={sendResponse} loading={respond.isPending}>
            {s[RESPOND_LABEL_KEYS[post.type] ?? 'respondDefault']}
          </Button>
        </Card>
      )}

      <CommentsSection post={post} />

      {lightbox !== null && (
        <Lightbox images={post.image_urls} startIndex={lightbox} onClose={() => setLightbox(null)} />
      )}
      <EditPostModal post={post} open={editOpen} onClose={() => setEditOpen(false)} />
      <ResolveModal post={post} postId={postId} open={modalOpen} onClose={() => setModalOpen(false)} />
      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} postId={postId} />
    </div>
  )
}
