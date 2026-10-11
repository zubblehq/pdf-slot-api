import type { ChangeEvent, CSSProperties, RefObject } from 'react'
import { rgbToCss, type Slot } from '@pdf-slot/core'

/**
*Invisible input surface layered over the rendered lines: its own
*text is transparent (only the caret is visible), so the glyphs the
*user actually sees are always SlotLines' one-span-per-line render --
*never this textarea's native, potentially-re-wrapped text node. It
*deliberately has no pointerdown handler of its own -- the body div's
*handler above both arms drag-detection and (by not calling
*preventDefault) leaves this element's native focus-on-click intact.
 * 
*Its own wrap geometry (which character falls on which row) is a
*SEPARATE concern from the invisible-text trick above, and matters
*for the caret alone: a click/keystroke's row is determined by the
*browser's own `white-space: pre-wrap` reflow of this element, not by
*`layoutText`. If this textarea measured text with a different font
*than `SlotLines` does, its wrap points -- and therefore the caret's
*row -- could disagree with where the glyphs the user is looking at
*actually break, even though the rendered glyphs themselves stay
*correct (SlotLines is unaffected either way). So every property that
*affects glyph advance widths or line spacing is mirrored from
*SlotLines/layoutText's inputs exactly: fontFamily (the same
*`@font-face` bytes, not the page's inherited Geist Sans),
*fontSize, fontKerning (must match PDF_APPLIES_KERNING for the same
*reason `layoutText`'s width measurement does -- see
*packages/core/src/layout/metrics.ts; GSUB substitution --
*`calt` for Inter, `liga` for the serif face -- is deliberately left
*at its CSS default, because pdf-lib applies it and so must the
*browser), and
*lineHeight as a unitless multiplier (`slot.lineHeight`), which -- since
*fontSize here is already toScreenLength(slot.size, viewport) --
*yields exactly toScreenLength(slot.size * slot.lineHeight, viewport)
*px per row, the same per-line step `layoutText` uses for baselineY.
 */
export function SlotTextInput({
  slot,
  textareaRef,
  typography,
  insetPx,
  onTextChange,
  onFocusIn,
  onBlurOut,
}: {
  slot: Slot
  textareaRef: RefObject<HTMLTextAreaElement | null>
  /** Mirrored from SlotLines/layoutText's inputs exactly -- see above. */
  typography: CSSProperties
  insetPx: { left: number; top: number }
  onTextChange(event: ChangeEvent<HTMLTextAreaElement>): void
  onFocusIn(): void
  onBlurOut(): void
}) {
  return (
    <textarea
      ref={textareaRef}
      value={slot.text}
      onChange={onTextChange}
      onBlur={onBlurOut}
      // Selecting on focus (rather than only from a drag/resize gesture) is
      // what makes a plain click on an unselected slot show it as selected
      // (border, resize handle) even though the click's own pointerdown never
      // crosses the drag threshold. The caller does that; see onFocusIn.
      onFocus={onFocusIn}
      spellCheck={false}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        resize: 'none',
        border: 'none',
        outline: 'none',
        boxSizing: 'border-box',
        paddingLeft: insetPx.left,
        paddingRight: insetPx.left,
        paddingTop: insetPx.top,
        paddingBottom: 0,
        margin: 0,
        background: 'transparent',
        color: 'transparent',
        // Said twice on purpose. `color` alone leaves the glyphs to
        // `-webkit-text-fill-color`, which defaults to currentColor
        // but is a separate property a browser or an extension can
        // set on a form control -- and if anything does, this
        // textarea paints its own text over the rendered lines and
        // the same words appear twice, a pixel apart.
        WebkitTextFillColor: 'transparent',
        caretColor: rgbToCss(slot.color),
        ...typography,
        overflow: 'hidden',
        whiteSpace: 'pre-wrap',
        // The stage is user-select: none; the one place text is selectable is here.
        userSelect: 'text',
      }}
    />
  )
}
