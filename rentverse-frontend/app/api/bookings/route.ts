import { NextRequest, NextResponse } from 'next/server'
import { forwardRequest, getAuthHeader, createErrorResponse } from '@/utils/apiForwarder'

// GET /api/bookings - List bookings
export async function GET(request: NextRequest) {
    try {
        const authHeader = getAuthHeader(request)

        if (!authHeader.Authorization) {
            return NextResponse.json(
                { success: false, message: 'Authorization header required' },
                { status: 401 },
            )
        }

        const { searchParams } = new URL(request.url)
        const queryString = searchParams.toString()
        const endpoint = queryString ? `api/bookings?${queryString}` : 'api/bookings'

        try {
            const response = await forwardRequest(endpoint, {
                method: 'GET',
                headers: {
                    ...authHeader,
                    'Content-Type': 'application/json',
                },
            })

            const contentType = response.headers.get('content-type')
            if (contentType?.includes('application/json')) {
                const data = await response.json()
                return NextResponse.json(data, { status: response.status })
            } else {
                return NextResponse.json(
                    { success: false, message: 'Invalid response from backend' },
                    { status: 502 }
                )
            }
        } catch (backendError) {
            console.error('Backend error during bookings list:', backendError)
            return NextResponse.json(
                createErrorResponse('Backend service unavailable', backendError as Error, 503),
                { status: 503 }
            )
        }
    } catch (error) {
        console.error('Error listing bookings:', error)
        return NextResponse.json(
            createErrorResponse('Failed to list bookings', error as Error),
            { status: 500 },
        )
    }
}

// POST /api/bookings - Create booking
export async function POST(request: NextRequest) {
    try {
        const authHeader = getAuthHeader(request)

        if (!authHeader.Authorization) {
            return NextResponse.json(
                { success: false, message: 'Authorization header required' },
                { status: 401 },
            )
        }

        const body = await request.json()

        try {
            const response = await forwardRequest('api/bookings', {
                method: 'POST',
                headers: {
                    ...authHeader,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            })

            const contentType = response.headers.get('content-type')
            if (contentType?.includes('application/json')) {
                const data = await response.json()
                return NextResponse.json(data, { status: response.status })
            } else {
                return NextResponse.json(
                    { success: false, message: 'Invalid response from backend' },
                    { status: 502 }
                )
            }
        } catch (backendError) {
            console.error('Backend error during booking creation:', backendError)
            return NextResponse.json(
                createErrorResponse('Backend service unavailable', backendError as Error, 503),
                { status: 503 }
            )
        }
    } catch (error) {
        console.error('Error creating booking:', error)
        return NextResponse.json(
            createErrorResponse('Failed to create booking', error as Error),
            { status: 500 },
        )
    }
}
