'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import ContentWrapper from '@/components/ContentWrapper'
import ButtonCircle from '@/components/ButtonCircle'
import { ArrowLeft } from 'lucide-react'
import { PropertiesApiClient } from '@/utils/propertiesApiClient'
import type { Property } from '@/types/property'

const FALLBACK_IMAGE =
  'https://res.cloudinary.com/dqhuvu22u/image/upload/f_webp/v1758016984/rentverse-rooms/Gemini_Generated_Image_5hdui35hdui35hdu_s34nx6.png'

function extractUrls(val: unknown): string[] {
  if (!val) return []
  if (Array.isArray(val)) return val.flatMap(extractUrls)

  const s = String(val)

  // try JSON array string first
  try {
    const parsed = JSON.parse(s)
    if (Array.isArray(parsed)) return parsed.flatMap(extractUrls)
  } catch {}

  return s
    .split(/[,\s|]+/g)
    .map((x) => x.trim())
    .filter((x) => /^https?:\/\//i.test(x))
}

export default function PropertyDetailClient({ propertyId }: { propertyId: string }) {
  const router = useRouter()

  const [property, setProperty] = useState<Property | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!propertyId) {
        setErrorMsg('Missing property ID')
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setErrorMsg(null)

        // You already use this in BookingClient. It returns a property payload.
        const res = await PropertiesApiClient.logPropertyView(propertyId)

        const p = res?.data?.property as Property | undefined

        if (!cancelled) {
          if (res?.success && p) {
            setProperty(p)
          } else {
            setProperty(null)
            setErrorMsg('Property not found')
          }
        }
      } catch (e) {
        if (!cancelled) {
          setProperty(null)
          setErrorMsg('Failed to load property details. Please try again.')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [propertyId])

  const imageSrc = useMemo(() => {
    const list = extractUrls((property as any)?.images)
    return list[0] || FALLBACK_IMAGE
  }, [property])

  const isFazwaz = imageSrc.includes('cdn.fazwaz.com')

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
                onClick={() => router.push('/property')}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
              >
                Browse properties
              </button>
            </div>
          </div>
        </div>
      </ContentWrapper>
    )
  }

  const price =
    typeof property.price === 'string' ? Number.parseFloat(property.price) : (property.price as number)

  return (
    <ContentWrapper>
      {/* Header */}
      <div className="flex items-center space-x-3 mb-6">
        <ButtonCircle icon={<ArrowLeft />} onClick={() => router.back()} />
        <h1 className="text-2xl font-sans font-medium text-slate-900">Property details</h1>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="relative w-full h-72">
            <Image
              src={imageSrc}
              alt={property.title || `Property ${property.id}`}
              fill
              className="object-cover"
              unoptimized={isFazwaz}
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>

          <div className="p-5 space-y-2">
            <h2 className="text-xl font-semibold text-slate-900">{property.title}</h2>
            <p className="text-slate-600 text-sm">
              {property.address}, {property.city}, {property.state}, {property.country}
            </p>

            <div className="pt-3 flex items-baseline justify-between">
              <div className="text-slate-900 font-semibold">
                RM {Number.isFinite(price) ? price : 0}
                <span className="text-slate-500 font-normal"> / month</span>
              </div>
              <div className="text-sm text-slate-600">
                {property.bedrooms ?? 0} bd • {property.bathrooms ?? 0} ba
              </div>
            </div>
          </div>
        </div>

        {/* Info + Actions */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Description</h3>
            <p className="text-slate-700 whitespace-pre-line">
              {property.description || 'No description provided.'}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-xl bg-slate-50">
                <div className="text-slate-500">Type</div>
                <div className="text-slate-900 font-medium">{property.propertyType?.name ?? '-'}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <div className="text-slate-500">Area</div>
                <div className="text-slate-900 font-medium">{property.areaSqm ?? 0} sqm</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <div className="text-slate-500">Furnished</div>
                <div className="text-slate-900 font-medium">{property.furnished ? 'Yes' : 'No'}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <div className="text-slate-500">Available</div>
                <div className="text-slate-900 font-medium">{property.isAvailable ? 'Yes' : 'No'}</div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => router.push(`/property/${propertyId}/book`)}
              className="flex-1 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-xl transition-colors"
            >
              Request to book
            </button>

            <button
              onClick={() => router.push('/property')}
              className="px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium rounded-xl transition-colors"
            >
              Back to list
            </button>
          </div>
        </div>
      </div>
    </ContentWrapper>
  )
}
