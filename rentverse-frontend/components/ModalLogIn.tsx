'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'
import React, { ChangeEvent, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import BoxError from '@/components/BoxError'
import InputPassword from '@/components/InputPassword'
import ButtonFilled from '@/components/ButtonFilled'
import useAuthStore from '@/stores/authStore'

interface ModalLogInProps {
  isModal?: boolean
}

function ModalLogIn({ isModal = true }: ModalLogInProps) {
  const {
    password,
    isLoading,
    error,
    mfaRequired,
    isVerifyingMfa,
    setPassword,
    isLoginFormValid,
    submitLogIn,
    submitMfaVerify,
  } = useAuthStore()

  const router = useRouter()
  const [mfaCode, setMfaCode] = useState('')

  const handleBackButton = () => {
    router.back()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (mfaRequired) {
      // Step 2 – verify the 6-digit MFA code
      await submitMfaVerify(mfaCode)
    } else {
      // Step 1 – normal password login
      await submitLogIn()
    }
  }

  const containerContent = (
    <div className={clsx([
      isModal ? 'shadow-xl' : 'border border-slate-400',
      'bg-white rounded-3xl max-w-md w-full p-8',
    ])}>
      {/* Header */}
      <div className="text-center mb-6 relative">
        <ArrowLeft onClick={handleBackButton} size={20}
                   className="absolute left-0 top-1 text-slate-800 cursor-pointer hover:text-slate-600" />
        <h2 className="text-xl font-semibold text-slate-900 mb-2">
          {mfaRequired ? 'Two-Factor Authentication' : 'Log in'}
        </h2>
        <div className="w-full h-px bg-slate-200 mt-4"></div>
      </div>

      {/* Content */}
      <div className="mb-8">
        {/* Alert box - only show when there's an error */}
        {error && (
          <div className="mb-6">
            <BoxError errorTitle={'Let\'s try that again'} errorDescription={error} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {!mfaRequired ? (
            <>
              {/* Step 1: Password Section */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-slate-900 mb-3"
                >
                  Password
                </label>
                <InputPassword
                  value={password}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setPassword(e.target.value)
                  }
                  placeholder="Password"
                  required
                  showStrengthIndicator={false}
                />
              </div>

              {/* Submit Button */}
              <ButtonFilled
                type="submit"
                disabled={!isLoginFormValid() || isLoading}
              >
                {isLoading ? 'Loading...' : 'Log in'}
              </ButtonFilled>

              <div className="text-center">
                <Link
                  href="/"
                  className={
                    'underline text-slate-700 text-sm hover:text-slate-900 transition-colors'
                  }
                >
                  Forgot password?
                </Link>
              </div>
            </>
          ) : (
            <>
              {/* Step 2: MFA Code Section */}
              <div>
                <p className="text-sm text-slate-700 mb-3 text-center">
                  Enter the 6-digit code from your authenticator app to finish
                  logging in.
                </p>
                <label
                  htmlFor="mfaCode"
                  className="block text-sm font-medium text-slate-900 mb-3"
                >
                  Authentication code
                </label>
                <input
                  id="mfaCode"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) =>
                    setMfaCode(e.target.value.replace(/\D/g, ''))
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-center text-lg tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="••••••"
                  required
                />
              </div>

              <ButtonFilled
                type="submit"
                disabled={mfaCode.length !== 6 || isVerifyingMfa || isLoading}
              >
                {isVerifyingMfa || isLoading ? 'Verifying…' : 'Verify code'}
              </ButtonFilled>

              <p className="text-xs text-center text-slate-500">
                Code not working? You can close this window and sign in again to
                restart the login process.
              </p>
            </>
          )}
        </form>
      </div>
    </div>
  )

  if (isModal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        {containerContent}
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center p-4">
      {containerContent}
    </div>
  )
}

export default ModalLogIn