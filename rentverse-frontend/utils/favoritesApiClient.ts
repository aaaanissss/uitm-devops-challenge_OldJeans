import type { Property } from '@/types/property'
import { createApiUrl } from './apiConfig'

// Backend response property structure
interface BackendProperty {
  id: string
  title: string
  description: string
  address: string
  city: string
  state: string
  zipCode: string
  country: string
  price: string
  currencyCode: string
  bedrooms: number
  bathrooms: number
  areaSqm: number
  furnished: boolean
  isAvailable: boolean
  images: string[]
  latitude: number
  longitude: number
  placeId?: string | null
  projectName?: string | null
  developer?: string | null
  code: string
  status: string
  createdAt: string
  updatedAt: string
  ownerId: string
  propertyTypeId: string
  propertyType: {
    id: string
    code: string
    name: string
    description: string
    icon: string
    isActive: boolean
    createdAt: string
    updatedAt: string
  }
  owner: {
    id: string
    email: string
    firstName: string
    lastName: string
    name: string
  }
  amenities: Array<{
    propertyId: string
    amenityId: string
    amenity: {
      id: string
      name: string
      category: string
    }
  }>
  mapsUrl: string
  viewCount: number
  averageRating: number
  totalRatings: number
  isFavorited: boolean
  favoriteCount: number
}

export interface FavoritesResponse {
  success: boolean
  data: {
    favorites: Property[]
    pagination: {
      page: number
      limit: number
      total: number
      pages: number
    }
  }
}

// Transform backend property to frontend Property format
function transformProperty(backendProperty: BackendProperty): Property {
  return {
    id: backendProperty.id,
    code: backendProperty.code,
    title: backendProperty.title,
    description: backendProperty.description,
    address: backendProperty.address,
    city: backendProperty.city,
    state: backendProperty.state,
    zipCode: backendProperty.zipCode,
    country: backendProperty.country,

    // keep your existing type expectations
    price: backendProperty.price,
    currencyCode: backendProperty.currencyCode,
    type: backendProperty.propertyType.code as
      | 'APARTMENT'
      | 'HOUSE'
      | 'STUDIO'
      | 'CONDO'
      | 'VILLA'
      | 'ROOM',

    bedrooms: backendProperty.bedrooms,
    bathrooms: backendProperty.bathrooms,
    area: backendProperty.areaSqm,
    areaSqm: backendProperty.areaSqm,

    furnished: backendProperty.furnished,
    isAvailable: backendProperty.isAvailable,

    viewCount: backendProperty.viewCount,
    averageRating: backendProperty.averageRating,
    totalRatings: backendProperty.totalRatings,
    isFavorited: backendProperty.isFavorited,
    favoriteCount: backendProperty.favoriteCount,

    images: backendProperty.images,
    amenities: backendProperty.amenities.map((a) => a.amenity.name),

    latitude: backendProperty.latitude,
    longitude: backendProperty.longitude,
    placeId: backendProperty.placeId,
    projectName: backendProperty.projectName,
    developer: backendProperty.developer,

    status: backendProperty.status,
    createdAt: backendProperty.createdAt,
    updatedAt: backendProperty.updatedAt,

    ownerId: backendProperty.ownerId,
    propertyTypeId: backendProperty.propertyTypeId,

    owner: {
      ...backendProperty.owner,
      phone: '', // fallback
    },

    propertyType: backendProperty.propertyType,
    mapsUrl: backendProperty.mapsUrl,
  }
}

function getAuthHeaders(includeJsonContentType: boolean = false): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null

  return {
    accept: 'application/json',
    ...(includeJsonContentType ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function extractErrorMessage(payload: any, fallback: string): string {
  return payload?.message || payload?.error || fallback
}

export class FavoritesApiClient {
  static async getFavorites(page: number = 1, limit: number = 10): Promise<FavoritesResponse> {
    try {
      const url = createApiUrl(`properties/favorites?page=${page}&limit=${limit}`)

      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(false),
        cache: 'no-cache',
      })

      const data = await response.json().catch(() => ({} as any))

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}: ${extractErrorMessage(data, 'Failed to fetch favorites')}`,
        )
      }

      // Transform backend properties to frontend format
      const favorites = (data?.data?.favorites ?? []).map(transformProperty)

      return {
        ...data,
        data: {
          ...data.data,
          favorites,
        },
      } as FavoritesResponse
    } catch (error) {
      console.error('Error fetching favorites:', error)
      throw error instanceof Error ? error : new Error('Network error occurred')
    }
  }

  static async addToFavorites(propertyId: string): Promise<{
    success: boolean
    message: string
    data: {
      action: string
      isFavorited: boolean
      favoriteCount: number
    }
  }> {
    try {
      const url = createApiUrl(`properties/${propertyId}/favorite`)

      const response = await fetch(url, {
        method: 'POST',
        headers: getAuthHeaders(true),
        // backend toggles; no body needed, but some servers dislike undefined
        body: JSON.stringify({}),
      })

      const data = await response.json().catch(() => ({} as any))

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}: ${extractErrorMessage(data, 'Failed to toggle favorite')}`,
        )
      }

      return data
    } catch (error) {
      console.error('Error toggling favorite:', error)
      throw error instanceof Error ? error : new Error('Network error occurred')
    }
  }

  static async removeFromFavorites(propertyId: string): Promise<{
    success: boolean
    message: string
    data: {
      action: string
      isFavorited: boolean
      favoriteCount: number
    }
  }> {
    // backend uses toggle on same endpoint
    return this.addToFavorites(propertyId)
  }

  static async toggleFavorite(propertyId: string): Promise<{
    success: boolean
    message: string
    data: {
      action: string
      isFavorited: boolean
      favoriteCount: number
    }
  }> {
    return this.addToFavorites(propertyId)
  }
}
