import { RESIZE_EDGES, RESIZE_STRIP_PX } from './slot-overlay.constants'
import type { ResizeEdge } from './drag-geometry'

/**
 * One invisible grab strip along each edge, 8 screen px wide: left and right
 * change the width (the text re-wraps), top and bottom the box's minimum
 * height.
 *
 * Each is centred on its edge so half of it sits outside the box, which
 * keeps the strip grabbable on a one-line slot.
 */
export function SlotResizeStrips({
  px,
  resize,
}: {
  px(screen: number): number
  resize(edge: ResizeEdge): Record<string, unknown>
}) {
  return (
    <>
      {RESIZE_EDGES.map(({ edge, cursor, place }) => (
        <div
          key={edge}
          data-resize-edge={edge}
          {...resize(edge)}
          style={{ position: 'absolute', pointerEvents: 'auto', cursor, ...place(px(RESIZE_STRIP_PX)) }}
        />
      ))}
    </>
  )
}
