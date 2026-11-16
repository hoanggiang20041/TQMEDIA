'use client'

interface AdsServicePageProps {
  platform: string
  icon: string
  description: string
}

import { useRole } from '@/context/RoleContext'

export default function AdsServicePage({ platform, icon, description }: AdsServicePageProps) {
  const { settings } = useRole()
  return (
    <>
      <section className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-5">
        <div className="hidden md:flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.25rem] bg-cyan-500/10 text-cyan-600 shadow-inner">
          <span className="material-symbols-outlined text-[36px]">{icon}</span>
        </div>
        <div>
          <h1 className="text-2xl md:text-[32px] font-bold text-on-surface tracking-tight">Dịch vụ {platform} Ads</h1>
          <p className="mt-1 text-sm md:text-[16px] font-medium text-on-surface-variant/90">
            {description}
          </p>
        </div>
      </section>

      <div className="mt-6 md:mt-10 flex flex-col items-center justify-center rounded-3xl md:rounded-[2.5rem] border border-outline-variant/50 bg-surface/50 p-6 md:p-12 text-center max-w-[800px] mx-auto shadow-sm backdrop-blur-xl">
        <div className="mb-4 md:mb-6 flex h-[80px] w-[80px] md:h-[100px] md:w-[100px] items-center justify-center rounded-2xl md:rounded-[2rem] bg-gradient-to-br from-cyan-400/20 to-blue-500/20 shadow-[0_0_50px_rgba(6,182,212,0.15)] border border-cyan-500/20">
          <span className="material-symbols-outlined text-cyan-400 text-[40px] md:text-[50px]">{icon}</span>
        </div>
        
        <h2 className="mb-3 md:mb-4 text-xl md:text-3xl font-bold tracking-tight text-on-surface">
          Tư vấn Dịch vụ {platform} Ads
        </h2>
        
        <p className="mb-6 md:mb-10 text-sm md:text-[18px] font-medium leading-relaxed text-on-surface/70 max-w-[600px]">
          Để đảm bảo chiến dịch quảng cáo mang lại hiệu quả cao nhất với chi phí tối ưu, 
          đội ngũ chuyên gia của chúng tôi sẽ tư vấn và lên chiến lược trực tiếp 1:1 cho bạn qua Zalo.
        </p>
        
        <a 
          href={settings?.contact_zalo || "#"} 
          target="_blank" 
          rel="noopener noreferrer"
          className="btn-primary neon-underglow bg-cyan-600 hover:bg-cyan-500 flex items-center justify-center gap-2 md:gap-3 rounded-xl md:rounded-2xl px-6 py-3.5 md:px-10 md:py-5 text-sm md:text-title-md font-bold text-white transition-all cursor-pointer shadow-[0_0_30px_rgba(6,182,212,0.3)] w-full md:w-auto hover:shadow-[0_0_40px_rgba(6,182,212,0.5)] hover:scale-105 active:scale-95 mb-4"
        >
          <span className="material-symbols-outlined text-[20px] md:text-[28px]">chat</span>
          Trò chuyện qua Zalo ngay
        </a>

        <button 
          onClick={() => window.dispatchEvent(new CustomEvent('trigger-live-chat', { detail: { platform } }))}
          className="btn-outline flex items-center justify-center gap-2 md:gap-3 rounded-xl md:rounded-2xl px-6 py-3.5 md:px-10 md:py-5 text-sm md:text-title-md font-bold text-cyan-600 border-2 border-cyan-500/30 hover:border-cyan-500 hover:bg-cyan-500/10 transition-all cursor-pointer w-full md:w-auto hover:scale-105 active:scale-95"
        >
          <span className="material-symbols-outlined text-[20px] md:text-[28px]">support_agent</span>
          Chat với Kỹ thuật viên trực tiếp
        </button>
      </div>
    </>
  )
}
