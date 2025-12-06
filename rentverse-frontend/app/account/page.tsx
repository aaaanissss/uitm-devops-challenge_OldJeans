import ContentWrapper from '@/components/ContentWrapper'
import AuthGuard from '@/components/AuthGuard'
import MfaSetupCard from '@/components/MfaSetupCard'

export default function SecurityPage() {
  return (
    <AuthGuard requireAuth={true} redirectTo="/auth">
      <ContentWrapper>
        <div className="py-8 flex justify-center">
          <MfaSetupCard />
        </div>
      </ContentWrapper>
    </AuthGuard>
  )
}
