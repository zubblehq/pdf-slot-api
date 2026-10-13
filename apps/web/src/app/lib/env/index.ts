/**
 * Everything this app reads from its environment, and the only place that
 * touches `import.meta.env`.
 *
 * One module owns it so a rename costs one file -- these names have moved
 * once already, from Next's `process.env.NEXT_PUBLIC_*` to Vite's
 * `import.meta.env.VITE_*`, and again to `VITE_PDF_*` in elli-ui, where the
 * module now lives beside everybody else's variables.
 */

/**
 * Where the API lives, or `undefined` for no API at all.
 *
 * Unset is a supported configuration, not a misconfiguration: without it the
 * app runs on browser storage alone and bulk generation is not offered (see
 * `lib/persistence`'s `selectStores`). The empty string is treated as unset
 * because a variable defined-but-blank in a dashboard is a mistake, not a
 * request for an API at the empty host.
 */
export const apiUrl: string | undefined = import.meta.env.VITE_API_URL || undefined

/**
 * Render the PDF on every commit instead of only on download.
 *
 * A testing aid: it makes the export path run constantly so a divergence
 * between overlay and PDF surfaces while editing. Off unless explicitly
 * "true", so a typo cannot turn it on.
 */
export const renderOnCommit: boolean = import.meta.env.VITE_RENDER_ON_COMMIT === 'true'

/**
 * Which `@pdf-slot/core` this build is running -- the commit its package.json
 * is pinned to, injected at build time.
 *
 * Sent with every job so the server can refuse one when the two sides do not
 * match; see CORE_VERSION_HEADER in @pdf-slot/core/contracts for why they can
 * diverge. Unset means the check is off, which is right in a single checkout:
 * there is one copy of core and nothing to compare.
 */
export const coreVersion: string | undefined = import.meta.env.VITE_CORE_VERSION || undefined
