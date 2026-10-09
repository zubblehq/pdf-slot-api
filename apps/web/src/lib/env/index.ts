/**
 * Everything this app reads from its environment, and the only place that
 * touches `import.meta.env`.
 *
 * One module owns it so a rename costs one file. The names moved once
 * already -- Next exposed browser variables as `process.env.NEXT_PUBLIC_*`,
 * Vite exposes them as `import.meta.env.VITE_*` -- and they will move again
 * when this becomes a module inside elli-ui.
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
