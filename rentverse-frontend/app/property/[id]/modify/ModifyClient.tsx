'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ContentWrapper from '@/components/ContentWrapper'
import ButtonCircle from '@/components/ButtonCircle'
import { ArrowLeft } from 'lucide-react'
import { PropertiesApiClient } from '@/utils/propertiesApiClient'
import type { Property } from '@/types/property'

export default function ModifyClient({ propertyId }: { propertyId: string }) {
  const router = useRouter()

  const [property, setProperty] = useState<Property | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setIsLoading(true)
        setErrorMsg(null)

        // same call pattern you used elsewhere to load property data
        const res = await PropertiesApiClient.logPropertyView(propertyId)
        const p = res?.data?.property as Property | undefined

        if (!cancelled) {
          if (res?.success && p) setProperty(p)
          else setErrorMsg('Property not found')
        }
      } catch (e) {
        if (!cancelled) setErrorMsg('Failed to load property. Please try again.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    if (!propertyId) {
      setErrorMsg('Missing property ID')
      setIsLoading(false)
      return
    }

    load()
    return () => {
      cancelled = true
    }
  }, [propertyId])

  if (isLoading) {
    return (
      <ContentWrapper>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-slate-600">Loading property…</div>
        </div>
      </ContentWrapper>
    )
  }

  if (errorMsg || !property) {
    return (
      <ContentWrapper>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="text-lg text-red-600">{errorMsg ?? 'Property not found'}</div>
            <div className="mt-4 flex gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
              >
                Retry
              </button>
              <button
                onClick={() => router.push(`/property/${propertyId}`)}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
              >
                Back to details
              </button>
            </div>
          </div>
        </div>
      </ContentWrapper>
    )
  }

  // ✅ Replace this placeholder with your existing modify form UI
  return (
    <ContentWrapper>
      <div className="flex items-center space-x-3 mb-6">
        <ButtonCircle icon={<ArrowLeft />} onClick={() => router.back()} />
        <h1 className="text-2xl font-sans font-medium text-slate-900">Modify property</h1>
      </div>

      <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-2xl p-6">
        <p className="text-slate-700">
          Editing: <span className="font-semibold">{property.title}</span>
        </p>

        <div className="mt-4 p-4 rounded-xl bg-slate-50 text-sm text-slate-700">
          Your existing modify form should be pasted here.
          <br />
          (The important part is: you already have <b>propertyId</b> from props, so don’t use <code>useParams()</code>.)
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => router.push(`/property/${propertyId}`)}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium rounded-xl"
          >
            Cancel
          </button>
        </div>
      </div>
    </ContentWrapper>
  )
}