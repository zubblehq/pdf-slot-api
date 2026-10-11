// Hand-rolled rather than shadcn: this is a canvas-editor interaction
// primitive (pointer-captured drag and resize mapped into PDF coordinate
// space), and shadcn has no equivalent component. See CLAUDE.md. The
// name editor inside it and the size badge under it are shadcn's Input
// and Badge.
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { toScreenLength, toScreenPoint } from '@pdf-slot/core'
import { SlotLines } from './SlotLines'
import { SlotNameTag } from './SlotNameTag'
import { SlotTextInput } from './SlotTextInput'
import { SlotNameEditor } from './SlotNameEditor'
import { SlotResizeStrips } from './SlotResizeStrips'
import { layoutSlot } from './slotBox'
import { slotScreenStyle } from './slotScreenStyle'
import type { SlotOverlayProps } from './SlotOverlay.types'
import { useSlotGestures } from './useSlotGestures'
import { PLACEHOLDER_COLOR, SELECTION_OUTLINE_PX, type SlotNaming } from './slot-overlay.constants'

export type { SlotNaming }


export function SlotOverlay({
  slot,
  name = '',
  viewport,
  screenScale = 1,
  metrics,
  selected,
  autoFocus = false,
  onFocused,
  onSelect,
  onChange,
  onCommit,
  textCommitted = false,
  locked = false,
  naming = null,
  onCloneStart,
}: SlotOverlayProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [focused, setFocused] = useState(false)
  // Pointer enter/leave, not pointermove: this flips twice per visit to a
  // slot, so revealing the tag costs two renders, not one per mouse
  // movement. (CSS :hover would cost none, but the tag is an
  // inline-styled canvas primitive with no class of its own, and hover
  // state here is only half the story -- selection and naming also show
  // it -- so one flag reads better than a class plus two overrides.)
  const [hovered, setHovered] = useState(false)

  // Naming a slot ends by handing it the caret, so what the user types
  // next is the slot's text. (Without it they are left looking at the
  // name-as-placeholder, which is not what gets exported.)
  useEffect(() => {
    if (!autoFocus) return
    textareaRef.current?.focus()
    onFocused?.()
  }, [autoFocus, onFocused])

  const { lines, boxHeight, placeholder } = layoutSlot(slot, metrics, name)

  const screenOrigin = toScreenPoint({ x: slot.x, y: slot.y }, viewport)
  const screenWidth = toScreenLength(slot.width, viewport)
  const screenHeight = toScreenLength(boxHeight, viewport)

  // While focused, the canvas is necessarily stale (it reflects the last
  // *committed* text, not each keystroke), so this slot's own DOM text stays
  // the source of truth for live feedback until it commits again. The
  // placeholder is never on the canvas, so it is always drawn here.
  const hideDomText = textCommitted && !focused && !placeholder

  const gestures = useSlotGestures({
    slot,
    boxHeight,
    // Pointer deltas are screen px; the stage is `screenScale` times
    // larger on screen than in its own frame.
    viewport: { zoom: viewport.zoom * screenScale, pageHeight: viewport.pageHeight },
    locked,
    textareaRef,
    onSelect,
    onChange,
    onCommit,
    onCloneStart,
  })

  const handleTextChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onChange({ text: event.target.value })
  }

  const { px, tag, tagOnScreen, typography, insetPx } = slotScreenStyle(slot, viewport, metrics, screenScale)
  // The tag is chrome, not content: it stays out of the way until the
  // pointer is on this slot. Selected or being named, it stays up
  // regardless -- otherwise the user loses track of which box is which,
  // and of where the handle is on the box they are working on.
  const tagShown = hovered || selected || naming !== null

  return (
    <div
      data-slot-id={slot.id}
      // No drag handlers here: a press inside the box belongs to the text
      // (selecting it, placing the caret). The name tag above is what
      // moves the slot -- see the tag below.
      //
      // Enter/leave (not over/out) so that crossing onto the tag, which is
      // a child of this box, is not read as leaving the slot: the tag is
      // what the user is reaching for once it appears.
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      style={{
        position: 'absolute',
        left: screenOrigin.x,
        top: screenOrigin.y,
        width: screenWidth,
        height: screenHeight,
        pointerEvents: 'auto',
        cursor: 'text',
        // Theme tokens (globals.css) so the overlay follows the app's palette.
        // Every slot is visibly a box: a light wash and a hairline in the
        // accent, so a user can find the slots on a busy form without the
        // box competing with the document. Both are paint-only (no layout).
        backgroundColor: 'var(--slot-highlight)',
        boxShadow: `inset 0 0 0 ${px(1)}px var(--slot-highlight-edge)`,
        // An outline (drawn inward), NOT a border. Absolutely positioned
        // children -- the textarea at `inset: 0` and SlotLines' spans --
        // are placed against this box's *padding* box, and a border (even
        // a transparent one) shrinks that by its width on every side. That
        // left the textarea 2px narrower and shorter than the slot
        // `layoutText` laid out: it wrapped a row earlier than the spans
        // and then scrolled internally to keep its caret visible, which is
        // the caret/line jump seen while typing. It also shifted every
        // glyph 1px right and down from the slot's true origin. An outline
        // paints over the box without taking part in layout, so all three
        // (box, textarea, spans) keep exactly the same rectangle.
        outline: selected ? `${px(SELECTION_OUTLINE_PX)}px solid var(--slot-selection)` : 'none',
        outlineOffset: -px(SELECTION_OUTLINE_PX),
      }}
    >
      {name && (
        <SlotNameTag
          name={name}
          locked={locked}
          shown={tagShown}
          px={px}
          tag={tag}
          tagOnScreen={tagOnScreen}
          onSelect={onSelect}
          body={gestures.body}
        />
      )}
      {!hideDomText && !naming && (
        <SlotLines
          slot={slot}
          lines={lines}
          viewport={viewport}
          metrics={metrics}
          // The placeholder is a hint in the slot's typography, but NEVER in
          // its ink: it is drawn faintly, in the box's own accent -- the
          // colour of the chrome around it -- because anything close to
          // real text is read as real text. A user took their slot's name
          // for their content, saved, and found the download "missing"
          // text they had never typed.
          color={placeholder ? PLACEHOLDER_COLOR : undefined}
          placeholder={placeholder}
        />
      )}
      {!naming && (
        <SlotTextInput
          slot={slot}
          textareaRef={textareaRef}
          typography={typography}
          insetPx={insetPx}
          onTextChange={handleTextChange}
          onFocusIn={() => {
            setFocused(true)
            onSelect()
          }}
          onBlurOut={() => {
            setFocused(false)
            // A blur fired to clear the caret for an in-progress drag is not
            // the user leaving the field -- the drag's pointerup commits.
            if (gestures.consumeDragBlur()) return
            onCommit()
          }}
        />
      )}
      {naming && (
        <SlotNameEditor
          slot={slot}
          naming={naming}
          typography={typography}
          px={px}
        />
      )}
      {selected && !locked && <SlotResizeStrips px={px} resize={gestures.resize} />}
    </div>
  )
}
