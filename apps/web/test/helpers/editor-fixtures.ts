import { readFileSync } from 'node:fs'
import path from 'node:path'
import { jest } from 'bun:test'
import { stubGlobal } from '../bun/stub-globals'

/**
 * The browser-only pieces the real Editor needs in jsdom, shared by every
 * suite that mounts it (Editor, TemplateEditor, page): a FontFace that
 * "loads", a `document.fonts` that accepts it, and a `fetch` that serves
 * the five bundled faces from public/fonts so `createFontMetrics` parses
 * real TTFs. Call `installFontFixtures()` in `beforeEach`; the suite's
 * `unstubAllGlobals()` in `afterEach` removes them.
 *
 * pdf.js is NOT stubbed here: `mock.module` is hoisted per file, so each suite
 * keeps its own `mock.module('pdfjs-dist', …)` -- use `fakePdfjsDocument()`
 * inside it to get the standard loading-task shape.
 */

export class FakeFontFace {
  constructor(
    public family: string,
    public source: unknown,
  ) {}
  async load() {
    return this
  }
}

export const FONT_DIR = path.resolve(__dirname, '../../public/fonts')

// Mirrors packages/core/src/fonts/registry.ts's FONT_FILES -- a literal
// here so this fixture never depends on the (possibly mocked) core module.
export const FONT_FILES = [
  'Inter-Regular.ttf',
  'Inter-Bold.ttf',
  'PT_Serif-Web-Regular.ttf',
  'PT_Serif-Web-Bold.ttf',
  'IBMPlexMono-Regular.ttf',
]

/**
 * The five faces, read once per test file rather than once per test.
 *
 * They are immutable, and they are ~2 MB each. Reading them in every
 * `beforeEach` meant a suite that mounts the editor twenty-two times read and
 * parsed a hundred megabytes of font data, which vitest spread across worker
 * processes and bun -- one process -- was killed for.
 */
const fontBytes = new Map<string, Buffer>()

function readFont(file: string): Buffer {
  let bytes = fontBytes.get(file)
  if (!bytes) {
    bytes = readFileSync(path.join(FONT_DIR, file))
    fontBytes.set(file, bytes)
  }
  return bytes
}

export function installFontFixtures(): void {
  stubGlobal('FontFace', FakeFontFace)
  Object.defineProperty(document, 'fonts', { configurable: true, value: { add: jest.fn() } })
  stubGlobal(
    'fetch',
    jest.fn(async (url: string) => {
      const file = FONT_FILES.find((f) => url.endsWith(f))
      if (!file) throw new Error(`unexpected fetch in test: ${url}`)
      const bytes = readFont(file)
      return {
        ok: true,
        // A fresh copy each call: the caller takes ownership of the buffer it
        // is handed (loadFonts slices it for FontFace), and the cached one
        // must outlive every test that asks for it.
        arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      }
    }),
  )
}

/**
 * A pdf.js loading task whose single page paints instantly. Pass an
 * `onRender` to observe or hold each paint (see Editor.test.ts's
 * mid-paint case for a held one).
 */
export function fakePdfjsDocument(render: () => { promise: Promise<void>; cancel: () => void } = () => ({
  promise: Promise.resolve(),
  cancel: jest.fn(),
})) {
  return {
    promise: Promise.resolve({
      getPage: jest.fn(async () => ({
        getViewport: () => ({ width: 100, height: 100 }),
        render,
      })),
    }),
    destroy: jest.fn(),
  }
}
