import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const dirname = path.dirname(fileURLToPath(import.meta.url))

/** In-process end-to-end: real Hono handlers + PGlite + memory blobs, driven by the real web store code. */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/e2e/**/*.e2e.test.ts'],
    testTimeout: 60_000,
    // See vitest.config.ts: a PGlite per file, so the workers are capped.
    maxWorkers: 4,
  },
  // The web modules under test import each other through the "@/*" alias in
  // apps/web/tsconfig.json, which vite resolves for the app and nothing
  // resolves here.
  resolve: { alias: { '@': path.resolve(dirname, '../web/src') } },
})
