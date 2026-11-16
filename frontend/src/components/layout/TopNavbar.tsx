'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { TOP_NAV_ITEMS } from '@/lib/constants'
import { useTheme } from '@/context/ThemeContext'
import { useRole } from '@/context/RoleContext'

export default function TopNavbar() {
  const pathname = usePathname()
  const { theme, toggleTheme } = useTheme()
  const { user, settings, isLoading } = useRole()

  return (
    <nav className="fixed top-0 w-full z-50 bg-surface/70 backdrop-blur-2xl border-b border-outline-variant/30 shadow-lg">
      <div className="flex justify-between items-center px-4 md:px-12 h-16 md:h-20 w-full max-w-[1400px] mx-auto">
        <Link href="/" className="flex items-center gap-2 md:gap-3 group shrink-0">
          <div className="relative w-8 h-8 md:w-11 md:h-11 overflow-hidden rounded-full flex items-center justify-center bg-black/5 dark:bg-transparent shrink-0">
            <Image
              src={settings?.ui_logo || "/logo.png"}
              alt="TQ Media Logo"
              width={44}
              height={44}
              className="w-full h-full object-cover"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span className="text-sm sm:text-base md:text-lg font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-teal-400 uppercase whitespace-nowrap animate-gradient-x leading-none">TQ MEDIA</span>
            <span className="text-[9px] uppercase tracking-widest text-on-surface-variant font-mono mt-0.5">Enterprise</span>
          </div>
        </Link>

        <div className="hidden md:flex gap-10">
          {TOP_NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.href || '/'}
              className={`text-base font-medium transition-all duration-200 active:scale-95 ${
                pathname === (item.href || '/')
                  ? 'text-on-surface border-b-2 border-cyan-500 pb-1 shadow-[0_4px_15px_-3px_rgba(6,182,212,0.4)]'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

          <div className="flex items-center gap-2 md:gap-5 shrink-0">
            {isLoading ? (
              <div className="w-24 md:w-32 h-9 md:h-12 rounded-lg md:rounded-xl bg-surface-variant/50 animate-pulse"></div>
            ) : (
              <>
                {!user && (
                  <Link href="/login" className="hidden md:block text-on-surface-variant hover:text-on-surface text-base font-medium transition-colors whitespace-nowrap">
                    Đăng nhập
                  </Link>
                )}
                <button
                  onClick={toggleTheme}
                  className="w-8 h-8 md:w-11 md:h-11 rounded-full bg-surface-variant/30 border border-outline-variant/30 hover:bg-surface-variant/50 transition-all flex items-center justify-center shrink-0"
                  title={theme === 'dark' ? 'Chế độ sáng' : 'Chế độ tối'}
                >
                  <span className="material-symbols-outlined text-[16px] md:text-[20px] text-on-surface-variant hover:text-on-surface transition-colors leading-none">
                    {theme === 'dark' ? 'light_mode' : 'dark_mode'}
                  </span>
                </button>
                {user ? (
                  <Link href="/dashboard" className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-on-primary px-3 py-1.5 md:px-7 md:py-3 rounded-lg md:rounded-xl text-xs md:text-base font-semibold transition-all hover:scale-105 active:scale-95 shadow-[0_0_25px_rgba(6,182,212,0.3)] whitespace-nowrap">
                    Bảng điều khiển
                  </Link>
                ) : (
                  <Link href="/login" className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-on-primary px-4 py-1.5 md:px-7 md:py-3 rounded-lg md:rounded-xl text-xs md:text-base font-semibold transition-all hover:scale-105 active:scale-95 shadow-[0_0_25px_rgba(6,182,212,0.3)] whitespace-nowrap">
                    Bắt đầu
                  </Link>
                )}
              </>
            )}
          </div>
      </div>
    </nav>
  )
}
