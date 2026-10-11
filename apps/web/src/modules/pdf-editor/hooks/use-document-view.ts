import { useMemo } from 'react'
import { toLayout, toValues, type Slot } from '@pdf-slot/core'
import type { useTables } from '@/modules/pdf-editor/components/table/useTables'

/**
 * The document as everything outside the canvas sees it: what gets saved,
 * and what a data file can fill.
 *
 * Five pure derivations of the same few inputs, pulled out of
 * template-editor-page because they are one question -- "what does the rest
 * of the app see of this document" -- answered in one place, rather than five
 * memos interleaved with state and handlers.
 *
 * All memoised, and that matters rather than being a habit: `fillTargets` and
 * `slotNames` are the generate panel's memo keys, so a fresh array every
 * render would make it re-parse the pasted rows on every keystroke.
 */
export function useDocumentView({
  fileId,
  slots,
  allSlots,
  names,
  tables,
}: {
  fileId: string
  /** The hand-placed slots only; a table's cells are derived (see useTables). */
  slots: Slot[]
  /** Those plus every table cell: what actually prints. */
  allSlots: Slot[]
  names: Record<string, string>
  tables: ReturnType<typeof useTables>
}) {
  // Memoised because it is the generate panel's memo key (see above).
  const slotNames = useMemo(() => Object.values(names), [names])

  /**
   * The names of the boxes that have something typed into them, as a data
   * file would have to name them: a plain slot by its own name, a table by
   * the table's. What the generate panel offers to print on every PDF when
   * the data file says nothing about them.
   */
  const filledIn = useMemo(() => {
    const filled = new Set<string>()
    for (const slot of slots) if (slot.text.trim() !== '') filled.add(names[slot.id] ?? slot.id)
    for (const cell of tables.cells) {
      if (cell.text.trim() === '') continue
      const table = tables.tableOf(cell.id)
      if (table) filled.add(table.name)
    }
    return [...filled]
  }, [slots, tables, names])

  // What a data file can fill: the named boxes, and the named tables with the
  // columns and the number of ruled lines each one has.
  const fillTargets = useMemo(
    () => ({
      slotNames,
      tables: tables.tables.map((table) => ({
        name: table.name,
        columns: table.columns.map((column) => column.name),
        rowCount: table.rowHeights.length,
      })),
    }),
    [slotNames, tables.tables],
  )

  // Debounced safety-net writes of both records; Save writes at once.
  const currentLayout = useMemo(
    () => toLayout(fileId, slots, names, new Date().toISOString(), tables.tables),
    [fileId, slots, names, tables.tables],
  )
  const currentValues = useMemo(
    () => toValues(fileId, allSlots, new Date().toISOString()),
    [fileId, allSlots],
  )

  return { slotNames, filledIn, fillTargets, currentLayout, currentValues }
}
