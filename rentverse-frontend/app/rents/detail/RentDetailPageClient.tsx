'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import ButtonCircle from '@/components/ButtonCircle'
import { ArrowLeft } from 'lucide-react'
import RentDetailClient from '../RentDetailClient'

export default function RentDetailPageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rentId = searchParams.get('id')

  if (!rentId) {
    return (
      <>
        <div className="flex items-center space-x-3 mb-6">
          <ButtonCircle icon={<ArrowLeft />} onClick={() => router.back()} />
          <h1 className="text-2xl font-sans font-medium text-slate-900">
            Rent details
          </h1>
        </div>

        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
          Missing rent id in URL.
        </div>
      </>
    )
  }

  return <RentDetailClient rentId={rentId} />
}
