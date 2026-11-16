const fs = require('fs');
const content = `"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/context/AuthContext'
import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'
import Link from 'next/link'
import { useSearchParams, useParams, useRouter } from 'next/navigation'

const MySwal = withReactContent(Swal)

export default function GenericServicePage() {
  const { user, refreshUser } = useAuth()
  const params = useParams()
  const router = useRouter()
  const platform = (params.platform as string) || 'facebook'

  const [servers, setServers] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)
  const [currentServiceType, setCurrentServiceType] = useState<string>('')
  const [currentServerIdx, setCurrentServerIdx] = useState(0)
  const [url, setUrl] = useState('')
  const [quantity, setQuantity] = useState(100)
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  
  // Custom Data Fields
  const [comments, setComments] = useState('')
  const [reactionType, setReactionType] = useState('LIKE')

  useEffect(() => {
    fetch(\`/api/services/\${platform}\`, { headers: { 'Authorization': \`Bearer \${localStorage.getItem('tq_token')}\` } })
      .then(res => res.json())
      .then(data => {
        setServers(data)
        const types = Object.keys(data)
        if (types.length > 0) {
          setCurrentServiceType(types[0])
          setCurrentServerIdx(0)
          setQuantity(data[types[0]][0]?.min || 100)
        }
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load servers', err)
        setLoading(false)
      })
  }, [platform])

  const availableServers = servers[currentServiceType] || []
  const currentServer = availableServers[currentServerIdx] ?? availableServers[0]

  const isCommentService = currentServiceType.toLowerCase().includes('comment') || currentServiceType.toLowerCase().includes('bình luận')
  const isReactionService = currentServiceType.toLowerCase().includes('reaction') || currentServiceType.toLowerCase().includes('cảm xúc')

  // Auto calculate quantity for comments
  useEffect(() => {
    if (isCommentService) {
      const lines = comments.split('\\n').filter(l => l.trim() !== '')
      const newQuantity = lines.length
      if (newQuantity < (currentServer?.min || 1)) {
        setQuantity(currentServer?.min || 1)
      } else if (newQuantity > (currentServer?.max || 10000)) {
        setQuantity(currentServer?.max || 10000)
      } else {
        setQuantity(newQuantity)
      }
    }
  }, [comments, isCommentService, currentServer])

  const handleServiceTypeChange = (type: string) => {
    setCurrentServiceType(type)
    setCurrentServerIdx(0)
    const firstServer = servers[type]?.[0]
    setQuantity(firstServer?.min || 100)
    setComments('')
    setReactionType('LIKE')
  }

  const handleServerChange = (idx: number) => {
    setCurrentServerIdx(idx)
    const srv = servers[currentServiceType]?.[idx]
    if (srv && !isCommentService) {
      if (quantity < srv.min) setQuantity(srv.min)
      if (quantity > srv.max) setQuantity(srv.max)
    }
  }

  const discount = user?.agencyLevel ? [0, 5, 10, 15, 20][user.agencyLevel] || 0 : 0

  const total = useMemo(() => {
    const discountedPrice = currentServer?.price * (1 - discount / 100) || 0
    return discountedPrice * quantity
  }, [currentServer, quantity, discount])

  const fmt = (val: number) => new Intl.NumberFormat('vi-VN').format(val)

  const handleCreateOrder = async () => {
    if (!currentServer) return MySwal.fire({ icon: 'info', title: 'Thông báo', text: 'Vui lòng chọn máy chủ!' })
    if (currentServer?.status === 'bao_tri') return MySwal.fire({ icon: 'error', title: 'Bảo trì', text: 'Máy chủ đang bảo trì!' })
    if (!url) return MySwal.fire({ icon: 'info', title: 'Thông báo', text: 'Vui lòng nhập link!' })
    
    if (isCommentService && comments.split('\\n').filter(l=>l.trim()).length === 0) {
      return MySwal.fire({ icon: 'info', title: 'Thông báo', text: 'Vui lòng nhập nội dung bình luận!' })
    }

    const confirmObj = await MySwal.fire({
      title: 'Xác nhận tạo đơn',
      text: \`Bạn có chắc chắn muốn thanh toán \${fmt(total)}đ cho đơn hàng này?\`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Đồng ý',
      cancelButtonText: 'Hủy'
    })
    
    if (!confirmObj.isConfirmed) return

    setIsSubmitting(true)
    try {
      const customData: any = {}
      if (isCommentService) customData.comments = comments
      if (isReactionService) customData.reactionType = reactionType

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${localStorage.getItem('tq_token')}\` },
        body: JSON.stringify({
          platform: platform,
          serviceType: currentServiceType,
          serverId: currentServer.id,
          serverName: currentServer.name,
          target: url,
          quantity: quantity,
          total: total,
          note: note,
          customData: Object.keys(customData).length > 0 ? customData : undefined
        })
      })
      const data = await res.json()
      if (data.success) {
        setSuccessMessage(\`Bạn đã tạo thành công 1 đơn hàng với tổng trị giá \${fmt(total)}đ.\`)
        setShowSuccessModal(true)
        setUrl('')
        setNote('')
        setComments('')
        refreshUser()
      } else {
        MySwal.fire({ icon: 'info', title: 'Thông báo', text: data.error || 'Có lỗi xảy ra!' })
      }
    } catch (err) {
      MySwal.fire({ icon: 'error', title: 'Thông báo', text: 'Không thể kết nối đến máy chủ!' })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-on-surface">Đang tải dữ liệu máy chủ...</div>
  if (Object.keys(servers).length === 0) return <div className="p-8 text-center text-on-surface">Không có dịch vụ nào cho nền tảng này.</div>

  return (
    <>
      <section className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/20 text-primary border border-primary/30">
          <span className="material-symbols-outlined text-[28px]">rocket_launch</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-on-surface tracking-tight capitalize">Dịch Vụ {platform}</h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Hệ thống tự động tăng tương tác an toàn và nhanh chóng
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
        {/* Left Column: Form */}
        <div className="space-y-6">
          <div className="glass-panel p-6 border border-outline-variant/30 relative overflow-hidden">
            <h2 className="text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">shopping_cart</span>
              Tạo đơn mới
            </h2>

            <div className="space-y-5">
              {/* Service Types Tabs */}
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-2">Loại Dịch Vụ</label>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(servers).map((type) => (
                    <button
                      key={type}
                      onClick={() => handleServiceTypeChange(type)}
                      className={\`px-4 py-2 rounded-xl text-sm font-medium transition-all \${
                        currentServiceType === type
                          ? 'bg-primary text-background shadow-lg shadow-primary/20'
                          : 'bg-surface border border-outline-variant/50 text-on-surface-variant hover:bg-surface-variant'
                      }\`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* URL */}
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">
                  Link / URL mục tiêu <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">link</span>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    className="input-glass w-full pl-10"
                  />
                </div>
              </div>

              {/* Servers */}
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-2">Chọn Máy Chủ</label>
                <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                  {availableServers.map((srv, idx) => (
                    <label
                      key={srv.id}
                      className={\`block cursor-pointer p-4 rounded-xl border transition-all \${
                        currentServerIdx === idx 
                          ? 'bg-primary/5 border-primary/50' 
                          : 'bg-surface/50 border-outline-variant/30 hover:border-primary/30'
                      }\`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1 flex-shrink-0">
                          <input
                            type="radio"
                            name="server"
                            className="w-4 h-4 text-primary bg-background border-outline-variant focus:ring-primary focus:ring-offset-background"
                            checked={currentServerIdx === idx}
                            onChange={() => handleServerChange(idx)}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-bold text-on-surface text-base break-words">{srv.name}</span>
                            {srv.status === 'bao_tri' && (
                              <span className="bg-error/10 text-error px-2 py-0.5 rounded text-[10px] font-bold uppercase">Bảo trì</span>
                            )}
                            {srv.status === 'cham' && (
                              <span className="bg-warning/10 text-warning px-2 py-0.5 rounded text-[10px] font-bold uppercase">Chậm</span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm mt-2">
                            <div className="text-cyan-400 font-bold bg-cyan-400/10 px-2 py-1 rounded">
                              {fmt(srv.price)}đ / 1
                            </div>
                            {srv.originalPrice && (
                              <div className="text-on-surface-variant line-through text-xs">
                                {fmt(srv.originalPrice)}đ
                              </div>
                            )}
                          </div>
                          {srv.desc && (
                            <div className="mt-2 text-sm text-on-surface-variant bg-surface-variant/30 p-2 rounded whitespace-pre-wrap">
                              {srv.desc}
                            </div>
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Custom Fields */}
              {isReactionService && (
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-1">Loại cảm xúc</label>
                  <select
                    value={reactionType}
                    onChange={(e) => setReactionType(e.target.value)}
                    className="input-glass w-full"
                  >
                    <option value="LIKE">👍 Like</option>
                    <option value="LOVE">❤️ Love</option>
                    <option value="CARE">🥰 Care</option>
                    <option value="HAHA">😆 Haha</option>
                    <option value="WOW">😮 Wow</option>
                    <option value="SAD">😢 Sad</option>
                    <option value="ANGRY">😡 Angry</option>
                  </select>
                </div>
              )}

              {isCommentService && (
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-1 flex justify-between">
                    <span>Nội dung bình luận</span>
                    <span className="text-primary">{comments.split('\\n').filter(l=>l.trim()).length} dòng</span>
                  </label>
                  <textarea
                    rows={5}
                    placeholder="Mỗi dòng 1 bình luận..."
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    className="input-glass w-full resize-none p-3"
                  />
                </div>
              )}

              {/* Quantity */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-1">Số lượng</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={e => {
                      if (!isCommentService) setQuantity(Number(e.target.value))
                    }}
                    readOnly={isCommentService}
                    className={\`input-glass w-full font-bold \${isCommentService ? 'bg-surface-variant/50 text-on-surface-variant' : 'text-on-surface'}\`}
                  />
                  {currentServer && !isCommentService && (
                    <p className="text-xs text-on-surface-variant mt-1">Min: {currentServer.min} - Max: {currentServer.max}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-1">Giá / 1</label>
                  <input
                    type="text"
                    value={\`\${fmt(currentServer?.price || 0)}đ\`}
                    readOnly
                    className="input-glass w-full bg-surface-variant/50 text-cyan-400 font-bold"
                  />
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">Ghi chú đơn hàng</label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú thêm nếu cần..."
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  className="input-glass w-full resize-none"
                />
              </div>

              {/* Total & Submit */}
              <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl mt-6 relative overflow-hidden">
                <div className="flex justify-between items-center relative z-10">
                  <span className="text-on-surface font-medium">Tổng thanh toán:</span>
                  <div className="text-right">
                    <span className="text-2xl font-black text-primary drop-shadow-md neon-glow">{fmt(total)}đ</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleCreateOrder}
                disabled={isSubmitting || !currentServer || currentServer.status === 'bao_tri'}
                className="btn-primary w-full h-12 text-lg font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all"
              >
                {isSubmitting ? (
                  <span className="material-symbols-outlined animate-spin">sync</span>
                ) : (
                  <span className="material-symbols-outlined">payments</span>
                )}
                {isSubmitting ? 'Đang xử lý...' : 'Tạo Đơn Ngay'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Info */}
        <div className="space-y-6">
          <div className="glass-panel p-5 border border-outline-variant/30">
            <h3 className="text-on-surface font-bold flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-warning">warning</span>
              Lưu ý quan trọng
            </h3>
            <div className="space-y-3 text-sm text-on-surface-variant">
              <p>• Hệ thống ưu tiên chất lượng và tốc độ hoàn thành.</p>
              <p>• Vui lòng kiểm tra kỹ link trước khi đặt đơn.</p>
              <p>• Đơn sai link sẽ không được hoàn tiền.</p>
              <p>• Nếu máy chủ bảo trì, đơn sẽ tự động hủy và hoàn tiền.</p>
              <p>• Tốc độ chạy phụ thuộc vào máy chủ và thuật toán nền tảng tại thời điểm đó.</p>
            </div>
          </div>
        </div>
      </div>

      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowSuccessModal(false)}></div>
          <div className="relative glass-panel p-8 max-w-sm w-full text-center border border-success/30 shadow-[0_0_50px_rgba(16,185,129,0.2)] zoom-in-95 animate-in">
            <div className="w-20 h-20 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-6 text-success animate-bounce">
              <span className="material-symbols-outlined text-5xl">check_circle</span>
            </div>
            <h3 className="text-2xl font-bold text-on-surface mb-2">Thành công!</h3>
            <p className="text-on-surface-variant mb-8">{successMessage}</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setShowSuccessModal(false)} className="btn-social flex-1 justify-center">Đóng</button>
              <Link href="/dashboard/orders" className="btn-primary flex-1 justify-center">Xem Đơn</Link>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
`;

fs.writeFileSync('d:/TQMEDIA/frontend/src/app/dashboard/[platform]/page.tsx', content, 'utf8');
console.log('Done!');
