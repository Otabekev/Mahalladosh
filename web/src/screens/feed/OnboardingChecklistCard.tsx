/** Activation checklist — the first thing a new neighbour sees on the feed.
 *  Steps come from /me/onboarding (derived server-side from real state); the card
 *  hides itself once every step is done, or when the neighbour dismisses it. */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui'
import { fmt, useStrings } from '@/core/i18n'
import { activationStrings } from '@/core/i18n/activation'
import { useOnboarding, type OnboardingStep } from '@/core/queries/me'

const DISMISS_KEY = 'md_onboarding_hidden'

function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FBF3E2" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

const STEP_TO: Record<OnboardingStep['key'], string> = {
  household: '/app/household',
  history: '/app/household',
  location: '/app/household',
  post: '/app/new',
  help: '/app',
}

export function OnboardingChecklistCard() {
  const s = useStrings(activationStrings)
  const navigate = useNavigate()
  const { data } = useOnboarding()
  const [hidden, setHidden] = useState(() => localStorage.getItem(DISMISS_KEY) === '1')

  if (!data || data.complete || hidden) return null

  const label: Record<OnboardingStep['key'], string> = {
    household: s.stepHousehold,
    history: s.stepHistory,
    location: s.stepLocation,
    post: s.stepPost,
    help: s.stepHelp,
  }
  const pct = Math.round((data.done_count / data.total) * 100)

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1')
    setHidden(true)
  }

  return (
    <Card className="relative p-4 overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-[4px] bg-honor" />

      <div className="flex items-start justify-between gap-2 pt-1">
        <div className="min-w-0">
          <h3 className="font-bold text-[17px] text-ink">{s.title}</h3>
          <p className="text-[14px] text-sub mt-0.5">{s.subtitle}</p>
        </div>
        <button
          onClick={dismiss}
          className="text-[13px] font-semibold text-sub shrink-0 min-h-[40px] px-1"
        >
          {s.hide}
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2.5">
        <div className="flex-1 h-2 rounded-full bg-line overflow-hidden">
          <div className="h-full rounded-full bg-honor transition-all" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[13px] font-bold text-sub shrink-0">
          {fmt(s.progress, { done: data.done_count, total: data.total })}
        </span>
      </div>

      <div className="mt-2.5 space-y-1">
        {data.steps.map((step) => (
          <button
            key={step.key}
            disabled={step.done}
            onClick={() => navigate(STEP_TO[step.key])}
            className={`w-full flex items-center gap-3 rounded-xl px-2 py-2.5 min-h-[48px] text-left transition ${
              step.done ? 'opacity-70' : 'active:scale-[0.99] hover:bg-paper'
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                step.done ? 'bg-accent' : 'border-2 border-brand'
              }`}
            >
              {step.done && <CheckIcon />}
            </span>
            <span
              className={`flex-1 text-[16px] ${
                step.done ? 'text-sub line-through' : 'text-ink font-semibold'
              }`}
            >
              {label[step.key]}
            </span>
            {!step.done && (
              <span className="text-brand shrink-0">
                <ChevronIcon />
              </span>
            )}
          </button>
        ))}
      </div>
    </Card>
  )
}
