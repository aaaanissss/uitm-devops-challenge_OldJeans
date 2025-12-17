import { NextRequest, NextResponse } from 'next/server'
import { forwardRequest, getAuthHeader, createErrorResponse } from '@/utils/apiForwarder'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const authHeader = getAuthHeader(request)

        if (!authHeader.Authorization) {
            return NextResponse.json(
                { success: false, message: 'Authorization header required' },
                { status: 401 },
            )
        }

        const body = await request.json().catch(() => ({}))

        try {
            const response = await forwardRequest(`api/bookings/${id}/sign`, {
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
            console.error('Backend error signing booking:', backendError)
            return NextResponse.json(
                createErrorResponse('Backend service unavailable', backendError as Error, 503),
                { status: 503 }
            )
        }
    } catch (error) {
        console.error('Error signing booking:', error)
        return NextResponse.json(
            createErrorResponse('Failed to sign booking', error as Error),
            { status: 500 },
        )
    }
}
