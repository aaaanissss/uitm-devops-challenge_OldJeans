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

    // ✅ IMPORTANT: do NOT include "api/" here
    const endpoint = queryString
      ? `security/alerts?${queryString}`
      : 'security/alerts'

    const response = await forwardRequest(endpoint, {
      method: 'GET',
      headers: {
        ...authHeader,
        'Content-Type': 'application/json',
      },
    })

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      return NextResponse.json(
        { success: false, message: 'Invalid response from backend' },
        { status: 502 },
      )
    }

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Error fetching alerts:', error)

    // If forwardRequest threw, we handle it here
    return NextResponse.json(
      createErrorResponse('Failed to fetch alerts', error as Error),
      { status: 500 },
    )
  }
}
