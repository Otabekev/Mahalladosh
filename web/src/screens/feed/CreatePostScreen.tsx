/** New post — step 1: pick type, step 2: short form (elder rule: 2-3 fields). Route: /app/new. */

import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Card,
  ErrorNote,
  Field,
  Input,
  PageTitle,
  POST_TYPE_META,
  Select,
  Textarea,
} from '@/components/ui'
import { useCreatePost } from '@/core/queries/posts'
import type { HelpCategory, PostIn, PostType } from '@/core/api/types'

type CreatableType = Exclude<PostType, 'newcomer'>

const TYPE_OPTIONS: { type: CreatableType; desc: string; placeholder: string }[] = [
  { type: 'help', desc: "Qo'shnilardan yordam so'rang", placeholder: 'Narvon kerak' },
  { type: 'announcement', desc: 'Mahallaga xabar bering', placeholder: "Ertaga hashar bo'ladi" },
  { type: 'charity', desc: "Xayriya yig'ing yoki e'lon qiling", placeholder: 'Muhtoj oilaga yordam' },
  { type: 'event', desc: "To'y-marosimga taklif qiling", placeholder: "To'yga marhamat" },
]

const HELP_CATEGORIES: { value: HelpCategory; label: string }[] = [
  { value: 'tool', label: 'Asbob-uskuna' },
  { value: 'ride', label: 'Transport' },
  { value: 'labor', label: 'Mehnat' },
  { value: 'childcare', label: 'Bola qarash' },
  { value: 'other', label: 'Boshqa' },
]

export default function CreatePostScreen() {
  const navigate = useNavigate()
  const create = useCreatePost()

  const [type, setType] = useState<CreatableType | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState<HelpCategory>('tool')
  const [eventDate, setEventDate] = useState('')
  const [goal, setGoal] = useState('')

  // ---- step 1: type picker ----
  if (!type) {
    return (
      <div>
        <PageTitle title="Yangi e'lon" subtitle="Nima haqida yozmoqchisiz?" />
        <div className="grid grid-cols-1 gap-2">
          {TYPE_OPTIONS.map((opt) => {
            const meta = POST_TYPE_META[opt.type]
            return (
              <Card key={opt.type} className="p-4 flex items-center gap-4" onClick={() => setType(opt.type)}>
                <span className="text-2xl">{meta.icon}</span>
                <div>
                  <div className="font-bold text-ink">{meta.label}</div>
                  <div className="text-sm text-sub">{opt.desc}</div>
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    )
  }

  // ---- step 2: form ----
  const meta = POST_TYPE_META[type]
  const option = TYPE_OPTIONS.find((o) => o.type === type)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const input: PostIn = { type, title: title.trim() }
    if (body.trim()) input.body = body.trim()
    if (type === 'help') input.category = category
    if (type === 'event' && eventDate) input.event_date = new Date(eventDate).toISOString()
    if (type === 'charity' && goal.trim()) input.goal = goal.trim()
    create.mutate(input, {
      onSuccess: (post) => navigate(`/app/posts/${post.id}`, { replace: true }),
    })
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <button
          type="button"
          onClick={() => setType(null)}
          aria-label="Orqaga"
          className="text-xl text-sub hover:text-ink px-1"
        >
          ←
        </button>
        <h1 className="text-xl font-bold text-ink">
          {meta.icon} {meta.label}
        </h1>
      </div>

      {create.error && <ErrorNote message={create.error.message} />}

      <Card className="p-4">
        <form onSubmit={submit}>
          <Field label="Sarlavha">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={option?.placeholder}
              maxLength={200}
              autoFocus
            />
          </Field>

          {type === 'help' && (
            <Field label="Yordam turi">
              <Select value={category} onChange={(e) => setCategory(e.target.value as HelpCategory)}>
                {HELP_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          {type === 'event' && (
            <Field label="Sana">
              <Input type="datetime-local" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            </Field>
          )}

          {type === 'charity' && (
            <Field label="Maqsad">
              <Input
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="5 mln so'm"
                maxLength={200}
              />
            </Field>
          )}

          <Field label="Batafsil (shart emas)">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Qisqacha yozing..."
              maxLength={4000}
            />
          </Field>

          <Button type="submit" full loading={create.isPending} disabled={title.trim().length < 3}>
            E'lon qilish
          </Button>
        </form>
      </Card>
    </div>
  )
}
