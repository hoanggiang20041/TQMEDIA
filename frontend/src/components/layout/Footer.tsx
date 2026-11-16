'use client';

import Link from 'next/link'
import Image from 'next/image'
import { FOOTER_LINKS } from '@/lib/constants'
import { useEffect, useState } from 'react'

export default function Footer() {
  const [settings, setSettings] = useState<any>({});

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => setSettings(data))
      .catch(() => {});
  }, []);

  const footerDesc = settings.footer_desc || "Nền tảng marketing mạng xã hội hàng đầu Việt Nam. Tối ưu hóa chiến dịch với công nghệ AI.";
  const fbLink = settings.contact_facebook || "";
  const zaloLink = settings.contact_zalo || "";
  const tiktokLink = settings.contact_tiktok || "";
  const email = settings.contact_email || "hotro@tqmedia.com";
  const hotline = settings.contact_hotline || "0853.111.999";
  const copyright = settings.footer_copyright || "© 2024 TQ MEDIA. Tất cả quyền được bảo lưu.";

  return (
    <footer className="w-full py-16 border-t border-outline-variant/30 mt-20 bg-surface">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10">
        {/* Top row */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-8 md:gap-10 mb-12">
          {/* Brand */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 group">
              <div className="relative w-10 h-10 overflow-hidden rounded-full flex items-center justify-center bg-black/5 dark:bg-transparent shrink-0">
                <Image
                  src={settings?.ui_logo || "/logo.png"}
                  alt="TQ Media Logo"
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                  priority
                />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-teal-400 uppercase animate-gradient-x leading-none">TQ MEDIA</span>
                <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-mono mt-0.5">Enterprise</span>
              </div>
            </div>
            <div 
              className="text-on-surface-variant text-sm max-w-xs leading-relaxed"
              dangerouslySetInnerHTML={{ __html: footerDesc }}
            />
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-4 md:gap-10">
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-on-surface-variant text-sm font-medium hover:text-on-surface transition-colors whitespace-nowrap"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Contact Info & Social icons */}
          <div className="flex flex-row md:flex-col justify-between md:justify-start items-center md:items-start w-full md:w-auto gap-4">
            <div className="text-left space-y-2 shrink-0">
              <div className="flex items-center gap-2 text-on-surface-variant text-sm">
                <span className="material-symbols-outlined text-[18px]">call</span>
                <span>{hotline}</span>
              </div>
              <div className="flex items-center gap-2 text-on-surface-variant text-sm">
                <span className="material-symbols-outlined text-[18px]">mail</span>
                <span>{email}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {fbLink && (
                <a href={fbLink} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-surface-variant/30 border border-outline-variant/30 flex items-center justify-center hover:bg-blue-500/10 hover:border-blue-500/30 transition-all">
                  <img src="/icons/facebook.svg" alt="Facebook" className="w-5 h-5" />
                </a>
              )}
              {zaloLink && (
                <a href={zaloLink} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-surface-variant/30 border border-outline-variant/30 flex items-center justify-center hover:bg-blue-400/10 hover:border-blue-400/30 transition-all font-bold text-blue-500 text-xs">
                  Zalo
                </a>
              )}
              {tiktokLink && (
                <a href={tiktokLink} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-surface-variant/30 border border-outline-variant/30 flex items-center justify-center hover:bg-cyan-500/10 hover:border-cyan-500/30 transition-all">
                  <img src="/icons/tiktok.svg" alt="TikTok" className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-outline-variant/30 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-on-surface-variant text-xs font-medium">{copyright}</p>
          <p className="text-neutral-600 text-xs">Powered by AI Technology</p>
        </div>
      </div>
    </footer>
  )
}
