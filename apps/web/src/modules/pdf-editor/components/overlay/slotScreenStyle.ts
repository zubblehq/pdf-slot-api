import {
  FONT_CSS_FAMILY,
  PDF_APPLIES_KERNING,
  slotInset,
  toScreenLength,
  type FontMetrics,
  type Slot,
  type Viewport,
} from '@pdf-slot/core'
import type { CSSProperties } from 'react'
import { TAG_FONT_PX, TAG_MAX_SCREEN_PX, TAG_MIN_SCREEN_PX } from './slot-overlay.constants'

/**
 * Turning a slot's measurements into the screen values its chrome and its
 * caret are drawn with. Pure: the same slot, viewport and scale always give
 * the same answer.
 *
 * Separated from SlotOverlay because `typography` and `insetPx` are part of
 * the preview-equals-download promise rather than part of a component --
 * they are what keeps the invisible textarea's caret on the same rows as the
 * glyphs `layoutText` positioned. Having them named and in one place means
 * that agreement can be checked directly.
 */
export function slotScreenStyle(
  slot: Slot,
  viewport: Viewport,
  metrics: FontMetrics,
  screenScale: number,
) {
  // Everything that must look the same size on screen at any zoom is sized
  // in stage px against the screen scale.
  const px = (screen: number) => screen / screenScale

  // The tag tracks the page between the two bounds, and holds still outside
  // them. Sized rather than scaled: a `transform: scale()` rasterises the
  // text at one size and stretches it to another, which is what left the
  // chip looking pixelated at high zoom. Setting the font size in stage px
  // so that it *lands* on the wanted screen size lets the browser lay the
  // glyphs out at their real size, sharp at any zoom.
  const tagOnScreen = Math.min(TAG_MAX_SCREEN_PX, Math.max(TAG_MIN_SCREEN_PX, TAG_FONT_PX * screenScale))
  const tag = (screenPx: number) => (screenPx * (tagOnScreen / TAG_FONT_PX)) / screenScale

  const typography: CSSProperties = {
    fontFamily: FONT_CSS_FAMILY[slot.fontId],
    fontSize: toScreenLength(slot.size, viewport),
    lineHeight: slot.lineHeight,
    fontKerning: PDF_APPLIES_KERNING ? 'normal' : 'none',
  }

  // The same inset layoutText was given, in screen px. The textarea is
  // invisible, but its caret is not, and its caret sits against *its* text --
  // so if it starts at the box edge while the glyphs start a padding in, the
  // caret stands a padding away from the letters it belongs to. Padding also
  // narrows its content box to the width the lines were wrapped at, so the
  // row the caret lands on is the row the reader sees.
  const inset = slotInset(slot, metrics)
  const insetPx = {
    left: toScreenLength(inset.left, viewport),
    top: toScreenLength(inset.top, viewport),
  }

  return { px, tag, tagOnScreen, typography, insetPx }
}
