/// <reference types="vite/client" />

/**
 * The environment this app reads, declared so `import.meta.env` is typed
 * rather than `any`. `lib/env` is the only module that touches it; these
 * names are what a deployment has to set.
 *
 * Both optional: unset is a supported configuration (see `lib/env`).
 */
interface ImportMetaEnv {
  /** Base URL of the API. Unset means browser storage only, no bulk generation. */
  readonly VITE_API_URL?: string
  /** "true" renders the PDF on every commit. A testing aid; see `lib/env`. */
  readonly VITE_RENDER_ON_COMMIT?: string
  /** The commit of @pdf-slot/core this build is pinned to; see `lib/env`. */
  readonly VITE_CORE_VERSION?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
