import type { CSSProperties, KeyboardEvent } from 'react'
import { rgbToCss, type Slot } from '@pdf-slot/core'
import { Input } from '@/app/components/ui/input'
import type { SlotNaming } from './slot-overlay.constants'

/**
 * Naming a slot, Figma-style: the box itself is the editor.
 *
 * shadcn's Input with its chrome stripped, so what is typed sits exactly
 * where the name will show and in the same typography. Enter keeps it,
 * Escape gives up, and leaving the field keeps it too -- unless the name is
 * already taken, in which case nothing is committed and the note below says
 * why.
 */
export function SlotNameEditor({
  slot,
  naming,
  typography,
  px,
  onKeyDown,
}: {
  slot: Slot
  naming: SlotNaming
  /** The slot's own type styling, so the name is shown as the text will be. */
  typography: CSSProperties
  px(screen: number): number
  onKeyDown(event: KeyboardEvent<HTMLInputElement>): void
}) {
  return (
    <>
      <Input
        autoFocus
        data-testid="slot-name-inline"
        aria-label="Slot name"
        placeholder="Name this slot"
        value={naming.value}
        onChange={(e) => naming.onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => { if (!naming.taken) naming.onCommit() }}
        aria-invalid={naming.taken || undefined}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute inset-0 h-full w-full rounded-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 dark:bg-transparent"
        style={{ ...typography, color: rgbToCss(slot.color), caretColor: rgbToCss(slot.color) }}
      />
      {naming.taken && (
        <span
          data-testid="slot-name-taken"
          role="status"
          className="pointer-events-none absolute left-0 top-full select-none whitespace-nowrap rounded-md bg-destructive px-1.5 py-0.5 text-destructive-foreground"
          style={{ fontSize: px(11), lineHeight: `${px(15)}px`, marginTop: px(3) }}
        >
          That name is already taken
        </span>
      )}
    </>
  )
}
