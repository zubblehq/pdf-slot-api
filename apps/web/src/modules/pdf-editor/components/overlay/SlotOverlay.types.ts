import type { Slot, FontMetrics, Viewport } from '@pdf-slot/core'
import type { SlotNaming } from './slot-overlay.constants'

/**
 * What SlotOverlay needs to draw one slot.
 *
 * Its own file so the component stays inside elli-ui's 200-line cap without
 * any of these explanations being dropped -- several of them (`textCommitted`,
 * `onCloneStart`, `screenScale`) describe behaviour that is not guessable
 * from the name.
 */
export type SlotOverlayProps = {
  slot: Slot
  /** The slot's name: shown, in the slot's own typography, as a placeholder while it has no text. */
  name?: string
  /** The frame the stage is laid out in (zoom 1 on the infinite canvas). */
  viewport: Viewport
  /**
   * The CSS scale the stage is shown at on top of `viewport.zoom`. Pointer
   * deltas arrive in screen px and are divided by it; the strips, outline
   * and badge are sized against it so they stay the same size on screen
   * at any zoom.
   */
  screenScale?: number
  metrics: FontMetrics
  selected: boolean
  /** True for one render once this slot has been named: the caret moves into its text box. */
  autoFocus?: boolean
  /** Called once that focus has been given, so the caller can clear its one-shot flag. */
  onFocused?(): void
  onSelect(): void
  /** `targetId` is set only while Alt+dragging: the patch is for the copy being dragged, not this slot. */
  onChange(patch: Partial<Slot>, targetId?: string): void
  /** Ends the current gesture (drag, resize, or text edit), closing its undo boundary. */
  onCommit(): void
  /**
   * True once the on-canvas render (pdf.js painting the real, committed PDF
   * bytes) reflects this slot's current text. While true and the slot isn't
   * focused, this overlay renders only its border/handles -- the glyphs the
   * user sees are the canvas's, not a DOM approximation of them. Rendering
   * both at once would show two overlapping (and not necessarily
   * pixel-identical) copies of the same text.
   */
  textCommitted?: boolean
  /** The layout is frozen (the panel's padlock): the box can be typed into but not moved or resized. */
  locked?: boolean
  /** When set, the box shows an inline editor for its name instead of its text -- how a slot is named at placement, with no dialog. */
  naming?: SlotNaming | null
  /**
   * Alt+drag (the Figma gesture): asked once, when the drag starts, for a
   * copy of this slot placed over it; returns the copy's id. The copy then
   * follows the pointer and this box stays put. Omitted: Alt+drag is a
   * plain drag.
   */
  onCloneStart?(): string | null
}
