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
  tenant: { name: string; email: string }
  property: { id: string; title: string; images: string[]; address: string }
}

export default function LandlordBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const [isSignModalOpen, setSignModalOpen] = useState(false)
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(
    null
  )

  const { isLoggedIn } = useAuthStore()
  const router = useRouter()

  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/bookings/owner-bookings', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (data.success) setBookings(data.data.bookings)
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isLoggedIn) fetchBookings()
  }, [isLoggedIn])

  const handleApproveAndSign = async (bookingId: string) => {
    if (
      !confirm(
        'Accept this request? You will need to sign to finalize the approval.'
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
        setSignModalOpen(true) // Open modal immediately
      } else {
        alert('Action failed')
      }
    } catch (error) {
      console.error(error)
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

  const getDisplayStatus = (status: string) => {
    switch (status) {
      case 'PENDING':
      case 'APPROVED':
        return {
          label: 'Action Required',
          color: 'bg-red-100 text-red-800',
        }

      case 'PARTIALLY_SIGNED':
        return {
          label: 'Approved',
          color: 'bg-orange-100 text-orange-800',
        }

      case 'FULLY_SIGNED':
        return {
          label: 'Active',
          color: 'bg-green-100 text-green-800',
        }

      case 'REJECTED':
        return {
          label: 'Rejected',
          color: 'bg-gray-100 text-gray-800',
        }

      default:
        return {
          label: status,
          color: 'bg-gray-100 text-gray-800',
        }
    }
  }

  if (!isLoggedIn) return <div>Please log in</div>

  return (
    <ContentWrapper>
      <div className="max-w-6xl mx-auto mb-12">
        <h1 className="text-2xl font-serif text-slate-900 mb-6">
          Manage Requests
        </h1>

        {isLoading ? (
          <div className="text-center py-20">Loading...</div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 rounded-xl border border-dashed border-slate-300">
            <p className="text-slate-500">No requests found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => {
              const normalizedStatus = booking.status?.toUpperCase().trim()
              const display = getDisplayStatus(normalizedStatus)

              return (
                <div
                  key={booking.id}
                  className="group bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row overflow-hidden"
                >
                  {/* Clickable Card Body */}
                  <div
                    onClick={() => router.push(`/rents/${booking.id}`)}
                    className="flex-1 flex flex-col md:flex-row gap-6 p-6 cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <div className="w-full md:w-48 h-32 relative rounded-lg overflow-hidden bg-slate-200 flex-shrink-0">
                      <Image
                        src={booking.property.images[0] || '/placeholder.jpg'}
                        alt={booking.property.title}
                        fill
                        className="object-cover"
                      />
                    </div>

                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-lg text-slate-900">
                          {booking.property.title}
                        </h3>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${display.color}`}
                        >
                          {display.label}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 flex items-center gap-1 mb-4">
                        <MapPin size={14} /> {booking.property.address}
                      </p>

                      <div className="flex gap-6 text-sm text-slate-700">
                        <span className="flex items-center gap-2">
                          <User size={16} className="text-slate-400" />{' '}
                          {booking.tenant.name}
                        </span>
                        <span className="flex items-center gap-2">
                          <Calendar size={16} className="text-slate-400" />{' '}
                          {new Date(booking.startDate).toLocaleDateString()} -{' '}
                          {new Date(booking.endDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="p-6 border-t md:border-l border-slate-100 flex flex-col justify-center items-center min-w-[200px] gap-3 bg-white">
                    {/* 1. Pending -> Approve */}
                    {booking.status === 'PENDING' && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleApproveAndSign(booking.id)
                          }}
                          disabled={!!actionLoading}
                          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg text-sm font-medium"
                        >
                          {actionLoading === booking.id ? (
                            <Loader2 className="animate-spin" size={16} />
                          ) : (
                            <Check size={16} />
                          )}
                          Accept & Sign
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleReject(booking.id)
                          }}
                          className="w-full flex items-center justify-center gap-2 border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 py-2 px-4 rounded-lg text-sm font-medium"
                        >
                          <XIcon size={16} /> Reject
                        </button>
                      </>
                    )}

                    {/* 2. Approved (Backend) -> UI: "Awaiting Signature" */}
                    {booking.status === 'APPROVED' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedBookingId(booking.id)
                          setSignModalOpen(true)
                        }}
                        className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white py-2 px-4 rounded-lg shadow-sm text-sm font-medium animate-pulse"
                      >
                        <PenTool size={16} /> Sign to Approve
                      </button>
                    )}

                    {/* 3. Partially Signed -> UI: "Approved" */}
                    {booking.status === 'PARTIALLY_SIGNED' && (
                      <div className="text-center text-xs text-emerald-600 font-medium bg-emerald-50 px-3 py-2 rounded border border-emerald-100">
                        <Check size={14} className="inline mr-1" /> Signed &
                        Approved
                        <br />
                        <span className="text-slate-500 font-normal">
                          Waiting for tenant
                        </span>
                      </div>
                    )}

                    {booking.status === 'FULLY_SIGNED' && (
                      <div className="text-green-600 font-bold text-sm flex items-center gap-2">
                        <Check size={18} /> Active
                      </div>
                    )}
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
