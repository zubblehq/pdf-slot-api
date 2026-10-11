import type { PointerEvent } from 'react'

/**
 * The chip above a slot carrying its name, and the handle the slot is
 * dragged by.
 *
 * Dragging happens here rather than on the box, which leaves the box free
 * for selecting text character by character without a drag being read into
 * it. Hidden, it still takes the pointer: its strip above the box is part of
 * what "hovering this slot" means, so reaching straight for the handle
 * reveals it rather than passing through a tag that is there but cannot be
 * felt.
 *
 * Sized rather than scaled. A `transform: scale()` rasterises the text at
 * one size and stretches it to another, which is what left the chip looking
 * pixelated at high zoom; setting the font size in stage px so that it
 * *lands* on the wanted screen size lets the browser lay the glyphs out at
 * their real size, sharp at any zoom.
 */
export function SlotNameTag({
  name,
  locked,
  shown,
  px,
  tag,
  tagOnScreen,
  onSelect,
  body,
}: {
  name: string
  locked: boolean
  /** Chrome, not content: up on hover, and while selected or being named. */
  shown: boolean
  /** Screen px -> stage px (see SlotOverlay). */
  px(screen: number): number
  /** Stage px for something that must land on a given screen size. */
  tag(screenPx: number): number
  tagOnScreen: number
  onSelect(): void
  body: { onPointerDown(event: PointerEvent<Element>): void } & Record<string, unknown>
}) {
  return (
    <span
      data-testid="slot-label"
      {...body}
      onPointerDown={(event) => {
        onSelect()
        body.onPointerDown(event)
      }}
      style={{
        position: 'absolute',
        left: 0,
        bottom: '100%',
        // 2 screen px clear of the box at every zoom, like the size badge
        // below it: a gap measured in stage px would open up into a gulf at
        // 400% while the chip itself held still.
        marginBottom: px(2),
        padding: `0 ${tag(4)}px`,
        fontSize: px(tagOnScreen),
        lineHeight: `${tag(14)}px`,
        fontFamily: 'var(--font-sans)',
        color: 'var(--slot-selection)',
        background: 'var(--card)',
        border: `${px(1)}px solid var(--slot-highlight-edge)`,
        borderRadius: tag(3),
        whiteSpace: 'nowrap',
        opacity: shown ? 1 : 0,
        transition: 'opacity 120ms ease',
        pointerEvents: locked ? 'none' : 'auto',
        cursor: locked ? 'default' : 'move',
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      {name}
    </span>
  )
}
