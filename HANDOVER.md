# The PDF slot editor, handed over

Read this before changing anything. It is short on purpose, and it is the only
document that explains *why* rather than *what*.

## What the product promises

A user opens a PDF or a scan, places named text boxes on the page, types into
them, and downloads the result. Then they feed a .csv or .json and get one PDF
per row.

The promise is narrower and harder than it sounds:

> **What the user sees positioned on the page in the browser is what comes out
> of the PDF.** The same glyphs, the same font, the same size, the same
> baseline, the same colour, in the same place.

Not approximately. A line that wraps after "Street" on screen and after
"Main" in the download is a bug, and the kind of bug a customer finds in a
batch of 400 invoices.

## How that promise is kept

There is one library, `@pdf-slot/core`, that works out where every character
goes: wrapping, glyph positions, PDF coordinates, table geometry, and the
renderer itself.

**The browser runs it to draw the preview. The server runs it to write the
PDF. Same code, called twice.** That is the entire mechanism. There is no
second implementation to keep in step, because a second implementation is
exactly what would drift.

Everything below follows from that one sentence.

### The two sides must be on the same commit of it

They are deployed separately — the editor when `elli-ui` ships, the service
when its image is rebuilt — so there is a window where they could be running
different versions of the geometry. In that window the preview and the
download disagree, and they do it **silently**: no error, no warning, text
slightly out of place.

So:

- Both consumers pin `@pdf-slot/core` to **a commit**, never a range. A range
  like `^1.4.0` lets two projects resolve to different versions while both
  look correct.
- The service refuses a job whose client reports a different core version:
  `409`, with both versions named. `CORE_VERSION_HEADER` in
  `@pdf-slot/core/contracts`. It is a net for the day someone forgets the
  pin — not a substitute for pinning.
- `packages/core/README.md` says how the library is published from this
  repository and what that costs. The short version: a geometry change is not
  finished when its tests pass, it is finished when core is pushed and every
  consumer's pin has moved, in the same breath.

### The fonts have to be the same bytes, not the same name

The browser measures text with the font files it fetched from `public/fonts/`.
The server measures and draws with the copies inside core. Two files with the
same name and different bytes would both look like Inter and break lines in
different places.

`tests/pdf-public-fonts.test.ts` in `elli-ui` compares them byte for byte,
against the copy in `node_modules` — the copy that is actually rendered with.

### The tests are the proof, not the ceremony

`packages/core/test/invariant.test.ts` builds a real PDF, reads the glyph
coordinates back out of its content stream, and compares them to what
`layoutText` predicted. If that test fails, the preview no longer matches the
download, whatever else passes.

The editor's component tests in `elli-ui` are the other half: they check that
the component still *applies* the maths, which is a different failure from
the maths being wrong. A box drawn 3px from where `toScreenPoint` says is
invisible to any test of a function.

## The short list of things that must not change quietly

1. **One copy of the geometry.** If you ever find yourself writing a second
   implementation of wrapping, measurement or coordinate conversion — in the
   browser, in the service, in a template — stop. That is the bug this whole
   arrangement exists to prevent.
2. **Both sides pinned to the same commit of core**, and the version guard
   left switched on.
3. **The fonts in `public/fonts/` and the fonts in core stay byte-identical.**
4. **`packages/core/test/invariant.test.ts` keeps passing.** If a change makes
   it fail, the change is wrong, not the test.
5. **Blob paths stay under `pdf/`.** The Azure container holds Elli's files
   too, and a container SAS can delete anywhere in it. `src/blob/paths.ts`
   enforces this; the test there walks the module's exports so a new path
   helper cannot skip it.

## Where things are

| | |
| --- | --- |
| The editor | `elli-ui`, `src/modules/pdf-editor`, route `/app/pdf` |
| Its tests | `elli-ui`, `tests/pdf-*.test.ts` (431 of them) |
| The geometry | `zubblehq/pdf-core`, developed as `packages/core` in this repository |
| The service | this repository, `apps/api` — Hono on Bun, pg-boss, its own compose file |
| The wire format | `@pdf-slot/core/contracts` |

`apps/web` in this repository is the editor's development harness and the
ancestor of the module now in `elli-ui`. **It is not deployed.** It is kept
because core is developed here and a change to the geometry wants somewhere to
be seen immediately; it will drift from `elli-ui`, and `elli-ui` is the one
that ships.

## What is not done

- **elli-core has no routes for this service.** The browser cannot reach it
  directly by design, so bulk generation is unreachable from `elli-ui` until
  Elli's API proxies to `PDF_ENGINE_URL`. The editor ships working on browser
  storage alone in the meantime, which is a supported mode and not a stub.
- **A build host needs an SSH deploy key for `zubblehq/pdf-core`.** `bun
  install` sends no token for a private git dependency.
- **The Azure SAS expires**, and nothing renews it. When it lapses every
  upload answers `403`. The agreed plan is to move the storage account to the
  VM's managed identity later, in one go.
- **Per-user authorisation does not exist.** Only `POST /files/:id/jobs` is
  authenticated, with a shared service key. That is survivable while the
  service is only reachable from inside the network. Anything that gives it a
  public address needs per-user auth on every route first.
