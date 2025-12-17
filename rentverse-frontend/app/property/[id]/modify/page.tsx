import ModifyClient from './ModifyClient'
import propertyIds from '@/data/static-property-ids.json'

export const dynamic = 'force-static'
export const dynamicParams = false

export function generateStaticParams() {
  return (propertyIds as string[]).map((id) => ({ id }))
}

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function Page({ params }: PageProps) {
  const { id } = await params
  return <ModifyClient propertyId={id} />
}
