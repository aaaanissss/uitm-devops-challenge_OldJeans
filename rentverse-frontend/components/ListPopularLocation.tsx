'use client'

import CardPopularLocation from '@/components/CardPopularLocation'
import { getPopularLocations } from '@/data/popular-locations'
import { FreeMode } from 'swiper/modules'
import { Swiper, SwiperSlide } from 'swiper/react'

function ListPopularLocation() {
  const locations = getPopularLocations()

  return (
    <div className="py-8 px-4 md:px-16">
      <div className="mb-12">
        <h2 className="text-center font-serif text-3xl text-teal-900 mb-4">
          Explore Popular Locations
        </h2>
      </div>

      {/* ✅ Mobile: show all cards (no swipe) */}
      <div className="grid grid-cols-2 gap-4 md:hidden">
        {locations.map((location) => (
          <CardPopularLocation key={location.name} location={location} />
        ))}
      </div>

      {/* ✅ md+ : keep swiper */}
      <div className="hidden md:block">
        <Swiper
          modules={[FreeMode]}
          spaceBetween={32}
          freeMode
          grabCursor
          breakpoints={{
            768: { slidesPerView: 3, spaceBetween: 24 },
            1024: { slidesPerView: 4, spaceBetween: 32 },
            1280: { slidesPerView: 6, spaceBetween: 32 },
          }}
        >
          {locations.map((location) => (
            <SwiperSlide key={location.name}>
              <CardPopularLocation location={location} />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  )
}

export default ListPopularLocation
