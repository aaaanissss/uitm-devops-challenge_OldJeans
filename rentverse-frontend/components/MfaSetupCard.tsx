'use client'

import { useState } from 'react'
import Image from 'next/image'
import ButtonFilled from '@/components/ButtonFilled'
import BoxError from '@/components/BoxError'
import { AuthApiClient } from '@/utils/authApiClient'

export default function MfaSetupCard() {
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleStartSetup = async () => {
    try {
      setIsLoading(true)
      setError(null)
      setSuccessMessage(null)

      const data = await AuthApiClient.setupMfa()
      setQrCode(data.qrCode)
      setSecret(data.secret)
    } catch (e: any) {
      setError(e.message || 'Failed to start MFA setup')
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (code.length !== 6) {
      setError('Please enter the 6-digit code')
      return
    }

    try {
      setIsConfirming(true)
      setError(null)

      await AuthApiClient.confirmMfa(code)
      setSuccessMessage('MFA enabled successfully for your account.')
    } catch (e: any) {
      setError(e.message || 'Failed to verify MFA code')
    } finally {
      setIsConfirming(false)
    }
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-xl w-full">
      <h2 className="text-lg font-semibold text-slate-900 mb-2">
        Two-Factor Authentication (MFA)
      </h2>
      <p className="text-sm text-slate-600 mb-4">
        Add an extra layer of security to your RentVerse account by requiring a
        one-time code from an authenticator app when you log in.
      </p>

      {error && (
        <div className="mb-4">
          <BoxError errorTitle="Something went wrong" errorDescription={error} />
        </div>
      )}

      {successMessage && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {successMessage}
        </div>
      )}

      {!qrCode ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-700">
            You&apos;ll need an authenticator app (Google Authenticator, Authy,
            1Password, etc.) to set this up.
          </p>
          <ButtonFilled onClick={handleStartSetup} disabled={isLoading}>
            {isLoading ? 'Generating QR code…' : 'Enable MFA'}
          </ButtonFilled>
        </div>
      ) : (
        <>
          <div className="flex flex-col md:flex-row gap-4 mt-4">
            <div className="flex-1 flex flex-col items-center">
              <p className="text-sm text-slate-700 mb-2">
                1. Scan this QR code with your authenticator app.
              </p>
              {/* qrCode is a data:image/png;base64 URL */}
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrCode} alt="MFA QR Code" className="w-40 h-40" />
              </div>
              {secret && (
                <p className="mt-2 text-xs text-slate-500 text-center break-all">
                  Or enter this key manually: <span className="font-mono">{secret}</span>
                </p>
              )}
            </div>

            <form onSubmit={handleConfirm} className="flex-1 space-y-4">
              <p className="text-sm text-slate-700">
                2. Enter the 6-digit code from your authenticator app to confirm
                setup.
              </p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-center text-lg tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="••••••"
                required
              />
              <ButtonFilled
                type="submit"
                disabled={code.length !== 6 || isConfirming}
              >
                {isConfirming ? 'Verifying…' : 'Confirm & Enable MFA'}
              </ButtonFilled>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
