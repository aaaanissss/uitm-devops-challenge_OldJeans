'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import { Search, Heart, User } from 'lucide-react'

import useCurrentUser from '@/hooks/useCurrentUser'
import UserDropdown from '@/components/UserDropdown' // ✅ change path if yours is different

type NavItem = 'explore' | 'wishlists' | 'user'

function NavBarBottom() {
  const pathname = usePathname()
  const { user } = useCurrentUser()

  const [activeTab, setActiveTab] = useState<NavItem>('explore')
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  // Auto-highlight tab based on route (optional but feels nicer)
  useEffect(() => {
    if (pathname.startsWith('/wishlist')) setActiveTab('wishlists')
    else if (
      pathname.startsWith('/account') ||
      pathname.startsWith('/admin') ||
      pathname.startsWith('/property/all') ||
      pathname.startsWith('/landlord')
    )
      setActiveTab('user')
    else setActiveTab('explore')
  }, [pathname])

  const closeUserMenu = () => setIsUserMenuOpen(false)

  return (
    <>
      {/* Dropdown sheet for mobile bottom-nav */}
      <UserDropdown
        isOpen={isUserMenuOpen}
        onClose={closeUserMenu}
        // Override UserDropdown's mobile "top-[72px]" positioning to sit above bottom bar
        className={clsx([
          'md:hidden',
          'top-auto bottom-[72px]', // 👈 sits above the bottom navbar
          'max-h-[calc(100vh-72px)]',
        ])}
      />

      <nav
        className={clsx([
          'fixed z-50',
          'block md:hidden',
          'bottom-0 left-0 right-0',
          'bg-white border-t border-slate-200',
        ])}
      >
        <ul className="flex items-center justify-around py-3 px-4">
          {/* Explore */}
          <li>
            <Link
              href="/"
              onClick={() => {
                setActiveTab('explore')
                closeUserMenu()
              }}
              className="flex flex-col items-center space-y-1 group"
            >
              <Search
                size={24}
                className={clsx(
                  'transition-colors duration-200',
                  activeTab === 'explore'
                    ? 'text-teal-600'
                    : 'text-slate-400 group-hover:text-slate-600'
                )}
              />
              <span
                className={clsx(
                  'text-xs font-medium transition-colors duration-200',
                  activeTab === 'explore'
                    ? 'text-teal-600'
                    : 'text-slate-400 group-hover:text-slate-600'
                )}
              >
                Explore
              </span>
            </Link>
          </li>

          {/* Wishlists */}
          <li>
            <Link
              href="/wishlist"
              onClick={() => {
                setActiveTab('wishlists')
                closeUserMenu()
              }}
              className="flex flex-col items-center space-y-1 group"
            >
              <Heart
                size={24}
                className={clsx(
                  'transition-colors duration-200',
                  activeTab === 'wishlists'
                    ? 'text-teal-600'
                    : 'text-slate-400 group-hover:text-slate-600'
                )}
              />
              <span
                className={clsx(
                  'text-xs font-medium transition-colors duration-200',
                  activeTab === 'wishlists'
                    ? 'text-teal-600'
                    : 'text-slate-400 group-hover:text-slate-600'
                )}
              >
                Wishlists
              </span>
            </Link>
          </li>

          {/* User / Login */}
          <li>
            {user ? (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('user')
                  setIsUserMenuOpen((v) => !v)
                }}
                className="flex flex-col items-center space-y-1 group"
                aria-haspopup="menu"
                aria-expanded={isUserMenuOpen}
                aria-label="Open user menu"
              >
                <User
                  size={24}
                  className={clsx(
                    'transition-colors duration-200',
                    activeTab === 'user' || isUserMenuOpen
                      ? 'text-teal-600'
                      : 'text-slate-400 group-hover:text-slate-600'
                  )}
                />
                <span
                  className={clsx(
                    'text-xs font-medium transition-colors duration-200',
                    activeTab === 'user' || isUserMenuOpen
                      ? 'text-teal-600'
                      : 'text-slate-400 group-hover:text-slate-600'
                  )}
                >
                  Account
                </span>
              </button>
            ) : (
              <Link
                href="/auth"
                onClick={() => {
                  setActiveTab('user')
                  closeUserMenu()
                }}
                className="flex flex-col items-center space-y-1 group"
              >
                <User
                  size={24}
                  className={clsx(
                    'transition-colors duration-200',
                    activeTab === 'user'
                      ? 'text-teal-600'
                      : 'text-slate-400 group-hover:text-slate-600'
                  )}
                />
                <span
                  className={clsx(
                    'text-xs font-medium transition-colors duration-200',
                    activeTab === 'user'
                      ? 'text-teal-600'
                      : 'text-slate-400 group-hover:text-slate-600'
                  )}
                >
                  Log in
                </span>
              </Link>
            )}
          </li>
        </ul>
      </nav>
    </>
  )
}

export default NavBarBottom
