/**
 * An error a retry cannot help with.
 *
 * The queue retries a handler that throws, which is right for a blob read
 * that timed out and wrong for a job whose file has been deleted: that one
 * will fail identically every time, and each attempt costs a render of every
 * record before it reaches the same conclusion.
 *
 * So the two are distinguished here rather than left to the queue. A fatal
 * error marks the job failed and is not rethrown, so the queue sees a handler
 * that finished and does not try again. Anything else is rethrown, and the
 * queue's `retryLimit` decides.
 *
 * The test for whether something belongs here: would running it again, on the
 * same data, do anything different? A missing row, a layout that no longer
 * exists, a character no font can draw -- no. A network error, a connection
 * the pool dropped -- yes.
 */
export class FatalJobError extends Error {
  readonly fatal = true

  constructor(message: string) {
    super(message)
    this.name = 'FatalJobError'
  }
}

/**
 * Whether an error should stop the job rather than be retried.
 *
 * Checked by the flag and not by `instanceof`: a handler can run against a
 * module loaded twice (a test that re-imports, two copies of this package in
 * one install), and `instanceof` quietly answers false for the second copy's
 * class. The consequence of getting that wrong is a job that retries until
 * its limit and still fails, which looks like flakiness rather than a bug.
 */
export function isFatalJobError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { fatal?: unknown }).fatal === true
}
