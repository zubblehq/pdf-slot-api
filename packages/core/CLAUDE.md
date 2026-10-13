# CLAUDE.md — @pdf-slot/core

Read `README.md` first: it explains why this package exists separately, why
both consumers pin it to a commit, and how this repository is published from
the monorepo it is developed in. This file is the working rules.

## What this is

The maths that decides where every character goes on a page: text wrapping,
glyph positions, PDF coordinates, table geometry, and the renderer itself.
Plus the wire format between the editor and its API, at
`@pdf-slot/core/contracts`.

**Two programs run this code.** The browser runs it to draw the preview a user
positions text with; the server runs it to produce the PDF. Same code, called
twice — and that is the only reason the preview matches the download.

## The rule that outranks every other

**Do not change what a glyph's position evaluates to unless that is the change
you intend.** A refactor that is "obviously equivalent" is the dangerous kind
here, because when it is not equivalent nothing errors: the preview and the
download simply disagree by a millimetre, and a customer finds it in a batch of
400.

`test/invariant.test.ts` is what catches that. It builds a real PDF, reads the
glyph coordinates back out of its content stream, and compares them with what
`layoutText` predicted. **If a change makes it fail, the change is wrong.** Do
not adjust the expectation to match new output without understanding exactly
which behaviour moved and why.

## Commands

```bash
npm test            # 179 tests
npm run test:watch
npm run typecheck
npm run fonts:embed # regenerate src/fonts/embedded.ts after changing a .ttf
```

There is **no build step and no `dist`.** `main` points at `src/index.ts`, and
both consumers compile TypeScript as part of their own build. See the README;
this is deliberate, not an oversight.

## Layout

```
src/
  index.ts         the public surface — everything a consumer imports
  layout/          wrapping, text metrics, font measurement
  geometry/        PDF ↔ screen coordinates, the Y-flip
  document/        pages, tables, normalising an uploaded PDF
  render/          writing the PDF with pdf-lib
  fonts/           the five faces, their registry, and their embedded base64
  contracts/       zod schemas for the wire + the version guard
test/
  invariant.test.ts          the one that matters
  metrics-*.test.ts          measured characterisations of pdf-lib's behaviour
```

## Conventions

- **Pure functions, no I/O.** This package reads no files and makes no network
  calls at runtime. The TTFs under `src/fonts/files/` are source material for
  the generated base64 module and for tests — never read at runtime.
- **Named exports**, re-exported from `src/index.ts`. A consumer should never
  reach into a subpath other than `/contracts`.
- **PDF points everywhere**, with the origin at the bottom-left, which is what
  PDF uses. Screen coordinates exist only at the boundary in `geometry/`, and
  the conversion is in one place on purpose.
- **A measured characterisation beats an assumption.** `metrics-*.test.ts`
  record what pdf-lib actually does with kerning and shaping, because the
  documentation does not say. If you find yourself guessing at a renderer's
  behaviour, write the test that measures it instead.

## Changing the fonts

The five faces are the one thing shared by *file*, not by code:

1. Replace the `.ttf` in `src/fonts/files/`
2. `npm run fonts:embed` — regenerates the base64 module the server draws with
3. Copy the same file into the editor's `public/fonts/`, in both consumers

A face updated in one place and not the other passes every test here and breaks
lines in different places on screen than on the page. The editor's suite has a
test that compares the two byte for byte; it is the only thing that catches it.

## Publishing

This repository is a mirror. The source is `packages/core` in the
`pdf-slot-api` monorepo, where it is developed against both consumers' tests.
The README has the `git subtree split` steps.

**A change here is not finished when its tests pass.** It is finished when it
has been pushed and every consumer's pin has moved to the new commit, in the
same breath. Leave a pin behind and the two halves run different geometry —
the exact failure this package exists to prevent. The runtime guard
(`CORE_VERSION_HEADER`) catches the day someone forgets; it is a net, not a
substitute.
