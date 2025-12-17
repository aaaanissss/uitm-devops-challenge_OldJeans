import { NextRequest, NextResponse } from 'next/server'
import { forwardRequest, getAuthHeader, createErrorResponse } from '@/utils/apiForwarder'

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
        const endpoint = queryString ? `api/properties/my-properties?${queryString}` : 'api/properties/my-properties'

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
            console.error('Backend error during my-properties fetch:', backendError)
            return NextResponse.json(
                createErrorResponse('Backend service unavailable', backendError as Error, 503),
                { status: 503 }
            )
        }
    } catch (error) {
        console.error('Error fetching my properties:', error)
        return NextResponse.json(
            createErrorResponse('Failed to fetch my properties', error as Error),
            { status: 500 },
        )
    }
}
