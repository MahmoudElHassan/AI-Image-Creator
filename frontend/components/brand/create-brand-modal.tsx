'use client'

import { useState } from 'react'
import { apiRequest, ApiError } from '@/lib/api'
import { Brand } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface CreateBrandModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onBrandCreated: (brand: Brand) => void
  onDuplicateName?: () => void
}

export function CreateBrandModal({
  open,
  onOpenChange,
  onBrandCreated,
  onDuplicateName,
}: CreateBrandModalProps) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const brand = await apiRequest<Brand>('/brands', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim() }),
      })
      onBrandCreated(brand)
      setName('')
      onOpenChange(false)
    } catch (err) {
      if (err instanceof ApiError && err.code === 'DUPLICATE_BRAND_NAME') {
        setError('A brand with this name already exists. Check your brands list.')
        onDuplicateName?.()
      } else {
        setError(err instanceof Error ? err.message : 'Failed to create brand')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setName('')
      setError(null)
    }
    onOpenChange(isOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create brand</DialogTitle>
          <DialogDescription>
            Name a studio. You can add a kit, keys, and a logo after.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="brand-name">Brand name</Label>
            <Input
              id="brand-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter brand name"
              autoFocus
            />
          </div>
          {error && <p className="text-[13px] text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
