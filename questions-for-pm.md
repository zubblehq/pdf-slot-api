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

## 2b. A suggestion: make the 200-line rule enforceable, or restate it

Related, and offered as a suggestion rather than a complaint — I spent real
effort complying with the 200-line rule before I thought to measure it.

**139 of your 634 components are over 200 lines — 21%.** Nine are over 900.
The largest are `email-agent-panel.tsx` at 3,813, `mailbox-page.tsx` at 2,391
and `rfq-detail.tsx` at 2,315. So the rule is documented but not held, which
makes it hard for someone new to know what is actually expected.

ESLint can enforce it, and the knobs matter:

```js
'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
'max-lines-per-function': ['warn', { max: 150, skipComments: true }],
```

Two things worth knowing. **ESLint's own defaults are 300 per file and 50 per
function** — 200 is stricter than the tool's reference point. And
`skipComments` is the option that matters most here: without it, a file is
penalised for explaining itself. One of ours was 258 lines of which 101 were
the documented props contract; counting comments would have pushed me to
delete the explanations to hit the number, which is the opposite of the point.

My suggestion: pick the number you actually want, turn it on with
`skipComments`, and fix the stragglers over time — or lower the documented
number to something the codebase reflects. Either beats a rule that only new
contributors follow. Happy to leave it alone entirely; it's your codebase.

## 3. Test runner — we'll use `bun:test`

Decided: the module will use `bun:test`, matching the rest of `elli-ui`, so
there's one way to run tests in your repo rather than two.

Worth knowing what it costs, since it is not a rename: 32 of the editor's test
files use Vitest helpers that `bun:test` has no equivalent for —
`vi.stubGlobal` in particular — so this is a real conversion of about 395
tests. Those tests are also the only reason I can prove the port changed
nothing, since they check glyph positions to six decimal places. I'll convert
them rather than drop coverage, and I'd rather it be visibly its own piece of
work than hidden inside the move.

## 4. Theme — the editor will follow yours

Decided: the editor adopts your four themes rather than staying fixed dark.
Every colour will come from your tokens, defined in all four theme files, so
the editor follows the switcher like the rest of the app.

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

**Summary:** only **1** blocks me. 3 and 4 are decided on our side and
underway. 5, 6 and 7 are needed before the backend moves. 2, 2b and 8 are
notes — 2b is a suggestion about your own lint config, take it or leave it.
