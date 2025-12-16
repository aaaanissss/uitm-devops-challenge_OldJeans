'use client'

import clsx from 'clsx'
import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import TextAction from '@/components/TextAction'
import SignUpButton from '@/components/SignUpButton'
import Avatar from '@/components/Avatar'
import UserDropdown from '@/components/UserDropdown'
import LanguageSelector from '@/components/LanguageSelector'
import SearchBoxProperty from '@/components/SearchBoxProperty'
import SearchBoxPropertyMini from '@/components/SearchBoxPropertyMini'
import useCurrentUser from '@/hooks/useCurrentUser'
import { usePropertyListingStore } from '@/stores/propertyListingStore'

import type { SearchBoxType } from '@/types/searchbox'
import ButtonSecondary from '@/components/ButtonSecondary'

interface NavBarTopProps {
  searchBoxType?: SearchBoxType
  isQuestionnaire?: boolean
}

function NavBarTop({
  searchBoxType = 'none',
  isQuestionnaire = false,
}: Readonly<NavBarTopProps>): React.ReactNode {
  const { user, isAuthenticated } = useCurrentUser()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const router = useRouter()
  const { clearTemporaryData, isDirty } = usePropertyListingStore()

  const toggleDropdown = () => setIsDropdownOpen((v) => !v)
  const closeDropdown = () => setIsDropdownOpen(false)

  const handleExit = () => {
    if (isDirty) {
      const confirmExit = window.confirm(
        'You have unsaved changes. Are you sure you want to exit? This will delete all your progress.'
      )
      if (confirmExit) {
        clearTemporaryData()
        router.push('/')
      }
    } else {
      router.push('/')
    }
  }

  const showCompactSearch = searchBoxType === 'compact' && !isQuestionnaire
  const showFullSearch = searchBoxType === 'full' && !isQuestionnaire

  return (
    <div
      className={clsx([
        'w-full fixed z-50',
        'px-6 py-4 bg-white top-0 list-none border-b border-slate-200',
      ])}
    >
      {/* Top row */}
      <div className={clsx(['w-full flex items-center justify-between relative'])}>
        <Link href="/">
          <Image
            src="https://res.cloudinary.com/dqhuvu22u/image/upload/f_webp/v1758183655/rentverse-base/logo-nav_j8pl7d.png"
            alt="Logo Rentverse"
            width={150}
            height={48}
            className="w-[110px] sm:w-[150px] h-auto"
            priority
          />
        </Link>

        {/* Desktop: centered search (compact) */}
        {showCompactSearch && (
          <div className="hidden lg:block absolute left-1/2 -translate-x-1/2">
            <SearchBoxPropertyMini className="w-[520px] max-w-[70vw]" />
          </div>
        )}

        {!isQuestionnaire && (
          <nav className="hidden md:flex items-center space-x-8">
            <li>
              <TextAction href={'/property/new'} text={'List your property'} />
            </li>
            <li>
              <LanguageSelector />
            </li>
            <li className="relative">
              {isAuthenticated && user ? (
                <>
                  <Avatar
                    user={user}
                    onClick={toggleDropdown}
                    className="cursor-pointer"
                  />
                  <UserDropdown isOpen={isDropdownOpen} onClose={closeDropdown} />
                </>
              ) : (
                <SignUpButton />
              )}
            </li>
          </nav>
        )}

        {isQuestionnaire && (
          <ButtonSecondary label="Exit" onClick={handleExit} />
        )}
      </div>

      {/* Mobile: compact search goes BELOW the top row */}
      {showCompactSearch && (
        <div className="lg:hidden w-full mt-3">
          <SearchBoxPropertyMini className="w-full" />
        </div>
      )}

      {/* Full search (desktop only, below navbar) */}
      {showFullSearch && (
        <div className="mt-4 hidden lg:block">
          <SearchBoxProperty className="w-full" />
        </div>
      )}
    </div>
  )
}

export default NavBarTop
