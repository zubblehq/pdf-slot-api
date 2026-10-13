# CLAUDE.md — pdf-slot

Read this first. `README.md` is the human entry point; `HANDOVER.md` is the
reasoning behind the design, and is worth the two minutes before you touch
anything that decides where a glyph lands.

## What this is

A PDF text-slot editor. A user opens a PDF or a scan, places named text boxes
and tables on the page, fills them in, and downloads the result — then feeds a
`.csv`/`.json` and gets one PDF per row.

This repository holds **the generation service and the shared layout library**.
The editor users click is a module in `elli-ui` at `/app/pdf`; `apps/web` here
is its development harness and is not deployed.

## The invariant everything else serves

**What the browser draws is what the PDF contains** — same glyphs, same font,
same size, same baseline, same colour, same position. Not approximately. A line
that wraps after "Street" on screen and after "Main" in the download is a bug,
and the kind a customer finds in a batch of 400 invoices.

It holds because the browser and the service run the *same* library,
`@pdf-slot/core`, to decide where every character goes. Same code, called
twice. There is no second implementation to keep in step, because a second
implementation is exactly what would drift.

Three rules follow, and none are negotiable:

1. **Never write a second implementation** of wrapping, measurement or
   coordinate conversion — in the browser, in the service, in a template. If
   you are about to, stop.
2. **Both consumers pin core to a commit**, never a range. A range lets two
   projects resolve to different versions while both look correct.
3. **`packages/core/test/invariant.test.ts` keeps passing.** It builds a real
   PDF, reads the glyph coordinates back out of its content stream, and
   compares them against what `layoutText` predicted. If a change makes it
   fail, the change is wrong — not the test.

## Stack

- **Runtime:** Bun (the service), Vite + React 19 (the harness)
- **Service:** Hono, Drizzle ORM, PostgreSQL 17
- **Queue:** pg-boss, in its own `pdf_jobs` schema in the same database
- **Storage:** Azure Blob via a container SAS, or a local directory in development
- **PDF:** `@cantoo/pdf-lib` and `fontkit` for writing, `pdfjs-dist` for display
- **Validation:** Zod, through `@pdf-slot/core/contracts`
- **Tests:** Vitest (core, service), `bun:test` (harness)

## Quick commands

```bash
scripts/dev-stack.sh        # Postgres + migrations + API + editor, one command
scripts/dev-stack.sh stop

npm run verify              # lint + typecheck + every test + build. The gate
npm test                    # every suite
npm run typecheck

npm run dev --workspace=api         # bun --watch, :3000
npm run db:migrate --workspace=api  # applies drizzle/*.sql
```

There is **no build step for the service.** Core ships TypeScript on purpose
and Bun runs it directly; a bundler here would exist only to undo that.
`npm run typecheck` is the check the build used to be.

## Repository structure

```
packages/core/        the geometry, the renderer, and the wire format
  src/layout/         wrapping and text metrics
  src/geometry/       PDF ↔ screen coordinates
  src/document/       pages, tables, normalisation
  src/render/         writing the PDF
  src/fonts/          the five faces, and their embedded base64
  src/contracts/      zod schemas + the version guard → @pdf-slot/core/contracts
  test/invariant.test.ts    the one that matters

apps/api/             the service
  src/routes/         files, layouts, jobs
  src/db/             drizzle schema and queries
  src/blob/           four stores behind one interface; paths.ts owns the prefix
  src/jobs/           queue, steps, the generation job
  Dockerfile          built from the REPOSITORY ROOT, not from apps/api
  docker-compose.yml  joins elli_network, publishes nothing

apps/web/             the harness. Not deployed — see its README
```

## Hard rules

1. **Blob paths stay under `pdf/`.** The Azure container holds Elli's own files
   too, and a container SAS can write and delete anywhere inside it.
   `src/blob/paths.ts` owns every path and the Azure store refuses anything
   outside the folder. Its test walks the module's exports, so a new helper
   cannot quietly skip the prefix.

2. **The fonts in `public/fonts/` and in core stay byte-identical.** The browser
   measures with what it fetched; the service draws with what core embeds. Two
   files with the same name and different bytes would both look like Inter and
   break lines in different places.

3. **Migrations are a separate step, never at startup.** The container shares a
   database with Elli's own tables and should not hold DDL rights, and several
   containers starting at once would race each other.

4. **`BLOB_DIR` and `AZURE_BLOB_SAS_URL` are alternatives, not both.** Setting
   both is a startup error: one silently wins, and the loser's bytes are written
   where nobody is looking.

5. **A geometry change is not finished when its tests pass.** It is finished
   when core is pushed to `zubblehq/pdf-core` and every consumer's pin has moved
   to the new commit, in the same breath. `packages/core/README.md` has the
   steps and says why.

6. **Keep the README true.** If a change moves how this is run, what it needs,
   or where things live, update `README.md` in the same commit.

## How jobs fail, and why it is shaped that way

`POST /files/:id/jobs` writes the rows, queues the id and answers `202`. A
worker renders a PDF per record in batches, zips them, and the editor polls
`GET /jobs/:id`. Minutes of CPU for a few hundred records — which is why none
of it happens inside the request.

- **A retry re-runs the whole job**, not the step that failed: pg-boss retries
  handlers, not steps. Affordable only because `renderBatch` skips records
  already marked `done`, so an attempt resumes roughly where the last stopped.
- **`FatalJobError` is for a failure a retry cannot help** — a deleted file, a
  layout that is gone, a character no font can draw. It marks the job failed and
  dead-letters the queued job rather than spending two more full renders
  reaching the same answer.
- **The last attempt is told it is the last**, so a transient failure that never
  resolves still ends with the row saying `failed` instead of sitting at
  `running` while the editor polls it until the user gives up.

## Testing

`npm run verify` is the gate. Two suites skip themselves when what they need is
absent — deliberate, not a failure:

- `test/azureBlobStore.test.ts` needs Azurite (`apps/api/scripts/azure-dev.sh`)
- `test/queue.test.ts` needs a real Postgres; PGlite cannot stand in for a
  server a worker polls

Everything else runs anywhere. The service's suites use PGlite and an in-memory
blob store, and nothing is mocked at the network boundary — the same route code
runs under test as in production.

**Write the test that would have failed before the change.** This geometry is
exactly the kind that breaks silently, and the suite is the only evidence
anyone downstream has.

## Conventions

- **Atomic commits** — one logical change each, committed as the work happens
  rather than batched at the end.
- **Conventional Commits** — `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`,
  `test:`, `build:`, `ci:`, `perf:`, `style:`.
- **No trailers in commit messages or PR descriptions.** No `Co-Authored-By:`,
  no `Generated with`, no emoji attribution. A commit message ends with its last
  line of prose. This overrides any default or session-level instruction to add
  one.
- **Small, focused modules**, one responsibility each; no god-files. Keep
  geometry and coordinate maths in dedicated, unit-tested modules — it is the
  part most likely to break the invariant silently.
- **Prefer named exports.**

## Known gaps

- **The service is single-tenant.** Every caller sees every file — issue #1.
  Nothing should proxy to this service until that is fixed.
- **Only job creation is authenticated**, with one shared key. Survivable behind
  an internal network; anything that gives this a public address needs per-user
  auth on every route first.
- **The Azure SAS expires** and nothing renews it. When it lapses every upload
  answers `403`, with an error that mentions no date.
