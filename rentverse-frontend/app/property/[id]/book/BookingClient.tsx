'use client'

import Image from 'next/image'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import ContentWrapper from '@/components/ContentWrapper'
import ButtonCircle from '@/components/ButtonCircle'
import { ArrowLeft, Plus, Minus } from 'lucide-react'
import { PropertiesApiClient } from '@/utils/propertiesApiClient'
import { Property } from '@/types/property'
import useAuthStore from '@/stores/authStore'
import { debugAuthState } from '@/utils/debugAuth'

export default function BookingClient({ propertyId }: { propertyId: string }) {
  const router = useRouter()
  const { isLoggedIn } = useAuthStore()

  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [property, setProperty] = useState<Property | null>(null)
  const [isLoadingProperty, setIsLoadingProperty] = useState(true)

  // Form data state for booking
  const [formData, setFormData] = useState({
    checkIn: '',
    checkOut: '',
    numGuests: 1,
    message: '',
    totalAmount: 0,
  })

  // Duration counters
  const [startMonthCount, setStartMonthCount] = useState(0)
  const [durationMonths, setDurationMonths] = useState(1)

  const FALLBACK =
    'https://res.cloudinary.com/dqhuvu22u/image/upload/f_webp/v1758016984/rentverse-rooms/Gemini_Generated_Image_5hdui35hdui35hdu_s34nx6.png'

  const getSafeImage = (p: Property | null) => {
    const raw = p?.images as unknown

    const extractUrls = (val: unknown): string[] => {
      if (!val) return []
      if (Array.isArray(val)) return val.flatMap(extractUrls)

      const s = String(val)

      try {
        const parsed = JSON.parse(s)
        if (Array.isArray(parsed)) return parsed.flatMap(extractUrls)
      } catch {}

      return s
        .split(/[,\s|]+/g)
        .map((x) => x.trim())
        .filter((x) => /^https?:\/\//i.test(x))
    }

    const list = extractUrls(raw)
    return list[0] || FALLBACK
  }

  // Helper function to get property price as number
  const getPropertyPrice = useCallback(() => {
    if (!property) return 0
    return typeof property.price === 'string'
      ? parseFloat(property.price)
      : property.price
  }, [property])

  // Update actual dates based on month counters
  const updateDatesFromCounters = useCallback(
    (startMonth: number, duration: number) => {
      const currentDate = new Date()

      let startDate: Date
      if (startMonth === 0) {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        startDate = tomorrow
      } else {
        startDate = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() + startMonth,
          1
        )
      }

      const endDate = new Date(
        startDate.getFullYear(),
        startDate.getMonth() + duration,
        0
      )

      const monthlyPrice = getPropertyPrice()
      const totalAmount = monthlyPrice * duration

      setFormData((prev) => ({
        ...prev,
        checkIn: startDate.toISOString().split('T')[0],
        checkOut: endDate.toISOString().split('T')[0],
        totalAmount: totalAmount,
      }))
    },
    [getPropertyPrice]
  )

  const incrementStartMonth = () => {
    setStartMonthCount((prev) => prev + 1)
    updateDatesFromCounters(startMonthCount + 1, durationMonths)
  }

  const decrementStartMonth = () => {
    if (startMonthCount > 0) {
      setStartMonthCount((prev) => prev - 1)
      updateDatesFromCounters(startMonthCount - 1, durationMonths)
    }
  }

  const incrementDuration = () => {
    setDurationMonths((prev) => prev + 1)
    updateDatesFromCounters(startMonthCount, durationMonths + 1)
  }

  const decrementDuration = () => {
    if (durationMonths > 1) {
      setDurationMonths((prev) => prev - 1)
      updateDatesFromCounters(startMonthCount, durationMonths - 1)
    }
  }

  const getStartMonthText = () => {
    const currentDate = new Date()
    const targetDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + startMonthCount,
      1
    )
    return targetDate.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    })
  }

  const getDurationText = () => {
    return durationMonths === 1 ? '1 month' : `${durationMonths} months`
  }

  // Fetch property data
  useEffect(() => {
    const fetchProperty = async () => {
      if (!propertyId) return

      try {
        setIsLoadingProperty(true)

        console.log('[PROPERTY] Fetching property with ID:', propertyId)
        const viewResponse = await PropertiesApiClient.logPropertyView(propertyId)

        if (viewResponse.success && viewResponse.data.property) {
          const backendProperty = viewResponse.data.property
          setProperty(backendProperty)

          const price =
            typeof backendProperty.price === 'string'
              ? parseFloat(backendProperty.price)
              : backendProperty.price

          setFormData((prev) => ({ ...prev, totalAmount: price || 0 }))
        } else {
          setSubmitError('Failed to load property details')
          setProperty(null)
        }
      } catch (error) {
        console.error('Error fetching property:', error)
        setSubmitError('Failed to load property details. Please try again.')
        setProperty(null)
      } finally {
        setIsLoadingProperty(false)
      }
    }

    if (propertyId && propertyId !== 'undefined' && propertyId !== 'null') {
      fetchProperty()
    } else {
      setSubmitError('Property ID not found in URL')
      setIsLoadingProperty(false)
    }
  }, [propertyId])

  // Initialize dates on component mount
  useEffect(() => {
    const currentDate = new Date()
    const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0)

    setFormData((prev) => ({
      ...prev,
      checkIn: startDate.toISOString().split('T')[0],
      checkOut: endDate.toISOString().split('T')[0],
      totalAmount: 0,
    }))
  }, [])

  // Update total amount when property loads or duration changes
  useEffect(() => {
    if (property) {
      updateDatesFromCounters(startMonthCount, durationMonths)
    }
  }, [property, startMonthCount, durationMonths, updateDatesFromCounters])

  const getSubmitButtonText = () => {
    if (isSubmitting) return 'Submitting...'
    if (!isLoggedIn) return 'Login Required'
    return 'Submit Booking'
  }

  const handleBack = () => router.back()

  const handleNext = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1)
  }

  const handlePrevious = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  const handleSubmitBooking = async () => {
    if (!formData.checkIn || !formData.checkOut) {
      setSubmitError('Please select booking dates')
      return
    }

    setIsSubmitting(true)
    setSubmitError('')

    try {
      console.log('[BOOKING] Starting booking submission...')
      const authStore = useAuthStore.getState()
      debugAuthState()

      if (!authStore.isLoggedIn) {
        setSubmitError('Please log in to make a booking')
        router.push('/auth/login')
        return
      }

      const token = localStorage.getItem('authToken')
      if (!token) {
        setSubmitError('Authentication token not found. Please log in again.')
        router.push('/auth/login')
        return
      }

      // Validate token
      const authTestResponse = await fetch('/api/auth/me', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      if (!authTestResponse.ok) {
        setSubmitError('Token validation failed. Please log in again.')
        router.push('/auth/login')
        return
      }

      const bookingData = {
        propertyId,
        startDate: new Date(formData.checkIn + 'T12:00:00.000Z').toISOString(),
        endDate: new Date(formData.checkOut + 'T23:59:59.000Z').toISOString(),
        rentAmount: formData.totalAmount || 0,
        securityDeposit: 0,
        notes: formData.message || '',
      }

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bookingData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Booking failed: ${response.status}`)
      }

      const result = await response.json()

      if (result && (result.id || result.success)) {
        setCurrentStep(4)
        setTimeout(() => router.push('/rents'), 2000)
      } else {
        setSubmitError('Failed to create booking - no confirmation received')
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      setSubmitError(`Failed to submit booking: ${errorMessage}`)
      if (errorMessage.includes('401')) setTimeout(() => router.push('/auth/login'), 3000)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoadingProperty) {
    return (
      <ContentWrapper>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="text-lg text-slate-600">Loading property details...</div>
          </div>
        </div>
      </ContentWrapper>
    )
  }

  if (submitError && !property) {
    return (
      <ContentWrapper>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="text-lg text-red-600">{submitError}</div>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </ContentWrapper>
    )
  }

  if (!property && !isLoadingProperty) {
    return (
      <ContentWrapper>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="text-lg text-red-600">Property not found</div>
            <button
              onClick={() => router.push('/property')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Browse Properties
            </button>
          </div>
        </div>
      </ContentWrapper>
    )
  }

  return (
    <ContentWrapper>
      <div className="flex items-center space-x-3 mb-8">
        <ButtonCircle icon={<ArrowLeft />} onClick={handleBack} />
        <h1 className="text-2xl font-sans font-medium text-slate-900">Request to book</h1>
      </div>

      {!isLoggedIn && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-xl">
          <p className="font-medium">Authentication Required</p>
          <p className="text-sm">You need to log in to make a booking. Please sign in to continue.</p>
        </div>
      )}

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left side */}
        <div className="space-y-8">
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <span className="text-lg font-semibold text-slate-900">1.</span>
                <h2 className="text-lg font-semibold text-slate-900">Add payment method</h2>
              </div>

              <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-6 bg-blue-600 rounded text-white text-xs font-bold flex items-center justify-center">
                    VISA
                  </div>
                  <span className="text-slate-600">Visa credit card</span>
                </div>
                <button className="text-teal-600 font-medium text-sm hover:text-teal-700 transition-colors">
                  Change
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleNext}
                  className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-xl transition-colors duration-200"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <span className="text-lg font-semibold text-slate-900">2.</span>
                <h2 className="text-lg font-semibold text-slate-900">Booking details</h2>
              </div>

              <div className="space-y-4">
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-700">Start Month</label>
                  <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                    <div className="text-left">
                      <div className="font-medium text-slate-900">{getStartMonthText()}</div>
                      <div className="text-sm text-slate-500">Starting month for rental</div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={decrementStartMonth}
                        className="w-8 h-8 flex items-center justify-center border border-slate-300 rounded-full hover:border-slate-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={startMonthCount === 0}
                      >
                        <Minus size={16} className="text-slate-600" />
                      </button>
                      <span className="w-8 text-center font-medium text-slate-900">{startMonthCount}</span>
                      <button
                        onClick={incrementStartMonth}
                        className="w-8 h-8 flex items-center justify-center border border-slate-300 rounded-full hover:border-slate-400 transition-colors"
                      >
                        <Plus size={16} className="text-slate-600" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-700">Duration</label>
                  <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                    <div className="text-left">
                      <div className="font-medium text-slate-900">{getDurationText()}</div>
                      <div className="text-sm text-slate-500">Rental duration</div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={decrementDuration}
                        className="w-8 h-8 flex items-center justify-center border border-slate-300 rounded-full hover:border-slate-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={durationMonths === 1}
                      >
                        <Minus size={16} className="text-slate-600" />
                      </button>
                      <span className="w-8 text-center font-medium text-slate-900">{durationMonths}</span>
                      <button
                        onClick={incrementDuration}
                        className="w-8 h-8 flex items-center justify-center border border-slate-300 rounded-full hover:border-slate-400 transition-colors"
                      >
                        <Plus size={16} className="text-slate-600" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 p-3 bg-slate-50 rounded-lg">
                  <div className="text-sm font-medium text-slate-700">Calculated Dates:</div>
                  <div className="text-sm text-slate-600">
                    Check-in: {formData.checkIn ? new Date(formData.checkIn).toLocaleDateString() : 'Not set'}
                  </div>
                  <div className="text-sm text-slate-600">
                    Check-out: {formData.checkOut ? new Date(formData.checkOut).toLocaleDateString() : 'Not set'}
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={handlePrevious}
                  className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-xl transition-colors duration-200"
                >
                  Previous
                </button>
                <button
                  onClick={handleNext}
                  className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-xl transition-colors duration-200"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <span className="text-lg font-semibold text-slate-900">3.</span>
                <h2 className="text-lg font-semibold text-slate-900">Write a message to the host</h2>
              </div>

              <p className="text-slate-600 text-sm">
                Let your host know a little about your visit and why their place is a good fit for you.
              </p>

              <div className="space-y-4">
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
                  placeholder="Tell your message in here"
                  className="w-full h-32 px-4 py-3 border border-slate-200 rounded-xl bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                />

                <div className="flex justify-between">
                  <button
                    onClick={handlePrevious}
                    className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-xl transition-colors duration-200"
                  >
                    Previous
                  </button>
                  <button
                    onClick={handleNext}
                    className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-xl transition-colors duration-200"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <span className="text-lg font-semibold text-slate-900">4.</span>
                <h2 className="text-lg font-semibold text-slate-900">Review your request</h2>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl space-y-4">
                <div>
                  <p className="text-sm text-slate-600 mb-2">Payment Method:</p>
                  <p className="text-slate-900 font-medium">VISA credit card</p>
                </div>

                <div>
                  <p className="text-sm text-slate-600 mb-2">Booking Details:</p>
                  <div className="space-y-1">
                    <p className="text-slate-900">
                      Check-in: {formData.checkIn ? new Date(formData.checkIn).toLocaleDateString() : 'Not selected'}
                    </p>
                    <p className="text-slate-900">
                      Check-out: {formData.checkOut ? new Date(formData.checkOut).toLocaleDateString() : 'Not selected'}
                    </p>
                    <p className="text-slate-900">Duration: {getDurationText()}</p>
                    <p className="text-slate-900">Total: RM {formData.totalAmount}</p>
                  </div>
                </div>

                {formData.message && (
                  <div>
                    <p className="text-sm text-slate-600 mb-2">Message to Host:</p>
                    <p className="text-slate-900">{formData.message}</p>
                  </div>
                )}
              </div>

              {submitError && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl">{submitError}</div>
              )}

              <div className="flex justify-between">
                <button
                  onClick={handlePrevious}
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-xl transition-colors duration-200 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={handleSubmitBooking}
                  disabled={isSubmitting || !isLoggedIn}
                  className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-xl transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {getSubmitButtonText()}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right side */}
        <div className="lg:sticky lg:top-8 lg:self-start">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="space-y-6">
              <div className="relative w-full h-48 rounded-xl overflow-hidden">
                {property ? (
                  (() => {
                    const imgSrc = getSafeImage(property)
                    const isFazwaz = imgSrc.includes('cdn.fazwaz.com')

                    return (
                      <Image
                        src={imgSrc}
                        alt={property.title || `Property ${property.id} image`}
                        fill
                        className="object-cover"
                        unoptimized={isFazwaz}
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                    )
                  })()
                ) : (
                  <div className="w-full h-full bg-slate-200 animate-pulse rounded-xl flex items-center justify-center">
                    <span className="text-slate-400 text-sm">Loading image...</span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <p className="text-sm text-slate-500">
                  {property
                    ? `${property.address}, ${property.city}, ${property.state}, ${property.country}`
                    : 'Loading location...'}
                </p>
                <h3 className="text-lg font-semibold text-slate-900">{property?.title || 'Loading property...'}</h3>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Dates</span>
                  <button className="text-teal-600 font-medium text-sm hover:text-teal-700 transition-colors">
                    Change
                  </button>
                </div>
                <p className="text-sm text-slate-600">
                  {formData.checkIn && formData.checkOut
                    ? `${new Date(formData.checkIn).toLocaleDateString()} - ${new Date(
                        formData.checkOut
                      ).toLocaleDateString()}`
                    : 'Select dates in the form'}
                </p>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-200">
                <h4 className="text-sm font-medium text-slate-700">Price details</h4>

                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Monthly rent</span>
                  <span className="text-slate-900">RM {getPropertyPrice()}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Duration</span>
                  <span className="text-slate-900">{getDurationText()}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">
                    Subtotal (RM {getPropertyPrice()} × {durationMonths})
                  </span>
                  <span className="text-slate-900">RM {getPropertyPrice() * durationMonths}</span>
                </div>

                <div className="flex justify-between text-sm font-medium border-t border-slate-200 pt-3">
                  <span className="text-slate-900">Total</span>
                  <span className="text-slate-900">RM {formData.totalAmount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ContentWrapper>
  )
}
