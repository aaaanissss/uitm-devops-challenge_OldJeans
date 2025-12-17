import { NextRequest, NextResponse } from 'next/server'
import { forwardRequest, getAuthHeader, createErrorResponse } from '@/utils/apiForwarder'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        try {
            const response = await forwardRequest(`api/properties/${id}/view`, {
                method: 'POST',
                headers: {
                    ...getAuthHeader(request),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({}),
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
            console.error('Backend error logging property view:', backendError)
            return NextResponse.json(
                createErrorResponse('Backend service unavailable', backendError as Error, 503),
                { status: 503 }
            )
        }
    } catch (error) {
        console.error('Error logging property view:', error)
        return NextResponse.json(
            createErrorResponse('Failed to log property view', error as Error),
            { status: 500 },
        )
    }
}
