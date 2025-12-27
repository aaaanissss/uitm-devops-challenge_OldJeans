import type {
  Property,
  PropertyViewResponse,
  PropertiesResponse,
  SearchFilters,
} from '@/types/property'
import { createApiUrl } from '@/utils/apiConfig'

/**
 * Properties API client (calls backend directly via createApiUrl)
 * IMPORTANT: endpoints passed to createApiUrl MUST NOT start with "api/"
 */
export class PropertiesApiClient {
  /**
   * Log a property view
   */
  static async logPropertyView(propertyId: string): Promise<PropertyViewResponse> {
    try {
      const response = await fetch(createApiUrl(`properties/${propertyId}/view`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}), // Empty body as per backend expectation
      })

      const data = await response.json().catch(() => ({} as any))

      if (!response.ok) {
        throw new Error(data?.message || 'Failed to log property view')
      }

      return data as PropertyViewResponse
    } catch (error) {
      console.error('Property view logging API error:', error)
      throw error instanceof Error ? error : new Error('Network error occurred')
    }
  }

  /**
   * Get property details
   */
  static async getProperty(propertyId: string): Promise<Property> {
    try {
      const response = await fetch(createApiUrl(`properties/${propertyId}`), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json().catch(() => ({} as any))

      if (!response.ok) {
        throw new Error(data?.message || 'Failed to get property details')
      }

      // Backend commonly returns { success, data: { property } } or { success, data }
      const backendProperty = data?.data?.property ?? data?.data
      if (!backendProperty) {
        throw new Error('No property data found in response')
      }

      // Map backend response to frontend Property interface
      const propertyData: Property = {
        ...backendProperty,
        // Map propertyType.code to type field for compatibility
        type: backendProperty.propertyType?.code || backendProperty.type || 'APARTMENT',
        // Ensure price is a number
        price:
          typeof backendProperty.price === 'string'
            ? parseFloat(backendProperty.price)
            : backendProperty.price,
        // Ensure area is available (map from areaSqm if area is missing)
        area: backendProperty.area ?? backendProperty.areaSqm ?? 0,
      }

      return propertyData
    } catch (error) {
      console.error('Get property API error:', error)
      throw error instanceof Error ? error : new Error('Network error occurred')
    }
  }

  /**
   * Search properties
   */
  static async searchProperties(filters: SearchFilters = {}): Promise<PropertiesResponse> {
    try {
      const params = new URLSearchParams()

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value))
        }
      })

      const queryString = params.toString()
      const endpoint = `properties${queryString ? `?${queryString}` : ''}`

      const response = await fetch(createApiUrl(endpoint), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json().catch(() => ({} as any))

      if (!response.ok) {
        throw new Error(data?.message || 'Failed to search properties')
      }

      return data as PropertiesResponse
    } catch (error) {
      console.error('Search properties API error:', error)
      throw error instanceof Error ? error : new Error('Network error occurred')
    }
  }

  /**
   * Create a new property
   */
  static async createProperty(
    propertyData: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Property> {
    try {
      const response = await fetch(createApiUrl('properties'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(propertyData),
      })

      const data = await response.json().catch(() => ({} as any))

      if (!response.ok) {
        throw new Error(data?.message || 'Failed to create property')
      }

      return (data?.data?.property ?? data?.data ?? data) as Property
    } catch (error) {
      console.error('Create property API error:', error)
      throw error instanceof Error ? error : new Error('Network error occurred')
    }
  }

  /**
   * Update an existing property
   */
  static async updateProperty(propertyId: string, updates: Partial<Property>): Promise<Property> {
    try {
      const response = await fetch(createApiUrl(`properties/${propertyId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      const data = await response.json().catch(() => ({} as any))

      if (!response.ok) {
        throw new Error(data?.message || 'Failed to update property')
      }

      return (data?.data?.property ?? data?.data ?? data) as Property
    } catch (error) {
      console.error('Update property API error:', error)
      throw error instanceof Error ? error : new Error('Network error occurred')
    }
  }

  /**
   * Delete a property
   */
  static async deleteProperty(propertyId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(createApiUrl(`properties/${propertyId}`), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json().catch(() => ({} as any))

      if (!response.ok) {
        throw new Error(data?.message || 'Failed to delete property')
      }

      return data as { success: boolean; message: string }
    } catch (error) {
      console.error('Delete property API error:', error)
      throw error instanceof Error ? error : new Error('Network error occurred')
    }
  }
}