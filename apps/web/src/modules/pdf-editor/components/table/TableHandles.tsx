import { columnLeft, toScreenLength, type TemplateTable, type Viewport } from '@pdf-slot/core'
import { Handle } from './Handle'
import { GRIP_LEN_PX, GRIP_THICK_PX, LABEL_FONT_PX, STRIP_PX, type TableHandle } from './table-handles'

/**
 * The handles a table offers, in three groups: the boundaries between its
 * columns, the bottom edge of each row, and the table's own edges.
 *
 * Grouped here rather than inside TableOverlay because each group is a
 * self-contained answer to "where does this handle go and what does it say",
 * and the overlay's job is the frame and what is selected.
 */
type Shared = {
  table: TemplateTable
  viewport: Viewport
  locked: boolean
  selected: boolean
  /** Screen px -> the units this overlay is drawn in (see TableOverlay). */
  px(screen: number): number
  bind(handle: TableHandle): Record<string, unknown>
}

export function TableColumnHandles({ table, viewport, locked, selected, px, bind }: Shared) {
  return (
    <>
      {/* The boundaries between columns: drag one and the column on its
          left takes the space from the column on its right, so the
          table's own width never moves and no other boundary shifts.
          The last column has nothing to its right to trade with, so it
          has no divider -- that edge sizes the whole table instead. */}
      {table.columns.slice(0, -1).map((column, index) => {
        const right = toScreenLength(columnLeft(table, index) + column.width - table.x, viewport)
        return (
          <Handle
            key={column.key}
            testId={`table-column-${column.key}`}
            bind={bind({ kind: 'column', key: column.key })}
            locked={locked}
            px={px}
            label={`${column.name} width — takes from the next column`}
            cursor="ew-resize"
            area={{ left: right - px(STRIP_PX) / 2, top: 0, bottom: 0, width: px(STRIP_PX) }}
            visible={
              selected
                ? { left: (px(STRIP_PX) - px(GRIP_THICK_PX)) / 2, top: '50%', marginTop: -px(GRIP_LEN_PX) / 2, width: px(GRIP_THICK_PX), height: px(GRIP_LEN_PX) }
                : { display: 'none' }
            }
            labelAt={{ left: px(STRIP_PX + 4), top: '50%', marginTop: -px(LABEL_FONT_PX) }}
          />
        )
      })}
    </>
  )
}

export function TableRowHandles({ table, viewport, locked, selected, px, bind, rowBottoms }: Shared & { rowBottoms: number[] }) {
  return (
    <>
      {/* Every row's bottom edge, the way a spreadsheet resizes a row:
          point at the line under a row and drag it. That row grows or
          shrinks and the rows below move down; the table's own height
          follows. The last row's line is the table's bottom edge, so
          every row can be set from the line beneath it. */}
      {rowBottoms.map((bottom, row) => (
        <Handle
          key={row}
          testId={`table-row-${table.id}-${row}-edge`}
          bind={bind({ kind: 'row', index: row })}
          locked={locked}
          px={px}
          label={`Row ${row + 1} height`}
          cursor="ns-resize"
          area={{ left: 0, right: 0, top: toScreenLength(bottom, viewport) - px(STRIP_PX) / 2, height: px(STRIP_PX) }}
          visible={
            selected
              ? {
                  left: '50%',
                  marginLeft: -px(GRIP_LEN_PX) / 2,
                  top: (px(STRIP_PX) - px(GRIP_THICK_PX)) / 2,
                  width: px(GRIP_LEN_PX),
                  height: px(GRIP_THICK_PX),
                }
              : { display: 'none' }
          }
          labelAt={{ left: '50%', marginLeft: px(GRIP_LEN_PX), top: -px(2) }}
        />
      ))}
    </>
  )
}

export function TableResizeHandles({
  locked,
  selected,
  px,
  bind,
  width,
  height,
}: Omit<Shared, 'table' | 'viewport'> & {
  /** Already in screen units: these edges are placed against the frame, not the page. */
  width: number
  height: number
}) {
  if (!selected || locked) return null
  // Only once the table is selected: unasked-for handles on every table
  // would cover the page.
  return (
    <>
          {/* Both side edges resize the table. The left one is not a
              column boundary -- there is no column to its left to trade
              with -- so it moves the table's left edge and leaves its
              right where it is. */}
          <Handle
            testId="table-width-left"
            bind={bind({ kind: 'widthLeft' })}
            locked={locked}
            px={px}
            label="Width — from this side"
            cursor="ew-resize"
            area={{ left: -px(STRIP_PX) / 2, top: '50%', marginTop: -px(GRIP_LEN_PX) / 2, width: px(STRIP_PX), height: px(GRIP_LEN_PX) }}
            visible={{ inset: 0, left: (px(STRIP_PX) - px(GRIP_THICK_PX)) / 2, width: px(GRIP_THICK_PX) }}
            labelAt={{ right: px(STRIP_PX + 4), top: '50%', marginTop: -px(LABEL_FONT_PX) }}
          />
          <Handle
            testId="table-width"
            bind={bind({ kind: 'width' })}
        locked={locked}
        px={px}
            label="Width — all columns together"
            cursor="ew-resize"
            area={{ left: width - px(STRIP_PX) / 2, top: '50%', marginTop: -px(GRIP_LEN_PX) / 2, width: px(STRIP_PX), height: px(GRIP_LEN_PX) }}
            visible={{ inset: 0, left: (px(STRIP_PX) - px(GRIP_THICK_PX)) / 2, width: px(GRIP_THICK_PX) }}
            labelAt={{ left: px(STRIP_PX + 4), top: '50%', marginTop: -px(LABEL_FONT_PX) }}
          />
          <Handle
            testId="table-size"
            bind={bind({ kind: 'size' })}
        locked={locked}
        px={px}
            label="Size the whole table"
            cursor="nwse-resize"
            area={{ left: width - px(STRIP_PX) / 2, top: height - px(STRIP_PX) / 2, width: px(STRIP_PX), height: px(STRIP_PX) }}
            visible={{ inset: px(1) }}
            labelAt={{ left: px(STRIP_PX + 4), top: -px(2) }}
          />
        </>
  )
}
