import { ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/app/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/app/components/ui/collapsible'
import { Label } from '@/app/components/ui/label'
import { Textarea } from '@/app/components/ui/textarea'
import { cn } from '@/app/lib/utils'
import { checkColumns, noColumnsMatch, validateBeforeSubmit } from './check-columns'
import { createJob } from './jobs-client'
import { parseRecords } from './parse-records'
import { readImportedFile } from './read-imported-file'
import { useJobPolling } from './use-job-polling'
import { useRecordPreview } from './use-record-preview'
import type { GeneratePanelProps } from './generate-panel.types'
import { DataSummary, tableExample } from './data-summary'
import { GenerateApiKeyField } from './generate-api-key-field'
import { GenerateFilePicker } from './generate-file-picker'
import { GenerateRecordStepper } from './generate-record-stepper'
import { GenerateJobStatus } from './generate-job-status'
import { GenerateTemplateDialog } from './generate-template-dialog'
import { readKey, readOpen, saveKey, saveOpen } from './generate-prefs'
import type { Summary } from './generate.constants'
/** Step 2: paste or import a list of records, get one PDF per record from the server, download the zip. */
export function GeneratePanel({
  apiUrl,
  fileId,
  targets,
  filledIn = [],
  onSaveNow,
  onPreviewRecord,
}: GeneratePanelProps) {
  const [apiKey, setApiKey] = useState(readKey)
  const [open, setOpen] = useState(readOpen)
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [asking, setAsking] = useState(false)
  /** Which record of the data the page is showing, or null for none. */
  const job = useJobPolling(apiUrl, jobId)
  const running = job?.status === 'queued' || job?.status === 'running' || (jobId !== null && job === null)

  const summary = useMemo<Summary | null>(() => {
    if (text.trim() === '') return null
    const parsed = parseRecords(text)
    if ('error' in parsed) return { kind: 'error', message: parsed.error }
    const check = checkColumns(parsed.records, targets)
    // An extra column or a deliberately blank slot is legitimate, so neither blocks. Nothing
    // matching at all never is: it is the wrong file, or a header row that was never these slots.
    const nothingMatches = noColumnsMatch(check, targets)
    return { kind: 'data', rows: parsed.records.length, nothingMatches, ...check }
  }, [text, targets])
  /** Nothing has been laid out, so there is nowhere for a record to go. */
  const nothingLaidOut = targets.slotNames.length === 0 && targets.tables.length === 0
  const blocked = nothingLaidOut || summary === null || summary.kind === 'error' || summary.nothingMatches

  /** The records as parsed, or none if the box does not hold usable data. */
  const records = useMemo(() => {
    if (text.trim() === '') return []
    const parsed = parseRecords(text)
    return 'error' in parsed ? [] : parsed.records
  }, [text])

  /**
   * Which row is actually on the page.
   *
   * Worked out from the data rather than remembered alongside it: the
   * data can be edited after a row was chosen, and a remembered index
   * then outlives the row it pointed at -- "showing row 3 of 1". Cutting
   * the data short falls back to the last row there is.
   */
  const { shown, showRecord, previewRow } = useRecordPreview({ records, nothingLaidOut, onPreviewRecord })

  const importFile = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    const outcome = await readImportedFile(file)
    if (outcome.kind === 'rejected') { setError(outcome.message); return }
    // Into the same box the user types in, so an import can be read and corrected in place.
    setText(outcome.contents)
    setFileName(outcome.name)
    // On the page immediately: a summary says how many rows there are, but
    // only the document itself says what one of them will look like. Nothing
    // laid out means nowhere to put it, and claiming to show a row while the
    // page stays empty is worse than saying nothing.
    if (outcome.firstRecord && onPreviewRecord && !nothingLaidOut) {
      onPreviewRecord(outcome.firstRecord)
      previewRow(0)
    } else {
      previewRow(null)
    }
    // The zip and the failure list belong to the data that has just been replaced.
    setJobId(null)
  }

  /**
   * Boxes the user has filled in that this data file says nothing about.
   * Only these make the question worth asking: with none, both answers
   * print exactly the same thing.
   */
  const unanswered = useMemo(() => {
    const parsed = parseRecords(text)
    if ('error' in parsed) return []
    const named = new Set<string>()
    for (const record of parsed.records) for (const key of Object.keys(record)) named.add(key)
    return filledIn.filter((name) => !named.has(name))
  }, [text, filledIn])

  const submit = async (fillFromTemplate: boolean) => {
    setError(null)
    // The `disabled` prop on the button is a convenience, not the guard: this is the function that
    // actually calls the API, so it refuses on its own rather than trusting the button was disabled.
    const validated = validateBeforeSubmit({ text, targets, apiKey })
    if ('error' in validated) { setError(validated.error); return }
    saveKey(apiKey)
    // Before the job, not after: it reads the layout from the server.
    if (onSaveNow) {
      try {
        await onSaveNow()
      } catch {
        setError('Could not save the layout, so generating was stopped -- what printed would not have been what you see')
        return
      }
    }
    const result = await createJob(apiUrl, fileId, validated.records, apiKey, fillFromTemplate)
    if ('error' in result) { setError(result.error); return }
    setJobId(result.jobId)
  }

  const hasTables = targets.tables.length > 0
  return (
    <Collapsible
      open={open}
      onOpenChange={(next) => { setOpen(next); saveOpen(next) }}
      className="border-t border-border"
    >
      {/* The row reads like the Shortcuts row at the foot of the panel:
          same padding, same weight, a chevron that turns. */}
      <CollapsibleTrigger
        data-testid="generate-toggle"
        className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-sm font-medium outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronRight className={cn('size-3.5 shrink-0 opacity-70 transition-transform', open && 'rotate-90')} aria-hidden />
        Generate from data
      </CollapsibleTrigger>
      <CollapsibleContent>
        {/* px-3 lines this up with the "Slots" heading above it.

            The form controls are a size down from their defaults. This is
            a 256px sidebar whose every other line is text-xs; at the stock
            text-sm the fields read as a different, larger interface that
            happens to be sitting inside this one. (`md:` too, because that
            is the breakpoint the stock size comes back at.) */}
        <div className="grid gap-3 px-3 pb-3" data-testid="generate-panel">
          <p className="text-xs text-muted-foreground">
            {hasTables
              ? 'One PDF per record. Names must match your slots and tables; a table\'s rows go in a list under its name.'
              : 'One PDF per row. Column names must match the slot names.'}
          </p>
            <GenerateApiKeyField apiKey={apiKey} onChange={setApiKey} />
            <GenerateFilePicker fileName={fileName} onPick={(file) => void importFile(file)} />
          <div className="grid gap-1.5">
            {/* Always both, even with a table on the file: a CSV cannot
                fill the table, but it still fills the plain slots, and a
                label reading "JSON array" would be telling the user their
                spreadsheet is refused when it is not. What a CSV can and
                cannot do is said underneath, where it can be said properly. */}
            <Label htmlFor="generate-records" className="text-xs">Records (JSON array or CSV)</Label>
            <Textarea id="generate-records" className="text-xs md:text-xs" data-testid="generate-records" rows={4} value={text} onChange={(e) => setText(e.target.value)}
              placeholder={hasTables ? tableExample(targets) : 'Name,Date\nAbel,18 Sep 2026'} />
            {hasTables && (
              <p className="text-xs text-muted-foreground" data-testid="generate-csv-note">
                A CSV is one flat line per PDF, so it can fill slots but never a table. Use JSON for a table, or for both at once.
              </p>
            )}
          </div>
            {records.length > 0 && onPreviewRecord && !nothingLaidOut && (
              <GenerateRecordStepper total={records.length} shown={shown} onShow={showRecord} />
            )}
          {/* Only once there is data to say it about. Shown the moment the
              panel opens it reads as something already gone wrong, when
              in fact the user has not done anything yet -- and what it
              asks for is on the page behind the panel, not in it. */}
          {nothingLaidOut && records.length > 0 && (
            <p className="text-xs text-destructive" data-testid="generate-nothing-laid-out">
              This data has nowhere to go: the page has no slots or tables yet. Add one, then come back.
            </p>
          )}
          {summary && !nothingLaidOut && <DataSummary summary={summary} targets={targets} />}
          {error && <p className="text-xs text-destructive" data-testid="generate-error">{error}</p>}
          <Button
        size="sm"
        onClick={() => { if (unanswered.length > 0) setAsking(true); else void submit(false) }}
        disabled={running || blocked}
        data-testid="generate-submit"
      >
            {running ? 'Generating…' : 'Generate PDFs'}
          </Button>

            <GenerateTemplateDialog
              open={asking}
              onOpenChange={(open) => { if (!open) setAsking(false) }}
              unanswered={unanswered}
              onSubmit={(fillFromTemplate) => { setAsking(false); void submit(fillFromTemplate) }}
            />
            {job && <GenerateJobStatus apiUrl={apiUrl} job={job} />}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

