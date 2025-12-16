'use client'

import SearchBoxProperty from '@/components/SearchBoxProperty'
import SearchBoxPropertyMini from '@/components/SearchBoxPropertyMini'

export default function SearchBoxPropertyResponsive() {
  return (
    <>
      <div className="hidden md:block">
        <SearchBoxProperty />
      </div>
      <div className="md:hidden">
        <SearchBoxPropertyMini />
      </div>
    </>
  )
}
