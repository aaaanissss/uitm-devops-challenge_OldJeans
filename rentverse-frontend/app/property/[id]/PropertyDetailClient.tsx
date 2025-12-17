'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import ContentWrapper from '@/components/ContentWrapper'
import ButtonCircle from '@/components/ButtonCircle'
import { ArrowLeft, MapPin } from 'lucide-react'
import { PropertiesApiClient } from '@/utils/propertiesApiClient'
import type { Property } from '@/types/property'

export default function PropertyDetailClient({
  propertyId,
}: {
  propertyId: string
}) {
  const router = useRouter()
  const [property, setProperty] = useState<Property | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        setError(null)

        if (!propertyId) {
          setError('Missing property ID')
          setLoading(false)
          return
        }

        // same API used elsewhere in your app
        const res = await PropertiesApiClient.logPropertyView(propertyId)

        if (!res?.success || !res.data?.property) {
          throw new Error('Property not found')
        }

        if (!cancelled) {
          setProperty(res.data.property)
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? 'Failed to load property')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [propertyId])

  const getSafeImage = (p: Property | null) => {
    const raw = p?.images as unknown

    const extractUrls = (val: unknown): string[] => {
      if (!val) return []
      if (Array.isArray(val)) return val.flatMap(extractUrls)

      const s = String(val)
      try {
        const parsed = JSON.parse(s)
        if (Array.isArray(parsed)) return parsed.flatMap(extractUrls)
      } catch {}

      return s
        .split(/[,\s|]+/g)
        .map((x) => x.trim())
        .filter((x) => /^https?:\/\//i.test(x))
    }

    const list = extractUrls(raw)
    return (
      list[0] ||
      'https://res.cloudinary.com/dqhuvu22u/image/upload/f_webp/v1758016984/rentverse-rooms/Gemini_Generated_Image_5hdui35hdui35hdu_s34nx6.png'
    )
  }

  if (loading) {
    return (
      <ContentWrapper>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-slate-600">Loading property…</div>
        </div>
      </ContentWrapper>
    )
  }

  if (error || !property) {
    return (
      <ContentWrapper>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="text-red-600 text-lg">
              {error ?? 'Property not found'}
            </div>
            <button
              onClick={() => router.push('/property')}
              className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg"
            >
              Back to properties
            </button>
          </div>
        </div>
      </ContentWrapper>
    )
  }

  const imageSrc = getSafeImage(property)
  const isFazwaz = imageSrc.includes('cdn.fazwaz.com')

  return (
    <ContentWrapper>
      {/* Header */}
      <div className="flex items-center space-x-3 mb-6">
        <ButtonCircle icon={<ArrowLeft />} onClick={() => router.back()} />
        <h1 className="text-2xl font-sans font-medium text-slate-900">
          Property details
        </h1>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image */}
        <div className="relative w-full h-80 rounded-2xl overflow-hidden">
          <Image
            src={imageSrc}
            alt={property.title}
            fill
            className="object-cover"
            unoptimized={isFazwaz}
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>

        {/* Details */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-slate-900">
            {property.title}
          </h2>

          <div className="flex items-center text-slate-600">
            <MapPin size={16} className="mr-2" />
            {property.address}, {property.city}, {property.state},{' '}
            {property.country}
          </div>

          <div className="text-3xl font-bold text-slate-900">
            RM {property.price}
          </div>

          <p className="text-slate-600">{property.description}</p>

          <div className="pt-4 flex gap-3">
            <button
              onClick={() => router.push(`/property/${propertyId}/book`)}
              className="px-6 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition"
            >
              Book now
            </button>

            <button
              onClick={() => router.push('/property')}
              className="px-6 py-3 border border-slate-300 rounded-xl hover:bg-slate-50 transition"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    </ContentWrapper>
  )
}
