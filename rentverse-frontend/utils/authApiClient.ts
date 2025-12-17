import type { RegisterRequest, AuthResponse } from '@/types/auth'
import { createApiUrl } from '@/utils/apiConfig'

/**
 * Authentication API client
 * NOTE: For Capacitor + Next static export, do NOT call '/api/...'
 * Always call the real backend URL via createApiUrl().
 */
export class AuthApiClient {
  /**
   * Register a new user
   */
  static async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await fetch(createApiUrl('auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      })

      const data = await response.json().catch(() => ({} as any))

      if (!response.ok) {
        throw new Error(data?.message || 'Registration failed')
      }

      return data as AuthResponse
    } catch (error) {
      console.error('Registration API error:', error)
      throw error instanceof Error ? error : new Error('Network error occurred')
    }
  }

  /**
   * Login user
   */
  static async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await fetch(createApiUrl('auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json().catch(() => ({} as any))

      if (!response.ok) {
        throw new Error(data?.message || 'Login failed')
      }

      return data as AuthResponse
    } catch (error) {
      console.error('Login API error:', error)
      throw error instanceof Error ? error : new Error('Network error occurred')
    }
  }

  /**
   * Check if email exists
   */
  static async checkEmail(
    email: string
  ): Promise<{ exists: boolean; isActive: boolean; role: string | null }> {
    try {
      const response = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json().catch(() => ({} as any))

      if (!response.ok) {
        throw new Error(data?.message || 'Email check failed')
      }

      // backend shape: { success, data: { exists, isActive, role } }
      return data.data
    } catch (error) {
      console.error('Email check API error:', error)
      throw error instanceof Error ? error : new Error('Network error occurred')
    }
  }

  /**
   * Get current user data
   */
  static async getCurrentUser(
    token: string
  ): Promise<AuthResponse['data']['user']> {
    try {
      const response = await fetch(createApiUrl('auth/me'), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json().catch(() => ({} as any))

      if (!response.ok) {
        throw new Error(data?.message || 'Failed to get user data')
      }

      return data.data
    } catch (error) {
      console.error('Get user API error:', error)
      throw error instanceof Error ? error : new Error('Network error occurred')
    }
  }

  // MFA Setup - initiate and confirm
  static async setupMfa() {
    if (typeof window === 'undefined') throw new Error('Not in browser')

    const token = localStorage.getItem('authToken')
    if (!token) throw new Error('Not authenticated')

    const res = await fetch(createApiUrl('auth/mfa/setup'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })

    const data = await res.json().catch(() => ({} as any))
    if (!res.ok || !data.success) {
      throw new Error(data?.message || 'Failed to start MFA setup')
    }

    return data.data as { qrCode: string; secret: string }
  }

  // Confirm MFA setup with code
  static async confirmMfa(code: string) {
    if (typeof window === 'undefined') throw new Error('Not in browser')

    const token = localStorage.getItem('authToken')
    if (!token) throw new Error('Not authenticated')

    const res = await fetch(createApiUrl('auth/mfa/confirm'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code }),
    })

    const data = await res.json().catch(() => ({} as any))
    if (!res.ok || !data.success) {
      throw new Error(data?.message || 'Failed to enable MFA')
    }

    return true
  }

  static async disableMfa() {
    const token = localStorage.getItem('authToken')
    if (!token) throw new Error('Not authenticated')

    const res = await fetch(createApiUrl('auth/mfa/disable'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })

    const data = await res.json().catch(() => ({} as any))
    if (!res.ok || !data.success) {
      throw new Error(data?.message || 'Failed to disable MFA')
    }

    return true
  }
}
