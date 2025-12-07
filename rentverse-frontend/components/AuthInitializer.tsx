'use client'

import { useEffect } from 'react'
import useAuthStore from '@/stores/authStore'

export default function AuthInitializer() {
  const initializeAuth = useAuthStore((s) => s.initializeAuth)

  useEffect(() => {
    console.log('[AuthInitializer] Initializing auth...')
    initializeAuth()
  }, [initializeAuth])

  return null
}