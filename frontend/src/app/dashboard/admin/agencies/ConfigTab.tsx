'use client'

import React, { useState, useEffect } from 'react'
import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'

const MySwal = withReactContent(Swal)

export default function ConfigTab() {
  const [upgradeConfigs, setUpgradeConfigs] = useState([
    { level: 1, price: 0 },
    { level: 2, price: 0 },
    { level: 3, price: 0 },
    { level: 4, price: 0 }
  ])
  const [inviteLinks, setInviteLinks] = useState<any[]>([])
  
  const [newInvite, setNewInvite] = useState({ level: 1, usageLeft: 1, email: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchConfigs()
    fetchInvites()
  }, [])

  const fetchConfigs = async () => {
    try {
      const res = await fetch('/api/admin/agency-upgrade-config', { headers: { 'Authorization': `Bearer ${localStorage.getItem('tq_token')}` } })
      const data = await res.json()
      if (data.success && data.config.length > 0) {
        setUpgradeConfigs(prev => prev.map(p => {
          const found = data.config.find((c: any) => c.level === p.level)
          return found ? found : p
        }))
      }
    } catch (e) {}
  }

  const fetchInvites = async () => {
    try {
      const res = await fetch('/api/admin/agency-invite-links', { headers: { 'Authorization': `Bearer ${localStorage.getItem('tq_token')}` } })
      const data = await res.json()
      if (data.success) {
        setInviteLinks(data.links)
      }
      setLoading(false)
    } catch (e) {}
  }

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/admin/agency-upgrade-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('tq_token')}` },
        body: JSON.stringify({ configs: upgradeConfigs })
      })
      const data = await res.json()
      if (data.success) {
        MySwal.fire({ icon: 'success', title: 'Thành công', text: 'Đã lưu cấu hình nâng cấp!' })
      }
    } catch (err) {}
  }

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/admin/agency-invite-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('tq_token')}` },
        body: JSON.stringify(newInvite)
      })
      const data = await res.json()
      if (data.success) {
        MySwal.fire({ icon: 'success', title: 'Thành công', text: 'Đã tạo link mời!' })
        fetchInvites()
      }
    } catch (err) {}
  }

  const handleDeleteInvite = async (id: string) => {
    const result = await MySwal.fire({
      title: 'Xóa link mời?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Xóa', cancelButtonText: 'Hủy'
    })
    if (result.isConfirmed) {
      try {
        await fetch(`/api/admin/agency-invite-links/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('tq_token')}` }
        })
        fetchInvites()
      } catch (err) {}
    }
  }

  const copyLink = (code: string) => {
    const link = `${window.location.origin}/invite/${code}`
    navigator.clipboard.writeText(link)
    MySwal.fire({ icon: 'success', title: 'Đã copy!', text: 'Đã copy link mời vào khay nhớ tạm.', timer: 1500, showConfirmButton: false })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
      {/* Upgrade Config */}
      <div className="glass-panel p-6">
        <h2 className="font-headline-sm text-on-surface mb-6">Giá Nâng Cấp Tự Động</h2>
        <form onSubmit={handleSaveConfig} className="space-y-4">
          {upgradeConfigs.map((cfg, index) => (
            <div key={cfg.level}>
              <label className="block text-sm font-medium text-on-surface-variant mb-1">Giá Nâng cấp Đại lý Cấp {cfg.level} (VNĐ)</label>
              <input
                type="number"
                min="0"
                value={cfg.price}
                onChange={e => {
                  const newConfigs = [...upgradeConfigs];
                  newConfigs[index].price = Number(e.target.value);
                  setUpgradeConfigs(newConfigs);
                }}
                className="input-glass w-full"
                required
              />
            </div>
          ))}
          <button type="submit" className="btn-primary w-full py-2.5 rounded-xl font-semibold mt-4">
            Lưu Bảng Giá
          </button>
        </form>
      </div>

      {/* Invite Links */}
      <div className="glass-panel p-6 flex flex-col h-full">
        <h2 className="font-headline-sm text-on-surface mb-6">Tạo Link Mời Đại Lý</h2>
        <form onSubmit={handleCreateInvite} className="space-y-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-1">Cấp Đại lý sẽ nhận</label>
              <select value={newInvite.level} onChange={e => setNewInvite({...newInvite, level: Number(e.target.value)})} className="input-glass w-full">
                <option value={1}>Cấp 1</option>
                <option value={2}>Cấp 2</option>
                <option value={3}>Cấp 3</option>
                <option value={4}>Cấp 4</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-1">Số lượt dùng (-1 là Vô hạn)</label>
              <input type="number" min="-1" value={newInvite.usageLeft} onChange={e => setNewInvite({...newInvite, usageLeft: Number(e.target.value)})} className="input-glass w-full" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">Email người nhận (Tùy chọn)</label>
            <input type="email" placeholder="Ví dụ: khachhang@gmail.com" value={newInvite.email} onChange={e => setNewInvite({...newInvite, email: e.target.value})} className="input-glass w-full" />
            <p className="text-xs text-on-surface-variant mt-1">Nếu nhập email, hệ thống sẽ gửi thư mời thẳng tới email này.</p>
          </div>
          <button type="submit" className="w-full bg-surface-variant border border-outline-variant hover:border-cyan-500/50 hover:bg-cyan-500/10 text-cyan-400 py-2.5 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[20px]">link</span> Tạo Link Mới
          </button>
        </form>

        <h3 className="font-semibold text-on-surface-variant mb-3">Danh sách Link đang hoạt động</h3>
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 min-h-[200px]">
          {loading ? (
            <div className="text-center text-sm text-on-surface-variant py-4">Đang tải...</div>
          ) : inviteLinks.length === 0 ? (
            <div className="text-center text-sm text-on-surface-variant py-4">Chưa có link mời nào.</div>
          ) : (
            inviteLinks.map(link => (
              <div key={link.id} className="bg-surface/50 border border-outline-variant/30 rounded-xl p-4 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-cyan-400 font-bold tracking-wider">{link.code}</span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">Cấp {link.level}</span>
                  </div>
                  <div className="text-xs text-on-surface-variant">Lượt còn lại: {link.usageLeft === -1 ? 'Vô hạn' : link.usageLeft}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => copyLink(link.code)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-variant text-on-surface hover:text-white transition-colors" title="Copy Link">
                    <span className="material-symbols-outlined text-[16px]">content_copy</span>
                  </button>
                  <button onClick={() => handleDeleteInvite(link.id)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-colors" title="Xóa">
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
