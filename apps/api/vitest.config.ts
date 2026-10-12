import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    // test/e2e/** is the in-process end-to-end suite (vitest.e2e.config.ts,
    // `npm run test:e2e`): it needs the web "@/*" alias and is not a unit test.
    include: ['test/**/*.test.ts'],
    exclude: [...configDefaults.exclude, 'test/e2e/**'],
    testTimeout: 30_000,
    // A cap, because most of these files stand up a PGlite -- a whole Postgres
    // compiled to WASM, in process. One per file in parallel is a dozen
    // databases at once, and the kernel OOM-killed a worker mid-run on an 8GB
    // machine: the run reported "Worker exited unexpectedly" and 46 of 55
    // tests, which reads exactly like a real failure and is not one.
    poolOptions: { forks: { maxForks: 4 } },
  },
})
