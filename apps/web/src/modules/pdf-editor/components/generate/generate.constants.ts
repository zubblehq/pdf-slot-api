import type { ColumnCheck } from './checkColumns'

export const MB = 1024 * 1024

/**
 * The whole file is read into the textarea, so the cap is about what the
 * browser can keep in a controlled input and re-parse on every keystroke,
 * not about what the server would accept.
 */
export const MAX_IMPORT_MB = 5

export const IMPORTABLE_NAME = /\.(csv|json)$/i

/** What the live check has to say about the text in the box: a reason it cannot be used, or what it holds. */
export type Summary =
  | { kind: 'error'; message: string }
  | (ColumnCheck & { kind: 'data'; rows: number; nothingMatches: boolean })
