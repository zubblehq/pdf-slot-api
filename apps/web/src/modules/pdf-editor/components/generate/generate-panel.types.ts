import type { JobRecord } from '@pdf-slot/core/contracts'
import type { FillTargets } from './check-columns'

/**
 * What the generate panel needs.
 *
 * Its own file so the component stays inside elli-ui's 200-line cap with
 * these explanations kept: `onSaveNow` and `onPreviewRecord` both describe
 * behaviour that is not guessable from the name, and `onSaveNow` in
 * particular exists for a bug -- a job renders from the *saved* layout.
 */
export type GeneratePanelProps = {
  apiUrl: string
  fileId: string
  targets: FillTargets
  /**
   * The boxes that have something typed into them, by name -- what the
   * user would see printed if they downloaded this one page. Offered as a
   * choice when the data leaves any of them out.
   */
  filledIn?: readonly string[]
  /**
   * Writes the layout as it stands and waits for it. A job renders from
   * the *saved* layout, and the editor's own writes are debounced, so
   * without this a change made in the last second before Generate is not
   * the one that prints.
   */
  onSaveNow?: () => Promise<unknown>
  /**
   * Pours one record into the boxes on the page. Called the moment a file
   * is imported, so what it will produce can be read off the document
   * rather than guessed at from a summary.
   */
  onPreviewRecord?: (record: JobRecord) => void
}
