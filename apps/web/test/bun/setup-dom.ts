/**
 * jsdom, registered as globals for bun:test. Loaded by bunfig.toml's preload.
 *
 * **Not happy-dom, which is what elli-ui preloads**, and the reason is worth
 * recording because it is expected to reverse.
 *
 * Our shadcn components are built on `@base-ui/react`, and closing a base-ui
 * AlertDialog under happy-dom never completes: the process stops responding
 * entirely -- not a failed test but a hang bun's own per-test timeout cannot
 * interrupt, with no output at all. It happens on any route out of the dialog,
 * the Cancel button and Escape alike, while *confirming* is fine. Under jsdom
 * the same case passes in three seconds.
 *
 * elli-ui's components are built on radix-ui instead, so when these move into
 * their repo the incompatibility goes with ours and their happy-dom preload
 * should be used. Until then this is the DOM that can run the suite.
 *
 * `pretendToBeVisual` gives requestAnimationFrame, which React's scheduler and
 * the canvas components expect. Properties already on globalThis are left
 * alone -- some are read-only, and the window's own copy is what the DOM
 * reaches for anyway.
 */
import { JSDOM } from 'jsdom'

if (typeof globalThis.document === 'undefined') {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost/',
    pretendToBeVisual: true,
  })
  const win = dom.window as unknown as Window & typeof globalThis
  globalThis.document = win.document
  // `window` points at globalThis, not at jsdom's Window. In a browser -- and
  // under vitest's jsdom environment -- they are the same object, so code
  // reading `window.matchMedia` and a test stubbing the global are touching
  // one thing. Pointing it at jsdom's own Window instead made those two
  // different objects: the stub landed on globalThis and the hook kept
  // reading jsdom's, so a test that replaced `matchMedia` saw its
  // replacement ignored.
  globalThis.window = globalThis as unknown as Window & typeof globalThis

  // ...but event handling is delegated to jsdom's window. With `window` and
  // `globalThis` the same object, `fireEvent.keyDown(window, ...)` would
  // otherwise reach bun's own EventTarget, which rejects a jsdom Event as
  // "must be an instance of Event". Binding these three means a listener
  // registered on `window` and an event dispatched at it meet in the same
  // implementation that built the event.
  for (const method of ['addEventListener', 'removeEventListener', 'dispatchEvent'] as const) {
    const fn = (win as unknown as Record<string, (...args: unknown[]) => unknown>)[method]
    Object.defineProperty(globalThis, method, {
      value: fn.bind(win),
      writable: true,
      configurable: true,
    })
  }
  // Properties bun does not define are copied across wholesale. The ones it
  // *does* define are left alone, because replacing its runtime primitives
  // (`setTimeout`, `queueMicrotask` and friends) recurses until the stack is
  // gone.
  for (const key of Object.getOwnPropertyNames(win)) {
    if (key in globalThis) continue
    try {
      ;(globalThis as Record<string, unknown>)[key] = (win as unknown as Record<string, unknown>)[key]
    } catch {
      /* read-only on globalThis: the window's own copy stands */
    }
  }

  // Except these, which bun also defines and which must come from jsdom
  // anyway: an event built from bun's constructor is rejected by a jsdom node
  // as "not of type 'Event'", and bun's `devicePixelRatio` reads 0 where a
  // page would say 1. Anything the DOM inspects the identity of belongs here.
  const fromJsdom = [
    'Event',
    'CustomEvent',
    'UIEvent',
    'MouseEvent',
    'PointerEvent',
    'KeyboardEvent',
    'FocusEvent',
    'InputEvent',
    'DragEvent',
    'DataTransfer',
    'devicePixelRatio',
    'getComputedStyle',
    'matchMedia',
  ]
  for (const key of fromJsdom) {
    if (!(key in win)) continue
    try {
      Object.defineProperty(globalThis, key, {
        value: (win as unknown as Record<string, unknown>)[key],
        writable: true,
        configurable: true,
      })
    } catch {
      /* not redefinable here; the window's own copy stands */
    }
  }
}
