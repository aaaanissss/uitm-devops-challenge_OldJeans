'use client'

import React, { useRef, useState } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { X, Loader2 } from 'lucide-react' // Assuming you have lucide-react installed

interface SignatureModalProps {
  isOpen: boolean
  onClose: () => void
  bookingId: string
  onSuccess: () => void
}

const SignatureModal = ({
  isOpen,
  onClose,
  bookingId,
  onSuccess,
}: SignatureModalProps) => {
  const sigCanvas = useRef<SignatureCanvas>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const clear = () => sigCanvas.current?.clear()

  const handleSubmit = async () => {
    // 1. Safety Check: Ensure bookingId exists
    if (!bookingId) {
      setError('Booking ID is missing')
      return
    }

    // 2. Check if signature canvas ref exists
    if (!sigCanvas.current) {
      setError('Signature canvas not ready')
      return
    }

    // 3. Check if signature is empty
    if (sigCanvas.current.isEmpty()) {
      setError('Please draw your signature first')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Get Base64 Image - use toDataURL directly on the canvas to avoid getTrimmedCanvas issues
      let signatureData: string
      try {
        // Try getTrimmedCanvas first (preferred, gives cropped result)
        const trimmedCanvas = sigCanvas.current.getTrimmedCanvas()
        signatureData = trimmedCanvas.toDataURL('image/png')
      } catch {
        // Fallback to regular toDataURL if getTrimmedCanvas fails
        signatureData = sigCanvas.current.toDataURL('image/png')
      }

      const token = localStorage.getItem('authToken')

      // Call the local Next.js API route instead of the backend directly
      const response = await fetch(`/api/bookings/${bookingId}/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ signatureData }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to sign agreement')
      }

      alert('Agreement Signed Successfully!')
      onSuccess()
      onClose()
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-bold text-gray-800">
            Sign Rental Agreement
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        {/* Canvas Area */}
        <div className="p-4 bg-gray-50">
          <p className="text-sm text-gray-500 mb-2">
            Draw your signature below:
          </p>
          <div className="border-2 border-dashed border-gray-300 rounded-lg bg-white">
            <SignatureCanvas
              ref={sigCanvas}
              penColor="black"
              canvasProps={{
                width: 400,
                height: 200,
                className: 'signature-canvas mx-auto cursor-crosshair',
              }}
            />
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t flex justify-end gap-3 bg-white">
          <button
            onClick={clear}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 underline"
            disabled={loading}
          >
            Clear
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <Loader2 className="animate-spin" size={16} />}
            {loading ? 'Signing...' : 'Confirm Signature'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default SignatureModal
