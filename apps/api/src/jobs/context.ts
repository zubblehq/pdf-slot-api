import type { FontBytes } from '@pdf-slot/core'
import type { Db } from '../db/client.js'
import type { BlobStore } from '../blob/blobStore.js'

/**
 * What a generation step needs.
 *
 * Process-level state rather than an argument, because what the queue carries
 * is a job id and nothing else -- a database handle and a blob store cannot be
 * serialised into a queue row, so the worker has to find them where it
 * already is. Set explicitly at the entrypoint; tests set their own.
 */
export type JobContext = { db: Db; blobs: BlobStore; fonts(): Promise<FontBytes> }

let current: JobContext | null = null

export function setJobContext(ctx: JobContext): void {
  current = ctx
}

export async function getJobContext(): Promise<JobContext> {
  if (!current) {
    // Lazy and dynamic on purpose: runtime.ts reads the environment and
    // connects to production services at module load, which tests never want.
    // Reached only if something runs a step without the entrypoint having set
    // this up.
    const { productionJobContext } = await import('../runtime.js')
    current = await productionJobContext()
  }
  return current
}
