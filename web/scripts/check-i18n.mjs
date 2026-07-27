/**
 * Four-language guard for the i18n dictionaries.
 *
 * TypeScript already catches a *missing* language: every dictionary is declared
 * `satisfies Dict`, and `Entry = Record<Lang, string>` demands all four keys, so
 * `tsc --noEmit` fails on an omitted one. What TypeScript cannot see is whether
 * the strings are the *right* strings — and the failure mode that actually
 * happens is Russian text pasted into the `uzc` slot, because both are Cyrillic
 * and it looks plausible to anyone who does not read Uzbek.
 *
 * `uzc` is Ўзбекча — Uzbek written in Cyrillic. It is NOT Russian. Elders in the
 * mahalla read it best, and serving them Russian is the one i18n bug that would
 * be invisible in review and obvious to the user.
 *
 * Run: npm run check:i18n   (also part of `npm run check` and CI)
 */

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = fileURLToPath(new URL('../src/core/i18n/', import.meta.url))
const LANGS = ['uz', 'uzc', 'ru', 'en']

// index.ts is the engine, not a dictionary; backend.ts maps server messages and
// deliberately has no `uz` key (the server already speaks Uzbek).
const NOT_A_DICT = new Set(['index.ts', 'backend.ts'])

const CYRILLIC = /[Ѐ-ӿ]/
// Letters Russian has and the Uzbek Cyrillic alphabet does not. Note that ё and ъ
// are NOT in this set: Uzbek Cyrillic uses both (ёрдам, эълон), so treating them
// as Russian markers produces false positives on perfectly good Uzbek.
const RUSSIAN_ONLY = /[ыЫщЩ]/

const problems = []
const files = readdirSync(DIR).filter((f) => f.endsWith('.ts') && !NOT_A_DICT.has(f))

for (const file of files) {
  const path = join(DIR, file)
  const src = readFileSync(path, 'utf8')
  const lines = src.split('\n')

  if (!src.includes('satisfies Dict')) {
    problems.push(
      `${file}: no \`satisfies Dict\` — without it TypeScript will not enforce the four languages.`,
    )
  }

  // Entries are object literals; a value may be inline or spread over lines, so
  // walk key-by-key from each `lang:` occurrence rather than parsing the object.
  const entries = collectEntries(src)
  for (const entry of entries) {
    const missing = LANGS.filter((l) => entry.values[l] === undefined)
    if (missing.length) {
      problems.push(`${file}:${entry.line} ${entry.key}: missing ${missing.join(', ')}`)
      continue
    }

    const { uz, uzc, ru, en } = entry.values
    const at = `${file}:${entry.line} ${entry.key}`

    // Placeholders ({n}, {mon}) are code, not prose — a template like "{d}-{mon}"
    // is legitimately script-free, so strip them before judging the script.
    const bare = (s) => String(s ?? '').replace(/\{\w+\}/g, ' ')

    if (RUSSIAN_ONLY.test(uzc)) {
      problems.push(
        `${at}: uzc contains "${uzc.match(RUSSIAN_ONLY)[0]}", which is not in the Uzbek Cyrillic alphabet — this looks like Russian.`,
      )
    }
    // A shared loanword (Транспорт, Спам, Статистика) really is identical in both,
    // so only a whole identical PHRASE is evidence of Russian in the uzc slot.
    if (uzc === ru && uz !== uzc && words(uzc) >= 3) {
      problems.push(`${at}: uzc is word-for-word identical to ru — Uzbek Cyrillic is not Russian.`)
    }
    // A value deliberately left untranslated (uz === uzc) is opting out of script
    // checks on purpose; household.genStatGloss is an English gloss by design.
    if (uz !== uzc && hasLetters(bare(uzc)) && !CYRILLIC.test(bare(uzc))) {
      problems.push(`${at}: uzc has no Cyrillic characters.`)
    }
    if (uz !== ru && hasLetters(bare(ru)) && !CYRILLIC.test(bare(ru))) {
      problems.push(`${at}: ru has no Cyrillic characters.`)
    }
    if (CYRILLIC.test(bare(en))) {
      problems.push(`${at}: en contains Cyrillic characters.`)
    }
    if (CYRILLIC.test(bare(uz))) {
      problems.push(`${at}: uz is Latin O'zbekcha but contains Cyrillic characters.`)
    }
    // Placeholders must survive translation, or fmt() renders a literal {name}.
    const expected = placeholders(uz)
    for (const lang of ['uzc', 'ru', 'en']) {
      const got = placeholders(entry.values[lang])
      const lost = [...expected].filter((p) => !got.has(p))
      const extra = [...got].filter((p) => !expected.has(p))
      if (lost.length) problems.push(`${at}: ${lang} is missing placeholder ${lost.join(', ')}`)
      if (extra.length) problems.push(`${at}: ${lang} has unknown placeholder ${extra.join(', ')}`)
    }
  }

  if (entries.length === 0) {
    problems.push(`${file}: no dictionary entries found — has the file shape changed?`)
  }

  void lines
}

/** Pull `key: { uz: '…', uzc: '…', ru: '…', en: '…' }` entries out of a dict file. */
function collectEntries(src) {
  const out = []
  // A key is at the start of a line, then an object literal opens. Values may be
  // single- or double-quoted and may run onto their own lines.
  const keyRe = /^\s{2}(\w+):\s*\{/gm
  let m
  while ((m = keyRe.exec(src)) !== null) {
    const key = m[1]
    const line = src.slice(0, m.index).split('\n').length
    // Scan forward to the matching brace.
    let depth = 0
    let i = m.index + m[0].length - 1
    let end = -1
    for (; i < src.length; i++) {
      const ch = src[i]
      if (ch === '{') depth++
      else if (ch === '}') {
        depth--
        if (depth === 0) {
          end = i
          break
        }
      }
    }
    if (end === -1) continue
    const body = src.slice(m.index + m[0].length, end)
    const values = {}
    for (const lang of LANGS) {
      const v = readValue(body, lang)
      if (v !== null) values[lang] = v
    }
    out.push({ key, line, values })
  }
  return out
}

/** Read `lang: '…'` (single, double or backtick quoted) out of an entry body. */
function readValue(body, lang) {
  const re = new RegExp(`\\b${lang}:\\s*(['"\`])`)
  const m = re.exec(body)
  if (!m) return null
  const quote = m[1]
  let i = m.index + m[0].length
  let out = ''
  for (; i < body.length; i++) {
    const ch = body[i]
    if (ch === '\\') {
      out += body[i + 1] ?? ''
      i++
      continue
    }
    if (ch === quote) break
    out += ch
  }
  return out
}

function placeholders(s) {
  return new Set([...String(s ?? '').matchAll(/\{(\w+)\}/g)].map((m) => m[1]))
}

function hasLetters(s) {
  return /[A-Za-zЀ-ӿ]/.test(String(s ?? ''))
}

function words(s) {
  return String(s ?? '')
    .split(/\s+/)
    .filter(Boolean).length
}

if (problems.length) {
  console.error(`\ni18n guard failed — ${problems.length} problem(s):\n`)
  for (const p of problems) console.error(`  • ${p}`)
  console.error('\nEvery user-visible string ships in all four languages:')
  console.error("  uz  O'zbekcha (Latin)   uzc  Ўзбекча (Cyrillic, Uzbek — not Russian)")
  console.error('  ru  Русский             en   English\n')
  process.exit(1)
}

console.log(`i18n guard passed — ${files.length} dictionaries, all four languages.`)
