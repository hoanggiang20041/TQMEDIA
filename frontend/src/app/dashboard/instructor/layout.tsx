'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRole } from '@/context/RoleContext'

export default function InstructorLayout({ children }: { children: React.ReactNode }) {
  const { role, isLoading } = useRole()
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    if (!isLoading) {
      if (role === 'ADMIN' || role === 'INSTRUCTOR') {
        setAuthorized(true)
      } else {
        router.push('/dashboard')
      }
    }
  }, [role, isLoading, router])

  if (isLoading || !authorized) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <span className="material-symbols-outlined animate-spin text-4xl text-cyan-400">progress_activity</span>
      </div>
    )
  }

  return <>{children}</>
}
