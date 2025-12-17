'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ContentWrapper from '@/components/ContentWrapper'
import ButtonCircle from '@/components/ButtonCircle'
import { ArrowLeft } from 'lucide-react'

type RentDetail = any

export default function RentDetailClient({ rentId }: { rentId: string }) {
  const router = useRouter()
  const [data, setData] = useState<RentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        setErr(null)

        const token = localStorage.getItem('authToken')
        if (!token) {
          setErr('Login required to view rent details.')
          setLoading(false)
          return
        }

        const res = await fetch(`/api/bookings/${rentId}`, {
          headers: {
            accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        })

        if (!res.ok) {
          const text = await res.text().catch(() => '')
          throw new Error(`Failed to load rent: ${res.status} ${text}`)
        }

        const json = await res.json()
        if (!cancelled) setData(json)
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? 'Failed to load rent detail')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    if (!rentId) {
      setErr('Missing rent ID')
      setLoading(false)
      return
    }

    load()
    return () => {
      cancelled = true
    }
  }, [rentId])

  return (
    <ContentWrapper>
      {/* Header */}
      <div className="flex items-center space-x-3 mb-6">
        <ButtonCircle icon={<ArrowLeft />} onClick={() => router.back()} />
        <h1 className="text-2xl font-sans font-medium text-slate-900">
          Rent details
        </h1>
      </div>

      {loading && (
        <div className="text-slate-600">Loading…</div>
      )}

      {!loading && err && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
          {err}
          <div className="mt-3 flex gap-3">
            <button
              onClick={() => router.push('/auth/login')}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg"
            >
              Go to login
            </button>
            <button
              onClick={() => router.push('/rents')}
              className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg"
            >
              Back to rents
            </button>
          </div>
        </div>
      )}

      {!loading && !err && data && (
        <pre className="bg-slate-50 border border-slate-200 p-4 rounded-xl overflow-auto text-xs">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </ContentWrapper>
  )
}
