/** New post — step 1: pick type, step 2: short form (elder rule: 2-3 fields). Route: /app/new. */

import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Card,
  ErrorNote,
  Field,
  MultiImagePicker,
  Input,
  PageTitle,
  POST_TYPE_META,
  Select,
  Textarea,
  usePostTypeLabel,
} from '@/components/ui'
import { fmt, useStrings } from '@/core/i18n'
import { common } from '@/core/i18n/common'
import { feedStrings } from '@/core/i18n/feed'
import { broadcastStrings } from '@/core/i18n/broadcast'
import { formatSom } from '@/components/CharityBar'
import { useCreatePost } from '@/core/queries/posts'
import type { EmergencyCategory, HelpCategory, PostIn, PostType } from '@/core/api/types'

type CreatableType = Exclude<PostType, 'newcomer'>

// Mirrors POLL_MIN_OPTIONS / POLL_MAX_OPTIONS in api/app/schemas.py.
const POLL_MIN_OPTIONS = 2
const POLL_MAX_OPTIONS = 5
type FeedKey = keyof typeof feedStrings

const TYPE_OPTIONS: { type: Exclude<CreatableType, 'share'>; descKey: FeedKey; placeholderKey: FeedKey }[] = [
  { type: 'help', descKey: 'helpDesc', placeholderKey: 'helpPlaceholder' },
  { type: 'announcement', descKey: 'announcementDesc', placeholderKey: 'announcementPlaceholder' },
  { type: 'charity', descKey: 'charityDesc', placeholderKey: 'charityPlaceholder' },
  { type: 'event', descKey: 'eventDesc', placeholderKey: 'eventPlaceholder' },
  { type: 'poll', descKey: 'pollDesc', placeholderKey: 'pollPlaceholder' },
]

type BroadKey = keyof typeof broadcastStrings

/** The two obligation-grade broadcasts, kept in their own group. They are duties
 *  rather than everyday posts, and listing them beside "Ulashish" would invite
 *  someone to reach for 🚨 when they meant 📢. */
const BROADCAST_OPTIONS: { type: 'taziya' | 'shoshilinch'; descKey: BroadKey }[] = [
  { type: 'shoshilinch', descKey: 'shoshilinchDesc' },
  { type: 'taziya', descKey: 'taziyaDesc' },
]

const EMERGENCY_CATEGORIES: { value: EmergencyCategory; labelKey: BroadKey }[] = [
  { value: 'fire', labelKey: 'catFire' },
  { value: 'medical', labelKey: 'catMedical' },
  { value: 'missing', labelKey: 'catMissing' },
  { value: 'livestock', labelKey: 'catLivestock' },
  { value: 'other', labelKey: 'catOther' },
]

const HELP_CATEGORIES: { value: HelpCategory; labelKey: FeedKey }[] = [
  { value: 'tool', labelKey: 'catTool' },
  { value: 'ride', labelKey: 'catRide' },
  { value: 'labor', labelKey: 'catLabor' },
  { value: 'childcare', labelKey: 'catChildcare' },
  { value: 'other', labelKey: 'catOther' },
]

export default function CreatePostScreen() {
  const navigate = useNavigate()
  const create = useCreatePost()
  const s = useStrings(feedStrings)
  const b = useStrings(broadcastStrings)
  const c = useStrings(common)
  const typeLabel = usePostTypeLabel()

  const [type, setType] = useState<CreatableType | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState<HelpCategory>('tool')
  const [emergency, setEmergency] = useState<EmergencyCategory>('fire')
  const [eventDate, setEventDate] = useState('')
  const [place, setPlace] = useState('')
  const [goal, setGoal] = useState('')
  const [goalAmount, setGoalAmount] = useState('')
  const [images, setImages] = useState<string[]>([])
  // a poll starts with the two empty rows it needs at minimum
  const [options, setOptions] = useState<string[]>(['', ''])
  const [error, setError] = useState<string | null>(null)

  // ---- step 1: type picker ----
  if (!type) {
    const shareMeta = POST_TYPE_META.share
    return (
      <div>
        <PageTitle title={s.newPost} subtitle={s.createSubtitle} />
        <div className="grid grid-cols-1 gap-2">
          <Card
            className="p-5 flex items-center gap-4 ring-2 ring-brand shadow-pop"
            onClick={() => setType('share')}
          >
            <span className="text-3xl">{shareMeta.icon}</span>
            <div>
              <div className="text-[15px] font-bold text-ink">{typeLabel('share')}</div>
              <div className="text-sm text-sub">{s.shareDesc}</div>
            </div>
          </Card>
          {TYPE_OPTIONS.map((opt) => {
            const meta = POST_TYPE_META[opt.type]
            return (
              <Card key={opt.type} className="p-4 flex items-center gap-4" onClick={() => setType(opt.type)}>
                <span className="text-2xl">{meta.icon}</span>
                <div>
                  <div className="font-bold text-ink">{typeLabel(opt.type)}</div>
                  <div className="text-sm text-sub">{s[opt.descKey]}</div>
                </div>
              </Card>
            )
          })}
        </div>

        {/* Set apart, below, and quieter than the everyday types. These reach every
            phone in the mahalla the moment they are sent. */}
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-sub mb-1">
            {b.sectionTitle}
          </p>
          <p className="text-xs text-sub/80 mb-2">{b.sectionNote}</p>
          <div className="grid grid-cols-1 gap-2">
            {BROADCAST_OPTIONS.map((opt) => {
              const bMeta = POST_TYPE_META[opt.type]
              return (
                <Card
                  key={opt.type}
                  className="p-4 flex items-center gap-4 border-brand/25"
                  onClick={() => setType(opt.type)}
                >
                  <span className="text-2xl">{bMeta.icon}</span>
                  <div>
                    <div className="font-bold text-ink">{typeLabel(opt.type)}</div>
                    <div className="text-sm text-sub">{b[opt.descKey]}</div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // ---- step 2: form ----
  const meta = POST_TYPE_META[type]
  const option = TYPE_OPTIONS.find((o) => o.type === type)
  const filledOptions = options.map((o) => o.trim()).filter(Boolean)
  const canSubmit =
    type === 'share'
      ? body.trim().length > 0 || images.length > 0
      : type === 'poll'
        ? title.trim().length >= 3 && filledOptions.length >= POLL_MIN_OPTIONS
        : // a janoza notice without a time is not actionable, so the button waits
          type === 'taziya'
          ? title.trim().length >= 3 && eventDate.length > 0
          : title.trim().length >= 3

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const input: PostIn = { type }
    if (body.trim()) input.body = body.trim()
    if (type === 'share') {
      if (images.length) input.image_urls = images
    } else {
      input.title = title.trim()
      if (type === 'help') input.category = category
      if (type === 'shoshilinch') input.category = emergency
      if ((type === 'event' || type === 'taziya') && eventDate)
        input.event_date = new Date(eventDate).toISOString()
      if ((type === 'event' || type === 'taziya') && place.trim()) input.place = place.trim()
      if (type === 'charity' && goal.trim()) input.goal = goal.trim()
      if (type === 'charity') {
        const amount = Number(goalAmount.replace(/\D/g, '') || '0')
        if (amount > 0) input.goal_amount = amount
      }
      if (type === 'poll') input.options = filledOptions
    }
    create.mutate(input, {
      onSuccess: (post) => navigate(`/app/posts/${post.id}`, { replace: true }),
    })
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <button
          type="button"
          onClick={() => {
            setType(null)
            setError(null) // an image-upload error must not follow into another type's form
          }}
          aria-label={c.back}
          className="text-xl text-sub hover:text-ink px-1"
        >
          ←
        </button>
        <h1 className="text-xl font-bold text-ink">
          {meta.icon} {typeLabel(type)}
        </h1>
      </div>

      {error && <ErrorNote message={error} />}
      {create.error && <ErrorNote message={create.error.message} />}

      <Card className="p-4">
        <form onSubmit={submit}>
          {type === 'share' ? (
            <>
              <Textarea
                rows={4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={s.sharePlaceholder}
                maxLength={4000}
                autoFocus
                className="mb-4"
              />
              <MultiImagePicker
                value={images}
                onChange={(urls) => {
                  setImages(urls)
                  setError(null)
                }}
                onError={setError}
              />
            </>
          ) : (
            <>
              <Field label={s.fieldTitle}>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    type === 'taziya'
                      ? b.taziyaNamePlaceholder
                      : type === 'shoshilinch'
                        ? b.shoshilinchPlaceholder
                        : option
                          ? s[option.placeholderKey]
                          : undefined
                  }
                  maxLength={200}
                  autoFocus
                />
              </Field>

              {type === 'help' && (
                <Field label={s.fieldHelpType}>
                  <Select value={category} onChange={(e) => setCategory(e.target.value as HelpCategory)}>
                    {HELP_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {s[cat.labelKey]}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}

              {type === 'shoshilinch' && (
                <Field label={b.fieldEmergencyType} hint={b.callWarning}>
                  <Select
                    value={emergency}
                    onChange={(e) => setEmergency(e.target.value as EmergencyCategory)}
                  >
                    {EMERGENCY_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {b[cat.labelKey]}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}

              {(type === 'event' || type === 'taziya') && (
                <Field label={type === 'taziya' ? b.fieldJanoza : s.fieldDate}>
                  <Input type="datetime-local" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
                </Field>
              )}

              {(type === 'event' || type === 'taziya') && (
                <Field label={b.fieldPlace}>
                  <Input
                    value={place}
                    onChange={(e) => setPlace(e.target.value)}
                    placeholder={b.placePlaceholder}
                    maxLength={200}
                  />
                </Field>
              )}

              {type === 'taziya' && (
                <p className="-mt-1 mb-4 text-xs text-sub/85 leading-relaxed">{b.taziyaGateWhy}</p>
              )}

              {type === 'charity' && (
                <Field label={s.fieldGoal}>
                  <Input
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    placeholder={s.goalPlaceholder}
                    maxLength={200}
                  />
                </Field>
              )}

              {type === 'charity' && (
                <Field label={s.fieldGoalAmount} hint={s.goalAmountHint}>
                  <div className="relative">
                    <Input
                      inputMode="numeric"
                      value={goalAmount && formatSom(Number(goalAmount.replace(/\D/g, '') || '0'))}
                      onChange={(e) => setGoalAmount(e.target.value)}
                      placeholder="1 000 000"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-sub">
                      {s.som}
                    </span>
                  </div>
                </Field>
              )}

              {type === 'poll' && (
                <Field
                  label={s.pollOptionsLabel}
                  hint={filledOptions.length < POLL_MIN_OPTIONS ? s.pollNeedsTwo : undefined}
                >
                  <div className="flex flex-col gap-2">
                    {options.map((value, i) => (
                      <Input
                        key={i}
                        value={value}
                        onChange={(e) =>
                          setOptions(options.map((o, j) => (j === i ? e.target.value : o)))
                        }
                        placeholder={fmt(s.pollOptionPlaceholder, { n: i + 1 })}
                        maxLength={80}
                      />
                    ))}
                  </div>
                  {options.length < POLL_MAX_OPTIONS && (
                    <button
                      type="button"
                      onClick={() => setOptions([...options, ''])}
                      className="mt-2 min-h-[44px] text-sm font-semibold text-brand"
                    >
                      + {s.pollAddOption}
                    </button>
                  )}
                </Field>
              )}

              <Field label={s.fieldDetails}>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={s.detailsPlaceholder}
                  maxLength={4000}
                />
              </Field>
            </>
          )}

          <Button type="submit" full loading={create.isPending} disabled={!canSubmit}>
            {s.submitPost}
          </Button>

          {type === 'share' && <p className="text-xs text-sub mt-3">{s.shareFootnote}</p>}
        </form>
      </Card>
    </div>
  )
}
