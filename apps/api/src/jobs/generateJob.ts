import { finishJob, loadJob, renderBatch } from './steps.js'
import { getJobContext } from './context.js'
import { setJobStatus } from '../db/jobs.js'
import { isFatalJobError } from './fatal.js'

/**
 * One PDF per record, in batches, then a zip.
 *
 * Run by a queue worker, which retries the whole function when it throws.
 * That is affordable because `renderBatch` skips records already marked done,
 * so a retry picks up roughly where the last attempt stopped instead of
 * rendering everything again.
 *
 * `lastAttempt` is the thing the caller knows and this function cannot:
 * whether the queue has any retries left. A transient failure on an earlier
 * attempt is rethrown and retried; the same failure on the last attempt has
 * to be written down, because nothing is coming back to do it.
 */
export async function generateJob(
  jobId: string,
  { lastAttempt }: { lastAttempt: boolean },
): Promise<'done' | 'fatal'> {
  try {
    const { batches } = await loadJob(jobId)
    for (const batch of batches) await renderBatch(jobId, batch)
    await finishJob(jobId)
    return 'done'
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    // Fatal, or out of attempts: the job is over, and the row has to say so
    // or it sits at "running" for ever while the editor polls it until the
    // user gives up. Reported rather than rethrown, so the caller can retire
    // the queued job instead of retrying a conclusion already reached.
    if (isFatalJobError(err) || lastAttempt) {
      await markJobFailed(jobId, message)
      return 'fatal'
    }
    throw err
  }
}

async function markJobFailed(jobId: string, message: string): Promise<void> {
  const { db } = await getJobContext()
  await setJobStatus(db, jobId, { status: 'failed', error: message, finishedAt: new Date() })
}
