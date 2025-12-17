import BookingClient from './BookingClient'

// Allow dynamic routes - booking pages are generated on-demand
export const dynamic = 'force-dynamic'
export const dynamicParams = true

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function Page({ params }: PageProps) {
  const { id } = await params
  return <BookingClient propertyId={id} />
}
