'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function RegisterRedirectContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const invite = searchParams.get('invite')
    const ref = searchParams.get('ref')
    if (invite) {
      router.replace(`/login?invite=${invite}`)
    } else if (ref) {
      router.replace(`/login?ref=${ref}`)
    } else {
      router.replace('/login')
    }
  }, [router, searchParams])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <span className="material-symbols-outlined animate-spin text-4xl text-cyan-400">progress_activity</span>
    </div>
  )
}

export default function RegisterRedirectPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><span className="material-symbols-outlined animate-spin text-4xl text-cyan-400">progress_activity</span></div>}>
      <RegisterRedirectContent />
    </Suspense>
  )
}
