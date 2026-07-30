/** Renders a post as a shareable square image, drawn on a canvas in the browser.
 *
 *  WHY CLIENT-SIDE. The obvious design is a server endpoint returning a PNG, and
 *  it is worse in three ways. It needs a TTF bundled and licensed for both Latin
 *  and Cyrillic (fontsource ships woff2, which Pillow cannot read, and the slim
 *  container has no system fonts). It needs the image to be fetchable for Telegram
 *  to preview it, which means either an auth header Telegram will not send or a
 *  public URL leaking a mahalla's content. And it duplicates the design system in
 *  a second language, where it will drift.
 *
 *  Drawing on a canvas has none of those problems: the app's own fonts are already
 *  loaded, the bytes never leave the device unless the neighbour chooses to share
 *  them, and the palette is imported from the same place the UI reads it.
 *
 *  WHAT IT SHOWS, deliberately: mahalla name, post title, author name. Nothing
 *  else — no family history, no household members, no phone numbers. A member
 *  could screenshot exactly this much anyway, so the card adds no exposure that
 *  did not already exist; it just makes the thing they were going to do look good.
 */

const SIZE = 1080
const PAD = 88

const PAPER = '#fbf3e2'
const INK = '#2a1d14'
const SUB = '#927e64'
const BRAND = '#b23a28'
const TEAL = '#157c84'
const GOLD = '#d89a2a'
const LINE = '#e7d4b0'

/** The khatam lattice, drawn rather than tiled so it stays crisp at any size. */
function girih(ctx: CanvasRenderingContext2D, step: number, alpha: number) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.strokeStyle = TEAL
  ctx.lineWidth = 1.6
  for (let y = 0; y < SIZE + step; y += step) {
    for (let x = 0; x < SIZE + step; x += step) {
      const c = step / 2
      const r = step * 0.25
      ctx.save()
      ctx.translate(x + c, y + c)
      ctx.beginPath()
      ctx.rect(-r, -r, r * 2, r * 2)
      ctx.stroke()
      ctx.rotate(Math.PI / 4)
      ctx.beginPath()
      ctx.rect(-r, -r, r * 2, r * 2)
      ctx.stroke()
      ctx.restore()
    }
  }
  ctx.restore()
}

/** The suzani ikat band — the same repeating palette the app uses on hero edges. */
function ikat(ctx: CanvasRenderingContext2D, y: number, h: number) {
  const bands = [BRAND, PAPER, TEAL, PAPER, GOLD, PAPER, '#1b4b8a', PAPER]
  const w = SIZE / 24
  for (let i = 0, x = 0; x < SIZE; i++, x += w) {
    ctx.fillStyle = bands[i % bands.length]
    ctx.fillRect(x, y, w + 1, h)
  }
}

/** Greedy word wrap. Returns at most `maxLines`, ellipsising the last one. */
function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width <= maxWidth) {
      line = next
      continue
    }
    if (line) lines.push(line)
    line = word
    if (lines.length === maxLines) break
  }
  if (line && lines.length < maxLines) lines.push(line)
  if (lines.length === maxLines) {
    let last = lines[maxLines - 1]
    while (last && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1)
    lines[maxLines - 1] = `${last}…`
  }
  return lines
}

export interface CardInput {
  title: string
  author: string
  mahalla: string
  /** Localised "N mahallasi" style line and the call to action. */
  footer: string
}

/** Draw the card and hand back PNG bytes. */
export async function renderPostCard(input: CardInput): Promise<Blob> {
  // the app's webfonts must be resolved before measureText, or the wrap is
  // computed against a fallback face and the lines come out the wrong length
  if (document.fonts?.ready) await document.fonts.ready

  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas unavailable')

  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, SIZE, SIZE)
  girih(ctx, 132, 0.07)
  ikat(ctx, 0, 14)

  // the ravoq frame — a hairline inset, echoing the app's card silhouette
  ctx.strokeStyle = LINE
  ctx.lineWidth = 2
  ctx.strokeRect(PAD / 2, PAD / 2 + 14, SIZE - PAD, SIZE - PAD - 14)

  // mahalla, small caps above the title
  ctx.fillStyle = BRAND
  ctx.font = '700 30px "Rubik Variable", Rubik, sans-serif'
  ctx.letterSpacing = '4px'
  ctx.fillText(input.mahalla.toUpperCase(), PAD, PAD + 74)
  ctx.letterSpacing = '0px'

  // the title carries the card
  ctx.fillStyle = INK
  ctx.font = '700 68px "Rubik Variable", Rubik, sans-serif'
  const lines = wrap(ctx, input.title, SIZE - PAD * 2, 5)
  lines.forEach((l, i) => ctx.fillText(l, PAD, PAD + 190 + i * 86))

  // author
  ctx.fillStyle = SUB
  ctx.font = '400 38px "Rubik Variable", Rubik, sans-serif'
  ctx.fillText(input.author, PAD, PAD + 190 + lines.length * 86 + 34)

  // wordmark + call to action, on the baseline
  ctx.fillStyle = INK
  ctx.font = '700 44px "Rubik Variable", Rubik, sans-serif'
  ctx.fillText('Mahalladosh', PAD, SIZE - PAD - 26)
  ctx.fillStyle = SUB
  ctx.font = '400 30px "Rubik Variable", Rubik, sans-serif'
  ctx.fillText(input.footer, PAD, SIZE - PAD + 22)

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/png'),
  )
}

/** Hand the card to the OS share sheet, or fall back to a download.
 *  Returns false when neither path is available. */
export async function sharePostCard(input: CardInput, fileName = 'mahalladosh.png') {
  const blob = await renderPostCard(input)
  const file = new File([blob], fileName, { type: 'image/png' })

  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  if (nav.canShare?.({ files: [file] })) {
    // the share sheet is where Telegram actually lives on a phone
    await navigator.share({ files: [file], title: input.title })
    return true
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
  return true
}
