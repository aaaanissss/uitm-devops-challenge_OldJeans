import { NextRequest, NextResponse } from 'next/server'
import { forwardRequest, createErrorResponse } from '@/utils/apiForwarder'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        // Validate required fields
        if (!body.code || !body.mfaToken) {
            return NextResponse.json(
                { success: false, message: 'MFA code and token are required' },
                { status: 400 },
            )
        }

        // Validate code format (should be 6 digits)
        if (!/^\d{6}$/.test(body.code)) {
            return NextResponse.json(
                { success: false, message: 'MFA code must be 6 digits' },
                { status: 400 },
            )
        }

        try {
            // Forward to backend
            const response = await forwardRequest('api/auth/mfa/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            })

            // Check if response is actually JSON
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
            console.error('Backend error during MFA verify:', backendError)
            return NextResponse.json(
                createErrorResponse('Backend service unavailable', backendError as Error, 503),
                { status: 503 }
            )
        }
    } catch (error) {
        console.error('Error verifying MFA:', error)
        return NextResponse.json(
            createErrorResponse('Failed to verify MFA', error as Error),
            { status: 500 },
        )
    }
}
