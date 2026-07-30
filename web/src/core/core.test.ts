/** Tests for the UI-free core layer.
 *
 *  Deliberately aimed at the code that has ALREADY broken silently rather than at
 *  coverage for its own sake. Every case here corresponds to a real defect or a
 *  real near-miss from building this app:
 *
 *   - feedItems: the feed cache changed from a flat array to pages, and every
 *     consumer that kept calling .map() rendered zero cards with no error at all.
 *   - applyVote: changing a vote once inflated the total, which does not look like
 *     a bug — the bars stay plausible and the number just drifts.
 *   - nextRahmat: an optimistic decrement on a stale count renders "-1".
 *   - fmt: a translation that loses its {placeholder} prints the literal braces to
 *     whichever language dropped it.
 */

import { describe, expect, it } from 'vitest'
import { applyVote, feedItems, nextRahmat } from './queries/posts'
import { applyMyReport, statusFor } from './queries/utility'
import { fmt } from './i18n'
import type { FeedPage, Poll, Post, UtilityBoard, UtilityStatus } from './api/types'

const post = (id: number) => ({ id }) as Post
const page = (ids: number[], next: string | null = null): FeedPage => ({
  items: ids.map(post),
  next_cursor: next,
})
const pages = (list: FeedPage[]) => ({ pages: list, pageParams: [] })

describe('feedItems', () => {
  it('flattens every page in order', () => {
    const out = feedItems(pages([page([1, 2]), page([3])]))
    expect(out.map((p) => p.id)).toEqual([1, 2, 3])
  })

  it('returns an empty list before the first page arrives', () => {
    // the screens map over this directly; undefined here would blank the feed
    expect(feedItems(undefined)).toEqual([])
  })

  it('survives a page with no items', () => {
    expect(feedItems(pages([page([]), page([7])])).map((p) => p.id)).toEqual([7])
  })
})

describe('applyVote', () => {
  const poll: Poll = {
    options: [
      { id: 1, text: 'Shanba', votes: 3 },
      { id: 2, text: 'Yakshanba', votes: 1 },
    ],
    total_votes: 4,
    my_option_id: null,
  }

  it('a first vote adds one to the total', () => {
    const out = applyVote(poll, 1)
    expect(out.total_votes).toBe(5)
    expect(out.options[0].votes).toBe(4)
    expect(out.my_option_id).toBe(1)
  })

  it('CHANGING a vote moves it without inflating the total', () => {
    const voted = applyVote(poll, 1)
    const moved = applyVote(voted, 2)
    expect(moved.total_votes).toBe(5) // still one person, not two
    expect(moved.options[0].votes).toBe(3) // taken back
    expect(moved.options[1].votes).toBe(2) // and given
    expect(moved.my_option_id).toBe(2)
  })

  it('re-tapping the same option is a no-op on the tallies', () => {
    const voted = applyVote(poll, 1)
    const again = applyVote(voted, 1)
    expect(again.total_votes).toBe(voted.total_votes)
    expect(again.options.map((o) => o.votes)).toEqual(voted.options.map((o) => o.votes))
  })

  it('does not mutate the poll it was given', () => {
    applyVote(poll, 1)
    expect(poll.total_votes).toBe(4)
    expect(poll.options[0].votes).toBe(3)
  })
})

describe('nextRahmat', () => {
  it('giving adds one', () => {
    expect(nextRahmat(false, 2)).toEqual({ mine: true, count: 3 })
  })

  it('taking back removes one', () => {
    expect(nextRahmat(true, 2)).toEqual({ mine: false, count: 1 })
  })

  it('never goes below zero on a stale count', () => {
    expect(nextRahmat(true, 0)).toEqual({ mine: false, count: 0 })
  })
})

describe('fmt', () => {
  it('substitutes named placeholders', () => {
    expect(fmt('{n} kishi', { n: 5 })).toBe('5 kishi')
  })

  it('substitutes every occurrence', () => {
    expect(fmt('{a} va {a}', { a: 'x' })).toBe('x va x')
  })

  it('leaves an unknown placeholder visible rather than printing undefined', () => {
    // loud is better than silent: "{name}" on screen is a bug someone reports,
    // "undefined" is one they screenshot and never mention
    expect(fmt('salom {name}', {})).toBe('salom {name}')
  })

  it('handles a string with no placeholders', () => {
    expect(fmt('Assalomu alaykum', { n: 1 })).toBe('Assalomu alaykum')
  })
})

describe('applyMyReport', () => {
  const base: UtilityStatus = {
    kind: 'light',
    out: 2,
    on: 3,
    answered: 5,
    my_state: null,
    my_reported_at: null,
    since: null,
    streets: [],
  }

  it('a first answer joins the tally', () => {
    const out = applyMyReport(base, true)
    expect(out.out).toBe(3)
    expect(out.on).toBe(3)
    expect(out.answered).toBe(6)
    expect(out.my_state).toBe('out')
  })

  it('CHANGING your answer moves it instead of adding a second', () => {
    // the power came back. Without the move, the board would claim one more house
    // than exists and the count would drift upward all evening
    const said = applyMyReport(base, true)
    const moved = applyMyReport(said, false)
    expect(moved.out).toBe(2)
    expect(moved.on).toBe(4)
    expect(moved.answered).toBe(6) // still one person, not two
    expect(moved.my_state).toBe('on')
  })

  it('re-tapping what you already said changes nothing', () => {
    const said = applyMyReport(base, true)
    expect(applyMyReport(said, true)).toBe(said)
  })

  it('never renders a negative count from a stale board', () => {
    const stale: UtilityStatus = { ...base, out: 0, on: 0, answered: 0, my_state: 'out' }
    expect(applyMyReport(stale, false).out).toBe(0)
  })

  it('does not mutate the status it was given', () => {
    applyMyReport(base, true)
    expect(base.out).toBe(2)
    expect(base.my_state).toBeNull()
  })
})

describe('statusFor', () => {
  it('returns an empty status before the board loads', () => {
    // the screen renders tallies straight from this; undefined here would crash it
    const s = statusFor(undefined, 'gas')
    expect(s.kind).toBe('gas')
    expect(s.answered).toBe(0)
    expect(s.streets).toEqual([])
  })

  it('picks the requested utility out of the board', () => {
    const board = {
      statuses: [
        { ...({ kind: 'light', out: 1, on: 0, answered: 1 } as UtilityStatus) },
        { ...({ kind: 'water', out: 4, on: 0, answered: 4 } as UtilityStatus) },
      ],
      windows: [],
    } as unknown as UtilityBoard
    expect(statusFor(board, 'water').out).toBe(4)
  })

  it('falls back rather than throwing when a utility is absent', () => {
    const board = { statuses: [], windows: [] } as unknown as UtilityBoard
    expect(statusFor(board, 'light').out).toBe(0)
  })
})
