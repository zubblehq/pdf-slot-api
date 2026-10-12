import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog'

/**
 * Asked only when the answer changes what prints: boxes filled in here that
 * the data file says nothing about. With none, both answers produce the same
 * PDFs and there is nothing to ask.
 */
export function GenerateTemplateDialog({
  open,
  onOpenChange,
  /** Names of the filled-in boxes the data does not mention. Never empty when open. */
  unanswered,
  onSubmit,
}: {
  open: boolean
  onOpenChange(open: boolean): void
  unanswered: string[]
  onSubmit(fillFromTemplate: boolean): void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="generate-template-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {unanswered.length === 1
              ? `Your data says nothing about "${unanswered[0]}".`
              : `Your data says nothing about ${unanswered.length} of the boxes you filled in.`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {`${unanswered.slice(0, 6).join(', ')}${unanswered.length > 6 ? `, and ${unanswered.length - 6} more` : ''}. ` +
              'Print what you typed into them on every PDF, or leave them blank and fill them from the data alone?'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="generate-leave-blank" onClick={() => onSubmit(false)}>
            Leave them blank
          </AlertDialogCancel>
          <AlertDialogAction data-testid="generate-keep-typed" onClick={() => onSubmit(true)}>
            Print what I typed
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
