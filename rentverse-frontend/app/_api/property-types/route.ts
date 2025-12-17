import { NextRequest, NextResponse } from 'next/server'
import { forwardRequest, getAuthHeader, createErrorResponse } from '@/utils/apiForwarder'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = searchParams.get('page') || '1'
    const limit = searchParams.get('limit') || '10'

    try {
      // Forward to backend
      const response = await forwardRequest(`property-types?page=${page}&limit=${limit}`, {
        method: 'GET',
        headers: {
          ...getAuthHeader(request),
          'Content-Type': 'application/json',
        },
      })

      // Check if response is actually JSON
      const contentType = response.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        const data = await response.json()
        return NextResponse.json(data, { status: response.status })
      } else {
        // If backend doesn't return JSON, create a generic error response
        return NextResponse.json(
          { success: false, message: 'Invalid response from backend' },
          { status: 502 }
        )
      }
    } catch (backendError) {
      console.error('Backend error during property types fetch:', backendError)
      return NextResponse.json(
        createErrorResponse('Backend service unavailable', backendError as Error, 503),
        { status: 503 }
      )
    }
  } catch (error) {
    console.error('Error during property types fetch:', error)
    return NextResponse.json(
      createErrorResponse('Failed to fetch property types', error as Error),
      { status: 500 },
    )
  }
}