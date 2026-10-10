import { createElement } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { tableFromStored, tableHeight, tableWidth, toScreenLength, toScreenPoint } from '@pdf-slot/core'
import type { TemplateTable, Viewport } from '@pdf-slot/core'
import { TableOverlay } from '@/modules/pdf-editor/components/table/TableOverlay'

/**
 * What TableOverlay *draws*, held against the maths it is supposed to be
 * drawing.
 *
 * The frame, the row dividers and the handles are the visible claim that a
 * table sits where the layout says it does -- the same claim the exported PDF
 * makes about its cells. If the overlay and `toScreenPoint`/`tableWidth` ever
 * disagree, the page shows a table in one place and prints it in another, and
 * nothing else in the suite would catch it: this component had no test.
 *
 * So these assert positions against core's own functions rather than against
 * numbers typed in here. A hard-coded 240 would pass while both sides drifted
 * together; computing the expectation means the test fails the moment the
 * overlay stops agreeing with the renderer.
 */

const viewport: Viewport = { zoom: 1.5, pageHeight: 841.89 }

function table(): TemplateTable {
  return tableFromStored({
    id: 'tbl',
    name: 'Items',
    page: 0,
    x: 60,
    y: 200,
    columns: [
      { key: 'qty', name: 'Qty', width: 60 },
      { key: 'desc', name: 'Description', width: 260 },
    ],
    rowHeights: [24, 30, 18],
    style: {
      fontId: 'sans',
      size: 11,
      color: { r: 0, g: 0, b: 0 },
      align: 'left',
      lineHeight: 1.2,
    },
  })
}

function mount(overrides: Partial<Parameters<typeof TableOverlay>[0]> = {}) {
  return render(
    createElement(TableOverlay, {
      table: table(),
      viewport,
      selected: false,
      onSelect: () => {},
      onChange: () => {},
      onCommit: () => {},
      ...overrides,
    }),
  )
}

const px = (value: string) => parseFloat(value)

afterEach(cleanup)

describe('TableOverlay geometry', () => {
  it('puts the frame exactly where core says the table is', () => {
    mount()
    const frame = screen.getByTestId('table-tbl')

    const origin = toScreenPoint({ x: 60, y: 200 }, viewport)
    expect(px(frame.style.left)).toBeCloseTo(origin.x, 6)
    expect(px(frame.style.top)).toBeCloseTo(origin.y, 6)
    expect(px(frame.style.width)).toBeCloseTo(toScreenLength(tableWidth(table()), viewport), 6)
    expect(px(frame.style.height)).toBeCloseTo(toScreenLength(tableHeight(table()), viewport), 6)
  })

  it('scales with the viewport rather than carrying fixed pixels', () => {
    const zoomed: Viewport = { ...viewport, zoom: 3 }
    mount({ viewport: zoomed })
    const frame = screen.getByTestId('table-tbl')

    // Twice the scale, twice the size: the one property a hard-coded pixel
    // value would quietly break.
    expect(px(frame.style.width)).toBeCloseTo(toScreenLength(tableWidth(table()), zoomed), 6)
    expect(px(frame.style.width) / toScreenLength(tableWidth(table()), viewport)).toBeCloseTo(2, 6)
  })

  it('never swallows a pointer press meant for the cell underneath', () => {
    mount()
    // The frame covers every cell. If it took pointer events, clicking a cell
    // would select the table instead of the cell -- the bug the component's
    // own comment describes.
    expect(screen.getByTestId('table-tbl').style.pointerEvents).toBe('none')
  })

  it('marks the selected row, and only when one is selected', () => {
    mount({ selected: true, selectedRow: 1 })
    const row = screen.getByTestId('table-selected-row-tbl')

    // The band sits inside the frame, so its top is measured from the
    // table's own top edge: row 0's height down, in screen units.
    expect(px(row.style.top)).toBeCloseTo(toScreenLength(24, viewport), 6)
    expect(px(row.style.height)).toBeCloseTo(toScreenLength(30, viewport), 6)

    cleanup()
    mount({ selected: true, selectedRow: null })
    expect(screen.queryByTestId('table-selected-row-tbl')).toBeNull()
  })

  it('makes its handles inert when locked rather than hiding them', () => {
    mount({ selected: true })
    const live = screen.getAllByTestId('table-handle-tbl')
    expect(live.length).toBeGreaterThan(0)
    expect(live.every((h) => h.style.pointerEvents === 'auto')).toBe(true)

    cleanup()
    mount({ selected: true, locked: true })
    // Still drawn -- the table is still shown as selected -- but nothing
    // about it can be grabbed.
    const locked = screen.getAllByTestId('table-handle-tbl')
    expect(locked.length).toBeGreaterThan(0)
    expect(locked.every((h) => h.style.pointerEvents === 'none')).toBe(true)
    expect(locked.every((h) => h.style.cursor === 'default')).toBe(true)
  })
})
