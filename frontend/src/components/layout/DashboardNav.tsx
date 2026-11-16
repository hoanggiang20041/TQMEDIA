'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ROUTES } from '@/lib/constants'

import { usePathname, useRouter } from 'next/navigation'

import { useRole, UserRole } from '@/context/RoleContext'
import { useTheme } from '@/context/ThemeContext'

export default function DashboardNav({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const { role, setRole, balance } = useRole()
  const { theme, toggleTheme } = useTheme()
  const [showNotifs, setShowNotifs] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const notifRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('tq_token');
      if (!token) return;
      
      const [transRes, notifRes] = await Promise.all([
        fetch('/api/transactions', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/notifications')
      ]);

      let allNotifs: any[] = [];

      if (transRes.ok) {
        const transData = await transRes.json();
        const mappedTrans = transData.map((t: any) => ({
          ...t,
          isSystem: true,
          dateObj: new Date(t.createdAt)
        }));
        allNotifs = [...allNotifs, ...mappedTrans];
      }

      if (notifRes.ok) {
        const adminData = await notifRes.json();
        const mappedAdmin = adminData.map((a: any) => ({
          ...a,
          isSystem: false,
          desc: a.title, // Map title to desc for display
          type: a.type || 'ADMIN_PROMO',
          dateObj: new Date(a.createdAt),
          time: new Intl.DateTimeFormat('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
          }).format(new Date(a.createdAt))
        }));
        allNotifs = [...allNotifs, ...mappedAdmin];
      }

      // Sort descending by date
      allNotifs.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());

      setNotifications(allNotifs.slice(0, 10)); // Show latest 10
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifs(false)
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfileMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <header className="sticky top-0 bg-surface/80 backdrop-blur-3xl flex justify-between items-center px-6 h-16 w-full border-b border-outline-variant/30 z-40 shrink-0 shadow-sm">
      <div className="flex-1 flex items-center gap-2 sm:gap-4">
        {pathname !== '/dashboard' && (
          <button onClick={() => router.back()} className="md:hidden text-on-surface-variant p-2 hover:bg-surface-variant/50 rounded-lg transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
        )}
        <button onClick={onMenuClick} className="md:hidden text-on-surface-variant p-2 hover:bg-surface-variant/50 rounded-lg transition-colors">
          <span className="material-symbols-outlined">menu</span>
        </button>
        <div className="relative w-full max-w-md hidden sm:block group">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-cyan-400 transition-colors">
            search
          </span>
          <input
            className="w-full bg-surface-variant/30 border border-outline-variant/50 rounded-xl py-2 pl-10 pr-4 text-on-surface placeholder:text-on-surface-variant focus:border-secondary/50 focus:bg-surface-variant/50 focus:outline-none transition-all text-sm"
            placeholder="Tìm kiếm..."
            type="text"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">

        {/* Balance Display */}
        <Link href={ROUTES.deposit} className="hidden sm:flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-4 py-1.5 rounded-full hover:bg-blue-500/20 transition-colors cursor-pointer group">
          <span className="material-symbols-outlined text-blue-400 text-[20px] group-hover:scale-110 transition-transform">account_balance_wallet</span>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider leading-none">Số dư</span>
            <span className="font-bold text-sm text-on-surface leading-none mt-0.5">{balance.toLocaleString('vi-VN')}₫</span>
          </div>
        </Link>

        <button onClick={toggleTheme} className="flex items-center justify-center h-10 w-10 rounded-full bg-surface-variant/30 border border-outline-variant/30 hover:bg-surface-variant/50 transition-all" title={theme === 'dark' ? 'Chế độ sáng' : 'Chế độ tối'}>
          <span className="material-symbols-outlined text-[20px] text-on-surface-variant hover:text-on-surface transition-colors">
            {theme === 'dark' ? 'light_mode' : 'dark_mode'}
          </span>
        </button>

        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => {
              if (typeof window !== 'undefined' && window.innerWidth < 640) {
                router.push('/dashboard/notifications');
                return;
              }
              if (!showNotifs) fetchNotifications()
              setShowNotifs(!showNotifs)
            }} 
            className="relative flex items-center justify-center h-10 w-10 rounded-full bg-surface-variant/30 border border-outline-variant/30 hover:bg-surface-variant/50 transition-all"
          >
            <span className="material-symbols-outlined text-[20px] text-on-surface-variant">notifications</span>
            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-secondary rounded-full border-2 border-surface"></span>
          </button>
          {showNotifs && (
            <div className="fixed left-4 right-4 top-[72px] sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 bg-surface border border-outline-variant/50 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.2)] overflow-hidden z-50">
              <div className="px-5 py-4 border-b border-outline-variant/30 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-on-surface">Thông báo</h3>
                <span className="text-[10px] font-bold bg-secondary/20 text-secondary px-2 py-0.5 rounded-full">{notifications.length} mới</span>
              </div>
              <div className="max-h-80 overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="px-5 py-8 text-center text-on-surface-variant text-sm">
                    Không có thông báo nào.
                  </div>
                ) : notifications.map((n: any, i: number) => {
                  const isDeposit = n.type === 'CỘNG TIỀN';
                  const isOrder = n.type === 'TRỪ TIỀN';
                  const isRefund = n.type === 'HOÀN TIỀN';
                  
                  const isAdminPromo = n.type === 'ADMIN' || n.type === 'ADMIN_PROMO';
                  const isAdminInfo = n.type === 'ADMIN_INFO';
                  const isAdminWarn = n.type === 'ADMIN_WARN';
                  const isAdminSuccess = n.type === 'ADMIN_SUCCESS';
                  const isAdmin = isAdminPromo || isAdminInfo || isAdminWarn || isAdminSuccess;
                  
                  let icon = 'notifications';
                  let color = 'text-gray-600 dark:text-gray-400';
                  let bg = 'bg-gray-500/10';
                  let sideColor = 'bg-orange-500';
                  let titleColor = 'text-orange-600 dark:text-orange-400';
                  
                  if (isAdminPromo) {
                    icon = 'campaign'; color = 'text-orange-600 dark:text-orange-400'; bg = 'bg-orange-500/10'; sideColor = 'bg-orange-500'; titleColor = 'text-orange-600 dark:text-orange-400';
                  } else if (isAdminInfo) {
                    icon = 'info'; color = 'text-blue-600 dark:text-blue-400'; bg = 'bg-blue-500/10'; sideColor = 'bg-blue-500'; titleColor = 'text-blue-600 dark:text-blue-400';
                  } else if (isAdminWarn) {
                    icon = 'warning'; color = 'text-yellow-600 dark:text-yellow-400'; bg = 'bg-yellow-500/10'; sideColor = 'bg-yellow-500'; titleColor = 'text-yellow-600 dark:text-yellow-400';
                  } else if (isAdminSuccess) {
                    icon = 'check_circle'; color = 'text-emerald-600 dark:text-emerald-400'; bg = 'bg-emerald-500/10'; sideColor = 'bg-emerald-500'; titleColor = 'text-emerald-600 dark:text-emerald-400';
                  } else if (isDeposit) {
                    icon = 'payments'; color = 'text-emerald-600 dark:text-emerald-400'; bg = 'bg-emerald-500/10';
                  } else if (isOrder) {
                    icon = 'shopping_cart'; color = 'text-blue-600 dark:text-blue-400'; bg = 'bg-blue-500/10';
                  } else if (isRefund) {
                    icon = 'currency_exchange'; color = 'text-teal-600 dark:text-teal-400'; bg = 'bg-teal-500/10';
                  }

                  return (
                    <div 
                      key={i} 
                      onClick={() => {
                        setShowNotifs(false);
                        router.push('/dashboard/notifications');
                      }}
                      className="px-5 py-3.5 hover:bg-surface-variant/50 transition-colors cursor-pointer flex items-start gap-3 border-b border-outline-variant/20 last:border-0 relative"
                    >
                      {isAdmin && <span className={`absolute left-0 top-0 bottom-0 w-1 ${sideColor} rounded-r-md`}></span>}
                      <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                        <span className={`material-symbols-outlined text-[18px] ${color}`}>{icon}</span>
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col">
                        <p className={`text-sm font-medium truncate ${isAdmin ? titleColor : 'text-on-surface/90'}`}>{n.desc}</p>
                        {isAdmin && <p className="text-xs text-on-surface mt-1 line-clamp-2">{n.content}</p>}
                        <p className="text-xs text-on-surface-variant mt-1">{n.time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="px-5 py-3 border-t border-outline-variant/30">
                <Link href="/dashboard/notifications" onClick={() => setShowNotifs(false)} className="block w-full text-center text-xs font-semibold text-secondary hover:brightness-110 transition-colors">Xem tất cả thông báo</Link>
              </div>
            </div>
          )}
        </div>
        <div className="relative" ref={profileRef}>
          <div 
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="h-9 w-9 rounded-full bg-gradient-to-tr from-cyan-500 to-teal-500 p-[1.5px] cursor-pointer ml-2 hover:scale-105 transition-transform shadow-[0_0_15px_rgba(6,182,212,0.4)]"
          >
            <Image
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuB9VDA4XCRqFOQwb8JdSxIY4MfBgWd03gUJrwJkFA-BzAlq4ODAJPZTl-uUfHssfp8Oaa4ADRlcJ2MDCKp9l-qvc7DHdzkk7V3CbLH62YIA2DEF0uL1I90FmX_v80OzTFvXZV_BVonHRqmNfp84XoIHV6_vAeg1b-HqU1IgyQbzNZioiH5UlS1sXeQm2Q8XJVuQfH5CUk5nhVtsYap7AZWdkra4mwxZ4ZrRwT_tmRIzFpUqFIyv4WvHsmlWwm67sO1vMGoosEIzRClx"
              alt="Ảnh đại diện"
              width={36}
              height={36}
              className="h-full w-full rounded-full object-cover"
            />
          </div>
          
          {showProfileMenu && (
            <div className="absolute right-0 top-full mt-3 w-56 glass-panel rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] overflow-hidden z-50 border border-outline-variant/30">
              <div className="px-5 py-3 border-b border-outline-variant/30">
                <p className="text-[15px] font-medium text-on-surface">Số dư : <span className="text-secondary">{balance.toLocaleString('vi-VN')}</span></p>
              </div>
              <div className="py-2">
                <Link href={ROUTES.profile} onClick={() => setShowProfileMenu(false)} className="flex items-center gap-3 px-5 py-2.5 hover:bg-surface-variant/50 transition-colors">
                  <span className="material-symbols-outlined text-[20px] text-on-surface-variant">account_circle</span>
                  <span className="text-[15px] text-on-surface">Tài khoản</span>
                </Link>
                <Link href={ROUTES.orders} onClick={() => setShowProfileMenu(false)} className="flex items-center gap-3 px-5 py-2.5 hover:bg-surface-variant/50 transition-colors">
                  <span className="material-symbols-outlined text-[20px] text-on-surface-variant">shopping_cart</span>
                  <span className="text-[15px] text-on-surface">Danh sách đơn hàng</span>
                </Link>
                <Link href={ROUTES.deposit} onClick={() => setShowProfileMenu(false)} className="flex items-center gap-3 px-5 py-2.5 hover:bg-surface-variant/50 transition-colors">
                  <span className="material-symbols-outlined text-[20px] text-on-surface-variant">inventory_2</span>
                  <span className="text-[15px] text-on-surface">Nạp tiền</span>
                </Link>
              </div>
              <div className="py-2 border-t border-outline-variant/30">
                <button 
                  onClick={() => {
                    localStorage.removeItem('tq_token');
                    localStorage.removeItem('tq_user');
                    window.location.href = '/login';
                  }}
                  className="w-full flex items-center gap-3 px-5 py-2.5 hover:bg-surface-variant/50 transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px] text-on-surface-variant">logout</span>
                  <span className="text-[15px] text-on-surface">Đăng xuất</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
