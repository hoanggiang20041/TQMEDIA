'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useRole } from '@/context/RoleContext'

function AffiliatePage() {
  const router = useRouter()
  const { user } = useRole()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [copySuccess, setCopySuccess] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const res = await fetch('/api/referrals', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('tq_token')}` }
      })
      const d = await res.json()
      if (d.success) {
        if (!d.affiliateEnabled) {
          router.push('/dashboard')
          return
        }
        setData(d)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const referralLink = data?.referralCode ? `${window.location.origin}/register?ref=${data.referralCode}` : ''

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink)
    setCopySuccess(true)
    setTimeout(() => setCopySuccess(false), 2000)
  }

  const fmt = (val: number) => new Intl.NumberFormat('vi-VN').format(val)

  if (loading) return <div className="p-8 text-center"><span className="material-symbols-outlined animate-spin text-4xl text-cyan-400">progress_activity</span></div>

  const totalEarned = data?.rewards.filter((r: any) => r.status === 'COMPLETED').reduce((sum: number, r: any) => sum + r.amount, 0) || 0
  const pendingEarned = data?.rewards.filter((r: any) => r.status === 'PENDING').reduce((sum: number, r: any) => sum + r.amount, 0) || 0

  return (
    <div className="p-4 sm:p-8 space-y-8 animate-fade-in max-w-5xl mx-auto w-full overflow-hidden">
      <div className="flex items-center gap-3 w-full">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center border border-cyan-500/30">
          <span className="material-symbols-outlined text-cyan-400 text-2xl">handshake</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Hoa hồng giới thiệu</h1>
          <p className="text-gray-400 text-sm">Chia sẻ liên kết và nhận {fmt(data?.milestoneReward || 50000)}đ cho mỗi {data?.milestoneCount || 3} thành viên mới đăng ký.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        <div className="bg-surface backdrop-blur-md rounded-2xl border border-outline-variant/30 p-6 shadow-sm overflow-hidden w-full">
          <h2 className="text-lg font-semibold text-white">Liên kết giới thiệu của bạn</h2>
          <p className="text-sm text-gray-400 break-words whitespace-pre-wrap">Gửi liên kết này cho bạn bè. Khi có đủ {data?.milestoneCount || 3} người tạo tài khoản thành công, bạn sẽ nhận được phần thưởng sau khi được Admin xét duyệt.</p>
          
          <div className="flex flex-col sm:flex-row items-stretch gap-2 mt-4 w-full">
            <input 
              type="text" 
              readOnly 
              value={referralLink} 
              className="flex-1 min-w-0 w-full bg-surface-variant border border-outline-variant/30 rounded-xl px-4 py-3 text-primary focus:outline-none"
            />
            <button 
              onClick={handleCopy}
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-on-primary px-6 py-3 rounded-xl transition-all font-semibold flex items-center justify-center gap-2 flex-shrink-0"
            >
              <span className="material-symbols-outlined text-sm">{copySuccess ? 'check' : 'content_copy'}</span>
              {copySuccess ? 'Đã chép' : 'Copy'}
            </button>
          </div>
        </div>

        <div className="bg-surface backdrop-blur-md rounded-2xl border border-outline-variant/30 p-6 flex flex-col justify-center shadow-sm">
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-on-surface-variant">Tiến độ nhận thưởng</span>
              <span className="text-sm font-semibold text-primary">{data?.totalValidReferrals % (data?.milestoneCount || 3)} / {data?.milestoneCount || 3} người</span>
            </div>
            <div className="w-full bg-surface-variant rounded-full h-2.5 border border-outline-variant/10">
              <div className="bg-primary h-2.5 rounded-full" style={{ width: `${((data?.totalValidReferrals % (data?.milestoneCount || 3)) / (data?.milestoneCount || 3)) * 100}%` }}></div>
            </div>
            <p className="text-xs text-on-surface-variant mt-2">Đã giới thiệu tổng cộng: {data?.totalValidReferrals} người</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-variant rounded-xl p-4 border border-outline-variant/30">
              <div className="text-on-surface-variant text-sm mb-1">Đã nhận</div>
              <div className="text-xl sm:text-2xl font-bold text-[#10B981]">+{fmt(totalEarned)} đ</div>
            </div>
            <div className="bg-surface-variant rounded-xl p-4 border border-outline-variant/30">
              <div className="text-on-surface-variant text-sm mb-1">Đang chờ</div>
              <div className="text-xl sm:text-2xl font-bold text-[#F59E0B]">+{fmt(pendingEarned)} đ</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface backdrop-blur-md rounded-2xl border border-outline-variant/30 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-on-surface mb-6">Lịch sử giới thiệu</h2>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse whitespace-nowrap min-w-[600px]">
            <thead>
              <tr className="border-b border-outline-variant/30 text-on-surface-variant text-sm">
                <th className="pb-3 font-medium">Thời gian</th>
                <th className="pb-3 font-medium">Chi tiết</th>
                <th className="pb-3 font-medium">Hoa hồng</th>
                <th className="pb-3 font-medium">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {data?.rewards.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-on-surface-variant">Chưa có ai đăng ký qua liên kết của bạn.</td>
                </tr>
              ) : (
                data?.rewards.map((r: any) => (
                  <tr key={r.id} className="border-b border-outline-variant/10 last:border-0 hover:bg-surface-variant/20">
                    <td className="py-4 text-sm text-on-surface-variant">
                      {new Date(r.createdAt).toLocaleString('vi-VN')}
                    </td>
                    <td className="py-4">
                      <div className="font-medium text-on-surface">{r.reason || 'Hoa hồng giới thiệu'}</div>
                      <div className="text-xs text-on-surface-variant">{r.referredUser?.name} {r.referredUser?.email}</div>
                    </td>
                    <td className="py-4 text-primary font-medium">
                      {fmt(r.amount)} đ
                    </td>
                    <td className="py-4">
                      {r.status === 'COMPLETED' && <span className="px-3 py-1 bg-[#10B981]/10 text-[#10B981] rounded-full text-xs font-medium border border-[#10B981]/20">Hoàn thành</span>}
                      {r.status === 'PENDING' && <span className="px-3 py-1 bg-[#F59E0B]/10 text-[#F59E0B] rounded-full text-xs font-medium border border-[#F59E0B]/20">Chờ nạp tiền</span>}
                      {r.status === 'REJECTED' && <span className="px-3 py-1 bg-[#EF4444]/10 text-[#EF4444] rounded-full text-xs font-medium border border-[#EF4444]/20" title={r.reason || ''}>Từ chối</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default AffiliatePage
