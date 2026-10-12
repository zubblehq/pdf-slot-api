import { Button } from '@/app/components/ui/button'
import { Progress } from '@/app/components/ui/progress'
import type { JobStatus } from '@pdf-slot/contracts'
import { zipUrl } from './jobs-client'

/**
 * What the running job is doing: how far along, the zip once it is finished,
 * and which rows failed.
 *
 * A row failing does not fail the job -- the other PDFs are still worth
 * having -- so the failures are listed beside the download rather than
 * instead of it.
 */
export function GenerateJobStatus({ apiUrl, job }: { apiUrl: string; job: JobStatus }) {
  const failures = job.items.filter((item) => item.status === 'failed')

  return (
    <div className="grid gap-2">
      <Progress value={job.total === 0 ? 0 : ((job.done + job.failed) / job.total) * 100} />
      <p className="text-xs text-muted-foreground" data-testid="generate-progress">
        {job.done + job.failed} / {job.total} {job.status === 'failed' ? `— failed: ${job.error ?? ''}` : ''}
      </p>
      {job.status === 'done' && (
        <Button size="sm" render={<a href={zipUrl(apiUrl, job.id)} data-testid="generate-zip" />} nativeButton={false} variant="outline">
          Download zip ({job.done} PDFs)
        </Button>
      )}
      {failures.length > 0 && (
        <ul className="text-xs text-destructive" data-testid="generate-failures">
          {failures.map((f) => <li key={f.index}>Row {f.index + 1}: {f.error}</li>)}
        </ul>
      )}
    </div>
  )
}
