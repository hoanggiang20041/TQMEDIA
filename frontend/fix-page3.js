const fs = require('fs');

const content = "use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { useRole } from "@/context/RoleContext"
import TopNavbar from "@/components/layout/TopNavbar"
import Footer from "@/components/layout/Footer"

function Particles() {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    let animationId
    const particles = []
    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
    resize()
    window.addEventListener("resize", resize)
    for (let i = 0; i < 70; i++) {
      particles.push({
        x: Math.random() * canvas.offsetWidth,
        y: Math.random() * canvas.offsetHeight,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.2 + 0.1,
      })
    }
    const animate = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight)
      particles.forEach((p) => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0) p.x = canvas.offsetWidth
        if (p.x > canvas.offsetWidth) p.x = 0
        if (p.y < 0) p.y = canvas.offsetHeight
        if (p.y > canvas.offsetHeight) p.y = 0
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = \gba(255,255,255,\)\
        ctx.fill()
      })
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 150) {
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = \gba(255,255,255,\)\
            ctx.stroke()
          }
        }
      }
      animationId = requestAnimationFrame(animate)
    }
    animate()
    return () => { cancelAnimationFrame(animationId); window.removeEventListener("resize", resize) }
  }, [])
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
}

export default function HomePage() {
  const { settings } = useRole()
  return (
    <div className="bg-background text-on-background min-h-screen selection:bg-cyan-500/30 overflow-hidden relative">
      <style dangerouslySetInnerHTML={{__html: \
        @keyframes gradient-move {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .gradient-text { 
          background: linear-gradient(135deg, #06b6d4, #3b82f6, #14b8a6, #06b6d4); 
          background-size: 300% 300%; 
          animation: gradient-move 6s ease infinite; 
          -webkit-background-clip: text; 
          -webkit-text-fill-color: transparent; 
          background-clip: text; 
        }
        .btn-gradient {
          background: linear-gradient(to right, #0891b2, #2563eb, #0d9488, #0891b2);
          background-size: 300% 100%;
          animation: gradient-move 4s ease infinite;
        }
        @keyframes float-stat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes counter-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @keyframes orbit {
          0% { transform: rotate(0deg) translateX(300px) rotate(0deg); }
          100% { transform: rotate(360deg) translateX(300px) rotate(-360deg); }
        }
        @keyframes orbit-reverse {
          0% { transform: rotate(360deg) translateX(230px) rotate(-360deg); }
          100% { transform: rotate(0deg) translateX(230px) rotate(0deg); }
        }
      \}} />

      <TopNavbar />

      <div className="fixed inset-0 z-0 pointer-events-none">
        <Particles />
        <div className="absolute w-[1000px] h-[1000px] top-[-20%] left-[-20%] bg-cyan-600/10 rounded-full blur-[200px] mix-blend-screen"></div>
        <div className="absolute w-[800px] h-[800px] bottom-[-20%] right-[-10%] bg-teal-600/10 rounded-full blur-[150px] mix-blend-screen"></div>
        <div className="absolute top-[30%] right-[20%] w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[120px] mix-blend-screen"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiLz48L3N2Zz4=')] [mask-image:radial-gradient(ellipse_at_center,black_50%,transparent_100%)] opacity-30"></div>
      </div>

      <div className="relative z-10 w-full pt-16">
        <section className="pt-36 pb-24 px-6 md:px-10 max-w-[1200px] mx-auto flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-variant/30 border border-outline-variant/30 mb-10 backdrop-blur-sm animate-fade-in-up">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.6)]"></span>
            <span className="text-xs font-medium text-on-surface tracking-wide">Phiên b?n 2.0 dã s?n sàng</span>
          </div>

          {settings?.home_title ? (
            <h1 
              className="text-5xl md:text-7xl lg:text-[80px] font-black tracking-tight leading-[1.1] mb-8 animate-fade-in-up" 
              style={{ animationDelay: '0.1s' }}
              dangerouslySetInnerHTML={{ __html: settings.home_title }}
            />
          ) : (
            <h1 className="text-5xl md:text-7xl lg:text-[80px] font-black tracking-tight leading-[1.1] mb-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              N?n t?ng Marketing<br/>
              <span className="gradient-text">M?ng Xã H?i</span> Ð?nh Cao
            </h1>
          )}
          
          <p className="text-lg md:text-xl text-on-surface-variant font-light leading-relaxed max-w-2xl mb-12 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            Gi?i pháp tang tru?ng toàn di?n cho TikTok, Facebook và Google.
            T?i uu hóa chi?n d?ch v?i s?c m?nh c?a công ngh? AI và h? th?ng t? d?ng hóa thông minh.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-5 mb-20 w-full sm:w-auto animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <Link
              href="/login"
              className="relative overflow-hidden rounded-xl group px-10 py-4 w-full sm:w-auto shadow-[0_0_30px_rgba(6,182,212,0.3)] hover:shadow-[0_0_40px_rgba(6,182,212,0.5)] transition-all active:scale-[0.98]"
            >
              <div className="absolute inset-0 btn-gradient opacity-90 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative flex items-center justify-center gap-2 text-white font-semibold tracking-wide">
                B?t d?u ngay
                <span className="material-symbols-outlined text-[20px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </div>
            </Link>
            <Link
              href="/dashboard/tiktok"
              className="px-10 py-4 rounded-xl font-semibold text-on-surface bg-surface border border-outline-variant/30 hover:bg-surface-variant/30 hover:border-outline-variant/30 transition-all w-full sm:w-auto backdrop-blur-xl"
            >
              Khám phá tính nang
            </Link>
          </div>

          <div className="w-full max-w-5xl animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <div className="relative w-[700px] h-[700px] mx-auto hidden lg:block">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 border border-cyan-500/30 backdrop-blur-xl flex items-center justify-center shadow-[0_0_60px_rgba(6,182,212,0.3)]">
                  <img src={settings?.ui_logo || "/logo.png"} alt="TQ MEDIA" className="w-20 h-20 rounded-2xl object-contain" />
                </div>
              </div>

              <div className="absolute inset-[50px] rounded-full border border-outline-variant/30"></div>
              <div className="absolute inset-[120px] rounded-full border border-outline-variant/30"></div>

              <div className="absolute top-1/2 left-1/2 w-0 h-0" style={{ animation: 'orbit 25s linear infinite' }}>
                <div className="flex flex-col items-center gap-1.5 -translate-x-1/2 -translate-y-1/2">
                  <div className="w-12 h-12 shrink-0 drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]">
                    <svg viewBox="0 0 448 512" className="w-full h-full" fill="#22d3ee"><path d="M448 209.91a210.06 210.06 0 0 1-122.77-39.25V349.38A162.55 162.55 0 1 1 185 188.31V278.2a74.62 74.62 0 1 0 52.23 71.18V0l88 0a121.18 121.18 0 0 0 1.86 22.17A122.18 122.18 0 0 0 381 102.39a121.43 121.43 0 0 0 67 20.14Z"></path></svg>
                  </div>
                  <div className="text-[11px] text-on-surface-variant font-bold tracking-wider">2.4M</div>
                </div>
              </div>

              <div className="absolute top-1/2 left-1/2 w-0 h-0" style={{ animation: 'orbit 25s linear infinite', animationDelay: '-8.33s' }}>
                <div className="flex flex-col items-center gap-1.5 -translate-x-1/2 -translate-y-1/2">
                  <div className="w-12 h-12 shrink-0 drop-shadow-[0_0_12px_rgba(59,130,246,0.6)]">
                    <svg viewBox="0 0 512 512" className="w-full h-full" fill="#60a5fa"><path d="M512 256C512 114.6 397.4 0 256 0S0 114.6 0 256c0 120 82.7 220.8 194.2 248.5V334.2h-56.6v-78.2h56.6v-61.3c0-56 33.1-87 83.8-87 24.6 0 50.3 4.4 50.3 4.4v55.1h-28.3c-27.9 0-36.6 17.3-36.6 35.1v42.7h62.1l-9.9 78.2h-52.2v170.3C429.3 476.8 512 376 512 256z"></path></svg>
                  </div>
                  <div className="text-[11px] text-on-surface-variant font-bold tracking-wider">1.8M</div>
                </div>
              </div>

              <div className="absolute top-1/2 left-1/2 w-0 h-0" style={{ animation: 'orbit 25s linear infinite', animationDelay: '-16.67s' }}>
                <div className="flex flex-col items-center gap-1.5 -translate-x-1/2 -translate-y-1/2">
                  <div className="w-12 h-12 shrink-0 drop-shadow-[0_0_12px_rgba(20,184,166,0.6)]">
                    <svg viewBox="0 0 488 512" className="w-full h-full" fill="#2dd4bf"><path d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path></svg>
                  </div>
                  <div className="text-[11px] text-on-surface-variant font-bold tracking-wider">890K</div>
                </div>
              </div>

              <div className="absolute top-1/2 left-1/2 w-0 h-0" style={{ animation: 'orbit-reverse 18s linear infinite' }}>
                <div className="flex flex-col items-center gap-1 -translate-x-1/2 -translate-y-1/2">
                  <div className="w-9 h-9 shrink-0 drop-shadow-[0_0_10px_rgba(239,68,68,0.6)]">
                    <svg viewBox="0 0 576 512" className="w-full h-full" fill="#f87171"><path d="M549.655 124.083c-6.281-23.65-24.787-42.276-48.284-48.597C458.781 64 288 64 288 64S117.22 64 74.629 75.486c-23.497 6.322-42.003 24.947-48.284 48.597-11.412 42.867-11.412 132.305-11.412 132.305s0 89.438 11.412 132.305c6.281 23.65 24.787 41.5 48.284 47.821C117.22 448 288 448 288 448s170.78 0 213.371-11.486c23.497-6.321 42.003-24.171 48.284-47.821 11.412-42.867 11.412-132.305 11.412-132.305s0-89.438-11.412-132.305zm-317.51 213.508V175.185l142.739 81.205-142.739 81.201z"></path></svg>
                  </div>
                  <div className="text-[10px] text-on-surface-variant font-semibold">520K</div>
                </div>
              </div>

              <div className="absolute top-1/2 left-1/2 w-0 h-0" style={{ animation: 'orbit-reverse 18s linear infinite', animationDelay: '-6s' }}>
                <div className="flex flex-col items-center gap-1 -translate-x-1/2 -translate-y-1/2">
                  <div className="w-9 h-9 shrink-0 drop-shadow-[0_0_10px_rgba(236,72,153,0.6)]">
                    <svg viewBox="0 0 448 512" className="w-full h-full" fill="#f472b6"><path d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z"></path></svg>
                  </div>
                  <div className="text-[10px] text-on-surface-variant font-semibold">1.2M</div>
                </div>
              </div>

              <div className="absolute top-1/2 left-1/2 w-0 h-0" style={{ animation: 'orbit-reverse 18s linear infinite', animationDelay: '-12s' }}>
                <div className="flex items-center gap-1.5 -translate-x-1/2 -translate-y-1/2">
                  <span className="material-symbols-outlined text-emerald-400 text-[20px]">trending_up</span>
                  <div className="text-[11px] text-emerald-400 font-bold">+24.8%</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:hidden">
              {[
                { icon: 'shopping_cart', label: 'Ðon hàng', value: '1,284', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
                { icon: 'account_balance_wallet', label: 'Doanh thu', value: '45.2M', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
                { icon: 'group', label: 'Ngu?i dùng', value: '342', color: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/20' },
                { icon: 'monitoring', label: 'Tang tru?ng', value: '+24.8%', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
              ].map((stat) => (
                <div key={stat.label} className={\g-surface \ border backdrop-blur-xl rounded-2xl p-5 text-center\}>
                  <span className={\material-symbols-outlined \ text-[28px] mb-2\}>{stat.icon}</span>
                  <div className="text-xl font-bold text-on-surface">{stat.value}</div>
                  <div className="text-xs text-on-surface-variant uppercase tracking-wider mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24 px-6 md:px-10 max-w-[1200px] mx-auto border-t border-outline-variant/30">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-on-surface mb-4 tracking-tight">Tính nang n?i b?t</h2>
            <p className="text-on-surface-variant text-lg max-w-2xl mx-auto">Công ngh? hàng d?u du?c tích h?p s?n d? giúp b?n b?t phá doanh thu.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: 'bolt', color: 'text-cyan-400', bgColor: 'bg-cyan-500/10', title: 'T? d?ng hóa toàn di?n', desc: 'Thi?t l?p k?ch b?n m?t l?n, h? th?ng s? t? d?ng ch?y chi?n d?ch 24/7 mà không c?n giám sát.' },
              { icon: 'analytics', color: 'text-blue-400', bgColor: 'bg-blue-500/10', title: 'Phân tích AI', desc: 'Thu?t toán AI liên t?c dánh giá và di?u hu?ng dòng ti?n vào các chi?n d?ch hi?u qu? nh?t.' },
              { icon: 'shield_lock', color: 'text-teal-400', bgColor: 'bg-teal-500/10', title: 'B?o m?t tuy?t d?i', desc: 'D? li?u khách hàng và ngân sách du?c mã hóa da t?ng, ch?ng gian l?n click (click t?c) 100%.' },
            ].map((feature) => (
              <div
                key={feature.title}
                className="bg-surface border border-outline-variant/30 backdrop-blur-xl p-8 rounded-2xl hover:bg-surface-variant/30 hover:border-outline-variant/30 transition-all hover:-translate-y-2 group"
              >
                <div className={\w-14 h-14 rounded-2xl \ border border-outline-variant/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform\}>
                  <span className={\material-symbols-outlined \ text-[28px]\}>
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
            <h2 className="text-3xl md:text-5xl font-bold text-on-surface mb-4 tracking-tight">D?ch v? cung c?p</h2>
            <p className="text-on-surface-variant text-lg max-w-2xl mx-auto">M? r?ng ph?u khách hàng trên các n?n t?ng m?ng xã h?i t? ngu?i dùng.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: 'play_circle', color: 'text-[#00f2fe]', title: 'TikTok Ads', desc: 'B?t trend th?n t?c. Phân ph?i video viral d?n hàng tri?u Gen Z và Millennials.', glow: 'rgba(0,242,254,0.1)' },
              { icon: 'thumb_up', color: 'text-[#1877F2]', title: 'Facebook Ads', desc: 'T?i uu chi phí chuy?n d?i (CPA). Re-targeting chính xác t?ng t?p khách truy c?p.', glow: 'rgba(24,119,242,0.1)' },
              { icon: 'search', color: 'text-[#EA4335]', title: 'Google SEO & Ads', desc: 'Chi?m linh Top 1 Google. Ðón d?u nhu c?u tìm ki?m c?a khách hàng có ý d?nh mua cao.', glow: 'rgba(234,67,53,0.1)' },
            ].map((service) => (
              <div
                key={service.title}
                className="bg-surface border border-outline-variant/30 backdrop-blur-xl p-8 rounded-2xl text-center hover:bg-surface-variant/30 transition-all relative overflow-hidden group cursor-pointer"
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: \adial-gradient(circle at top, \, transparent 70%)\ }}></div>
                <span className={\material-symbols-outlined text-[48px] \ mb-6 relative z-10 group-hover:scale-110 transition-transform duration-300\}>
                  {service.icon}
                </span>
                <h3 className="text-xl font-semibold text-on-surface mb-3 relative z-10">{service.title}</h3>
                <p className="text-on-surface-variant text-sm leading-relaxed mb-6 relative z-10">{service.desc}</p>
                <button className={\	ext-sm font-semibold \ hover:underline underline-offset-4 relative z-10\}>
                  Khám phá ngay &rarr;
                </button>
              </div>
            ))}
          </div>
        </section>

        <Footer />
      </div>
    </div>
  )
}


fs.writeFileSync('src/app/page.tsx', content);
