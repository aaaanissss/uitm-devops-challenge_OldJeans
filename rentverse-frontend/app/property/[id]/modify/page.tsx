import ModifyClient from './ModifyClient'

// Allow dynamic routes - modify pages are generated on-demand
export const dynamic = 'force-dynamic'
export const dynamicParams = true

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function Page({ params }: PageProps) {
  const { id } = await params
  return <ModifyClient propertyId={id} />
}
