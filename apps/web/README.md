# web — the editor's development harness

A Vite app that mounts the PDF slot editor on its own, so a change to the
geometry can be seen in a browser without standing up Elli's whole frontend.

**This is not the editor that ships.** The shipping copy is a module in
[`elli-ui`](https://github.com/zubblehq/elli-ui) at `/app/pdf`. Nothing
deploys from here.

## Why it still exists

`@pdf-slot/core` is developed in this repository, and a change to how text is
measured or where a glyph lands wants somewhere it can be *looked at*
immediately — not after a push, a pin bump and a rebuild of somebody else's
app. This is that somewhere.

It also carries the editor's full suite, which is what proves a core change
moved nothing: the same tests run in `elli-ui` as `tests/pdf-*.test.ts`.

## The cost, stated plainly

This and the `elli-ui` module are the same code with different packaging, and
**they will drift.** When they disagree, `elli-ui` is right — it is the one
users touch.

So a change made here that matters to users is not finished until it is also
in `elli-ui`. If keeping the two in step becomes a chore rather than a
convenience, the honest move is to delete this harness and develop core
against its own tests alone.

## Running it

```bash
npm run dev        # :5173 — talks to the API on :3000 when VITE_API_URL is set
npm test           # bun test --isolate
npm run typecheck
npm run build
```

`scripts/dev-stack.sh` at the repository root starts this, the API and a
Postgres together, which is usually what you want.

## Environment

All optional. Unset, the editor runs on browser storage alone and does not
offer bulk generation — a supported mode, not a degraded one.

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | where the service lives. Unset means browser storage only |
| `VITE_CORE_VERSION` | which commit of core this build runs; sent with every job so the service can refuse a mismatch |
| `VITE_RENDER_ON_COMMIT` | re-render the PDF on every edit, not only on download. A testing aid for catching preview/export divergence while editing |

`src/app/lib/env` is the only module that reads `import.meta.env`.
