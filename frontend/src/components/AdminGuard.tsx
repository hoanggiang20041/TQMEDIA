'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRole } from '@/context/RoleContext'

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { role, isLoading } = useRole()
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    if (!isLoading) {
      if (role !== 'ADMIN') {
        router.push('/dashboard')
      } else {
        setAuthorized(true)
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
