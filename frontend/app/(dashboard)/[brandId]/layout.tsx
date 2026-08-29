import { notFound, redirect } from 'next/navigation'
import { loadOwnedBrandFromSession } from '@/lib/brand-data'
import { Brand } from '@/types'

async function ensureBrandAccess(brandId: string): Promise<Brand> {
  const result = await loadOwnedBrandFromSession(brandId)
  if ('reason' in result) {
    if (result.reason === 'unauthenticated') redirect('/login')
    notFound()
  }
  return result.brand
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