'use client'

import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

interface PromptInputProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

const MIN = 3
const MAX = 4000

export function PromptInput({ value, onChange, disabled }: PromptInputProps) {
  const length = value.length
  const trimmed = value.trim().length
  const tooShort = trimmed > 0 && trimmed < MIN
  const tooLong = trimmed > MAX

  return (
    <div className="flex flex-col gap-2">
      <Label
        htmlFor="generate-prompt"
        className={cn(
          'text-micro font-semibold uppercase tracking-[0.09em] text-muted-foreground',
          'leading-none',
        )}
      >
        Prompt
      </Label>
      <div className="relative">
        <Textarea
          id="generate-prompt"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="Describe the image…"
          className="min-h-[128px] pb-7 text-[15px] leading-[1.5]"
          maxLength={MAX + 200}
          aria-describedby="generate-prompt-help"
        />
        <span
          className={cn(
            'pointer-events-none absolute bottom-2 right-3 font-mono text-[11px] tabular-nums text-muted-foreground',
            (tooShort || tooLong) && 'text-destructive',
          )}
        >
          {length} / {MAX}
        </span>
      </div>
      {tooShort ? (
        <p id="generate-prompt-help" className="text-[12px] text-muted-foreground">
          Minimum {MIN} characters.
        </p>
      ) : (
        <p id="generate-prompt-help" className="sr-only">
          Describe the image you want Basar to generate.
        </p>
      )}
    </div>
  )
}