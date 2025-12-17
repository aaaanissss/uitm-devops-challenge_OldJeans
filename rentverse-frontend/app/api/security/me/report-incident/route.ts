import { NextRequest, NextResponse } from 'next/server'
import { forwardRequest, getAuthHeader, createErrorResponse } from '@/utils/apiForwarder'

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
            const response = await forwardRequest('api/security/me/report-incident', {
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
            console.error('Backend error during report-incident:', backendError)
            return NextResponse.json(
                createErrorResponse('Backend service unavailable', backendError as Error, 503),
                { status: 503 }
            )
        }
    } catch (error) {
        console.error('Error reporting incident:', error)
        return NextResponse.json(
            createErrorResponse('Failed to report incident', error as Error),
            { status: 500 },
        )
    }
}
