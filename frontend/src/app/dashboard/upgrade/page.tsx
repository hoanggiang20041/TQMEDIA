'use client'

import React, { useState, useEffect } from 'react'
import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'
import { useRole } from '@/context/RoleContext'

const MySwal = withReactContent(Swal)

export default function UpgradeAgencyPage() {
  const { user } = useRole()
  const [config, setConfig] = useState<any[]>([])
  const [currentLevel, setCurrentLevel] = useState(0)
  const [balance, setBalance] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const res = await fetch('/api/user/agency-upgrade-config', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('tq_token')}` }
      })
      const data = await res.json()
      if (data.success) {
        setConfig(data.config)
        setCurrentLevel(data.currentLevel)
        setBalance(data.balance)
      }
      setLoading(false)
    } catch (err) {
      setLoading(false)
    }
  }

  const handleUpgrade = async (targetLevel: number, price: number) => {
    if (balance < price) {
      return MySwal.fire({
        icon: 'error',
        title: 'Số dư không đủ',
        text: 'Vui lòng nạp thêm tiền vào tài khoản để nâng cấp.'
      })
    }

    const confirm = await MySwal.fire({
      title: `Xác nhận nâng cấp Đại lý Cấp ${targetLevel}?`,
      text: `Bạn sẽ bị trừ ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price)} vào số dư.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Đồng ý nâng cấp',
      cancelButtonText: 'Hủy'
    })

    if (confirm.isConfirmed) {
      try {
        const res = await fetch('/api/user/upgrade-agency', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('tq_token')}` },
          body: JSON.stringify({ targetLevel })
        })
        const data = await res.json()
        if (data.success) {
          await MySwal.fire({
            icon: 'success',
            title: 'Nâng cấp thành công!',
            text: `Chúc mừng bạn đã trở thành Đại lý Cấp ${targetLevel}. Bạn có thể tận hưởng mức chiết khấu mới ngay lập tức!`
          })
          window.location.reload()
        } else {
          MySwal.fire({ icon: 'error', title: 'Lỗi', text: data.error })
        }
      } catch (err) {
        MySwal.fire({ icon: 'error', title: 'Lỗi hệ thống', text: 'Vui lòng thử lại sau.' })
      }
    }
  }

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div></div>

  return (
    <div className="space-y-10 animate-fade-in-up pb-10 pt-10 md:pt-16">
      <div className="text-center space-y-3 max-w-3xl mx-auto">
        <h1 className="text-3xl md:text-5xl font-extrabold text-primary drop-shadow-sm leading-tight">Nâng cấp Đại lý</h1>
        <p className="text-on-surface-variant text-base md:text-lg">Kích hoạt các mức chiết khấu độc quyền để tối ưu hóa lợi nhuận kinh doanh của bạn.</p>
      </div>

      <div className="bg-surface-variant/40 border border-outline-variant/30 rounded-3xl p-6 md:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-md relative">
        <div className="relative z-10">
          <p className="text-on-surface-variant font-semibold text-sm uppercase tracking-wider mb-1">Cấp bậc hiện tại</p>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-3xl">verified</span>
            <p className="text-3xl font-black text-on-surface">
              {user?.role === 'ADMIN' ? 'Quản Trị Viên' : currentLevel === 0 ? 'Khách Hàng' : `Đại lý Cấp ${currentLevel}`}
            </p>
          </div>
        </div>
        <div className="sm:text-right relative z-10 bg-surface/80 p-4 rounded-2xl border border-outline-variant/50 shadow-sm backdrop-blur-md">
          <p className="text-on-surface-variant font-semibold text-sm uppercase tracking-wider mb-1">Số dư khả dụng</p>
          <p className="text-2xl font-bold text-primary">
            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(balance)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
        {config.map(cfg => {
          const level = cfg.level
          const price = cfg.price
          const isCurrent = currentLevel === level
          const isPassed = currentLevel > level
          
          return (
            <div key={level} className={`relative flex flex-col bg-surface rounded-3xl transition-all duration-500 group ${isCurrent ? 'ring-2 ring-primary shadow-lg scale-105 z-10' : 'border border-outline hover:border-primary/50 hover:shadow-xl hover:-translate-y-2'}`}>
              {/* Highlight ribbon for current */}
              {isCurrent && (
                <div className="absolute top-5 -right-12 bg-primary text-on-primary text-xs font-bold px-12 py-1 rotate-45 shadow-md overflow-hidden">
                  ĐANG DÙNG
                </div>
              )}
              
              <div className={`p-8 text-center ${isPassed ? 'opacity-60 grayscale-[50%]' : ''}`}>
                <div className={`w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-6 shadow-sm transition-transform group-hover:scale-110 ${isCurrent ? 'bg-primary text-on-primary shadow-primary/40' : isPassed ? 'bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400' : 'bg-surface-variant/50 text-primary border border-primary/20'}`}>
                  <span className="material-symbols-outlined text-4xl">workspace_premium</span>
                </div>
                
                <h3 className={`text-2xl font-black mb-3 ${isCurrent ? 'text-primary' : 'text-on-surface'}`}>Đại lý Cấp {level}</h3>
                <div className="flex justify-center items-end gap-1 mb-2">
                  <p className={`text-3xl font-extrabold tracking-tight ${isPassed ? 'text-gray-500 dark:text-gray-400 line-through' : 'text-on-surface'}`}>
                    {new Intl.NumberFormat('vi-VN').format(price)}
                  </p>
                  <span className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">đ</span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Phí kích hoạt một lần</p>
              </div>

              <div className={`px-6 pb-8 flex-1 flex flex-col ${isPassed ? 'opacity-60 grayscale-[50%]' : ''}`}>
                <div className="space-y-4 flex-1 mb-8">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 bg-green-500/20 text-green-500 rounded-full p-0.5"><span className="material-symbols-outlined text-[14px] block">check</span></div>
                    <span className="text-sm text-on-surface font-medium leading-tight">Chiết khấu tốt nhất cho Cấp {level}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 bg-green-500/20 text-green-500 rounded-full p-0.5"><span className="material-symbols-outlined text-[14px] block">check</span></div>
                    <span className="text-sm text-on-surface font-medium leading-tight">Độc quyền trọn đời, không gia hạn</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 bg-green-500/20 text-green-500 rounded-full p-0.5"><span className="material-symbols-outlined text-[14px] block">check</span></div>
                    <span className="text-sm text-on-surface font-medium leading-tight">Hỗ trợ kỹ thuật ưu tiên 24/7</span>
                  </div>
                </div>

                <button
                  onClick={() => handleUpgrade(level, price)}
                  disabled={isCurrent || isPassed || price === 0}
                  className={`w-full py-4 rounded-2xl font-bold text-sm tracking-wide uppercase transition-all duration-300 ${
                    isCurrent ? 'bg-primary/10 text-primary cursor-default border-2 border-primary/20' :
                    isPassed ? 'bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed border border-gray-300 dark:border-gray-700' :
                    'bg-primary text-on-primary hover:opacity-90 shadow-md'
                  }`}
                >
                  {isCurrent ? 'Đang kích hoạt' : isPassed ? 'Đã vượt qua' : (price > 0 ? 'Nâng cấp ngay' : 'Đang cập nhật')}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
