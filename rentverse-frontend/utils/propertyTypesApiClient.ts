import type { PropertyTypesResponse } from '@/types/property'
import { createApiUrl } from '@/utils/apiConfig'

export class PropertyTypesApiClient {
  private static getAuthToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('authToken')
  }

  static async getPropertyTypes(): Promise<PropertyTypesResponse> {
    const token = this.getAuthToken()

    const headers: Record<string, string> = {
      accept: 'application/json',
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    try {
      const url = createApiUrl('property-types?page=1&limit=10')

      if (process.env.NODE_ENV === 'development') {
        console.log('[PropertyTypesAPI] GET', url)
        console.log('[PropertyTypesAPI] Headers:', headers)
      }

      const response = await fetch(url, {
        method: 'GET',
        headers,
        cache: 'no-cache',
      })

      const data = await response.json().catch(() => ({} as any))

      if (!response.ok) {
        const msg =
          data?.message ||
          data?.error ||
          `HTTP error! status: ${response.status}`
        throw new Error(msg)
      }

      return data as PropertyTypesResponse
    } catch (error) {
      console.error('Error fetching property types:', error)
      throw error instanceof Error ? error : new Error('Network error occurred')
    }
  }
}
