import PropertyDetailClient from './PropertyDetailClient'

// Allow dynamic routes - property pages are generated on-demand
export const dynamic = 'force-dynamic'
export const dynamicParams = true

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function Page({ params }: PageProps) {
  const { id } = await params
  return <PropertyDetailClient propertyId={id} />
}
