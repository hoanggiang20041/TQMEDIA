import type { Metadata } from 'next'
import { Inter, Geist } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-inter',
  display: 'swap',
})

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
  display: 'swap',
})

export async function generateMetadata(): Promise<Metadata> {
  let faviconUrl = '/favicon.ico';
  try {
    const res = await fetch('http://localhost:4000/api/settings', { next: { revalidate: 60 } });
    if (res.ok) {
      const data = await res.json();
      if (data.ui_favicon) {
        faviconUrl = data.ui_favicon;
      }
    }
  } catch (err) {
    console.warn('Could not fetch dynamic favicon during SSR');
  }

  return {
    title: {
      default: 'TQMEDIA - Nền tảng Marketing Mạng Xã Hội',
      template: '%s | TQMEDIA',
    },
    description: 'Giải pháp tăng trưởng toàn diện cho TikTok, Facebook và Google. Tối ưu hóa chiến dịch với công nghệ AI và tự động hóa.',
    icons: {
      icon: faviconUrl,
    }
  }
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

import { RoleProvider } from '@/context/RoleContext'
import { ThemeProvider } from '@/context/ThemeContext'
import Chatbot from '@/components/Chatbot'
import LegalBanner from '@/components/LegalBanner'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi" className={`${inter.variable} ${geist.variable}`} suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        {/* Prevent flash of incorrect theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.getItem('tq_theme') === 'dark') {
                  document.documentElement.classList.add('dark')
                } else {
                  document.documentElement.classList.remove('dark')
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="bg-background text-on-background font-body-md min-h-screen antialiased flex flex-col pb-[100px]">
        <ThemeProvider>
          <RoleProvider>
            {children}
            <Chatbot />
            <LegalBanner isGlobal={true} />
          </RoleProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
