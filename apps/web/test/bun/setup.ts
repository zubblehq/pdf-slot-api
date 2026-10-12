import { mock } from 'bun:test'

/**
 * The bun counterpart of test/setup.ts, loaded by bunfig.toml's preload.
 *
 * Both entries exist for the same reasons the Vitest version explains in
 * full: there is no 2D canvas backend, so @scena/react-ruler throws when it
 * draws on mount; and there is no layout, so nothing supplies
 * elementFromPoint for the table handles to pass a click through with.
 *
 * It has to be a preload rather than a per-file import: bun does not hoist
 * mock.module above the imports in a test file, so a mock registered inside
 * one arrives after the module it is replacing has already loaded.
 */

mock.module('@scena/react-ruler', () => ({ default: () => null }))

if (typeof document !== 'undefined' && typeof document.elementFromPoint !== 'function') {
  document.elementFromPoint = () => null
}
