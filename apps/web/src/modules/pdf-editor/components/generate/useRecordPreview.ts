import { useEffect, useRef, useState } from 'react'
import type { JobRecord } from '@pdf-slot/contracts'

/**
 * Putting one record of the data on the page, and stepping through them.
 *
 * Its own hook because it is the one part of this panel that reaches out and
 * changes the document: everything else here only reads the data.
 */
export function useRecordPreview({
  records,
  nothingLaidOut,
  onPreviewRecord,
}: {
  records: JobRecord[]
  /** No slots and no tables: there is nowhere to put a record. */
  nothingLaidOut: boolean
  onPreviewRecord?: (record: JobRecord) => void
}) {
  const [previewing, setPreviewing] = useState<number | null>(null)

  /**
   * Clamped on read rather than on write, because the data can shrink under
   * a preview that is already up -- an index stored when there were four rows
   * then outlives the row it pointed at -- "showing row 3 of 1". Cutting the
   * data short falls back to the last row there is.
   */
  const shown =
    previewing === null || records.length === 0 ? null : Math.min(previewing, records.length - 1)

  /**
   * Puts a record on the page. Every box it names is filled and every box it
   * does not is emptied, so what is on the document is that record and
   * nothing else -- which is what generating it would produce.
   */
  const showRecord = (index: number) => {
    const record = records[index]
    if (!record || !onPreviewRecord || nothingLaidOut) return
    onPreviewRecord(record)
    setPreviewing(index)
  }

  // Held in a ref, not a dependency: the callback is rebuilt every time the
  // layout changes, and putting a record on the page changes the layout -- so
  // depending on it would re-run the effect below for ever.
  const putOnPage = useRef(onPreviewRecord)
  useEffect(() => {
    putOnPage.current = onPreviewRecord
  })

  /**
   * Once a row is on the page, keep it in step with the data: editing the
   * data re-reads that row onto the document. Without this the page goes on
   * showing a row the data no longer has, which is the one thing a preview
   * must never do.
   *
   * Only once a row is being shown -- typing into the box a letter at a time
   * must not take the page over -- and on a delay, so it follows the typing
   * rather than fighting it.
   */
  useEffect(() => {
    if (shown === null || nothingLaidOut) return
    const record = records[shown]
    if (!record) return
    const timer = setTimeout(() => putOnPage.current?.(record), 400)
    return () => clearTimeout(timer)
  }, [records, shown, nothingLaidOut])

  return {
    shown,
    showRecord,
    /** Set directly, without putting anything on the page: the import path has already done that. */
    previewRow: setPreviewing,
  }
}
