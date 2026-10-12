import { PgBoss } from 'pg-boss'

/**
 * The work queue, in the same Postgres as everything else.
 *
 * Generation is minutes of CPU for a few hundred records, so the request that
 * starts a job cannot wait for it: `POST /files/:id/jobs` writes the rows,
 * puts the id on this queue and answers. A worker picks it up and the editor
 * polls `GET /jobs/:id`.
 *
 * pg-boss rather than a hosted queue because the service is moving to a VM
 * with a Postgres already in it, and a queue that lives in the same database
 * as the job rows means the two cannot disagree about what exists. It replaced
 * Vercel's Workflow, which cannot run there -- that needed a platform to hold
 * the function between steps, and this needs a process that stays up.
 */

/** Jobs waiting to be generated. */
export const GENERATE_QUEUE = 'pdf-generate'

/**
 * Where a job goes after its last failed attempt.
 *
 * Nothing reads it. It exists so a job that failed is still *somewhere* -- the
 * row in our own tables says `failed` with a message, which is what the editor
 * shows, but that row is written by our handler and a crash between the two is
 * exactly when you want the queue's own record. Draining it is a thing a
 * person does while looking at why.
 */
export const GENERATE_DEAD_LETTER = 'pdf-generate-failed'

/**
 * Its own schema, so `\dt` on this database still shows our four tables and
 * not pg-boss's dozen. The PM asked for this; it also means pg-boss's own
 * migrations can never collide with drizzle's.
 */
export const QUEUE_SCHEMA = 'pdf_jobs'

/**
 * Attempts, and the wait between them.
 *
 * Three is for the shape of failure this job actually has: a blob read or a
 * database connection that failed once. A fourth attempt rescues almost
 * nothing a third did not, and every attempt holds a worker for as long as the
 * render takes. The backoff is there so a service that is down for a minute is
 * not hammered for that minute.
 */
const RETRY_LIMIT = 3
const RETRY_DELAY_SECONDS = 15

/**
 * What the queue does with a job, as this module sees it: `fatal` means do not
 * retry, and anything thrown means do.
 *
 * Passed in rather than imported so the queue can be tested as a queue --
 * send, consume, retry, retire -- without standing up a renderer and a
 * database full of job rows to watch it move.
 */
export type JobHandler = (
  jobId: string,
  attempt: { lastAttempt: boolean },
) => Promise<'done' | 'fatal'>

/** Only the retry timings move, and only so a test need not wait out the real ones. */
export type QueueOptions = { retryLimit?: number; retryDelaySeconds?: number }

/**
 * How long a job may hold a worker before the queue decides it died.
 *
 * Ten minutes is sized for the largest job the API accepts: 5000 records
 * (MAX_JOB_RECORDS) through a renderer that manages a few hundred a second
 * for a simple layout. If this is ever too short the symptom is nasty -- the
 * queue hands the job to a second worker while the first is still rendering
 * it, and both write the same blobs -- so it is deliberately generous.
 */
const EXPIRE_IN_MINUTES = 10

export type Queue = {
  /** Put a job on the queue. Returns once Postgres has it, not when it is done. */
  send(jobId: string): Promise<void>
  /** Start consuming. Resolves once the worker is registered, not when the queue is empty. */
  work(handler: JobHandler): Promise<void>
  stop(): Promise<void>
}

export async function createQueue(
  connectionString: string,
  options: QueueOptions = {},
): Promise<Queue> {
  const retryLimit = options.retryLimit ?? RETRY_LIMIT
  const retryDelay = options.retryDelaySeconds ?? RETRY_DELAY_SECONDS
  const boss = new PgBoss({ connectionString, schema: QUEUE_SCHEMA })

  // pg-boss reports failures it cannot hand back to a caller -- a maintenance
  // query, a lost connection -- on this event, and throws out of the process
  // if nothing is listening.
  boss.on('error', (err: unknown) => console.error('[queue] pg-boss:', err))

  await boss.start()

  const settings = {
    deadLetter: GENERATE_DEAD_LETTER,
    retryLimit,
    retryDelay,
    retryBackoff: true,
    expireInSeconds: EXPIRE_IN_MINUTES * 60,
  }

  await boss.createQueue(GENERATE_DEAD_LETTER)
  await boss.createQueue(GENERATE_QUEUE, settings)
  // And then update it, because `createQueue` does nothing to a queue that
  // already exists. Without this the settings above would be the settings of
  // whichever deploy first created the queue, and changing a number here
  // would have no effect on anything -- silently, with the new value sitting
  // in the source as evidence that it had.
  await boss.updateQueue(GENERATE_QUEUE, settings)

  return {
    async send(jobId) {
      await boss.send(GENERATE_QUEUE, { jobId })
    },

    async work(handler) {
      // One job at a time per worker. Generation is CPU-bound and already
      // batched inside the job, so a second concurrent render in the same
      // process would make both slower and double the memory high-water mark.
      // More throughput is more containers, not more workers here.
      //
      // `perJobResults` so this handler can say *how* a job ended rather than
      // only whether it threw. A fatal error -- a deleted file, a character no
      // font can draw -- is settled as `deadletter`, which skips the remaining
      // retries instead of spending two more full renders reaching the same
      // answer, and leaves the queue holding a record of it.
      await boss.work<{ jobId: string }>(
        GENERATE_QUEUE,
        { batchSize: 1, perJobResults: true },
        async (jobs) => {
          const job = jobs[0]
          if (!job) return []
          const { jobId } = job.data
          // `retryCount` counts attempts already made, so this call is the
          // last one once it has reached the limit.
          const lastAttempt = job.retryCount >= retryLimit
          const outcome = await handler(jobId, { lastAttempt })
          return [
            {
              id: job.id,
              status: outcome === 'fatal' ? ('deadletter' as const) : ('completed' as const),
            },
          ]
        },
      )
    },

    async stop() {
      // Waits for a job in flight rather than killing it, so a container
      // being replaced finishes the PDF it is in the middle of.
      await boss.stop({ graceful: true })
    },
  }
}
