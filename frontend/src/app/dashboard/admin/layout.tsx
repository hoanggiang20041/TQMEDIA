'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useRole } from '@/context/RoleContext'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { role, isLoading } = useRole()
  const router = useRouter()
  const pathname = usePathname()
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    if (!isLoading) {
      if (role === 'ADMIN') {
        setAuthorized(true)
      } else if (role === 'INSTRUCTOR') {
        // Hướng dẫn viên chỉ được phép vào quản lý ghi danh
        if (
          pathname === '/dashboard/admin/enrollments' || 
          pathname.startsWith('/dashboard/admin/enrollments/')
        ) {
          setAuthorized(true)
        } else {
          router.push('/dashboard')
        }
      } else if (role === 'TECHNICIAN') {
        if (
          pathname === '/dashboard/admin/live-chat' ||
          pathname.startsWith('/dashboard/admin/live-chat/')
        ) {
          setAuthorized(true)
        } else {
          router.push('/dashboard')
        }
      } else {
        // Các role khác không được vào admin
        router.push('/dashboard')
      }
    }
  }, [role, isLoading, router, pathname])

  if (isLoading || !authorized) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <span className="material-symbols-outlined animate-spin text-4xl text-cyan-400">progress_activity</span>
      </div>
    )
  }

  return <>{children}</>
}
