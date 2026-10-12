import type { TemplateTable } from '@pdf-slot/core'
import { LABEL_FONT_PX, type TableHandle } from './table-handles'

/**
 * The tag a table is moved by, the way a slot is moved by its name.
 *
 * Sized rather than scaled, so the words stay sharp -- see SlotOverlay: a
 * transform rasterises then stretches them.
 */
export function TableMoveTag({
  table,
  locked,
  shown,
  px,
  bind,
}: {
  table: TemplateTable
  locked: boolean
  /** The tag is chrome: shown only when the pointer is on the table, or it is selected. */
  shown: boolean
  px(screen: number): number
  bind(handle: TableHandle): Record<string, unknown>
}) {
  return (
    <span
        data-testid={`table-handle-${table.id}`}
        {...bind({ kind: 'move' })}
        style={{
          opacity: shown ? 1 : 0,
          transition: 'opacity 120ms',
          position: 'absolute',
          left: 0,
          bottom: '100%',
          marginBottom: px(2),
          padding: `0 ${px(4)}px`,
          fontSize: px(LABEL_FONT_PX),
          lineHeight: `${px(LABEL_FONT_PX + 4)}px`,
          fontFamily: 'var(--font-sans)',
          color: 'var(--slot-selection)',
          background: 'var(--card)',
          border: `${px(1)}px solid var(--slot-highlight-edge)`,
          borderRadius: px(3),
          whiteSpace: 'nowrap',
          userSelect: 'none',
          pointerEvents: locked ? 'none' : 'auto',
          cursor: locked ? 'default' : 'move',
          touchAction: 'none',
        }}
      >
        Table · {table.rowHeights.length} row{table.rowHeights.length === 1 ? '' : 's'}
      </span>
  )
}
