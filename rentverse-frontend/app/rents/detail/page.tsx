import { Suspense } from 'react'
import ContentWrapper from '@/components/ContentWrapper'
import RentDetailPageClient from './RentDetailPageClient'

export const dynamic = 'force-static'

export default function Page() {
  return (
    <ContentWrapper>
      <Suspense fallback={<div className="text-slate-600">Loading…</div>}>
        <RentDetailPageClient />
      </Suspense>
    </ContentWrapper>
  )
}
