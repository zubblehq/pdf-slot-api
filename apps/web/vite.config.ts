import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react-swc'
import { defineConfig } from 'vite'

const dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * The plugins and the alias, and deliberately nothing else.
 *
 * `plugin-react-swc` and `@tailwindcss/vite` rather than their alternatives
 * because elli-ui -- where this app is headed (see
 * docs/superpowers/specs/2026-10-07-nextjs-to-react-port-design.md) -- uses
 * exactly these two. Matching now means stage 2 moves files rather than
 * reconciling build tools.
 *
 * No `base` is set, so `import.meta.env.BASE_URL` is `/` here. Under elli-ui
 * it will not be, which is why nothing in `src/` hard-codes a leading slash
 * for an asset (see `src/lib/assets/assetUrl.ts`).
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Mirrors tsconfig.json's "@/*" -> "./src/*". Vite does not read tsconfig
  // paths on its own, and vitest.config.mts declares the same alias.
  resolve: { alias: { '@': path.resolve(dirname, './src') } },
})
