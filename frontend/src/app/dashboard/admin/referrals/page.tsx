'use client'

import { useState, useEffect } from 'react'
import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'

const MySwal = withReactContent(Swal)

function AdminReferralsPage() {
  const [loading, setLoading] = useState(true)
  const [rewards, setRewards] = useState<any[]>([])

  useEffect(() => {
    fetchRewards()
  }, [])

  const fetchRewards = async () => {
    try {
      const res = await fetch('/api/admin/referrals', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('tq_token')}` }
      })
      const d = await res.json()
      if (Array.isArray(d)) setRewards(d)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      let reason = ''
      if (newStatus === 'REJECTED') {
        const { value } = await MySwal.fire({
          title: 'Nhập lý do từ chối',
          input: 'text',
          showCancelButton: true,
          confirmButtonText: 'Từ chối',
          cancelButtonText: 'Hủy'
        })
        if (!value) return
        reason = value
      }
      
      const res = await fetch(`/api/admin/referrals/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('tq_token')}`
        },
        body: JSON.stringify({ status: newStatus, reason })
      })
      const data = await res.json()
      if (data.success) {
        setRewards(prev => prev.map(r => r.id === id ? { ...r, status: newStatus, reason } : r))
        MySwal.fire('Thành công', 'Đã cập nhật trạng thái', 'success')
      } else {
        MySwal.fire('Lỗi', 'Không thể cập nhật', 'error')
      }
    } catch (err) {
      MySwal.fire('Lỗi', 'Lỗi hệ thống', 'error')
    }
  }

  const fmt = (val: number) => new Intl.NumberFormat('vi-VN').format(val)

  if (loading) return <div className="p-8 text-center"><span className="material-symbols-outlined animate-spin text-4xl text-cyan-400">progress_activity</span></div>

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Quản lý Hoa hồng</h1>
        <p className="text-gray-400 text-sm">Theo dõi các lượt giới thiệu và chống gian lận.</p>
      </div>

      <div className="bg-slate-800/50 rounded-2xl border border-white/5 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-slate-900/50">
              <th className="p-4 font-medium text-gray-300">Thời gian</th>
              <th className="p-4 font-medium text-gray-300">Người giới thiệu</th>
              <th className="p-4 font-medium text-gray-300">Người đăng ký mới</th>
              <th className="p-4 font-medium text-gray-300">IP Đăng ký</th>
              <th className="p-4 font-medium text-gray-300">Hoa hồng</th>
              <th className="p-4 font-medium text-gray-300">Trạng thái</th>
              <th className="p-4 font-medium text-gray-300">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {rewards.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-500">Chưa có dữ liệu.</td>
              </tr>
            ) : (
              rewards.map(r => (
                <tr key={r.id} className="border-b border-white/5 last:border-0 hover:bg-slate-700/20">
                  <td className="p-4 text-sm text-gray-400">
                    {new Date(r.createdAt).toLocaleString('vi-VN')}
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-cyan-400">{r.referrer?.name}</div>
                    <div className="text-xs text-gray-500">{r.referrer?.email}</div>
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-white">{r.referredUser?.name}</div>
                    <div className="text-xs text-gray-500">{r.referredUser?.email}</div>
                  </td>
                  <td className="p-4 text-sm text-yellow-500 font-mono">
                    {r.ipAddress}
                  </td>
                  <td className="p-4 font-medium text-green-400">
                    {fmt(r.amount)} đ
                  </td>
                  <td className="p-4">
                    {r.status === 'COMPLETED' && <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">Đã cộng tiền</span>}
                    {r.status === 'PENDING' && <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-medium">Chờ nạp tiền</span>}
                    {r.status === 'REJECTED' && (
                      <div className="flex flex-col gap-1">
                        <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-medium text-center">Từ chối</span>
                        <span className="text-[10px] text-gray-500 text-center">{r.reason}</span>
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <select 
                      className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-sm text-white focus:outline-none"
                      value={r.status}
                      onChange={(e) => updateStatus(r.id, e.target.value)}
                    >
                      <option value="PENDING">Pending</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="REJECTED">Rejected</option>
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default AdminReferralsPage
