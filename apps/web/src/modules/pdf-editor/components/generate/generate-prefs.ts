/**
 * The two things this panel remembers between visits, and the only code that
 * touches browser storage for it.
 *
 * Every access is wrapped: in a private window, or with site data blocked,
 * `localStorage` throws on read rather than returning null. The panel works
 * either way -- it just forgets.
 */

const KEY_STORAGE = 'pdf-slot-api-key'

export const readKey = () => {
  try { return localStorage.getItem(KEY_STORAGE) ?? '' } catch { return '' }
}

export const saveKey = (key: string) => {
  try { localStorage.setItem(KEY_STORAGE, key) } catch { /* storage blocked: the key just isn't remembered */ }
}

/**
 * Shut unless this browser has opened it before. The form is a few hundred
 * pixels in a 256px column and it is step two: someone placing text on a page
 * should not have to scroll past it to see their slots.
 */
const OPEN_STORAGE = 'pdf-slot-generate-open'

export const readOpen = () => {
  try { return localStorage.getItem(OPEN_STORAGE) === 'yes' } catch { return false }
}

export const saveOpen = (open: boolean) => {
  try { localStorage.setItem(OPEN_STORAGE, open ? 'yes' : 'no') } catch { /* storage blocked: it just opens shut next time */ }
}
