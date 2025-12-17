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
        const endpoint = queryString ? `api/security/audit-logs/export.csv?${queryString}` : 'api/security/audit-logs/export.csv'

        try {
            const response = await forwardRequest(endpoint, {
                method: 'GET',
                headers: {
                    ...authHeader,
                },
            })

            // For CSV export, return the raw response
            const contentType = response.headers.get('content-type')
            if (contentType?.includes('text/csv') || contentType?.includes('application/octet-stream')) {
                const csvData = await response.text()
                return new NextResponse(csvData, {
                    status: response.status,
                    headers: {
                        'Content-Type': 'text/csv',
                        'Content-Disposition': response.headers.get('Content-Disposition') || 'attachment; filename="audit-logs.csv"',
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
            console.error('Backend error during audit-logs export:', backendError)
            return NextResponse.json(
                createErrorResponse('Backend service unavailable', backendError as Error, 503),
                { status: 503 }
            )
        }
    } catch (error) {
        console.error('Error exporting audit logs:', error)
        return NextResponse.json(
            createErrorResponse('Failed to export audit logs', error as Error),
            { status: 500 },
        )
    }
}
