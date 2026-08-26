import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { backendUrl } from '@/lib/server-api-url'
import { Brand } from '@/types'

async function ensureBrandAccess(brandId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    redirect('/login')
  }

  const apiUrl = backendUrl(`/brands/${brandId}`)

  const response = await fetch(apiUrl, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
    cache: 'no-store',
  })

  if (response.status === 404) {
    notFound()
  }

  if (response.status === 401) {
    redirect('/login')
  }

  if (!response.ok) {
    throw new Error('Failed to load brand')
  }

  const payload: unknown = await response.json()
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid brand payload: expected object')
  }
  const brand = payload as Partial<Brand>
  if (
    !brand.kit_status ||
    !['not_started', 'in_progress', 'complete'].includes(brand.kit_status)
  ) {
    throw new Error('Invalid brand payload: missing or invalid kit_status')
  }
  return brand as Brand
}

export default async function BrandLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { brandId: string }
}) {
  await ensureBrandAccess(params.brandId)
  return <>{children}</>
}