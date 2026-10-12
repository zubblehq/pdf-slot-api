/**
 * `vi.stubGlobal` / `vi.unstubAllGlobals`, which bun:test has no equivalent
 * for.
 *
 * Vitest records the original value of each global it replaces and restores
 * them all on request. This does the same by hand, in one place, so 46 test
 * files do not need 66 hand-written save-and-restore pairs -- each of which is
 * a chance to leave a stubbed `fetch` behind and make the *next* file fail for
 * no visible reason.
 *
 * `defineProperty` rather than assignment, because some of these are not
 * writable: happy-dom defines `localStorage` with a getter and no setter, so
 * `globalThis.localStorage = x` throws "Attempted to assign to readonly
 * property" -- on the way in and, more confusingly, on the way out.
 *
 * Deleting the key when there was no original matters too: assigning
 * `undefined` leaves the property present, and code that asks
 * `typeof x === 'function'` behaves differently from code that asks
 * `'x' in globalThis`.
 */

type Original = { descriptor: PropertyDescriptor | undefined }

const originals = new Map<string, Original>()

function put(name: string, value: unknown): void {
  Object.defineProperty(globalThis, name, {
    value,
    writable: true,
    configurable: true,
    enumerable: true,
  })
}

export function stubGlobal(name: string, value: unknown): void {
  if (!originals.has(name)) {
    originals.set(name, { descriptor: Object.getOwnPropertyDescriptor(globalThis, name) })
  }
  put(name, value)
}

export function unstubAllGlobals(): void {
  for (const [name, { descriptor }] of originals) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor)
    else delete (globalThis as Record<string, unknown>)[name]
  }
  originals.clear()
}
