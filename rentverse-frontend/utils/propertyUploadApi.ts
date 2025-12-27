/**
 * Property Upload API Service
 * Handles uploading properties to the backend
 */

import type { PropertyListingData } from '@/stores/propertyListingStore'
import { createApiUrl } from '@/utils/apiConfig'

export interface MinimalPropertyUploadRequest {
  code: string
  title: string
  description: string
  address: string
  city: string
  state: string
  zipCode: string
  latitude: number
  longitude: number
  price: number
  currencyCode: string
  propertyTypeId: string
  bedrooms: number
  bathrooms: number
  areaSqm: number
  furnished: boolean
  isAvailable: boolean
  images: string[]
  amenityIds: string[]
}

export interface PropertyUploadRequest {
  code: string
  title: string
  description: string
  address: string
  city: string
  state: string
  country: string
  zipCode: string
  placeId: string
  latitude: number
  longitude: number
  price: number
  currencyCode: string
  propertyTypeId: string
  bedrooms: number
  bathrooms: number
  areaSqm: number
  furnished: boolean
  isAvailable: boolean
  status: 'DRAFT' | 'PUBLISHED'
  images: string[]
  amenityIds: string[]
}

export interface PropertyUploadResponse {
  success: boolean
  message: string
  data: {
    property: {
      id: string
      code: string
      title: string
      description: string
      address: string
      city: string
      state: string
      zipCode: string
      price: number
      type: string
      bedrooms: number
      bathrooms: number
      area: number
      isAvailable: boolean
      viewCount: number
      averageRating: number
      totalRatings: number
      isFavorited: boolean
      favoriteCount: number
      images: string[]
      amenities: string[]
      createdAt: string
      updatedAt: string
    }
  }
}

function extractErrorMessage(payload: any, fallback: string) {
  if (!payload) return fallback
  if (typeof payload === 'string') return payload
  return payload?.message || payload?.error || fallback
}

/**
 * Upload a property to the backend
 */
export async function uploadProperty(
  propertyData: MinimalPropertyUploadRequest,
  token: string,
): Promise<PropertyUploadResponse> {
  try {
    const url = createApiUrl('properties')

    // Debug: Log the request data
    if (process.env.NODE_ENV === 'development') {
      console.log('[PropertyUpload] POST', url)
      console.log('[PropertyUpload] Payload:', JSON.stringify(propertyData, null, 2))
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(propertyData),
      cache: 'no-cache',
    })

    const data = await response.json().catch(() => ({} as any))

    if (!response.ok) {
      // Handle detailed validation errors if present
      const details =
        data?.details ? ` Validation details: ${JSON.stringify(data.details)}` : ''
      const msg = extractErrorMessage(data, `Upload failed (HTTP ${response.status}).`)
      throw new Error(`${msg}${details}`)
    }

    if (!data?.success) {
      throw new Error(data?.message || 'Upload failed')
    }

    return data as PropertyUploadResponse
  } catch (error) {
    console.error('Property upload error:', error)
    throw error instanceof Error ? error : new Error('Network error occurred')
  }
}

/**
 * Generate a unique property code
 */
function generatePropertyCode(): string {
  const timestamp = Date.now().toString().slice(-6)
  const random = Math.random().toString(36).substring(2, 5).toUpperCase()
  return `PROP${timestamp}${random}`
}

/**
 * Convert property listing data to upload format
 */
export function mapPropertyListingToUploadRequest(
  data: PropertyListingData,
): MinimalPropertyUploadRequest {
  const propertyTypeId = data.propertyTypeId || getDefaultPropertyTypeId(data.propertyType)

  if (!propertyTypeId) {
    console.warn('No propertyTypeId available, this may cause upload issues')
  }

  const images = Array.isArray(data.images)
    ? data.images.filter((url) => url && url.trim() !== '')
    : []

  if (images.length === 0) {
    console.warn('No images found in property data - property will be uploaded without images')
  } else {
    console.log(`Preparing property upload with ${images.length} images:`, images)
  }

  const payload: MinimalPropertyUploadRequest = {
    code: generatePropertyCode(),
    title: data.title || 'Test Property',
    description: data.description || 'Test Description',
    address:
      data.streetAddress ||
      data.address ||
      `${data.city || 'Kuala Lumpur'}, ${data.state || 'Selangor'}`,
    city: data.city || 'Kuala Lumpur',
    state: data.state || 'Selangor',
    zipCode: data.zipCode || '50000',
    latitude: data.latitude || 3.139,
    longitude: data.longitude || 101.6869,
    price: Math.max(data.price || 1000, 1),
    currencyCode: 'MYR',
    propertyTypeId,
    bedrooms: Math.max(data.bedrooms || 1, 1),
    bathrooms: Math.max(data.bathrooms || 1, 1),
    areaSqm: Math.max(data.areaSqm || 100, 1),
    furnished: false,
    isAvailable: true,
    images,
    amenityIds: [],
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('[PropertyUpload] Mapped payload:', JSON.stringify(payload, null, 2))
    console.log('[PropertyUpload] Images included:', payload.images.length, 'URLs')
  }

  return payload
}

/**
 * Get default property type ID based on property type name
 * This is a fallback for cases where dynamic ID isn't available
 */
function getDefaultPropertyTypeId(propertyType?: string): string {
  const fallbackMap: Record<string, string> = {
    Apartment: 'fallback-apartment-id',
    Condominium: 'fallback-condominium-id',
    House: 'fallback-house-id',
    Townhouse: 'fallback-townhouse-id',
    Villa: 'fallback-villa-id',
    Penthouse: 'fallback-penthouse-id',
    Studio: 'fallback-studio-id',
  }

  console.warn(
    `Using fallback propertyTypeId for "${propertyType}". Consider implementing dynamic property type ID mapping.`,
  )
  return fallbackMap[propertyType || ''] || 'fallback-apartment-id'
}

/**
 * Enhanced mapping function that gets propertyTypeId from actual API data
 */
export async function mapPropertyListingToUploadRequestWithDynamicTypes(
  data: PropertyListingData,
): Promise<MinimalPropertyUploadRequest> {
  let propertyTypeId = data.propertyTypeId

  if (!propertyTypeId && data.propertyType) {
    try {
      const { PropertyTypesApiClient } = await import('@/utils/propertyTypesApiClient')
      const response = await PropertyTypesApiClient.getPropertyTypes()

      if (response.success && response.data) {
        const matchingType = response.data.find(
          (type) =>
            type.name === data.propertyType ||
            type.code === data.propertyType?.toUpperCase(),
        )

        if (matchingType) {
          propertyTypeId = matchingType.id
          console.log(`Found dynamic propertyTypeId: ${propertyTypeId} for ${data.propertyType}`)
        }
      }
    } catch (error) {
      console.error('Failed to fetch dynamic property types:', error)
    }
  }

  if (!propertyTypeId) {
    propertyTypeId = getDefaultPropertyTypeId(data.propertyType)
  }

  const images = Array.isArray(data.images)
    ? data.images.filter((url) => url && url.trim() !== '')
    : []

  if (images.length === 0) {
    console.warn('No images found in property data - property will be uploaded without images')
  } else {
    console.log(`Preparing enhanced property upload with ${images.length} images:`, images)
  }

  return {
    code: generatePropertyCode(),
    title: data.title || 'Test Property',
    description: data.description || 'Test Description',
    address:
      data.streetAddress ||
      data.address ||
      `${data.city || 'Kuala Lumpur'}, ${data.state || 'Selangor'}`,
    city: data.city || 'Kuala Lumpur',
    state: data.state || 'Selangor',
    zipCode: data.zipCode || '50000',
    latitude: data.latitude || 3.139,
    longitude: data.longitude || 101.6869,
    price: Math.max(data.price || 1000, 1),
    currencyCode: 'MYR',
    propertyTypeId,
    bedrooms: Math.max(data.bedrooms || 1, 1),
    bathrooms: Math.max(data.bathrooms || 1, 1),
    areaSqm: Math.max(data.areaSqm || 100, 1),
    furnished: false,
    isAvailable: true,
    images,
    amenityIds: [],
  }
}
