import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'

/**
 * The key the generating server checks.
 *
 * Hidden by default, because it is a key -- but a key typed blind is a key
 * mistyped, and the error for a wrong one comes back only after a job is
 * refused. So it can be revealed.
 */
export function GenerateApiKeyField({
  apiKey,
  onChange,
}: {
  apiKey: string
  onChange(key: string): void
}) {
  const [shown, setShown] = useState(false)

  return (
    <div className="grid gap-1.5">
      <Label htmlFor="generate-key" className="text-xs">API key</Label>
      <div className="relative">
        <Input
          id="generate-key"
          className="pr-7 text-xs md:text-xs"
          data-testid="generate-key"
          type={shown ? 'text' : 'password'}
          value={apiKey}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="off"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="absolute inset-y-0 right-0.5 my-auto text-muted-foreground"
          aria-label={shown ? 'Hide the API key' : 'Show the API key'}
          aria-pressed={shown}
          data-testid="generate-key-reveal"
          onClick={() => setShown((was) => !was)}
        >
          {shown ? <EyeOff /> : <Eye />}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Set on the server that generates the PDFs; ask whoever runs it. Remembered in this browser.
      </p>
    </div>
  )
}
