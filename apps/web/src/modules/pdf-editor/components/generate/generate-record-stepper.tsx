import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/app/components/ui/button'

/**
 * Stepping one row of the data onto the page.
 *
 * A count tells you how much data there is; only the document itself tells
 * you what a row will actually look like, which is the point of this.
 */
export function GenerateRecordStepper({
  total,
  shown,
  onShow,
}: {
  total: number
  /** Which row is on the page, or null while none is. */
  shown: number | null
  onShow(index: number): void
}) {
  return (
    <div className="flex items-center gap-1.5" data-testid="generate-preview">
      <Button
        variant="outline"
        size="xs"
        disabled={shown === null || shown <= 0}
        onClick={() => onShow((shown ?? 0) - 1)}
        aria-label="Show the row before"
        data-testid="generate-preview-prev"
      >
        <ChevronLeft />
      </Button>
      <span className="min-w-0 flex-1 truncate text-center text-xs text-muted-foreground" data-testid="generate-preview-label">
        {shown === null
          ? `${total} ${total === 1 ? 'row' : 'rows'} · show one on the page`
          : `Showing row ${shown + 1} of ${total}`}
      </span>
      <Button
        variant="outline"
        size="xs"
        disabled={shown !== null && shown >= total - 1}
        onClick={() => onShow(shown === null ? 0 : shown + 1)}
        aria-label="Show the next row"
        data-testid="generate-preview-next"
      >
        <ChevronRight />
      </Button>
    </div>
  )
}
