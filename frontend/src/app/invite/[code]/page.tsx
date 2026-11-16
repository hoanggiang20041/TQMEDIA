"use client"

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useRole } from '@/context/RoleContext'
import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'

const MySwal = withReactContent(Swal)

export default function InviteCodePage() {
  const params = useParams()
  const router = useRouter()
  const code = params.code as string
  const { user, refreshUser } = useRole()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (code) {
      handleInvite()
    } else {
      router.replace('/')
    }
  }, [code, user])

  const handleInvite = async () => {
    // If not logged in, save code to localStorage and redirect to login
    if (!user) {
      localStorage.setItem('pending_invite_code', code)
      MySwal.fire({
        icon: 'info',
        title: 'Yêu cầu đăng nhập',
        text: 'Vui lòng đăng nhập hoặc đăng ký tài khoản để nhận đặc quyền Đại lý!',
        confirmButtonText: 'Đăng nhập ngay'
      }).then(() => {
        router.replace('/login')
      })
      return
    }

    // User is logged in, attempt to upgrade using the code
    try {
      const token = localStorage.getItem('tq_token')
      if (!token) return

      // Instead of an explicit upgrade endpoint, we'll try to trigger a login with token to upgrade
      // But the backend only handles inviteCode in /api/auth/register or /api/auth/login.
      // Wait, there is no separate /api/invite endpoint! 
      // I should create one in server.ts OR just let them know it's not ready.
      
      const res = await fetch('/api/user/apply-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ inviteCode: code })
      })

      const data = await res.json()
      if (data.success) {
        await MySwal.fire({
          icon: 'success',
          title: 'Nâng cấp thành công!',
          text: `Chúc mừng bạn đã được nâng cấp lên Đại lý Cấp ${data.level}!`,
          confirmButtonText: 'Vào Trang Chủ'
        })
        localStorage.removeItem('pending_invite_code')
        await refreshUser()
        router.replace('/dashboard')
      } else {
        await MySwal.fire({
          icon: 'error',
          title: 'Không hợp lệ',
          text: data.error || 'Mã mời không tồn tại hoặc đã hết lượt sử dụng.'
        })
        localStorage.removeItem('pending_invite_code')
        router.replace('/dashboard')
      }
    } catch (err) {
      MySwal.fire({ icon: 'error', title: 'Lỗi', text: 'Đã có lỗi xảy ra. Vui lòng thử lại sau.' })
      router.replace('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <span className="material-symbols-outlined animate-spin text-5xl text-primary mb-4 block">sync</span>
        <p className="text-on-surface-variant animate-pulse">Đang xử lý liên kết lời mời...</p>
      </div>
    </div>
  )
}
