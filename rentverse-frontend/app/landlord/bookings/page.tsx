'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import ContentWrapper from '@/components/ContentWrapper'
import {
  Calendar,
  MapPin,
  User,
  Check,
  X as XIcon,
  PenTool,
  Loader2,
  ChevronRight,
} from 'lucide-react'
import useAuthStore from '@/stores/authStore'
import SignatureModal from '@/components/Modals/SignatureModal'
import { useRouter } from 'next/navigation'

interface Booking {
  id: string
  startDate: string
  endDate: string
  rentAmount: number
  status: string
  notes?: string
  tenant: {
    id: string
    name: string
    email: string
    phone?: string
  }
  property: {
    id: string
    title: string
    images: unknown // <-- keep flexible because sometimes backend sends weird formats
    address: string
  }
  agreement?: {
    landlordSignedAt?: string
    tenantSignedAt?: string
  }
}

// Helper: safely extract a usable URL from array / JSON string / comma-separated string
const extractFirstUrl = (val: unknown): string | null => {
  if (!val) return null

  if (Array.isArray(val)) {
    for (const v of val) {
      const u = extractFirstUrl(v)
      if (u) return u
    }
    return null
  }

  const s = String(val).trim()

  // try JSON array string
  try {
    const parsed = JSON.parse(s)
    if (Array.isArray(parsed)) return extractFirstUrl(parsed)
  } catch {}

  // split commas/spaces/pipes and pick first http(s)
  const parts = s.split(/[,\s|]+/g).map(x => x.trim())
  const first = parts.find(x => /^https?:\/\//i.test(x))
  return first || null
}

export default function LandlordBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const [isSignModalOpen, setSignModalOpen] = useState(false)
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null)

  const { isLoggedIn } = useAuthStore()
  const router = useRouter()

  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/bookings/owner-bookings', {
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json()
      if (data.success) {
        setBookings(data.data.bookings)
      }
    } catch (error) {
      console.error('Failed to load bookings', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isLoggedIn) fetchBookings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn])

  const handleApproveAndSign = async (bookingId: string) => {
    if (
      !confirm(
        'Approve this booking? You will be asked to sign the agreement immediately.'
      )
    )
      return

    setActionLoading(bookingId)
    try {
      const token = localStorage.getItem('authToken')

      const res = await fetch(`/api/bookings/${bookingId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      if (res.ok) {
        await fetchBookings()
        setSelectedBookingId(bookingId)
        setSignModalOpen(true)
      } else {
        const err = await res.json()
        alert(err.message || 'Approval failed')
      }
    } catch (error) {
      console.error(error)
      alert('Network error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (bookingId: string) => {
    if (!confirm('Reject this booking?')) return
    setActionLoading(bookingId)

    try {
      const token = localStorage.getItem('authToken')
      await fetch(`/api/bookings/${bookingId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: 'Landlord declined' }),
      })

      fetchBookings()
    } catch (error) {
      console.error(error)
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'APPROVED':
        return 'bg-emerald-100 text-emerald-800'
      case 'REJECTED':
        return 'bg-red-100 text-red-800'
      case 'PARTIALLY_SIGNED':
        return 'bg-blue-100 text-blue-800'
      case 'FULLY_SIGNED':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (!isLoggedIn) {
    return <div className="p-10 text-center">Please log in to manage properties.</div>
  }

  return (
    <ContentWrapper>
      <div className="max-w-6xl mx-auto mb-12">
        <h1 className="text-2xl font-serif text-slate-900 mb-6">Manage Requests</h1>

        {isLoading ? (
          <div className="text-center py-20">
            <Loader2 className="animate-spin mx-auto mb-2" />
            Loading requests...
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 rounded-xl border border-dashed border-slate-300">
            <p className="text-slate-500">No booking requests found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => {
              // ✅ compute image safely here (NOT inside JSX text)
              const raw = (booking.property as any).images?.[0] ?? booking.property.images
              const img = extractFirstUrl(raw) || '/placeholder-property.jpg'
              const isFazwaz = img.includes('cdn.fazwaz.com')

              return (
                <div
                  key={booking.id}
                  className="group bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col md:flex-row"
                >
                  {/* 1. Clickable Area for Details */}
                  <div
                    onClick={() => router.push(`/rents/${booking.id}`)}
                    className="flex-1 flex flex-col md:flex-row gap-6 p-6 cursor-pointer"
                  >
                    {/* Property Image */}
                    <div className="w-full md:w-48 h-32 relative rounded-lg overflow-hidden flex-shrink-0 bg-slate-100">
                      <Image
                        src={img}
                        alt={booking.property.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        unoptimized={isFazwaz}
                        sizes="(max-width: 768px) 100vw, 200px"
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-lg text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {booking.property.title}
                        </h3>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(
                            booking.status
                          )}`}
                        >
                          {booking.status.replace('_', ' ')}
                        </span>
                      </div>

                      <p className="text-sm text-slate-500 flex items-center gap-1 mb-4">
                        <MapPin size={14} /> {booking.property.address}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-700 bg-slate-50 p-3 rounded-lg">
                        <div className="flex items-center gap-2">
                          <User size={16} className="text-slate-400" />
                          <span>
                            Tenant: <strong>{booking.tenant.name}</strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar size={16} className="text-slate-400" />
                          <span>
                            {new Date(booking.startDate).toLocaleDateString()} -{' '}
                            {new Date(booking.endDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. Actions Area */}
                  <div className="p-6 border-t md:border-t-0 md:border-l border-slate-100 bg-slate-50/50 flex flex-col justify-center items-center min-w-[180px] gap-3">
                    {booking.status === 'PENDING' && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleApproveAndSign(booking.id)
                          }}
                          disabled={!!actionLoading}
                          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg transition-colors text-sm font-medium"
                        >
                          {actionLoading === booking.id ? (
                            <Loader2 className="animate-spin" size={16} />
                          ) : (
                            <Check size={16} />
                          )}
                          Approve & Sign
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleReject(booking.id)
                          }}
                          disabled={!!actionLoading}
                          className="w-full flex items-center justify-center gap-2 border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 py-2 px-4 rounded-lg transition-colors text-sm font-medium"
                        >
                          <XIcon size={16} />
                          Reject
                        </button>
                      </>
                    )}

                    {booking.status === 'APPROVED' && (
                      <>
                        <div className="text-xs text-amber-600 font-medium mb-1 px-2 py-1 bg-amber-50 rounded">
                          ⚠️ Action Required
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedBookingId(booking.id)
                            setSignModalOpen(true)
                          }}
                          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg shadow-sm text-sm font-medium animate-pulse"
                        >
                          <PenTool size={16} />
                          Sign Now
                        </button>
                      </>
                    )}

                    {booking.status === 'PARTIALLY_SIGNED' && (
                      <div className="text-center px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium border border-blue-100">
                        <div className="flex justify-center mb-1">
                          <Loader2 size={14} className="animate-spin" />
                        </div>
                        You signed.
                        <br />
                        Waiting for tenant.
                      </div>
                    )}

                    {booking.status === 'FULLY_SIGNED' && (
                      <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100">
                        <Check size={16} /> All Signed
                      </div>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/rents/${booking.id}`)
                      }}
                      className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
                    >
                      View Details <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <SignatureModal
        isOpen={isSignModalOpen}
        onClose={() => setSignModalOpen(false)}
        bookingId={selectedBookingId!}
        onSuccess={() => fetchBookings()}
      />
    </ContentWrapper>
  )
}
