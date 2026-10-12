/**
 * A URL for a file served from `public/`.
 *
 * Not a hard-coded `/fonts/...`. Standalone, this app is served from the
 * domain root and the two are identical; mounted under a base path -- which
 * is where this is headed, at `/app/pdf` inside elli-ui -- a leading slash
 * resolves against the domain root instead, 404s, and the fonts never
 * arrive. Fonts that never arrive means nothing renders at all.
 *
 * `BASE_URL` is Vite's own record of where the app is mounted, always with a
 * trailing slash, so it is correct in both cases without a flag to set.
 */
export function assetUrl(path: string): string {
  // Defaulted rather than assumed: `BASE_URL` is Vite's, and a runtime that
  // does not define it -- bun, or a plain Node import -- would otherwise crash
  // here rather than fall back. No base configured means served from the root,
  // which is what '/' says.
  const base = import.meta.env?.BASE_URL ?? '/'
  return `${base.endsWith('/') ? base : `${base}/`}${path.replace(/^\/+/, '')}`
}
