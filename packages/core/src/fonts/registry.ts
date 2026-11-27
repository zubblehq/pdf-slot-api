export type FontId =
  | 'sans' | 'sans-bold' | 'serif' | 'serif-bold' | 'mono'
  | 'sans-light' | 'sans-medium' | 'sans-semibold'
  | 'sourceserif' | 'sourceserif-bold' | 'arial' | 'arial-bold' | 'georgia' | 'georgia-bold'
  | 'sourceserif-light' | 'sourceserif-semibold' | 'georgia-medium' | 'georgia-semibold'
  | 'mono-light' | 'mono-medium' | 'mono-semibold' | 'mono-bold'

/**
 * Every id, in a fixed order. New ids only ever go on the end -- the three
 * lighter-than-bold Inter weights after the original five, then Source
 * Serif 4, Arial and Georgia, then the extra weights of Source Serif 4,
 * Georgia and IBM Plex Mono -- so the position of every id a saved layout
 * already uses is unchanged.
 */
export const FONT_IDS: readonly FontId[] = [
  'sans', 'sans-bold', 'serif', 'serif-bold', 'mono',
  'sans-light', 'sans-medium', 'sans-semibold',
  'sourceserif', 'sourceserif-bold', 'arial', 'arial-bold', 'georgia', 'georgia-bold',
  'sourceserif-light', 'sourceserif-semibold', 'georgia-medium', 'georgia-semibold',
  'mono-light', 'mono-medium', 'mono-semibold', 'mono-bold',
] as const

/**
 * The TTF behind each id, in ./files -- and, byte for byte, in
 * apps/web/public/fonts, where the browser fetches the very same file to
 * register as a CSS face. The id is the stable thing: it is what a saved
 * layout stores, so changing which typeface an id maps to re-flows old
 * documents but never breaks them.
 *
 * Every face here must be a *static* TTF. A variable font would carry an
 * `fvar` table, which pdf-lib/fontkit cannot be relied on to embed, and the
 * bold request would silently come out at the default weight.
 * test/fonts.test.ts enforces it.
 *
 * Provenance:
 *  - Inter 4.1, static instances from `extras/ttf/` of the official release
 *    (github.com/rsms/inter) -- SIL OFL 1.1, ./Inter-LICENSE.txt. Light,
 *    Medium and SemiBold come from the same Inter-4.1.zip as Regular and
 *    Bold (whose bytes it matches), so all five weights are one build.
 *    PT Serif and IBM Plex Mono carry no extra weights here.
 *  - PT Serif, IBM Plex Mono -- SIL OFL 1.1, via github.com/google/fonts.
 *    Plex Mono's Light, Medium, SemiBold and Bold come from the same
 *    google/fonts directory as its Regular (whose bytes it matches).
 *    PT Serif exists only in Regular and Bold.
 *  - Source Serif 4 4.005, static TTFs from `TTF/` of the official desktop
 *    release (github.com/adobe-fonts/source-serif) -- SIL OFL 1.1,
 *    ./SourceSerif4-LICENSE.md. Light, Regular, Semibold and Bold; the
 *    release has no Medium.
 *  - `arial` is Liberation Sans 2.1.5 (github.com/liberationfonts) -- SIL OFL
 *    1.1, ./LiberationSans-LICENSE.txt. Arial itself is licensed by Monotype
 *    and cannot be embedded in the PDFs we ship; Liberation Sans has the same
 *    advance width for every character, so text breaks where Arial's would.
 *  - `georgia` is Gelasio (github.com/SorkinType/Gelasio, fonts/ttf) -- SIL
 *    OFL 1.1, ./Gelasio-LICENSE.txt. Georgia is likewise licensed; Gelasio
 *    is metric-compatible with it. Regular, Medium, SemiBold and Bold;
 *    Gelasio has no Light. Liberation Sans, like Arial, has only Regular
 *    and Bold.
 *  The ids say `arial` and `georgia` because that is what a user asks for:
 *  should a licence for the real faces arrive, only the files change.
 */
export const FONT_FILES: Record<FontId, string> = {
  sans: 'Inter-Regular.ttf',
  'sans-bold': 'Inter-Bold.ttf',
  serif: 'PT_Serif-Web-Regular.ttf',
  'serif-bold': 'PT_Serif-Web-Bold.ttf',
  mono: 'IBMPlexMono-Regular.ttf',
  'sans-light': 'Inter-Light.ttf',
  'sans-medium': 'Inter-Medium.ttf',
  'sans-semibold': 'Inter-SemiBold.ttf',
  sourceserif: 'SourceSerif4-Regular.ttf',
  'sourceserif-bold': 'SourceSerif4-Bold.ttf',
  arial: 'LiberationSans-Regular.ttf',
  'arial-bold': 'LiberationSans-Bold.ttf',
  georgia: 'Gelasio-Regular.ttf',
  'georgia-bold': 'Gelasio-Bold.ttf',
  'sourceserif-light': 'SourceSerif4-Light.ttf',
  'sourceserif-semibold': 'SourceSerif4-Semibold.ttf',
  'georgia-medium': 'Gelasio-Medium.ttf',
  'georgia-semibold': 'Gelasio-SemiBold.ttf',
  'mono-light': 'IBMPlexMono-Light.ttf',
  'mono-medium': 'IBMPlexMono-Medium.ttf',
  'mono-semibold': 'IBMPlexMono-SemiBold.ttf',
  'mono-bold': 'IBMPlexMono-Bold.ttf',
}

/**
 * What each face is called where one is named in full. The id stays the
 * role (`sans`), so a document records which slot it used rather than
 * which typeface was in it -- swapping the typeface then leaves every
 * saved file readable.
 */
export const FONT_LABELS: Record<FontId, string> = {
  sans: 'Inter',
  'sans-bold': 'Inter Bold',
  'sans-light': 'Inter Light',
  'sans-medium': 'Inter Medium',
  'sans-semibold': 'Inter SemiBold',
  serif: 'PT Serif',
  'serif-bold': 'PT Serif Bold',
  mono: 'IBM Plex Mono',
  sourceserif: 'Source Serif 4',
  'sourceserif-bold': 'Source Serif 4 Bold',
  arial: 'Arial (Liberation Sans)',
  'arial-bold': 'Arial (Liberation Sans) Bold',
  georgia: 'Georgia (Gelasio)',
  'georgia-bold': 'Georgia (Gelasio) Bold',
  'sourceserif-light': 'Source Serif 4 Light',
  'sourceserif-semibold': 'Source Serif 4 SemiBold',
  'georgia-medium': 'Georgia (Gelasio) Medium',
  'georgia-semibold': 'Georgia (Gelasio) SemiBold',
  'mono-light': 'IBM Plex Mono Light',
  'mono-medium': 'IBM Plex Mono Medium',
  'mono-semibold': 'IBM Plex Mono SemiBold',
  'mono-bold': 'IBM Plex Mono Bold',
}

/**
 * CSS font-family name used by the overlay's @font-face rules.
 *
 * Deliberately private names, never the typeface's real one. `Inter` is a
 * font a reader may well have installed locally, and a family called `Inter`
 * would let the browser satisfy the overlay from that copy -- a different
 * version, different metrics -- while the export used the bytes in ./files.
 * The preview would drift from the download with nothing on screen to say
 * so. A name no system font can claim makes the registered bytes the only
 * thing that can match (see apps/web/src/modules/pdf-editor/lib/fonts/load-fonts.ts).
 */
export const FONT_CSS_FAMILY: Record<FontId, string> = {
  sans: 'PdfSlotSans',
  'sans-bold': 'PdfSlotSansBold',
  'sans-light': 'PdfSlotSansLight',
  'sans-medium': 'PdfSlotSansMedium',
  'sans-semibold': 'PdfSlotSansSemibold',
  serif: 'PdfSlotSerif',
  'serif-bold': 'PdfSlotSerifBold',
  mono: 'PdfSlotMono',
  sourceserif: 'PdfSlotSourceSerif',
  'sourceserif-bold': 'PdfSlotSourceSerifBold',
  arial: 'PdfSlotArial',
  'arial-bold': 'PdfSlotArialBold',
  georgia: 'PdfSlotGeorgia',
  'georgia-bold': 'PdfSlotGeorgiaBold',
  'sourceserif-light': 'PdfSlotSourceSerifLight',
  'sourceserif-semibold': 'PdfSlotSourceSerifSemibold',
  'georgia-medium': 'PdfSlotGeorgiaMedium',
  'georgia-semibold': 'PdfSlotGeorgiaSemibold',
  'mono-light': 'PdfSlotMonoLight',
  'mono-medium': 'PdfSlotMonoMedium',
  'mono-semibold': 'PdfSlotMonoSemibold',
  'mono-bold': 'PdfSlotMonoBold',
}

export type FontBytes = Record<FontId, Uint8Array>
