/**
 * Every path this service writes, and the one folder they all sit under.
 *
 * The container is shared. Elli keeps its own files in the same Azure
 * container this service writes to, so a path of ours that escaped its folder
 * would be pointing at someone else's data -- and the only operation that
 * would tell us is a delete, by which time it has happened. A prefix is not a
 * convention here; `assertOwnedPath` below is what makes it hold.
 *
 * Changing `BLOB_PREFIX` does not orphan anything already stored. Every path
 * that is read back later -- a file's source, a rendered record, a job's zip
 * -- is written into the database at the moment it is created and read from
 * there, never recomputed. So old blobs keep being found at the paths they
 * were written to, and only new writes move.
 */

/** The folder this service owns inside the container. */
export const BLOB_PREFIX = 'pdf'

/** The uploaded PDF or image a template is built on. */
export const sourcePath = (fileId: string) => `${BLOB_PREFIX}/files/${fileId}.pdf`

/** What one record's PDF is called inside the zip the user downloads. */
export const itemFileName = (index: number) => `record-${String(index + 1).padStart(4, '0')}.pdf`

/** One rendered record of a bulk job. */
export const itemPath = (jobId: string, index: number) =>
  `${BLOB_PREFIX}/jobs/${jobId}/${itemFileName(index)}`

/** A finished job's zip of every record that rendered. */
export const zipPath = (jobId: string) => `${BLOB_PREFIX}/jobs/${jobId}/all.zip`

/**
 * Refuse a path that is not ours, before it reaches the container.
 *
 * Called by the **Azure** store only, and only there because only there is the
 * container shared with somebody else. The disk and Vercel stores have a
 * namespace of their own, and the paths they already hold predate this prefix
 * -- enforcing it on them would turn deleting an older file into an error.
 *
 * Checked at the store rather than trusted at each call site, because the
 * dangerous paths are exactly the ones that did not come from the helpers
 * above: a path read back out of the database, written by an older build or by
 * hand. `..` is rejected on its own account -- `pdf/../elli` has the right
 * prefix and the wrong target.
 */
export function assertOwnedPath(path: string): void {
  if (path.split('/').includes('..')) {
    throw new Error(`Blob path escapes ${BLOB_PREFIX}/ with a parent segment: ${path}`)
  }
  if (!path.startsWith(`${BLOB_PREFIX}/`)) {
    throw new Error(`Blob path is outside ${BLOB_PREFIX}/: ${path}`)
  }
}
