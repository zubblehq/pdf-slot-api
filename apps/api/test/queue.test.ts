import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Client } from 'pg'
import { createQueue, GENERATE_QUEUE, QUEUE_SCHEMA, type Queue } from '../src/jobs/queue.js'

/**
 * The queue against a real Postgres.
 *
 * PGlite is what the rest of this suite runs on and it cannot stand in here:
 * pg-boss wants a server it can hold a connection to and poll, and the whole
 * point of these cases is what the queue does over time -- hands a job to a
 * worker, hands it back after a failure, stops handing it back once it is
 * settled. Those are the behaviours the generation path depends on and the
 * ones no amount of calling `generateJob` directly would exercise.
 *
 * Skipped when there is no Postgres, so the suite still passes without one:
 *   docker run --rm -d --name pdfslot-pg -e POSTGRES_PASSWORD=pw \
 *     -p 55432:5432 postgres:17
 * and then `createdb` the database below -- `scripts/dev-stack.sh` does both.
 */

const DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgres://postgres:pw@localhost:55432/pdfslot'

const reachable = await (async () => {
  const client = new Client({ connectionString: DATABASE_URL, connectionTimeoutMillis: 1500 })
  try {
    await client.connect()
    await client.end()
    return true
  } catch {
    return false
  }
})()

/** Resolves when `check` is true, or throws rather than hanging the run. */
async function until(what: string, check: () => boolean, timeoutMs = 20_000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (!check()) {
    if (Date.now() > deadline) throw new Error(`Timed out waiting for ${what}`)
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
}

describe.skipIf(!reachable)('the generation queue', () => {
  const queues: Queue[] = []

  // Each case gets its own queue, started fresh. pg-boss creates its schema on
  // the first start and leaves it; that is the production behaviour too.
  async function queue(options?: Parameters<typeof createQueue>[1]): Promise<Queue> {
    const q = await createQueue(DATABASE_URL, options)
    queues.push(q)
    return q
  }

  // Before *each* case, not once: jobs outlive the queue object, so a job
  // another case left mid-retry would be handed to this one's worker. The
  // first version of this did it once and the cases interfered -- a leftover
  // retry counted as a call in the case after it, and the case that set its
  // own retry timings got the ones set by the case before.
  beforeEach(async () => {
    const client = new Client({ connectionString: DATABASE_URL })
    await client.connect()
    await client.query(`DROP SCHEMA IF EXISTS ${QUEUE_SCHEMA} CASCADE`)
    await client.end()
  })

  afterEach(async () => {
    await Promise.all(queues.splice(0).map((q) => q.stop()))
  })

  it('creates its own schema, so our tables are still the only ones in public', async () => {
    await queue()
    const client = new Client({ connectionString: DATABASE_URL })
    await client.connect()
    const { rows } = await client.query<{ nspname: string }>(
      'select nspname from pg_namespace where nspname = $1',
      [QUEUE_SCHEMA],
    )
    await client.end()
    expect(rows).toHaveLength(1)
  })

  it('hands a sent job to the worker, once, with its id', async () => {
    const seen: string[] = []
    const q = await queue()
    await q.work(async (jobId) => {
      seen.push(jobId)
      return 'done'
    })

    await q.send('job-abc')
    await until('the worker to be handed the job', () => seen.length > 0)
    expect(seen).toEqual(['job-abc'])

    // A completed job is not handed out again. Long enough to have been
    // redelivered if it were going to be.
    await new Promise((resolve) => setTimeout(resolve, 1500))
    expect(seen).toEqual(['job-abc'])
  })

  it('hands a thrown job back, and tells the last attempt it is the last', async () => {
    // What a transient failure looks like: it throws, it comes round again,
    // and the attempt that has no more retries is told so -- which is how
    // generateJob knows to write the failure down instead of hoping.
    const attempts: boolean[] = []
    const q = await queue({ retryLimit: 2, retryDelaySeconds: 1 })
    await q.work(async (_jobId, { lastAttempt }) => {
      attempts.push(lastAttempt)
      throw new Error('a blob read that failed this time')
    })

    await q.send('job-retry')
    await until('every attempt to be spent', () => attempts.includes(true), 30_000)

    // Three calls for a limit of two: the first try and two retries. Only the
    // last is told it is the last.
    expect(attempts).toEqual([false, false, true])
  })

  it('applies the settings in the source to a queue that already exists', async () => {
    // The trap this is here for: `createQueue` does nothing to a queue it
    // finds already there. Without the `updateQueue` beside it, these numbers
    // would be whatever the first deploy that created the queue used, and
    // editing them would change nothing at all -- which is the worst kind of
    // wrong, because the source says otherwise.
    const first = await queue({ retryLimit: 9, retryDelaySeconds: 99 })
    await first.stop()
    queues.pop()

    await queue({ retryLimit: 1, retryDelaySeconds: 1 })

    const client = new Client({ connectionString: DATABASE_URL })
    await client.connect()
    const { rows } = await client.query<{ retry_limit: number; retry_delay: number }>(
      `select retry_limit, retry_delay from ${QUEUE_SCHEMA}.queue where name = $1`,
      [GENERATE_QUEUE],
    )
    await client.end()
    expect(rows[0]).toMatchObject({ retry_limit: 1, retry_delay: 1 })
  })

  it('does not retry a job the handler calls fatal', async () => {
    // The point of the distinction: a deleted file fails the same way every
    // time, and each attempt would re-render every record to find out.
    let calls = 0
    const q = await queue({ retryLimit: 2, retryDelaySeconds: 1 })
    await q.work(async () => {
      calls += 1
      return 'fatal'
    })

    await q.send('job-fatal')
    await until('the handler to run', () => calls > 0)
    // Twice the retry delay, so a retry would have happened by now.
    await new Promise((resolve) => setTimeout(resolve, 2500))
    expect(calls).toBe(1)
  })
})
