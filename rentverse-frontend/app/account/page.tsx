'use client'

import ContentWrapper from '@/components/ContentWrapper'
import AuthGuard from '@/components/AuthGuard'
import MfaSetupCard from '@/components/MfaSetupCard'
import useAuthStore from '@/stores/authStore'

export default function SecurityPage() {
  const user = useAuthStore((s) => s.user)

  return (
    <AuthGuard requireAuth={true} redirectTo="/auth">
      <ContentWrapper>
        <div className="py-8 flex justify-center">
          <MfaSetupCard mfaEnabled={user?.mfaEnabled} />
        </div>
      </ContentWrapper>
    </AuthGuard>
  )
}
