import { NextRequest, NextResponse } from 'next/server'
import { forwardRequest, getAuthHeader, createErrorResponse } from '@/utils/apiForwarder'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const queryString = searchParams.toString()
        const endpoint = queryString ? `api/property-types?${queryString}` : 'api/property-types'

        try {
            const response = await forwardRequest(endpoint, {
                method: 'GET',
                headers: {
                    ...getAuthHeader(request),
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
            console.error('Backend error during property-types fetch:', backendError)
            return NextResponse.json(
                createErrorResponse('Backend service unavailable', backendError as Error, 503),
                { status: 503 }
            )
        }
    } catch (error) {
        console.error('Error fetching property types:', error)
        return NextResponse.json(
            createErrorResponse('Failed to fetch property types', error as Error),
            { status: 500 },
        )
    }
}
