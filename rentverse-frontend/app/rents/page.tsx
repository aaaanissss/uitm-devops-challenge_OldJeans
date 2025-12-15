'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import ContentWrapper from '@/components/ContentWrapper'
import {
  Search,
  Calendar,
  MapPin,
  User,
  Download,
  PenTool,
  Check,
} from 'lucide-react'
import useAuthStore from '@/stores/authStore'
import { createApiUrl } from '@/utils/apiConfig'
import SignatureModal from '@/components/Modals/SignatureModal'

// ... (Interfaces Booking & BookingsResponse remain the same) ...
// Paste the interfaces from your previous file here to avoid errors
interface Booking {
  id: string
  startDate: string
  endDate: string
  rentAmount: string
  currencyCode: string
  status: string
  notes: string
  createdAt: string
  property: {
    id: string
    title: string
    address: string
    city: string
    images: string[]
    price: string
    currencyCode: string
  }
  landlord: {
    id: string
    email: string
    firstName: string
    lastName: string
    name: string
  }
}

interface BookingsResponse {
  success: boolean
  data: {
    bookings: Booking[]
    pagination: {
      page: number
      limit: number
      total: number
      pages: number
    }
  }
}

function RentsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const [isSignModalOpen, setSignModalOpen] = useState(false)
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(
    null
  )

  const { isLoggedIn } = useAuthStore()

  const fetchBookings = async () => {
    if (!isLoggedIn) {
      setIsLoading(false)
      return
    }
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/bookings/my-bookings', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })
      const data: BookingsResponse = await response.json()
      if (data.success) setBookings(data.data.bookings)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchBookings()
  }, [isLoggedIn])

  const handleOpenSignModal = (bookingId: string) => {
    setSelectedBookingId(bookingId)
    setSignModalOpen(true)
  }

  const handleSignSuccess = async () => {
    await fetchBookings()
  }

  const downloadRentalAgreement = async (bookingId: string) => {
    // ... (Your existing download logic) ...
    try {
      setDownloadingId(bookingId)
      const token = localStorage.getItem('authToken')
      const response = await fetch(
        createApiUrl(`bookings/${bookingId}/rental-agreement`),
        {
          headers: {
            accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      )
      const data = await response.json()
      if (data.success && data.data.pdf) {
        const link = document.createElement('a')
        link.href = data.data.pdf.url
        link.download = data.data.pdf.fileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (error) {
      alert('Failed to download')
    } finally {
      setDownloadingId(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatAmount = (amount: string, currency: string) => {
    const num = parseFloat(amount)
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency === 'IDR' ? 'IDR' : 'MYR',
      minimumFractionDigits: 0,
    }).format(num)
  }

  // --- ROBUST STATUS HELPER (Tenant View) ---
  const getDisplayStatus = (rawStatus: string) => {
    // Safety check
    if (!rawStatus) {
      return { label: 'Unknown', color: 'bg-gray-100 text-gray-800' }
    }

    // Normalize status (case-insensitive, trim spaces)
    const status = rawStatus.toUpperCase().trim()

    switch (status) {
      case 'PENDING':
      case 'APPROVED':
        return {
          label: 'Pending',
          color: 'bg-red-100 text-red-800',
        }

      case 'PARTIALLY_SIGNED':
        return {
          label: 'Action Required',
          color: 'bg-orange-100 text-orange-800',
        }

      case 'FULLY_SIGNED':
        return {
          label: 'Approved',
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

  if (!isLoggedIn) return <div>Please Log In</div>

  return (
    <ContentWrapper>
      <div className="max-w-6xl mx-auto flex items-center justify-between mb-8">
        <h3 className="text-2xl font-serif text-slate-900">My rents</h3>
        <Link
          href="/property"
          className="flex items-center space-x-2 px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors"
        >
          <Search size={16} />{' '}
          <span className="text-sm font-medium">Explore</span>
        </Link>
      </div>

      <div className="max-w-6xl mx-auto">
        {isLoading ? (
          <div className="text-center py-20">Loading...</div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-20">
            <p>No rents found.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {bookings.map((booking) => {
              const normalizedStatus = booking.status?.toUpperCase().trim()
              const display = getDisplayStatus(normalizedStatus)

              return (
                <div
                  key={booking.id}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="flex flex-col md:flex-row">
                    <div className="md:w-1/3">
                      <div className="relative h-48 md:h-full">
                        <Image
                          src={
                            booking.property.images[0] ||
                            '/placeholder-property.jpg'
                          }
                          alt={booking.property.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                    </div>

                    <div className="flex-1 p-6">
                      <div className="flex flex-col h-full">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-xl font-semibold text-slate-900 mb-1">
                              {booking.property.title}
                            </h3>
                            <div className="flex items-center text-slate-600 text-sm">
                              <MapPin size={14} className="mr-1" />
                              <span>
                                {booking.property.address},{' '}
                                {booking.property.city}
                              </span>
                            </div>
                          </div>
                          {/* UPDATED BADGE */}
                          <div
                            className={`px-3 py-1 rounded-full text-xs font-bold ${display.color}`}
                          >
                            {display.label}
                          </div>
                        </div>

                        <div className="flex items-center text-slate-600 mb-4">
                          <Calendar size={16} className="mr-2" />
                          <span className="text-sm">
                            {formatDate(booking.startDate)} -{' '}
                            {formatDate(booking.endDate)}
                          </span>
                        </div>

                        <div className="flex items-center text-slate-600 mb-4">
                          <User size={16} className="mr-2" />
                          <span className="text-sm">
                            Landlord: {booking.landlord.name}
                          </span>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mt-auto space-y-3 sm:space-y-0">
                          <div>
                            <p className="text-2xl font-bold text-slate-900">
                              {formatAmount(
                                booking.rentAmount,
                                booking.currencyCode
                              )}
                            </p>
                            <p className="text-sm text-slate-500">
                              Total amount
                            </p>
                          </div>

                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                            {/* BUTTON LOGIC UPDATE */}
                            {/* Show SIGN button if Approved/PartiallySigned AND not fully signed yet */}
                            {(booking.status === 'APPROVED' ||
                              booking.status === 'PARTIALLY_SIGNED') && (
                              <button
                                onClick={() => handleOpenSignModal(booking.id)}
                                className="flex items-center justify-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm shadow-sm"
                              >
                                <PenTool size={16} />
                                <span>Sign to Approve</span>
                              </button>
                            )}

                            {booking.status === 'FULLY_SIGNED' && (
                              <div className="px-4 py-2 bg-green-50 text-green-700 rounded-lg border border-green-200 text-sm flex items-center gap-2">
                                <Check size={16} /> Active
                              </div>
                            )}

                            <button
                              onClick={() =>
                                downloadRentalAgreement(booking.id)
                              }
                              disabled={downloadingId === booking.id}
                              className="flex items-center justify-center space-x-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors text-sm"
                            >
                              <Download size={16} />
                            </button>

                            <Link
                              href={`/rents/${booking.id}`}
                              className="flex items-center justify-center px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm"
                            >
                              Detail
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
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
        onSuccess={handleSignSuccess}
      />
    </ContentWrapper>
  )
}

export default RentsPage
