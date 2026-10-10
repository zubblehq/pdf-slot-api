/**
 * What a table drag is adjusting, and the pixel sizes the handles are drawn
 * at. Split out of TableOverlay so the handle groups can share them without
 * importing each other.
 */
import type { TableColumn, TemplateTable } from '@pdf-slot/core'

/** What a drag on the table is adjusting. */
export type TableHandle =
  /** A boundary between two columns: sets the width of the column to its left. */
  | { kind: 'column'; key: string }
  /** A row's bottom edge: that row's height, the rows below moving down. */
  | { kind: 'row'; index: number }
  /** The right edge: the whole table's width, columns keeping their shares. */
  | { kind: 'width' }
  /** The left edge: the same, from the other side -- the right edge stays put. */
  | { kind: 'widthLeft' }
  /** The corner: both at once. */
  | { kind: 'size' }
  /** The whole table. */
  | { kind: 'move' }

/** Grab strips, in screen px, so they are the same size to the hand at any zoom. */
export const STRIP_PX = 8
/** How long an edge's grab bar is, and how thick the visible part is. */
export const GRIP_LEN_PX = 26
export const GRIP_THICK_PX = 5
/** The label that says what a handle does, in screen px. */
export const LABEL_FONT_PX = 11

export type TableDragPatch = Partial<Pick<TemplateTable, 'x' | 'y'>> & {
  columnWidth?: { key: string; width: number }
  /** Every column at once: the whole table was resized. */
  columns?: TableColumn[]
  /** A row's height, or every row's: the same field either way. */
  rowHeights?: number[]
}

/** Past this, the pointer was dragged rather than clicked. */
export const DRAG_SLOP_PX = 3
