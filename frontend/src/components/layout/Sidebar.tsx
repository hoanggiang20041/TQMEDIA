'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { MENU_FINANCE, MENU_SERVICES, MENU_SOCIAL, MENU_UTILITIES, MENU_INSTRUCTOR, SIDEBAR_FOOTER_ITEMS, NavItem } from '@/lib/constants'
import { useRole } from '@/context/RoleContext'
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
const MySwal = withReactContent(Swal);

const BrandIcon = ({ name, className }: { name: string, className?: string }) => {
  const iconUrls: Record<string, string> = {
    'TikTok': 'https://img.icons8.com/3d-fluency/94/tiktok.png',
    'Facebook': 'https://img.icons8.com/3d-fluency/94/facebook-logo.png',
    'Google': 'https://img.icons8.com/color/94/google-logo.png',
    'Instagram': 'https://img.icons8.com/3d-fluency/94/instagram-new.png',
    'YouTube': 'https://img.icons8.com/3d-fluency/94/youtube-play.png',
    'Shopee': 'https://img.icons8.com/color/94/shopee.png',
    'Telegram': 'https://img.icons8.com/3d-fluency/94/telegram.png',
    'Twitter': 'https://img.icons8.com/color/94/twitterx.png',
    'X-Twitter': 'https://img.icons8.com/color/94/twitterx.png',
    'Threads': 'https://img.icons8.com/nolan/94/threads.png'
  };

  const src = iconUrls[name];

  if (src) {
    return (
      <div className={`relative overflow-hidden premium-icon-wrapper rounded-full ${className}`} style={{ width: '20px', height: '20px', display: 'flex' }}>
        <img src={src} alt={name} className="w-full h-full object-contain" />
      </div>
    );
  }

  // Fallback cho Lazada (với màu xanh sáng để nổi bật trên nền tối và hiệu ứng shadow)
  switch (name) {
    case 'Lazada':
      return (
        <div className={`relative overflow-hidden premium-icon-wrapper rounded-full ${className}`} style={{ width: '20px', height: '20px', display: 'flex' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full drop-shadow-md" style={{ color: '#00D1FF' }}><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
        </div>
      );
    default:
      return null;
  }
}

export default function Sidebar({ isCollapsed = false, toggleSidebar = () => {}, isMobileOpen = false, closeMobile = () => {} }: { isCollapsed?: boolean, toggleSidebar?: () => void, isMobileOpen?: boolean, closeMobile?: () => void }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { role, logout, settings } = useRole()
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  // Mở sẵn dropdown Dịch vụ nếu đang ở các trang con
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({
    'Dịch vụ': pathname.includes('/tiktok') || pathname.includes('/facebook') || pathname.includes('/google') || pathname.includes('/instagram') || pathname.includes('/youtube') || pathname.includes('/services') || pathname.includes('/shopee') || pathname.includes('/telegram') || pathname.includes('/x-twitter') || pathname.includes('/threads') || pathname.includes('/lazada'),
    'Quản lý': pathname.includes('/orders') || pathname.includes('/analytics'),
    'Khu vực Admin': pathname.includes('/dashboard/admin') && role === 'ADMIN',
    'Khu vực Giảng viên': pathname.includes('/dashboard/admin') && role === 'INSTRUCTOR',
  })

  const toggleDropdown = (label: string, ancestorLabels: string[] = []) => {
    setOpenDropdowns(prev => {
      if (prev[label]) {
        return { ...prev, [label]: false };
      } else {
        const next = { ...prev };
        // Close all other dropdowns except ancestors
        Object.keys(next).forEach(k => {
          if (!ancestorLabels.includes(k) && k !== label) {
            next[k] = false;
          }
        });
        next[label] = true;
        return next;
      }
    });
  }

  const isActive = (href?: string) => {
    if (!href) return false
    if (href === '/dashboard') return pathname === '/dashboard'
    
    if (href.includes('?')) {
      const [path, query] = href.split('?')
      if (pathname !== path) return false
      
      const typeMatch = query.match(/type=([^&]+)/)
      const currentType = searchParams.get('type')
      if (typeMatch && currentType) {
        return decodeURIComponent(typeMatch[1]) === currentType
      }
      return false
    }

    return pathname.startsWith(href) && href !== '#'
  }

  // Filter items based on role and settings
  const filterItems = (items: NavItem[]) => items.filter(item => {
    if (item.label === 'Khu vực Admin') {
      if (!mounted) return false
      return role === 'ADMIN' || role === 'TECHNICIAN'
    }
    if (role === 'TECHNICIAN' && item.label !== 'Khu vực Admin') {
      return false; // TECHNICIAN only sees Admin -> Live Chat
    }
    return true
  }).map(item => {
    let currentItem = { ...item };
    if (currentItem.label === 'Khu vực Admin' && role === 'TECHNICIAN') {
      currentItem.label = 'Khu vực Kỹ Thuật';
    }
    if (currentItem.subItems) {
      const filteredSubItems = currentItem.subItems.filter(sub => {
        if (sub.label === 'Hoa hồng giới thiệu' && settings?.affiliate_enabled === 'false') return false;
        if (item.label === 'Khu vực Admin' && role === 'TECHNICIAN' && !['Live Chat CSKH', 'Quản lý Đơn (KTV)', 'Đơn hàng Sản phẩm'].includes(sub.label)) return false;
        if (item.label === 'Khu vực Admin' && role === 'ADMIN' && sub.label === 'Quản lý Đơn (KTV)') return false; // Admin hide this to avoid confusion
        return true;
      });
      return { ...currentItem, subItems: filteredSubItems };
    }
    return currentItem;
  });

  const filteredFinanceItems = filterItems(MENU_FINANCE)
  const filteredServicesItems = filterItems(MENU_SERVICES)
  const filteredSocialItems = filterItems(MENU_SOCIAL)
  const filteredUtilitiesItems = filterItems(MENU_UTILITIES)
  const filteredInstructorItems = role === 'INSTRUCTOR' ? MENU_INSTRUCTOR : []

  const renderNavItems = (items: NavItem[], level: number = 0, ancestorLabels: string[] = []): React.ReactNode => {
    return items.map((item) => {
      const hasSub = item.subItems && item.subItems.length > 0;
      const isOpen = openDropdowns[item.label] && !isCollapsed;
      const isBrand = ['Facebook', 'TikTok', 'Instagram', 'YouTube', 'Google', 'Shopee', 'Telegram', 'Twitter', 'X-Twitter', 'Threads', 'Lazada'].includes(item.icon || '');
      
      if (hasSub) {
        return (
          <div key={item.label} className="flex flex-col relative group/dropdown">
            <button
              onClick={() => {
                if (isCollapsed) toggleSidebar();
                toggleDropdown(item.label, ancestorLabels);
              }}
              title={isCollapsed ? item.label : undefined}
              className={
                level === 0
                  ? `grid items-center px-4 py-3 text-on-surface-variant border-l-2 border-transparent hover:bg-surface-variant/50 hover:text-on-surface transition-all duration-200 cursor-pointer rounded-lg text-[15px] font-medium w-full text-left ${isCollapsed ? 'grid-cols-1 justify-items-center' : 'grid-cols-[24px_1fr_24px] gap-3'}`
                  : `flex items-center gap-3 px-4 py-2.5 text-on-surface-variant hover:bg-surface-variant/50 hover:text-on-surface rounded-lg text-[14px] transition-colors whitespace-normal break-words leading-snug justify-between w-full`
              }
            >
              {level === 0 ? (
                <>
                  {isBrand ? (
                    <BrandIcon name={item.icon || ''} className="w-[20px] h-[20px] justify-self-center shrink-0 text-cyan-500 mx-[2px]" />
                  ) : (
                    <div className="w-6 h-6 flex items-center justify-center justify-self-center shrink-0">
                      <span className="material-symbols-outlined">{item.icon}</span>
                    </div>
                  )}
                  {!isCollapsed && <span className="whitespace-nowrap transition-all duration-300 overflow-hidden text-ellipsis">{item.label}</span>}
                  {!isCollapsed && <span className={`material-symbols-outlined transition-transform duration-200 justify-self-end ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>}
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    {isBrand ? (
                      <BrandIcon name={item.icon || item.label} className="w-[18px] h-[18px] opacity-80 shrink-0" />
                    ) : item.icon ? (
                      <span className="material-symbols-outlined text-[18px] opacity-80 shrink-0">{item.icon}</span>
                    ) : null}
                    <span className="text-left">{item.label}</span>
                  </div>
                  <span className={`material-symbols-outlined transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} text-[16px]`}>expand_more</span>
                </>
              )}
            </button>
            
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? (level === 0 ? 'max-h-[2000px]' : 'max-h-[1000px]') + ' opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
              <div className={`flex flex-col gap-1 ${level === 0 ? (isCollapsed ? 'items-center py-1' : 'ml-[22px] border-l-2 border-outline-variant/30 pl-2 py-1') : 'ml-4 border-l border-outline-variant/20 pl-2'}`}>
                {renderNavItems(item.subItems!, level + 1, [...ancestorLabels, item.label])}
              </div>
            </div>
          </div>
        );
      }

      return (
        <Link
          key={item.label}
          href={item.href || '#'}
          title={isCollapsed ? item.label : undefined}
          onClick={(e) => {
            if (item.href === '#') {
              e.preventDefault();
              MySwal.fire({ icon: 'info', title: 'Thông báo', text: 'Dịch vụ này đang được phát triển và sẽ sớm ra mắt! Sếp vui lòng quay lại sau nhé.' });
            } else {
              closeMobile();
            }
          }}
          className={
            level === 0
              ? (isActive(item.href)
                ? `grid items-center px-4 py-3 text-on-surface border-l-2 border-cyan-500 bg-gradient-to-r from-cyan-500/20 to-transparent shadow-[inset_0_0_20px_rgba(6,182,212,0.1)] text-[15px] font-medium ${isCollapsed ? 'grid-cols-1 justify-items-center rounded-lg border-l-0' : 'grid-cols-[24px_1fr] gap-3 rounded-r-lg text-left'}`
                : `grid items-center px-4 py-3 text-on-surface-variant border-l-2 border-transparent hover:bg-surface-variant/50 hover:text-on-surface transition-all duration-200 cursor-pointer active:translate-x-1 text-[15px] font-medium ${isCollapsed ? 'grid-cols-1 justify-items-center rounded-lg' : 'grid-cols-[24px_1fr] gap-3 rounded-r-lg text-left'}`)
              : (isActive(item.href)
                ? 'flex items-center gap-3 px-4 py-2.5 text-on-surface bg-surface-variant/50 rounded-lg text-[14px] transition-colors whitespace-normal break-words leading-snug justify-between'
                : 'flex items-center gap-3 px-4 py-2.5 text-on-surface-variant hover:bg-surface-variant/50 hover:text-on-surface rounded-lg text-[14px] transition-colors whitespace-normal break-words leading-snug justify-between')
          }
        >
          {level === 0 ? (
            <>
              <div className="w-6 h-6 flex items-center justify-center justify-self-center shrink-0">
                <span className="material-symbols-outlined" style={isActive(item.href) ? { fontVariationSettings: "'FILL' 1" } : undefined}>{item.icon}</span>
              </div>
              {!isCollapsed && <span className="whitespace-nowrap transition-all duration-300 overflow-hidden text-ellipsis">{item.label}</span>}
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                {isBrand ? (
                  <BrandIcon name={item.icon || item.label} className="w-[18px] h-[18px] opacity-80 shrink-0" />
                ) : item.icon ? (
                  <span className="material-symbols-outlined text-[18px] opacity-80 shrink-0">{item.icon}</span>
                ) : null}
                {item.label}
              </div>
              {item.href === '#' && (
                <span className="text-[9px] font-bold bg-primary/20 text-primary px-1.5 py-0.5 rounded uppercase whitespace-nowrap">Sắp có</span>
              )}
            </>
          )}
        </Link>
      );
    });
  };

  const sidebarWidth = isCollapsed ? 'w-64 md:w-[80px]' : 'w-64';

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
          onClick={closeMobile}
        />
      )}

      <nav className={`flex flex-col h-screen py-6 gap-2 bg-surface dark:bg-surface/90 backdrop-blur-3xl fixed left-0 border-r border-outline-variant/30 shadow-[0_0_40px_rgba(0,0,0,0.1)] dark:shadow-[0_0_40px_rgba(0,0,0,0.5)] z-50 transition-transform duration-300 ease-in-out ${sidebarWidth} ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
      <div className={`px-6 mb-8 flex items-center ${isCollapsed ? 'justify-center px-0' : 'justify-between'}`}>
        <Link href="/" className={`flex items-center gap-3 group ${isCollapsed ? 'justify-center w-full' : ''}`}>
          <div className="relative w-9 h-9 overflow-hidden rounded-full flex items-center justify-center bg-black/5 dark:bg-transparent shrink-0">
            <Image
              src={settings?.ui_logo || "/logo.png"}
              alt="TQ Media Logo"
              width={36}
              height={36}
              className="w-full h-full object-cover"
              priority
            />
          </div>
          <div className={`flex flex-col transition-all duration-300 overflow-hidden ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
            <span className="text-base font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-teal-400 whitespace-nowrap animate-gradient-x leading-none">TQ MEDIA</span>
            <span className="text-[9px] uppercase tracking-widest text-on-surface-variant font-mono mt-0.5">Enterprise</span>
          </div>
        </Link>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto px-2 flex flex-col gap-1 hide-scrollbar">
        
        {/* TỔNG QUAN & TÀI CHÍNH SECTION */}
        {role !== 'TECHNICIAN' && (
          <>
            <div className={`px-4 mt-2 mb-1 ${isCollapsed ? 'hidden' : 'block'}`}>
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                TỔNG QUAN & TÀI CHÍNH
              </span>
            </div>
            {renderNavItems(filteredFinanceItems)}

            {/* SẢN PHẨM & DỊCH VỤ SECTION */}
            <div className={`px-4 mt-6 mb-1 ${isCollapsed ? 'hidden' : 'block'}`}>
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                SẢN PHẨM & DỊCH VỤ
              </span>
            </div>
            {renderNavItems(filteredSocialItems)}
            {renderNavItems(filteredServicesItems)}
          </>
        )}

        {/* TIỆN ÍCH & MỞ RỘNG SECTION */}
        <div className={`px-4 mt-6 mb-1 ${isCollapsed ? 'hidden' : 'block'}`}>
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
            TIỆN ÍCH & MỞ RỘNG
          </span>
        </div>
        {renderNavItems(filteredUtilitiesItems)}
        
        {role === 'INSTRUCTOR' && (
          <>
            <div className={`px-4 mt-6 mb-1 ${isCollapsed ? 'hidden' : 'block'}`}>
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                GIẢNG VIÊN
              </span>
            </div>
            {renderNavItems(filteredInstructorItems)}
          </>
        )}
        
      </div>

      {/* Footer Items */}
      <div className="mt-auto px-2 pt-4 pb-6 border-t border-outline-variant/30 flex flex-col gap-1">
        {SIDEBAR_FOOTER_ITEMS.map((item) => {
          if (item.icon === 'logout') {
            return (
              <button
                key={item.label}
                onClick={logout}
                title={isCollapsed ? item.label : undefined}
                className={`grid items-center px-4 py-3 text-red-400 border-l-2 border-transparent hover:bg-red-500/10 transition-all duration-200 cursor-pointer active:translate-x-1 text-[15px] font-medium w-full text-left ${isCollapsed ? 'grid-cols-1 justify-items-center rounded-lg' : 'grid-cols-[24px_1fr] gap-3 rounded-r-lg'}`}
              >
                <div className="w-6 h-6 flex items-center justify-center justify-self-center shrink-0">
                  <span className="material-symbols-outlined">{item.icon}</span>
                </div>
                {!isCollapsed && (
                  <span className="whitespace-nowrap transition-all duration-300 overflow-hidden text-ellipsis">
                    {item.label}
                  </span>
                )}
              </button>
            )
          }

          return (
            <Link
              key={item.label}
              href={item.href!}
              title={isCollapsed ? item.label : undefined}
              onClick={closeMobile}
              className={`grid items-center px-4 py-3 text-on-surface-variant border-l-2 border-transparent hover:bg-surface-variant/50 hover:text-on-surface transition-all duration-200 cursor-pointer active:translate-x-1 text-[15px] font-medium ${isCollapsed ? 'grid-cols-1 justify-items-center rounded-lg' : 'grid-cols-[24px_1fr] gap-3 rounded-r-lg text-left'}`}
            >
              <div className="w-6 h-6 flex items-center justify-center justify-self-center shrink-0">
                <span className="material-symbols-outlined">{item.icon}</span>
              </div>
              {!isCollapsed && (
                <span className="whitespace-nowrap transition-all duration-300 overflow-hidden text-ellipsis">
                  {item.label}
                </span>
              )}
            </Link>
          )
        })}
      </div>
      
      {/* Collapse Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="hidden md:flex absolute -right-3 top-10 bg-surface border border-outline-variant/50 rounded-full p-1 shadow-md text-on-surface-variant hover:text-on-surface hover:scale-110 transition-all z-50 items-center justify-center"
      >
        <span className={`material-symbols-outlined text-[16px] transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}>
          chevron_left
        </span>
      </button>
    </nav>
    </>
  )
}
