import type { JobRecord } from '@pdf-slot/core/contracts'
import { IMPORTABLE_NAME, MAX_IMPORT_MB, MB } from './generate.constants'
import { parseRecords } from './parse-records'

/**
 * Reading a chosen .csv or .json file: what the panel should do with it, as
 * a value rather than a sequence of state writes.
 *
 * Pure apart from reading the file, so the rules -- which extensions, how
 * big, what happens when it will not parse -- can be checked without
 * mounting the panel.
 */
export type ImportOutcome =
  | { kind: 'rejected'; message: string }
  | { kind: 'read'; contents: string; name: string; firstRecord: JobRecord | null }

export async function readImportedFile(file: File): Promise<ImportOutcome> {
  if (!IMPORTABLE_NAME.test(file.name)) {
    return { kind: 'rejected', message: 'Choose a .csv or .json file' }
  }
  if (file.size > MAX_IMPORT_MB * MB) {
    return {
      kind: 'rejected',
      message: `That file is ${(file.size / MB).toFixed(1)} MB; the limit is ${MAX_IMPORT_MB} MB`,
    }
  }

  let contents: string
  try {
    contents = await file.text()
  } catch {
    return { kind: 'rejected', message: 'Could not read that file' }
  }

  // A file that will not parse is still read into the box, so it can be
  // corrected in place; it just has no row to put on the page.
  const parsed = parseRecords(contents)
  const firstRecord = 'error' in parsed ? null : parsed.records[0] ?? null
  return { kind: 'read', contents, name: file.name, firstRecord }
}
