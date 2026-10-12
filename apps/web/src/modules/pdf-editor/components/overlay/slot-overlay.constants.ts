import type { CSSProperties } from 'react'
import type { ResizeEdge } from './drag-geometry'

/**
 * The fixed sizes and the one shape SlotOverlay's pieces share.
 *
 * Split out so the tag, the text surface, the name editor and the resize
 * strips can each have their own file without importing one another.
 */
/** Grab strips for the four resize edges, in screen px; see the JSX below. */
export const RESIZE_EDGES: { edge: ResizeEdge; cursor: string; place(px: number): CSSProperties }[] = [
  { edge: 'left', cursor: 'ew-resize', place: (px) => ({ left: -px / 2, top: 0, bottom: 0, width: px }) },
  { edge: 'right', cursor: 'ew-resize', place: (px) => ({ right: -px / 2, top: 0, bottom: 0, width: px }) },
  { edge: 'top', cursor: 'ns-resize', place: (px) => ({ top: -px / 2, left: 0, right: 0, height: px }) },
  { edge: 'bottom', cursor: 'ns-resize', place: (px) => ({ bottom: -px / 2, left: 0, right: 0, height: px }) },
]
export const RESIZE_STRIP_PX = 8
export const SELECTION_OUTLINE_PX = 2
/**
 * How the name shows through an empty box: faint enough that it cannot be
 * taken for text that will be exported, solid enough to judge the fit.
 *
 * A theme token rather than a `color-mix()` computed here: every colour
 * belongs in styles/, where all four themes can give it their own value, and
 * an expression built in a component cannot be re-themed. It also survives a
 * test DOM, which `color-mix()` does not.
 */
export const PLACEHOLDER_COLOR = 'var(--slot-placeholder)'
/**
 * How big the name chip is ON SCREEN: it tracks the page between these
 * two, so it reads as this slot's tag rather than a pip beside a box
 * that has outgrown it, and holds still outside them.
 */
export const TAG_MIN_SCREEN_PX = 11
export const TAG_MAX_SCREEN_PX = 15
/** What the chip would be at 100%, before the bounds bite. */
export const TAG_FONT_PX = 11

/** The inline name editor a freshly placed (or renamed) slot shows; see `naming` below. */
export type SlotNaming = {
  value: string
  onChange(value: string): void
  /** Enter or blur: keep the name (the parent decides what an empty one means). */
  onCommit(): void
  /** Escape: give up on the edit. */
  onCancel(): void
  /**
   * Another slot on this file already answers to this name. A slot's
   * name is a column in a bulk-generation data file, so two of them
   * cannot share one -- the API refuses such a layout outright.
   */
  taken?: boolean
}
