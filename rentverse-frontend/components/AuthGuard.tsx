'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import useAuthStore from '@/stores/authStore'

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  redirectTo?: string
}

/**
 * AuthGuard component to handle client-side authentication redirects
 * - For auth pages (login/signup): redirects authenticated users away
 * - For protected pages: redirects unauthenticated users to login
 */
export default function AuthGuard({ 
  children, 
  requireAuth = true, 
  redirectTo = '/auth/login' 
}: AuthGuardProps) {
  const { isLoggedIn, initializeAuth } = useAuthStore()
  const router = useRouter()
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Initialize auth from localStorage
    initializeAuth()
    
    // Give it time to restore state
    const timer = setTimeout(() => {
      setIsReady(true)
    }, 100)

    return () => clearTimeout(timer)
  }, [initializeAuth])

  useEffect(() => {
    if (!isReady) return

    console.log('[AuthGuard] isLoggedIn:', isLoggedIn, 'requireAuth:', requireAuth)

    if (requireAuth && !isLoggedIn) {
      console.log('[AuthGuard] Redirecting to:', redirectTo)
      router.push(redirectTo)
    }
  }, [isReady, isLoggedIn, requireAuth, redirectTo, router])

  if (!isReady) {
    return <div>Loading...</div> // Show loading while initializing
  }

  if (requireAuth && !isLoggedIn) {
    return null // Don't render children while redirecting
  }

  return <>{children}</>
}