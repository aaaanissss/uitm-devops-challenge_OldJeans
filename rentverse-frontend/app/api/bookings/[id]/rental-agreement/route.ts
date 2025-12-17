import { NextRequest, NextResponse } from 'next/server'
import { forwardRequest, getAuthHeader, createErrorResponse } from '@/utils/apiForwarder'

export async function GET(
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

        try {
            const response = await forwardRequest(`api/bookings/${id}/rental-agreement`, {
                method: 'GET',
                headers: {
                    ...authHeader,
                },
            })

            // For PDF downloads, return the raw response
            const contentType = response.headers.get('content-type')
            if (contentType?.includes('application/pdf') || contentType?.includes('application/octet-stream')) {
                const pdfData = await response.arrayBuffer()
                return new NextResponse(pdfData, {
                    status: response.status,
                    headers: {
                        'Content-Type': 'application/pdf',
                        'Content-Disposition': response.headers.get('Content-Disposition') || 'attachment; filename="rental-agreement.pdf"',
                    },
                })
            } else if (contentType?.includes('application/json')) {
                const data = await response.json()
                return NextResponse.json(data, { status: response.status })
            } else {
                return NextResponse.json(
                    { success: false, message: 'Invalid response from backend' },
                    { status: 502 }
                )
            }
        } catch (backendError) {
            console.error('Backend error getting rental agreement:', backendError)
            return NextResponse.json(
                createErrorResponse('Backend service unavailable', backendError as Error, 503),
                { status: 503 }
            )
        }
    } catch (error) {
        console.error('Error getting rental agreement:', error)
        return NextResponse.json(
            createErrorResponse('Failed to get rental agreement', error as Error),
            { status: 500 },
        )
    }
}
