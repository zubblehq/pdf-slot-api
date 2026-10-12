// Hand-rolled rather than shadcn: like SlotOverlay, this is a canvas
// primitive -- pointer-captured drags mapped into PDF coordinate space --
// and shadcn has no equivalent. See CLAUDE.md.
import { useRef, type CSSProperties, type PointerEvent } from 'react'
import { DRAG_SLOP_PX, LABEL_FONT_PX } from './table-handles'


/**
 * A handle: a generous area to grab, something to see once the table is
 * selected, and a word for what it does when the pointer is on it. A bar
 * five pixels wide cannot explain itself by looking like anything, and
 * these adjust different things from one another.
 *
 * A handle has to be wide enough to hit, which means it lies over the
 * cells around it -- a row's handle runs the width of the table, right
 * across the boxes people are trying to type into. So a press that never
 * moved is not a drag at all: the handle steps out of the way and hands
 * the click to whatever was underneath it, which is how clicking near
 * the bottom of a cell still puts the caret in that cell.
 */
export function Handle({
  testId,
  bind,
  label,
  cursor,
  locked,
  px,
  area,
  visible,
  labelAt,
}: {
  testId: string
  /** The gesture handlers for this handle, already bound to it. */
  bind: React.DOMAttributes<HTMLElement>
  label: string
  cursor: string
  locked: boolean
  /** Screen px to stage px, so a handle is the same size to the hand at any zoom. */
  px(screen: number): number
  area: CSSProperties
  /** The bit you can see, drawn inside the grab area. */
  visible: CSSProperties
  labelAt: CSSProperties
}) {
  const self = useRef<HTMLDivElement>(null)
  const pressedAt = useRef<{ x: number; y: number } | null>(null)

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    pressedAt.current = { x: event.clientX, y: event.clientY }
    bind.onPointerDown?.(event)
  }

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    bind.onPointerUp?.(event)
    const from = pressedAt.current
    pressedAt.current = null
    const el = self.current
    if (!from || !el) return
    const moved = Math.abs(event.clientX - from.x) > DRAG_SLOP_PX || Math.abs(event.clientY - from.y) > DRAG_SLOP_PX
    if (moved) return

    // Nothing was dragged, so this was a click on whatever the handle is
    // covering. Look straight through it and give the click away.
    const taking = el.style.pointerEvents
    el.style.pointerEvents = 'none'
    const under = document.elementFromPoint(event.clientX, event.clientY)
    el.style.pointerEvents = taking
    const field = under instanceof HTMLElement
      ? (under instanceof HTMLTextAreaElement ? under : under.querySelector('textarea'))
      : null
    if (field instanceof HTMLTextAreaElement) field.focus()
  }

  return (
    <div
      ref={self}
      data-testid={testId}
      {...bind}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      className="group/handle"
      style={{
        position: 'absolute',
        pointerEvents: locked ? 'none' : 'auto',
        touchAction: 'none',
        cursor: locked ? 'default' : cursor,
        ...area,
      }}
    >
      <div
        style={{
          position: 'absolute',
          background: 'var(--slot-selection)',
          // A ring rather than a border: a border eats into a grip only
          // five pixels wide until the colour is gone. White reads
          // against both the selection tint and the dark canvas, and
          // disappears politely on the page itself.
          boxShadow: `0 0 0 ${px(1)}px rgba(255, 255, 255, 0.85)`,
          borderRadius: px(2),
          ...visible,
        }}
      />
      <span
        className="pointer-events-none opacity-0 transition-opacity group-hover/handle:opacity-100"
        style={{
          position: 'absolute',
          fontSize: px(LABEL_FONT_PX),
          lineHeight: `${px(LABEL_FONT_PX + 4)}px`,
          padding: `0 ${px(4)}px`,
          fontFamily: 'var(--font-sans)',
          color: 'var(--card)',
          background: 'var(--slot-selection)',
          borderRadius: px(3),
          whiteSpace: 'nowrap',
          userSelect: 'none',
          ...labelAt,
        }}
      >
        {label}
      </span>
    </div>
  )
}

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
