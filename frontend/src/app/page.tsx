"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { useRole } from "@/context/RoleContext"
import TopNavbar from "@/components/layout/TopNavbar"
import Footer from "@/components/layout/Footer"


export default function HomePage() {
  const { settings, user } = useRole()
  
  const parseSafeJSON = (jsonString: any, fallback: any) => {
    try {
      if (!jsonString) return fallback;
      const parsed = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      return fallback;
    } catch(e) {
      return fallback;
    }
  }
  
  return (
    <div className="bg-background text-on-background min-h-screen selection:bg-cyan-500/30 overflow-hidden relative">

      <TopNavbar />

      <div className="fixed inset-0 z-0 pointer-events-none bg-background">
      </div>

      <div className="relative z-10 w-full pt-16">
        <section className="pt-36 pb-24 px-6 md:px-10 max-w-[1200px] mx-auto flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-variant/30 border border-outline-variant/30 mb-10 backdrop-blur-sm animate-fade-in-up">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.6)]"></span>
            <span className="text-xs font-medium text-on-surface tracking-wide">Phiên bản 2.0 đã sẵn sàng</span>
          </div>

          {settings?.home_title ? (
            <h1 
              className="hero-title text-5xl md:text-7xl lg:text-[80px] font-black tracking-normal leading-[1.2] mb-8 animate-fade-in-up" 
              style={{ animationDelay: '0.1s' }}
              dangerouslySetInnerHTML={{ __html: settings.home_title }}
            />
          ) : (
            <h1 className="hero-title text-5xl md:text-7xl lg:text-[80px] font-black tracking-normal leading-[1.2] mb-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              Nền tảng Marketing<br/>
              <strong>Mạng Xã Hội</strong> Đỉnh Cao
            </h1>
          )}
          
          {settings?.home_desc ? (
            <div 
              className="text-lg md:text-xl text-on-surface-variant font-light leading-relaxed max-w-2xl mx-auto mb-12 animate-fade-in-up" 
              style={{ animationDelay: '0.2s' }}
              dangerouslySetInnerHTML={{ __html: settings.home_desc }}
            />
          ) : (
            <p className="text-lg md:text-xl text-on-surface-variant font-light leading-relaxed max-w-2xl mb-12 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              Giải pháp tăng trưởng toàn diện cho TikTok, Facebook và Google.
              Tối ưu hóa chiến dịch với sức mạnh của công nghệ AI và hệ thống tự động hóa thông minh.
            </p>
          )}
          
          <div className="flex flex-col sm:flex-row gap-5 mb-20 w-full sm:w-auto animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <Link
              href={user ? "/dashboard" : "/login"}
              className="relative overflow-hidden rounded-xl px-10 py-4 w-full sm:w-auto bg-primary text-white hover:bg-primary-container hover:text-on-primary-container transition-all"
            >
              <div className="relative flex items-center justify-center gap-2 font-semibold tracking-wide">
                {user ? "Bảng điều khiển" : "Bắt đầu ngay"}
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </div>
            </Link>
            <Link
              href="/dashboard/tiktok"
              className="px-10 py-4 rounded-xl font-semibold text-on-surface bg-surface border border-outline-variant hover:bg-surface-variant transition-all w-full sm:w-auto"
            >
              Khám phá tính năng
            </Link>
          </div>

          <div className="w-full max-w-5xl animate-fade-in-up mt-16" style={{ animationDelay: '0.4s' }}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: 'shopping_cart', label: 'Đơn hàng', value: settings?.home_stats_orders || '1,284', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
                { icon: 'account_balance_wallet', label: 'Doanh thu', value: settings?.home_stats_revenue || '45.2M', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
                { icon: 'group', label: 'Người dùng', value: settings?.home_stats_users || '342', color: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/20' },
                { icon: 'monitoring', label: 'Tăng trưởng', value: settings?.home_stats_growth || '+24.8%', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
              ].map((stat) => (
                <div key={stat.label} className={`bg-surface ${stat.border} border backdrop-blur-xl rounded-2xl p-5 text-center`}>
                  <span className={`material-symbols-outlined ${stat.color} text-[28px] mb-2`}>{stat.icon}</span>
                  <div className="text-xl font-bold text-on-surface">{stat.value}</div>
                  <div className="text-xs text-on-surface-variant uppercase tracking-wider mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24 px-6 md:px-10 max-w-[1200px] mx-auto border-t border-outline-variant/30">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-on-surface mb-4 tracking-tight">{settings?.home_features_title || 'Tính năng nổi bật'}</h2>
            <p className="text-on-surface-variant text-lg max-w-2xl mx-auto">{settings?.home_features_desc || 'Công nghệ hàng đầu được tích hợp sẵn để giúp bạn bứt phá doanh thu.'}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {parseSafeJSON(settings?.home_features_list, [
              { icon: 'bolt', color: 'text-cyan-400', bgColor: 'bg-cyan-500/10', title: 'Tự động hóa toàn diện', desc: 'Thiết lập kịch bản một lần, hệ thống sẽ tự động chạy chiến dịch 24/7 mà không cần giám sát.' },
              { icon: 'analytics', color: 'text-blue-400', bgColor: 'bg-blue-500/10', title: 'Phân tích AI', desc: 'Thuật toán AI liên tục đánh giá và điều hướng dòng tiền vào các chiến dịch hiệu quả nhất.' },
              { icon: 'shield_lock', color: 'text-teal-400', bgColor: 'bg-teal-500/10', title: 'Bảo mật tuyệt đối', desc: 'Dữ liệu khách hàng và ngân sách được mã hóa đa tầng, chống gian lận click (click tặc) 100%.' },
            ]).map((feature: any, idx: number) => (
              <div
                key={idx}
                className="bg-surface border border-outline-variant/30 backdrop-blur-xl p-8 rounded-2xl hover:bg-surface-variant/30 hover:border-outline-variant/30 transition-all hover:-translate-y-2 group"
              >
                <div className={`w-14 h-14 rounded-2xl ${feature.bgColor} border border-outline-variant/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <span className={`material-symbols-outlined ${feature.color} text-[28px]`}>
                    {feature.icon}
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-on-surface mb-3">{feature.title}</h3>
                <p className="text-on-surface-variant text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-24 px-6 md:px-10 max-w-[1200px] mx-auto border-t border-outline-variant/30">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-on-surface mb-4 tracking-tight">{settings?.home_services_title || 'Dịch vụ cung cấp'}</h2>
            <p className="text-on-surface-variant text-lg max-w-2xl mx-auto">{settings?.home_services_desc || 'Mở rộng phễu khách hàng trên các nền tảng mạng xã hội tỷ người dùng.'}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {parseSafeJSON(settings?.home_services_list, [
              { icon: 'play_circle', color: 'text-[#00f2fe]', title: 'TikTok Ads', desc: 'Bắt trend thần tốc. Phân phối video viral đến hàng triệu Gen Z và Millennials.', glow: 'rgba(0,242,254,0.1)', link: '/dashboard/tiktok' },
              { icon: 'thumb_up', color: 'text-[#1877F2]', title: 'Facebook Ads', desc: 'Tối ưu chi phí chuyển đổi (CPA). Re-targeting chính xác từng tệp khách truy cập.', glow: 'rgba(24,119,242,0.1)', link: '/dashboard/facebook' },
              { icon: 'search', color: 'text-[#EA4335]', title: 'Google SEO & Ads', desc: 'Chiếm lĩnh Top 1 Google. Đón đầu nhu cầu tìm kiếm của khách hàng có ý định mua cao.', glow: 'rgba(234,67,53,0.1)', link: '/dashboard/google' },
            ]).map((service: any, idx: number) => (
              <Link
                href={service.link || '/dashboard'}
                key={idx}
                className="bg-surface border border-outline-variant/30 backdrop-blur-xl p-8 rounded-2xl text-center hover:bg-surface-variant/30 transition-all relative overflow-hidden group cursor-pointer"
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `radial-gradient(circle at top, ${service.glow}, transparent 70%)` }}></div>
                <span className={`material-symbols-outlined text-[48px] ${service.color} mb-6 relative z-10 group-hover:scale-110 transition-transform duration-300`}>
                  {service.icon}
                </span>
                <h3 className="text-xl font-semibold text-on-surface mb-3 relative z-10">{service.title}</h3>
                <p className="text-on-surface-variant text-sm leading-relaxed mb-6 relative z-10">{service.desc}</p>
                <span className={`text-sm font-semibold ${service.color} hover:underline underline-offset-4 relative z-10 block mt-6`}>
                  Khám phá ngay &rarr;
                </span>
              </Link>
            ))}
          </div>
        </section>

        <Footer />
      </div>
    </div>
  )
}
