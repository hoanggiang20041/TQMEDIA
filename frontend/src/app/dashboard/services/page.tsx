import type { Metadata } from 'next'
import Link from 'next/link'
import { ROUTES } from '@/lib/constants'

export const metadata: Metadata = {
  title: 'Danh mục Dịch vụ',
}

const services = [
  {
    title: 'Dịch vụ TikTok',
    description: 'Tăng view, follow, like và tương tác tự động trên nền tảng TikTok.',
    icon: 'video_library',
    href: ROUTES.tiktok,
    color: 'text-[#00f2fe]',
    bg: 'bg-[#00f2fe]/10',
    border: 'hover:border-[#00f2fe]/50',
  },
  {
    title: 'Dịch vụ Facebook',
    description: 'Xây dựng Fanpage, tăng like, share, bình luận và mắt livestream Facebook.',
    icon: 'thumb_up',
    href: ROUTES.facebook,
    color: 'text-[#1877F2]',
    bg: 'bg-[#1877F2]/10',
    border: 'hover:border-[#1877F2]/50',
  },
  {
    title: 'Dịch vụ Google',
    description: 'Tối ưu hóa SEO, tăng đánh giá 5 sao Google Maps và traffic website.',
    icon: 'search',
    href: ROUTES.google,
    color: 'text-[#EA4335]',
    bg: 'bg-[#EA4335]/10',
    border: 'hover:border-[#EA4335]/50',
  },
  {
    title: 'Dịch vụ Instagram',
    description: 'Tăng follower thật, auto like thả tim và tương tác reels Instagram.',
    icon: 'photo_camera',
    href: ROUTES.instagram,
    color: 'text-[#E1306C]',
    bg: 'bg-[#E1306C]/10',
    border: 'hover:border-[#E1306C]/50',
  },
  {
    title: 'Dịch vụ YouTube',
    description: 'Tăng view, sub, giờ xem an toàn, hỗ trợ bật kiếm tiền kênh YouTube.',
    icon: 'smart_display',
    href: ROUTES.youtube,
    color: 'text-[#FF0000]',
    bg: 'bg-[#FF0000]/10',
    border: 'hover:border-[#FF0000]/50',
  },
]

export default function ServicesHubPage() {
  return (
    <>
      <div className="mb-8">
        <h1 className="font-headline-md text-headline-md text-on-surface flex items-center gap-3">
          <span className="material-symbols-outlined text-[32px] text-primary">apps</span>
          Danh mục dịch vụ
        </h1>
        <p className="text-on-surface-variant text-body-md mt-2">
          Chọn nền tảng bạn muốn chạy dịch vụ bên dưới
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {services.map((svc) => (
          <Link
            key={svc.title}
            href={svc.href}
            className={`glass-panel p-6 md:p-8 rounded-2xl flex flex-col items-center text-center gap-4 glow-hover ${svc.border} transition-all duration-300 group hover:scale-[1.02]`}
          >
            <div className={`w-20 h-20 rounded-full flex items-center justify-center ${svc.bg} mb-2 group-hover:scale-110 transition-transform duration-300`}>
              <span className={`material-symbols-outlined text-[40px] ${svc.color}`}>
                {svc.icon}
              </span>
            </div>
            
            <h2 className="text-xl font-bold text-on-surface group-hover:text-primary transition-colors">
              {svc.title}
            </h2>
            
            <p className="text-on-surface-variant text-sm leading-relaxed flex-1">
              {svc.description}
            </p>
            
            <div className="mt-4 w-full py-3 rounded-lg bg-surface-container-high text-on-surface-variant font-medium text-sm group-hover:bg-primary group-hover:text-on-primary transition-colors flex items-center justify-center gap-2">
              Khám phá ngay
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </div>
          </Link>
        ))}
      </div>
    </>
  )
}
