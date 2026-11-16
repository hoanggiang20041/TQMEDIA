'use client'

import { useState } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import DashboardNav from '@/components/layout/DashboardNav'
import { useRole } from '@/context/RoleContext'
import LegalBanner from '@/components/LegalBanner'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const { isLoading, user } = useRole()

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-background">
        <span className="material-symbols-outlined animate-spin text-4xl text-cyan-400">progress_activity</span>
      </div>
    )
  }

  // Nếu không có user (tức là token không hợp lệ hoặc đã bị xoá), không render nội dung bên trong
  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-[100dvh] overflow-hidden bg-background text-on-background selection:bg-cyan-500/30">
      <Sidebar 
        isCollapsed={isSidebarCollapsed} 
        toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
        isMobileOpen={isMobileSidebarOpen}
        closeMobile={() => setIsMobileSidebarOpen(false)}
      />
      <div className={`flex-1 flex flex-col h-[100dvh] overflow-hidden relative transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'md:ml-[80px]' : 'md:ml-64'}`}>
        {/* Background Gradients for Dashboard Area */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="hidden md:block absolute w-[600px] h-[600px] top-[-20%] right-[-10%] bg-cyan-600/10 rounded-full blur-[150px] mix-blend-screen"></div>
          <div className="hidden md:block absolute w-[500px] h-[500px] bottom-[-20%] left-[-10%] bg-teal-600/10 rounded-full blur-[120px] mix-blend-screen"></div>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiLz48L3N2Zz4=')] [mask-image:radial-gradient(ellipse_at_center,black_50%,transparent_100%)] opacity-30 dark:opacity-30"></div>
        </div>

        <DashboardNav onMenuClick={() => setIsMobileSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 pb-32 md:pb-32 relative flex flex-col">
          <div className="max-w-[1400px] mx-auto flex flex-col gap-8 w-full flex-1">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
