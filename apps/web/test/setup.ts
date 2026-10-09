import { configure } from '@testing-library/dom'
import { vi } from 'vitest'

// jsdom has no 2D canvas backend. @scena/react-ruler draws on mount and
// would throw on the null context, so every suite sees an inert ruler;
// the tick maths it is given is covered on its own (rulerTicks.test.ts).
vi.mock('@scena/react-ruler', () => ({ default: () => null }))

// jsdom does no layout, so it ships no elementFromPoint. The table
// handles call it to hand a click through to the cell underneath; with
// nothing under the pointer the click is simply not passed on, which is
// the same answer jsdom would give if it could lay the page out.
if (typeof document.elementFromPoint !== 'function') {
  document.elementFromPoint = () => null
}

// The editor is code-split (see src/App.tsx), so a wait for it to appear now
// covers resolving and evaluating its module graph -- pdf.js, pdf-lib and
// fontkit -- not just a render. That is slower than Testing Library's 1s
// default, and it is real: in a browser the editor arrives asynchronously
// too. Raising the budget keeps what the assertions check unchanged; only the
// latency they tolerate moves.
configure({ asyncUtilTimeout: 10_000 })
