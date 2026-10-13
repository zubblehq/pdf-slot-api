import type { FontBytes } from '@pdf-slot/core'
import { decodeEmbeddedFonts } from '@pdf-slot/core/fonts/embedded'

/**
 * The renderer's fonts, decoded from the data compiled into this bundle (packages/core's
 * embedded module, byte-identical to the TTFs the editor ships -- see test/fonts.test.ts). No
 * file or asset lookup, so the one code path serves dev, tests and the container -- none of
 * which can be assumed to have the repository on disk.
 *
 * Memoised for the life of the provider: steps.ts keys a WeakMap of parsed font metrics off the
 * returned object's identity, so every call must resolve to the SAME FontBytes instance. A throw
 * is not memoised -- the next call decodes again rather than every later step in the process
 * inheriting one failure.
 */
export function embeddedFontProvider(): () => Promise<FontBytes> {
  let fonts: FontBytes | null = null
  return async () => (fonts ??= decodeEmbeddedFonts())
}
