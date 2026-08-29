import { notFound, redirect } from 'next/navigation'
import { loadOwnedBrandFromSession } from '@/lib/brand-data'
import { GeneratorForm } from '@/components/generation/generator-form'
import type { Brand } from '@/types'

async function loadBrand(brandId: string): Promise<Brand> {
  const result = await loadOwnedBrandFromSession(brandId)
  if ('reason' in result) {
    if (result.reason === 'unauthenticated') redirect('/login')
    notFound()
  }
  return result.brand
}

export default async function BrandGeneratorPage({
  params,
}: {
  params: { brandId: string }
}) {
  const { brandId } = params
  const brand = await loadBrand(brandId)
  return (
    <GeneratorForm
      brandId={brandId}
      brandName={brand.name}
      brandHasLogo={Boolean(brand.logo_url)}
    />
  )
}