'use client'

import Image from 'next/image'
import ContentWrapper from '@/components/ContentWrapper'
//import SearchBoxProperty from '@/components/SearchBoxProperty'
import ListFeatured from '@/components/ListFeatured'
import ListPopularLocation from '@/components/ListPopularLocation'
import SearchBoxPropertyResponsive from '@/components/SearchBoxPropertyResponsive'

export default function Home() {
  return (
    <div className="pb-24 md:pb-0">
      {/* pb-24 prevents bottom mobile navbar from covering content */}
      <ContentWrapper>
        {/* Hero Section */}
        <section className="relative flex justify-center min-h-[520px] md:min-h-[600px]">
          {/* Background Image */}
          <div className="absolute inset-0 z-0">
            {/* Desktop */}
            <Image
              width={1440}
              height={600}
              alt="Hero Background"
              className="hidden md:block w-full h-full object-cover object-top"
              src="https://res.cloudinary.com/dqhuvu22u/image/upload/f_webp/v1758183708/rentverse-base/hero_bg_desktop_z8j6pg.png"
              priority
            />
            {/* Mobile */}
            <Image
              width={768}
              height={900}
              alt="Hero Background"
              className="md:hidden w-full h-full object-cover object-top"
              src="https://res.cloudinary.com/dqhuvu22u/image/upload/f_webp/v1758183708/rentverse-base/hero_bg_mobile_s4xpxr.png"
              priority
            />
          </div>

          {/* Content Overlay */}
          <div className="relative z-10 w-full max-w-4xl mx-auto px-4 pt-10 md:pt-16 text-center">
            <h1 className="mx-auto font-serif text-3xl md:text-5xl lg:text-6xl text-teal-900 mb-3 md:mb-4 max-w-2xl leading-snug">
              The right home is waiting for you
            </h1>

            <p className="text-base md:text-xl text-teal-700 mb-6 md:mb-8 mx-auto max-w-lg">
              Explore thousands of apartments, condominiums, and houses for rent across the country.
            </p>

            {/* Keep search box from feeling too wide on mobile */}
            <div className="mx-auto w-full max-w-xl">
              <SearchBoxPropertyResponsive />
            </div>

            {/* ✅ Hide this big preview image on mobile */}
            <Image
              src="https://res.cloudinary.com/dqhuvu22u/image/upload/f_webp/v1758186240/rentverse-base/sample-dashboard_h7ez5z.png"
              alt="Search Results Sample on Rentverse"
              width={1080}
              height={720}
              className="hidden md:block my-16 rounded-lg shadow-lg w-full h-auto"
            />
          </div>
        </section>
        {/* Trusted Section */}
        <section className="py-16 bg-slate-50">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-serif text-slate-800 text-center mb-12">
              Trusted by Thousands of Tenants and Property Owners
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center">
              <div className="flex items-center text-start gap-x-4">
                <Image
                  src="https://res.cloudinary.com/dqhuvu22u/image/upload/f_webp/v1758187013/rentverse-base/icon-key-property_nkanqy.png"
                  width={48}
                  height={48}
                  alt="Property Owners Icon"
                  className="w-12 h-12"
                />
                <div className="flex flex-col">
                  <span className="text-2xl md:text-3xl font-bold text-slate-800 mb-1">10,000+</span>
                  <p className="text-sm md:text-base text-slate-600">Listed properties</p>
                </div>
              </div>

              <div className="flex items-center text-start gap-x-4">
                <Image
                  src="https://res.cloudinary.com/dqhuvu22u/image/upload/f_webp/v1758187014/rentverse-base/icon-location_yzbsol.png"
                  width={48}
                  height={48}
                  alt="Location Icon"
                  className="w-12 h-12"
                />
                <div className="flex flex-col">
                  <span className="text-2xl md:text-3xl font-bold text-slate-800 mb-1">200+</span>
                  <p className="text-sm md:text-base text-slate-600">Strategic locations</p>
                </div>
              </div>

              <div className="flex items-center text-start gap-x-4">
                <Image
                  src="https://res.cloudinary.com/dqhuvu22u/image/upload/f_webp/v1758187014/rentverse-base/icon-rating_nazm4g.png"
                  width={48}
                  height={48}
                  alt="Rating Icon"
                  className="w-12 h-12"
                />
                <div className="flex flex-col">
                  <span className="text-2xl md:text-3xl font-bold text-slate-800 mb-1">98%</span>
                  <p className="text-sm md:text-base text-slate-600">User satisfaction rate</p>
                </div>
              </div>
              <div className="flex items-center text-start gap-x-4">
                <Image
                  src="https://res.cloudinary.com/dqhuvu22u/image/upload/f_webp/v1758187014/rentverse-base/icon-check_poswwx.png"
                  width={48}
                  height={48}
                  alt="Badge Icon"
                  className="w-12 h-12"
                />
                <div className="flex flex-col">
                  <span className="text-2xl md:text-3xl font-bold text-slate-800 mb-1">5,000+</span>
                  <p className="text-sm md:text-base text-slate-600">Verified users</p>
                </div>
              </div>
            </div>
          </div>
        </section>
        <ListFeatured />
        <ListPopularLocation />
      </ContentWrapper>
    </div>
  )
}
