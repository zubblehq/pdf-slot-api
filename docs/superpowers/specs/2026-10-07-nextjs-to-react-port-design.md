# Next.js to React — design

Date: 2026-10-07. Touches only the outermost layer of `apps/web`, which
`2026-09-13-two-step-template-editing-design.md` and
`2026-09-19-backend-and-bulk-generation-design.md` both build inside. The
render invariant from `2026-09-03-pdf-slot-editor-design.md` is the thing
this port must not disturb, and the section below argues why it cannot.

## Goal

Replace Next.js with Vite + React in `apps/web`, leaving every component,
hook and module under `src/features`, `src/lib` and `src/components`
byte-identical.

The request came from outside the team: React, not Next, with no further
detail. Vite is this design's choice, not a stated requirement — recorded
here so a reviewer who wanted something else can say so before any work
starts.

Decisions taken with the user (2026-10-07):

- **Vite + React + TypeScript**, building to static files.
- **`apps/web` is replaced in place**, not stood up beside the Next version.
  The Next app stays recoverable from `main` and from git history.
- **Swap the shell only.** The outer two files that put the app on screen
  are rewritten; nothing inside is edited. This is the whole point: the 170
  web tests exercise what is inside, so "all 170 still pass" is evidence the
  port changed nothing, and that evidence only exists if the components are
  left alone.
- **No visual redesign.** The Vercel/Geist direction is already followed.
  A visual pass, if wanted, is separate work after this lands.

## Why this is a small change

`apps/web` barely touches Next. The whole coupling is:

| What | Where | Size |
|---|---|---|
| `Metadata` type, `<html>`/`<body>`, Geist font loaders | `src/app/layout.tsx` | one file |
| The single route | `src/app/page.tsx` | one file |
| `next.config.ts` | — | empty object |
| `'use client'` | 52 files | one line each, all no-ops without a server |
| `process.env.NEXT_PUBLIC_*` | 2 read sites | two names |
| `next-themes` | `src/components/ui/sonner.tsx` | theme is hard-coded `dark` anyway |
| `eslint-config-next` | `eslint.config.mjs` | config only |

There is no `next/image`, no `next/link`, no `next/navigation`, no route
handler, no server action, no server component that does server work. The
app is one client-rendered screen that Next happens to serve.

## The render invariant

**Preview must equal download.** The port does not go near the mechanism
that holds it.

The five document faces are loaded by the app's own code, not by Next.
`src/lib/fonts/loadFonts.ts` fetches `/fonts/<file>` over HTTP and
`registerFontFaces` hands those exact bytes to the `FontFace` API, so the
CSS the overlay draws with and the bytes `renderPdf` embeds come from one
download. Any bundler serves `public/` the same way Next does, over the same
URLs; `loadFonts.ts` is not edited, and neither is `packages/core`.

So the invariant's chain — fetch, FontFace, `layoutText`, `renderPdf` — is
untouched end to end. It also stays *verified* rather than merely intact:
the tests that compare `layoutText`'s output against glyph positions pulled
back out of an exported PDF's content stream live in `packages/core` and
`apps/web/test`, and both run unchanged.

## Two fonts, and only one of them moves

These are easy to confuse and the distinction is why the port is safe.

**Inter** (plus PT Serif and IBM Plex Mono) is the *document* font: what the
user's text is set in, on screen and embedded in the exported PDF. Loaded
from `public/fonts/` by `loadFonts.ts`. **Unchanged.**

**Geist** is the *interface* font: panels, buttons, labels, slot name tags.
It never enters a PDF. It is currently loaded by `geist/font/sans` and
`geist/font/mono`, which are Next-only wrappers around `next/font`.

Geist is therefore the one font that moves. The `geist` npm package already
ships the raw `.woff2` files under `dist/fonts/`, so the replacement is
`@font-face` rules declaring the families that
`--font-geist-sans` / `--font-geist-mono` name. `globals.css` already
indirects through those two variables:

```css
--font-sans: var(--font-geist-sans);
--font-mono: var(--font-geist-mono);
```

Only the two definitions change. Every `font-sans` utility, and the
`var(--font-sans)` used for chrome inside `SlotOverlay` and `TableOverlay`,
keeps resolving to the same typeface.

## Shape

Before and after, `apps/web` only:

```
  before                              after
  src/app/layout.tsx                  index.html          the real page, with a root div
  src/app/page.tsx                    src/main.tsx        mount React into it
  src/app/globals.css                 src/App.tsx         page.tsx's body, moved over
  src/app/favicon.ico                 src/styles/globals.css
  next.config.ts                      public/favicon.ico
  next-env.d.ts                       vite.config.ts
```

`src/features`, `src/lib`, `src/components` and `test/` keep their paths
exactly. The `@/*` → `./src/*` alias stays, because `apps/api`'s end-to-end
config resolves web modules through it
(`apps/api/vitest.e2e.config.ts`) and the merge guard imports
`@/features/template/openFile`.

### What the three new files hold

Each has one responsibility, which is the reason there are three rather than
one:

- **`index.html`** — the document. `<html class="dark" lang="en">`, the
  title and description that were Next's `metadata` export, and
  `<div id="root">`. The `dark` class stays on `<html>` in the markup so the
  first paint is already dark and nothing flashes, exactly as the current
  comment in `layout.tsx` explains.
- **`src/main.tsx`** — `createRoot(...).render(<App />)` and the stylesheet
  import. Nothing else; no providers, no logic.
- **`src/App.tsx`** — what `page.tsx` is today, minus `'use client'`, plus
  the `<Toaster theme="dark" position="top-center" />` that `layout.tsx`
  rendered and the `bg-background text-foreground antialiased` classes that
  were on `<body>`.

`suppressHydrationWarning` goes: there is no hydration, so the browser
extensions it guarded against cannot cause a mismatch.

### One new module: reading the environment

`process.env` does not exist in a Vite browser build. The two reads become
`import.meta.env.VITE_*`, and rather than scattering that across the two
files that happen to read them today, both move behind one module:

```
src/lib/config.ts     apiUrl, renderOnCommit — read import.meta.env, nothing else
```

`src/lib/persistence/index.ts` re-exports `apiUrl` from there so its
consumers do not change, and `useEditorPipeline.ts` imports
`renderOnCommit` instead of reading `process.env` inline. One module owns
the environment; if the variables are renamed again, one file changes.

**This renames two deployed variables.** `NEXT_PUBLIC_API_URL` →
`VITE_API_URL` and `NEXT_PUBLIC_RENDER_ON_COMMIT` → `VITE_RENDER_ON_COMMIT`.
The `pdf-slot-design` Vercel project has `NEXT_PUBLIC_API_URL` set in
Production; it must be added under the new name **before** the first deploy,
or the web app falls back to IndexedDB and bulk generation silently
disappears from the UI. This is the one step that can break production, and
it is a dashboard change, not a code change.

## Build and deploy

`npm run dev` → `vite`, `build` → `vite build`, `preview` replaces `start`.
Output is `dist/`: plain HTML, JS and CSS.

Vercel keeps working — the `pdf-slot-design` project's framework preset
changes from Next.js to Vite, and that is the only project setting that
moves. Worth noting for the Azure thread: static output means the frontend
can also be served by any web server or dropped in a blob container, with no
Node process. That is a consequence, not a goal, and nothing here commits to
it.

`apps/api` is untouched.

## Removals

- `next`, `next-themes`, `eslint-config-next` from `apps/web`'s
  dependencies; `geist` **stays** (its font files are what we self-host).
- `next-env.d.ts`, and the `.next/**` entries in `tsconfig.json`'s
  `include` and `eslint.config.mjs`'s ignores.
- `public/next.svg`, `vercel.svg`, `file.svg`, `globe.svg`, `window.svg` —
  `create-next-app` scaffolding, zero references in `src/` or `test/`.
- The 52 `'use client'` directives.
- `next-themes` in `sonner.tsx`: its `useTheme` already reports `"system"`
  because no provider exists, and `App.tsx` passes `theme="dark"`
  explicitly. The import goes; the explicit prop stays.

`eslint.config.mjs` is rebuilt on `typescript-eslint` plus the React hooks
rules, matching how `apps/api` and `packages/core` already configure lint,
so the monorepo has one convention instead of two.

## Testing

The acceptance gate is deliberately blunt:

1. **All 170 `apps/web` tests pass unchanged.** Not adapted, not skipped —
   unchanged. Any test that needs editing means the port reached inside, and
   that is a signal to stop and look, not to edit the test. `vitest.config.mts`
   already runs on Vite's own resolver, so its `@` alias and jsdom
   environment carry over as they are; `import.meta.env` works under vitest
   natively.
2. **`apps/api`'s end-to-end suites pass**, the merge guard included — it
   reaches into `apps/web/src` through the `@` alias and is precisely the
   test that fails if the port cut a wire.
3. **`packages/core` passes**, which is where the invariant's
   content-stream comparison lives.
4. **Typecheck and lint clean** across the workspace.
5. **The app run for real**: upload a PDF, place a slot and a table, check
   the overlay against a downloaded PDF, then generate from a data file
   against a live API. Tests cover the invariant arithmetic; this covers the
   shell actually booting, the fonts actually arriving over HTTP, and
   `VITE_API_URL` actually reaching `persistence`.

## Risks

**The env rename breaks production.** Highest-likelihood failure, and it
fails quietly — no error, just the API store never engaging. Mitigated by
setting the new variable in Vercel before deploying, and by checking the
deployed bundle for the API URL rather than assuming.

**Geist renders differently self-hosted than through `next/font`.** `next/font`
subsets and preloads; plain `@font-face` does neither by default. The risk is
cosmetic (a flash of fallback text, slightly different metrics), never the
PDF. Checked by eye against the current deploy.

**A `'use client'` removal changes behaviour.** It cannot — the directive is
meaningless without a server — but 52 mechanical edits across files is where
a stray character lands. The test suite is the guard.

## Out of scope

Any visual redesign. Restructuring `src/`. Adding a router — the app is one
screen, and a router for one screen is weight with no payer. Moving the
frontend off Vercel. Touching `apps/api`, `packages/core` or
`packages/contracts`.
