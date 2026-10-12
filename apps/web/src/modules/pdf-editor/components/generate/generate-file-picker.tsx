import { Button } from '@/app/components/ui/button'

/**
 * Choosing a .csv or .json file.
 *
 * A real file input, hidden, with the button being its label -- so the picker
 * opens without any script, and the browser's own "Choose File / No file
 * chosen" control, the one thing on this screen the app does not style, never
 * appears. `peer` carries the keyboard focus ring across to the label.
 */
export function GenerateFilePicker({
  fileName,
  onPick,
}: {
  /** The name of the file already imported, if any. */
  fileName: string | null
  onPick(file: File | undefined): void
}) {
  return (
    <div className="grid gap-1.5">
      <span className="text-xs leading-none font-medium">Import a file</span>
      <input
        id="generate-file"
        data-testid="generate-file"
        type="file"
        accept=".csv,.json,text/csv,application/json"
        className="peer sr-only"
        onChange={(e) => {
          const picked = e.target.files?.[0]
          // Cleared so that picking the same file again -- after fixing it -- still fires a change.
          e.target.value = ''
          onPick(picked)
        }}
      />
      <Button
        variant="outline"
        size="sm"
        nativeButton={false}
        className="w-full cursor-pointer peer-focus-visible:border-ring peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50"
        render={<label htmlFor="generate-file" data-testid="generate-file-choose" />}
      >
        Choose a .csv or .json file
      </Button>
      {fileName && <p className="truncate text-xs text-muted-foreground" data-testid="generate-file-name">{fileName}</p>}
    </div>
  )
}
