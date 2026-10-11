# PDF editor — what's done, and what I need decided

Thanks for the answers on Azure. They settled most of it. The UI is now a
React app and I'm reshaping it into an `elli-ui` module. Below is where it
stands, then eight things — **only 1 actually blocks me.**

## Where it stands

- The Next.js UI is ported to React (Vite 7, React 19, Tailwind 4 — matching
  elli-ui's stack).
- It's laid out the way `elli-ui` lays out a module: shared code under
  `src/app`, the feature under `src/modules/pdf-editor`, your folder and
  naming conventions.
- All 395 tests pass, typecheck and lint clean.
- Azure Blob storage is finished and tested against the real container.

Not started: the move into your repo, and the backend's move to the VM.

---

## 1. How does elli-ui get the shared geometry library? **(blocking)**

The editor and the backend share one library — `packages/core` — that works
out where every character goes on the page. The browser runs it to draw the
preview; the server runs it to make the PDF. **Same code, called twice. That
is the only reason the preview matches the downloaded file.**

Today they share a folder, because they share a repo. Once the UI lives in
`elli-ui`, that stops being possible.

If we end up with two copies, they will eventually drift — someone fixes a
rounding bug on one side — and then the preview stops matching the download.
It fails silently: no error, just text slightly out of place, found by a
customer.

**What I suggest:** publish it as a private package to GitHub Packages. You're
already a GitHub org, so there's no new service to run — a token and two lines
of config. My repo keeps using the folder locally, so nothing about my
workflow changes; `elli-ui` depends on a version number.

**What I need:** whether GitHub Packages is acceptable, and who sets up the
publish step in `elli-devops`. If you'd rather do it another way, tell me
which — any single-source approach works. Two copies is the one option I'd
push back on.

## 2. Inline styles in the canvas — a note, not a request

Your frontend rules say don't write `style={{ ... }}`, use Tailwind classes.
The editor canvas can't follow that: it has to say "this text box sits 237.4
pixels from the left", a number worked out at runtime from the zoom and the
box's position in the PDF, and there is no class for a computed number.

I was going to ask you to grant an exemption. Then I checked your codebase and
found you already do exactly this, for exactly the same reason — your
virtualised email list and your custom scrollbar use
`style={{ transform: translateY(...) }}` and `style={{ top: metrics.top }}`.
You have 26 of them in `src/modules` and 34 in `src/app`. We have 26.

So there's nothing to decide. Flagging it only so a reviewer doesn't query it
cold.

## 3. Which test runner should this module use?

`elli-ui` runs `bun:test`. The editor's 395 tests are on Vitest. They are not
interchangeable: 32 files use helpers (`vi.stubGlobal` in particular) that
`bun:test` has no equivalent for, so this is a real conversion, not a rename.

Those tests are also the only reason I can prove this port changed nothing —
they check glyph positions to six decimal places.

**What I need:** either your team accepts Vitest for this one module (it can
run alongside `bun:test`), or you want the conversion done — in which case
I'd like it treated as its own piece of work, not folded into the move.

## 4. Should the editor follow your themes, or stay dark?

You have four themes, and your rule is that every colour is defined in all
four. The editor is currently fixed dark — deliberately, the way Figma and
most design tools are, so the page being edited stands out against its
surroundings.

**What I need:** a decision. Following your themes is more work and means the
editor looks different per theme; staying dark means one area of the app that
doesn't follow the switcher. Either is fine by me — it's a product call.

## 5. Which repo owns the backend?

It currently exists in two of my repos, identical. Before it goes to the VM,
one needs to be the real one, or a fix will land in the wrong copy.

Not urgent — nothing touches it until the backend work starts — but it needs
an answer before then.

## 6. Guarding against the two halves disagreeing

The browser and the server are deployed at different times: the browser when
`elli-ui` ships, the service when your pipeline rebuilds my image. If a change
to the geometry lands in one before the other, there's a window where the
preview and the download disagree.

Your client already sends `x-app-version` and forces an update on a `426`.
**I'd like to use that same mechanism** — the service refuses a job when the
two sides report different geometry versions, so instead of a batch of subtly
wrong PDFs you get a clear "reload the page".

**What I need:** confirmation that reusing `x-app-version`/`426` for this is
fine, or a pointer to how you'd rather do it.

## 7. Who reviews changes to the editor once it's in your repo?

Once the UI is in `elli-ui`, your developers can change it — good. But some of
that code is what keeps the preview matching the download, and a reasonable-
looking edit there breaks that quietly.

**What I need:** agreement that changes inside the editor's canvas folder get
reviewed by me, or at least flagged. Not ownership — just a second pair of
eyes on the part that can fail invisibly.

## 8. One small thing, for your awareness

Your rules ban `toLocaleDateString` because a calendar date shifted by the
viewer's timezone printed Jan 1 as Dec 31. I use it in one place — showing
when someone saved a file — which is a *moment*, not a calendar date, so
showing it in the viewer's own timezone is correct.

I'll switch it to your `formatDate` (the moment one), not `formatDateOnly`.
Flagging it only so nobody thinks the rule was ignored.

---

**Summary:** only **1** blocks me. 3 and 4 I can work around either way, but
the answer changes how much work the move is. 5, 6 and 7 are needed before the
backend moves. 2 and 8 are notes, nothing needed.
