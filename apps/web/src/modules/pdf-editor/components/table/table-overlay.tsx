// Hand-rolled rather than shadcn: like SlotOverlay, this is a canvas
// primitive -- pointer-captured drags mapped into PDF coordinate space --
// and shadcn has no equivalent. See CLAUDE.md.
import { useEffect, useRef, useState } from 'react'
import { tableHeight, tableWidth, toScreenLength, toScreenPoint, type TemplateTable, type Viewport } from '@pdf-slot/core'
import { useTableGestures } from './use-table-gestures'
import type { TableDragPatch } from './table-handles'
import { TableColumnHandles, TableResizeHandles, TableRowHandles } from './table-handle-groups'
import { TableMoveTag } from './table-move-tag'

export { DRAG_SLOP_PX, type TableDragPatch, type TableHandle } from './table-handles'

/**
 * The chrome around a table: an outline, a divider between each pair of
 * columns, a handle on every row's bottom edge, and -- once the table is
 * selected -- a right edge and a corner that size the whole thing.
 *
 * Every handle says what it does when the pointer is on it, because a
 * bar four pixels wide cannot say it by looking like anything. Dragging
 * one reports the new measurement in PDF points; the parent applies it
 * and the cells are laid out again (see syncTableCells).
 *
 * The cells themselves are drawn by SlotOverlay like any other slot, so
 * nothing here paints text: this is only the frame you grab.
 */
export function TableOverlay({
  table,
  viewport,
  screenScale = 1,
  selected,
  selectedRow = null,
  locked = false,
  onSelect,
  onChange,
  onCommit,
}: {
  table: TemplateTable
  viewport: Viewport
  screenScale?: number
  selected: boolean
  /** Which row the selected cell is in, so the row can be shown as picked. */
  selectedRow?: number | null
  locked?: boolean
  onSelect(): void
  /** Live during a drag; every call carries the measurement from the gesture's fixed origin. */
  onChange(patch: TableDragPatch): void
  /** The drag ended: close the undo boundary. */
  onCommit(): void
}) {
  const handlers = useTableGestures({ table, viewport, screenScale, locked, onSelect, onChange, onCommit })
  const [hovered, setHovered] = useState(false)
  const frameRef = useRef<HTMLDivElement>(null)

  // The frame takes no pointer events -- a press inside it belongs to the
  // cell underneath -- so it never receives enter or leave. Hovering is
  // worked out from where the pointer is instead, and only written when
  // the answer changes, so an idle mouse costs nothing.
  useEffect(() => {
    const onMove = (event: globalThis.PointerEvent) => {
      const box = frameRef.current?.getBoundingClientRect()
      if (!box) return
      const inside =
        event.clientX >= box.left && event.clientX <= box.right &&
        event.clientY >= box.top && event.clientY <= box.bottom
      setHovered((was) => (was === inside ? was : inside))
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  // The tag is chrome, not content: it sits over the page's own heading
  // row, so it stays out of the way until the pointer is on the table or
  // the table is selected -- the two moments its handle is wanted.
  const tagShown = hovered || selected

  const origin = toScreenPoint({ x: table.x, y: table.y }, viewport)
  const width = toScreenLength(tableWidth(table), viewport)
  const height = toScreenLength(tableHeight(table), viewport)
  const px = (screen: number) => screen / screenScale
  // How far each row's bottom edge sits from the top of the table.
  const rowBottoms = table.rowHeights.map((_, row) =>
    table.rowHeights.slice(0, row + 1).reduce((total, each) => total + each, 0),
  )

  return (
    <div
      ref={frameRef}
      data-testid={`table-${table.id}`}
      style={{
        position: 'absolute',
        left: origin.x,
        top: origin.y,
        width,
        height,
        // The frame never swallows a click meant for a cell: only its
        // handles take the pointer.
        pointerEvents: 'none',
        outline: `${px(selected ? 2 : 1)}px ${selected ? 'solid' : 'dashed'} var(--slot-selection)`,
        outlineOffset: -px(1),
      }}
    >
      {/* The row the selection is in, painted right across the table.
          Picking a row in the panel selects one cell of it, and a single
          highlighted cell in a grid of forty is not something you can
          find -- the band is what makes the choice visible. */}
      {selectedRow !== null && selectedRow >= 0 && selectedRow < table.rowHeights.length && (
        <div
          data-testid={`table-selected-row-${table.id}`}
          aria-hidden
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: toScreenLength(rowBottoms[selectedRow]! - table.rowHeights[selectedRow]!, viewport),
            height: toScreenLength(table.rowHeights[selectedRow]!, viewport),
            // Tint only, no border of its own. The cells already draw
            // the row's edges; an outline here lands a pixel inside them
            // and reads as a second line beside the first.
            background: 'color-mix(in srgb, var(--slot-selection) 22%, transparent)',
            pointerEvents: 'none',
          }}
        />
      )}

      <TableColumnHandles table={table} viewport={viewport} locked={locked} selected={selected} px={px} bind={handlers} />
      <TableRowHandles table={table} viewport={viewport} locked={locked} selected={selected} px={px} bind={handlers} rowBottoms={rowBottoms} />
      <TableResizeHandles locked={locked} selected={selected} px={px} bind={handlers} width={width} height={height} />
      <TableMoveTag table={table} locked={locked} shown={tagShown} px={px} bind={handlers} />
    </div>
  )
}
