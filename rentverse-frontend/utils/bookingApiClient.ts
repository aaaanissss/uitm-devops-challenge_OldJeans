import { createApiUrl } from '@/utils/apiConfig'

export interface BookingRequest {
  propertyId: string
  startDate: string
  endDate: string
  rentAmount: number
  securityDeposit: number
  notes: string
}

export interface BookingResponse {
  id: string
  propertyId: string
  startDate: string
  endDate: string
  rentAmount: number
  securityDeposit: number
  notes: string
  status: string
  createdAt: string
  updatedAt: string
}

function getAuthHeaders(): Record<string, string> {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('authToken') : null

  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  }
}

function unwrapBookingResponse(payload: any): any {
  // supports: {data:{booking}}, {data:{}}, or direct object
  return payload?.data?.booking ?? payload?.data ?? payload
}

export class BookingApiClient {
  static async createBooking(
    bookingData: BookingRequest,
  ): Promise<BookingResponse> {
    const response = await fetch(createApiUrl('bookings'), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(bookingData),
    })

    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      const msg = payload?.message || payload?.error || 'Unknown error'
      throw new Error(`HTTP ${response.status}: ${msg}`)
    }

    return unwrapBookingResponse(payload) as BookingResponse
  }

  static async getUserBookings(): Promise<BookingResponse[]> {
    const response = await fetch(createApiUrl('bookings'), {
      method: 'GET',
      headers: getAuthHeaders(),
    })

    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      const msg = payload?.message || payload?.error || 'Unknown error'
      throw new Error(`HTTP ${response.status}: ${msg}`)
    }

    const data = payload?.data?.bookings ?? payload?.data ?? payload
    return data as BookingResponse[]
  }

  static async getBookingById(bookingId: string): Promise<BookingResponse> {
    const response = await fetch(createApiUrl(`bookings/${bookingId}`), {
      method: 'GET',
      headers: getAuthHeaders(),
    })

    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      const msg = payload?.message || payload?.error || 'Unknown error'
      throw new Error(`HTTP ${response.status}: ${msg}`)
    }

    return unwrapBookingResponse(payload) as BookingResponse
  }

  static async cancelBooking(bookingId: string): Promise<BookingResponse> {
    const response = await fetch(createApiUrl(`bookings/${bookingId}/cancel`), {
      method: 'PATCH',
      headers: getAuthHeaders(),
    })

    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      const msg = payload?.message || payload?.error || 'Unknown error'
      throw new Error(`HTTP ${response.status}: ${msg}`)
    }

    return unwrapBookingResponse(payload) as BookingResponse
  }
}
