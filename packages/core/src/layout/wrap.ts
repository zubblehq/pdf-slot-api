import type { FontMetrics } from './metrics'
import type { Slot } from '../document/types'

export type Align = 'left' | 'center' | 'right'

/**
 * Where the lines sit inside a box that is taller than they are. Only a
 * box with a height of its own (a dragged slot, a table cell) has room to
 * move them in; a box as tall as its text looks the same either way.
 */
export type VerticalAlign = 'top' | 'middle' | 'bottom'

/** A single laid-out line. `x` and `baselineY` are PDF points. */
export type PositionedLine = { text: string; x: number; baselineY: number }

/**
 * A box is never inset so far that there is no room left to read.
 * Narrower than this and a word breaks to one letter a line, which is
 * not text any more.
 */
export const MIN_TEXT_WIDTH = 12

export type LayoutInput = {
  text: string
  size: number
  width: number
  align: Align
  lineHeight: number
  /** Top-left corner of the slot box, in PDF points. */
  originX: number
  originY: number
  /**
   * The height the lines may use, PDF points, measured down from `originY`
   * (padding already taken off). Absent = the box is exactly as tall as its
   * text, and `verticalAlign` has nothing to do.
   */
  boxHeight?: number
  /** Absent = top, which is what every file saved before this existed means. */
  verticalAlign?: VerticalAlign
  /**
   * Extra advance after every glyph, PDF points (PDF's `Tc`); absent = 0.
   * Measured between glyphs only -- see `FontMetrics.widthOfText`.
   */
  letterSpacing?: number
}

/**
 * The height of the box that holds `lineCount` lines: the taller of the
 * line boxes (`lineCount * size * lineHeight`, which leaves the usual
 * leading under the last line) and the glyphs themselves -- from the
 * first line's ascender, down `lineCount - 1` steps, to the last line's
 * descender. The second term is what keeps a tight line height from
 * drawing a box the text hangs out of: a face's ascender + descender can
 * exceed one step of `size * lineHeight`, and for every face bundled here
 * it does at the line heights people actually pick -- Inter (sans) spans
 * 1.21 em, PT Serif 1.33, IBM Plex Mono 1.30. Preview-only: the export places
 * text by baseline and never reads this.
 */
export function layoutHeight(lineCount: number, size: number, lineHeight: number, metrics: FontMetrics): number {
  const lineBoxes = lineCount * size * lineHeight
  // `descender` is negative (below the baseline), hence the subtraction.
  const glyphs = metrics.ascender(size) + (lineCount - 1) * size * lineHeight - metrics.descender(size)
  return Math.max(lineBoxes, glyphs)
}

/**
 * Splits a word into grapheme clusters rather than code points, so a hard
 * character break can never fall inside a multi-code-point cluster (e.g. a
 * base letter plus a combining diacritic) and strand a combining mark at the
 * start of the next line.
 *
 * `Intl.Segmenter` can in principle segment differently across JS engines.
 * That is safe here only because `layoutText` runs once per session and both
 * consumers (the overlay and the PDF writer) read that single output array —
 * they cannot disagree with each other even if a different browser would have
 * segmented differently. This reasoning holds only while both consumers share
 * one JS realm. If line breaking (or export) ever moves server-side, the
 * server and browser become different realms and this guarantee must be
 * re-checked.
 */
function graphemeClusters(word: string): string[] {
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
  return Array.from(segmenter.segment(word), (s) => s.segment)
}

function breakParagraph(
  paragraph: string, width: number, size: number, metrics: FontMetrics, letterSpacing: number,
): string[] {
  if (paragraph === '') return ['']
  // Unspaced text calls widthOfText exactly as it always has: two
  // arguments, so a FontMetrics written before spacing existed still works.
  const measure = (text: string) =>
    letterSpacing === 0 ? metrics.widthOfText(text, size) : metrics.widthOfText(text, size, letterSpacing)

  const lines: string[] = []
  let current = ''

  for (const word of paragraph.split(' ')) {
    const candidate = current === '' ? word : current + ' ' + word

    if (measure(candidate) <= width) {
      current = candidate
      continue
    }

    if (current !== '') {
      lines.push(current)
      current = ''
    }

    // The word alone may still not fit; break it by character.
    if (measure(word) <= width) {
      current = word
      continue
    }

    let chunk = ''
    for (const cluster of graphemeClusters(word)) {
      if (chunk !== '' && measure(chunk + cluster) > width) {
        lines.push(chunk)
        chunk = cluster
      } else {
        chunk += cluster
      }
    }
    current = chunk
  }

  if (current !== '') lines.push(current)
  return lines.length === 0 ? [''] : lines
}

/**
 * What to lay out for a slot, its padding already taken off.
 *
 * Both the overlay and the PDF writer go through here rather than
 * building their own input, because the two must agree to the point:
 * preview equals download is decided by whether these numbers match.
 *
 * `text` is passed in rather than read off the slot because the overlay
 * also lays out a slot's *name*, as the placeholder in an empty box.
 */
export function slotLayout(slot: Slot, text: string, metrics?: FontMetrics): LayoutInput {
  const inset = slotInset(slot, metrics)
  return {
    text,
    size: slot.size,
    width: slot.width - inset.left * 2,
    align: slot.align,
    lineHeight: slot.lineHeight,
    originX: slot.x + inset.left,
    // PDF y grows upward, so insetting from the top means going down.
    originY: slot.y - inset.top,
    // The top padding is kept clear at the bottom too, the way the left
    // padding is kept on the right: bottom-aligned text in a ruled cell
    // wants holding off the rule under it just as top-aligned text does
    // the one above. A box with no height of its own has nowhere to move
    // its text, so it gets none, and lays out exactly as it always has.
    boxHeight: slot.height ? Math.max(0, slot.height - inset.top * 2) : undefined,
    verticalAlign: slot.verticalAlign,
    // Only when set, so an unspaced slot's input is exactly what it was.
    ...(slot.letterSpacing ? { letterSpacing: slot.letterSpacing } : {}),
  }
}

/**
 * The padding actually applied, each axis against what the box can spare.
 *
 * `left` is kept clear on the left *and* the right. Only the left edge is
 * what a user is usually nudging text off, which is what it is called
 * after -- but text can be right-aligned, and then it is the right edge
 * that needs holding off the rule. One number for both is what lets a
 * column of amounts sit inside its cell whichever way it is aligned.
 *
 * `top` is the top alone: there is nothing below the last line that a
 * bottom padding would hold it off, since a box grows downward to fit.
 *
 * Both are clamped by what is left. Across, the text must stay wide
 * enough to be a line rather than a column of single letters. Down, a box
 * with a height of its own -- a table's cell, which owns its row -- must
 * still hold one line below its padding, or the text would push the box
 * past the row it belongs to and the table would come apart.
 */
export function slotInset(slot: Slot, metrics?: FontMetrics): { left: number; top: number } {
  const wantedLeft = Math.max(0, slot.paddingLeft ?? slot.padding ?? 0)
  const wantedTop = Math.max(0, slot.paddingTop ?? slot.padding ?? 0)
  const across = Math.max(0, (slot.width - MIN_TEXT_WIDTH) / 2)
  const line = metrics ? metrics.ascender(slot.size) - metrics.descender(slot.size) : 0
  const down = slot.height === undefined ? Infinity : Math.max(0, slot.height - line)
  return { left: Math.min(wantedLeft, across), top: Math.min(wantedTop, down) }
}

export function layoutText(input: LayoutInput, metrics: FontMetrics): PositionedLine[] {
  if (input.text === '') return []

  // Normalize CRLF and lone-CR (classic Mac) line endings to LF before
  // splitting. Left unnormalized, a trailing '\r' rides along as a literal
  // character in the returned line text -- and that same string is drawn by
  // both the overlay and the PDF writer, which can disagree on how a bare
  // '\r' renders (a browser text node silently drops it; a real embedded
  // font may measure it or show a .notdef box).
  const normalized = input.text.replace(/\r\n?/g, '\n')
  const spacing = input.letterSpacing ?? 0

  const raw = normalized
    .split('\n')
    .flatMap((p) => breakParagraph(p, input.width, input.size, metrics, spacing))

  const step = input.size * input.lineHeight
  const firstBaseline =
    input.originY - metrics.ascender(input.size) - verticalOffset(input, raw.length, metrics)

  return raw.map((text, i) => {
    const lineWidth =
      spacing === 0 ? metrics.widthOfText(text, input.size) : metrics.widthOfText(text, input.size, spacing)
    const slack = input.width - lineWidth
    const dx = input.align === 'center' ? slack / 2 : input.align === 'right' ? slack : 0
    return {
      text,
      x: input.originX + dx,
      baselineY: firstBaseline - i * step,
    }
  })
}

/**
 * How far below the top of the box the first line starts, PDF points.
 *
 * What is centred (or pushed down) is the ink a reader sees: from the
 * first line's ascender to the last line's descender -- the same extent
 * `layoutHeight` calls the glyphs. Never negative: text taller than its
 * box stays hung from the top, where it was, rather than climbing out
 * above the box and over whatever is printed there.
 */
function verticalOffset(input: LayoutInput, lineCount: number, metrics: FontMetrics): number {
  const align = input.verticalAlign ?? 'top'
  if (align === 'top' || input.boxHeight === undefined) return 0
  const step = input.size * input.lineHeight
  const ink = metrics.ascender(input.size) + (lineCount - 1) * step - metrics.descender(input.size)
  const slack = Math.max(0, input.boxHeight - ink)
  return align === 'middle' ? slack / 2 : slack
}
