'use client'

import { useEffect, useState } from 'react'

interface SuccessModalProps {
  isOpen: boolean
  onClose: () => void
  onContinue: () => void
  orderId?: string
  message?: string
  title?: string
}

export default function SuccessModal({ 
  isOpen, 
  onClose, 
  onContinue,
  orderId,
  message = 'Đơn hàng của bạn đã được tiếp nhận và đang được hệ thống xử lý tốc độ cao.',
  title = 'Đặt Hàng Thành Công!'
}: SuccessModalProps) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setShow(true)
    } else {
      const timer = setTimeout(() => setShow(false), 400)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  if (!isOpen && !show) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-background/80 backdrop-blur-md transition-all duration-500 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      {/* Modal Container */}
      <div 
        className={`relative w-full max-w-[520px] overflow-hidden rounded-[2.5rem] border border-white/20 bg-surface/90 p-1 shadow-[0_0_80px_rgba(34,197,94,0.15)] backdrop-blur-2xl transition-all duration-500 ease-out ${
          isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-90 opacity-0 translate-y-8'
        }`}
      >
        {/* Soft Glow Background inside Modal */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent rounded-[2.4rem] opacity-60" />
        <div className="absolute inset-0 bg-surface/95 backdrop-blur-3xl rounded-[2.4rem]" />

        {/* Content */}
        <div className="relative flex flex-col items-center px-10 py-12 text-center">
          
          <style>{`
            @keyframes drawCheck {
              0% { stroke-dashoffset: 30; }
              100% { stroke-dashoffset: 0; }
            }
            @keyframes popIn {
              0% { transform: scale(0.5); opacity: 0; }
              80% { transform: scale(1.1); opacity: 1; }
              100% { transform: scale(1); opacity: 1; }
            }
          `}</style>

          {/* Animated SVG Success Icon */}
          <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-green-400/20 to-emerald-600/20 shadow-[0_0_50px_rgba(34,197,94,0.4)]">
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-[inset_0_-2px_10px_rgba(0,0,0,0.2)] animate-[popIn_0.5s_cubic-bezier(0.175,0.885,0.32,1.275)_forwards]">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path 
                  d="M6 12.5L10 16.5L18 7.5" 
                  stroke="white" 
                  strokeWidth="3.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  style={{ 
                    strokeDasharray: 30, 
                    strokeDashoffset: 30,
                    animation: 'drawCheck 0.5s ease-out 0.3s forwards'
                  }}
                />
              </svg>
            </div>
          </div>

          <h2 className="mb-3 text-[32px] font-bold text-on-surface tracking-tight">
            {title}
          </h2>
          
          <p className="mb-8 text-[17px] font-medium text-on-surface-variant leading-relaxed">
            {message}
          </p>

          {orderId && (
            <div className="mb-10 flex w-full flex-col items-center rounded-2xl border border-outline-variant/30 bg-surface-variant/50 p-5">
              <span className="mb-2 text-sm font-semibold uppercase tracking-wider text-on-surface-variant">Mã giao dịch</span>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-green-500 text-[22px]">receipt_long</span>
                <span className="font-mono text-2xl font-bold text-on-surface tracking-widest">{orderId}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex w-full flex-col gap-4 sm:flex-row">
            <button 
              onClick={onClose}
              className="flex-1 rounded-2xl border-2 border-outline-variant/50 bg-surface-variant/30 py-4 text-lg font-bold text-on-surface transition-all duration-300 hover:bg-surface-variant hover:border-outline-variant active:scale-95"
            >
              Đóng
            </button>
            <button 
              onClick={onContinue}
              className="flex-1 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 py-4 text-lg font-bold text-white shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all duration-300 hover:shadow-[0_0_30px_rgba(34,197,94,0.5)] hover:brightness-110 active:scale-95"
            >
              Đặt Tiếp Tục
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
