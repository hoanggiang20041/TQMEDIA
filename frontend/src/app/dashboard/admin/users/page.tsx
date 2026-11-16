'use client'

import React, { useEffect, useState } from 'react'
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { useRole } from '@/context/RoleContext';
const MySwal = withReactContent(Swal);

const ROLES = ['GUEST', 'HOC_VIEN', 'INSTRUCTOR', 'ADMIN', 'TECHNICIAN']

export default function UsersManagementPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  
  // Refund Modal State
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false)
  const [refundAmount, setRefundAmount] = useState<number | ''>('')
  const [refundReason, setRefundReason] = useState('')
  const [refundingUser, setRefundingUser] = useState<any>(null)
  
  // Form State
  const [formData, setFormData] = useState({ id: '', name: '', email: '', phone: '', password: '', role: 'GUEST', balance: 0, agencyLevel: 0 })
  const [errorMsg, setErrorMsg] = useState('')
  const { role } = useRole()
  
  // Revoke Modal State
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false)
  const [revokeAmount, setRevokeAmount] = useState<number | ''>('')
  const [revokeReason, setRevokeReason] = useState('')


  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('tq_token')
      const res = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  
  const handleAgencyLevelChange = async (userId: string, level: string) => {
    try {
      const token = localStorage.getItem('tq_token')
      const res = await fetch(`/api/admin/users/${userId}/agency-level`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ agencyLevel: Number(level) })
      })
      if (res.ok) {
        setUsers(users.map(u => u.id === userId ? { ...u, agencyLevel: Number(level) } : u))
      } else {
        MySwal.fire({ icon: 'error', title: 'Thất bại', text: 'Có lỗi xảy ra!' })
      }
    } catch (err) { }
  }

const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const token = localStorage.getItem('tq_token')
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ role: newRole })
      })
      if (res.ok) {
        setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u))
      } else {
        MySwal.fire({ icon: 'info', title: 'Thông báo', text: 'Có lỗi xảy ra khi cập nhật cấp bậc!' })
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (userId: string) => {
    const __confirmResult = await MySwal.fire({ title: 'Xác nhận', text: 'Bạn có chắc chắn muốn xóa thành viên này không?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Đồng ý', cancelButtonText: 'Hủy' });
    if (!__confirmResult.isConfirmed) return;
    try {
      const token = localStorage.getItem('tq_token')
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (res.ok) {
        setUsers(users.filter(u => u.id !== userId))
      } else {
        MySwal.fire({ icon: 'info', title: 'Thông báo', text: 'Lỗi khi xóa thành viên.' })
      }
    } catch (err) {
      console.error(err)
    }
  }

  const openCreateModal = () => {
    setIsEditing(false)
    setFormData({ id: '', name: '', email: '', phone: '', password: '', role: 'GUEST', balance: 0, agencyLevel: 0 })
    setErrorMsg('')
    setIsModalOpen(true)
  }

  const openEditModal = (user: any) => {
    setIsEditing(true)
    setFormData({ id: user.id, name: user.name, email: user.email, phone: user.phone || '', password: '', role: user.role, balance: user.balance, agencyLevel: user.agencyLevel || 0 })
    setErrorMsg('')
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    const token = localStorage.getItem('tq_token')
    
    try {
      const url = isEditing ? `/api/admin/users/${formData.id}` : '/api/admin/users'
      const method = isEditing ? 'PUT' : 'POST'
      
      const payload = { ...formData }
      if (isEditing && !payload.password) delete (payload as any).password // Don't send empty password on edit
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      })
      
      const data = await res.json()
      if (res.ok) {
        setIsModalOpen(false)
        fetchUsers() // Refresh list
      } else {
        setErrorMsg(data.error || 'Đã có lỗi xảy ra')
      }
    } catch (err) {
      setErrorMsg('Lỗi kết nối máy chủ')
    }
  }

  const openRefundModal = (user: any) => {
    setRefundingUser(user)
    setRefundAmount('')
    setRefundReason('')
    setIsRefundModalOpen(true)
  }

  const handleRefund = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!refundAmount || Number(refundAmount) <= 0) {
      return MySwal.fire({ icon: 'error', title: 'Lỗi', text: 'Vui lòng nhập số tiền hợp lệ!' })
    }
    try {
      const token = localStorage.getItem('tq_token')
      const res = await fetch(`/api/admin/users/${refundingUser.id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ amount: Number(refundAmount), reason: refundReason })
      })
      const data = await res.json()
      if (res.ok) {
        setIsRefundModalOpen(false)
        MySwal.fire({ icon: 'success', title: 'Thành công', text: 'Hoàn tiền thành công và đã lưu lịch sử giao dịch!' })
        fetchUsers()
      } else {
        MySwal.fire({ icon: 'error', title: 'Thất bại', text: data.error || 'Có lỗi xảy ra!' })
      }
    } catch (err) {
      MySwal.fire({ icon: 'error', title: 'Thất bại', text: 'Lỗi kết nối máy chủ' })
    }
  }

  const openRevokeModal = (user: any) => {
    setRefundingUser(user)
    setRevokeAmount('')
    setRevokeReason('')
    setIsRevokeModalOpen(true)
  }

  const handleRevoke = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!revokeAmount || Number(revokeAmount) <= 0) {
      return MySwal.fire({ icon: 'error', title: 'Lỗi', text: 'Vui lòng nhập số tiền hợp lệ!' })
    }
    try {
      const token = localStorage.getItem('tq_token')
      const res = await fetch(`/api/admin/users/${refundingUser.id}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ amount: Number(revokeAmount), reason: revokeReason })
      })
      const data = await res.json()
      if (res.ok) {
        setIsRevokeModalOpen(false)
        MySwal.fire({ icon: 'success', title: 'Thành công', text: 'Thu hồi tiền thành công và đã lưu lịch sử giao dịch!' })
        fetchUsers()
      } else {
        MySwal.fire({ icon: 'error', title: 'Thất bại', text: data.error || 'Có lỗi xảy ra!' })
      }
    } catch (err) {
      MySwal.fire({ icon: 'error', title: 'Thất bại', text: 'Lỗi kết nối máy chủ' })
    }
  }

  const fmt = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  const filteredUsers = users.filter(u => 
    searchQuery === '' ||
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.phone || '').includes(searchQuery)
  );

  return (
    <div className="w-full space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Quản lý Thành viên</h1>
          <p className="text-on-surface-variant text-sm mt-1">Toàn quyền quản trị (Thêm, Sửa, Xóa, Cấp bậc, Số dư).</p>
        </div>
        <div className="flex gap-3 items-center">
          <div className="relative w-full sm:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50">search</span>
            <input 
              type="text" 
              placeholder="Tìm tên, email, SĐT..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-surface-variant/30 border border-outline-variant/30 rounded-xl text-sm focus:outline-none focus:border-cyan-500/50 text-white placeholder:text-on-surface-variant/50 transition-colors"
            />
          </div>
          <button 
            onClick={openCreateModal}
            className="bg-cyan-600 hover:bg-cyan-500 border border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.3)] px-5 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-95 whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[20px]">person_add</span>
            Thêm
          </button>
        </div>
      </div>

      <div className="bg-surface-variant/30 border border-outline-variant/30 backdrop-blur-xl rounded-2xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.1)] w-full overflow-hidden">
        {loading ? (
          <div className="text-center py-20 text-on-surface-variant flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-4xl animate-spin text-cyan-400">progress_activity</span>
            <span>Đang tải dữ liệu...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-20 text-on-surface-variant">
            Không tìm thấy thành viên nào.
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left min-w-[800px]">
              <thead>
                <tr className="text-on-surface-variant text-xs uppercase tracking-widest border-b border-outline-variant/30">
                  <th className="pb-4 pl-4 pr-4 font-semibold">Thành viên</th>
                  <th className="pb-4 pr-4 font-semibold">Số điện thoại</th>
                  {role !== 'TECHNICIAN' && <th className="pb-4 pr-4 font-semibold">Số dư (VNĐ)</th>}
                  <th className="pb-4 pr-4 font-semibold">Vai trò</th>
                  <th className="pb-4 pr-4 font-semibold">Đại lý</th>
                  {role !== 'TECHNICIAN' && <th className="pb-4 pr-4 font-semibold text-right">Hành động</th>}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-outline-variant/30 last:border-0 hover:bg-surface-variant/50 transition-colors group">
                    <td className="py-4 pl-4 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 text-cyan-400 flex items-center justify-center font-bold text-lg border border-cyan-500/30 shrink-0 shadow-inner">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-white text-sm font-semibold group-hover:text-cyan-400 transition-colors">{user.name}</p>
                          <p className="text-on-surface-variant text-xs font-mono mt-0.5">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      <span className="text-on-surface-variant text-sm font-medium">
                        {user.phone || '-'}
                      </span>
                    </td>
                    {role !== 'TECHNICIAN' && (
                      <td className="py-4 pr-4">
                        <span className="text-white text-sm font-bold bg-surface-variant/50 px-3 py-1.5 rounded-lg border border-outline-variant/30 inline-block shadow-inner">
                          {fmt(user.balance)}
                        </span>
                      </td>
                    )}
                    <td className="py-4 pr-4">
                      <select 
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className="bg-surface-variant border border-outline-variant text-white text-xs font-semibold tracking-wide rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500 cursor-pointer shadow-sm hover:border-cyan-500/50 transition-colors"
                      >
                        {ROLES.map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    </td>
                      <td className="py-4 pr-4">
                        <select 
                          value={user.agencyLevel || 0}
                          onChange={(e) => handleAgencyLevelChange(user.id, e.target.value)}
                          className="bg-surface-variant border border-outline-variant text-white text-xs font-semibold tracking-wide rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500 cursor-pointer shadow-sm hover:border-cyan-500/50 transition-colors"
                        >
                          <option value="0">Thường</option>
                          {[1,2,3,4].map(level => (
                            <option key={level} value={level}>Cấp {level}</option>
                          ))}
                        </select>
                      </td>

                    {role !== 'TECHNICIAN' && (
                      <td className="py-4 pr-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => openRevokeModal(user)}
                            className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center hover:bg-orange-500 hover:text-white transition-colors"
                            title="Thu hồi tiền"
                          >
                            <span className="material-symbols-outlined text-[16px]">money_off</span>
                          </button>
                          <button 
                            onClick={() => openRefundModal(user)}
                            className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 flex items-center justify-center hover:bg-green-500 hover:text-white transition-colors"
                            title="Hoàn tiền"
                          >
                            <span className="material-symbols-outlined text-[16px]">payments</span>
                          </button>
                          <button 
                            onClick={() => openEditModal(user)}
                            className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-colors"
                            title="Sửa thông tin"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>
                          <button 
                            onClick={() => handleDelete(user.id)}
                            className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
                            title="Xóa thành viên"
                            disabled={user.email === 'admin@tqmedia.com'}
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal CRUD */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-outline-variant rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-outline-variant/50 flex justify-between items-center bg-surface-variant/30">
              <h3 className="text-lg font-bold text-white">{isEditing ? 'Sửa thông tin thành viên' : 'Thêm thành viên mới'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-on-surface-variant hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 flex flex-col gap-4 overflow-y-auto">
              {errorMsg && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                  {errorMsg}
                </div>
              )}
              
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-on-surface-variant ml-1">Họ và tên <span className="text-red-400">*</span></label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-[#0A0A0F] border border-outline-variant/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors" />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-on-surface-variant ml-1">Email <span className="text-red-400">*</span></label>
                <input required disabled={isEditing && formData.email === 'admin@tqmedia.com'} type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-[#0A0A0F] border border-outline-variant/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors disabled:opacity-50" />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-on-surface-variant ml-1">Số điện thoại</label>
                <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-[#0A0A0F] border border-outline-variant/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors" />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-on-surface-variant ml-1">Mật khẩu {isEditing && <span className="text-on-surface-variant font-normal opacity-70">(Bỏ trống nếu không muốn đổi)</span>}</label>
                <input required={!isEditing} type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-[#0A0A0F] border border-outline-variant/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-on-surface-variant ml-1">Cấp bậc</label>
                  <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full bg-[#0A0A0F] border border-outline-variant/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors">
                    {ROLES.map(role => <option key={role} value={role}>{role}</option>)}
                  </select>
                </div>
                
                {isEditing && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-on-surface-variant ml-1">Chỉnh sửa Số dư</label>
                    <input type="number" value={formData.balance} onChange={e => setFormData({...formData, balance: Number(e.target.value)})} className="w-full bg-[#0A0A0F] border border-outline-variant/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors" />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-outline-variant/30">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:text-white hover:bg-surface-variant transition-colors">
                  Hủy
                </button>
                <button type="submit" className="bg-cyan-600 hover:bg-cyan-500 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg transition-colors">
                  {isEditing ? 'Lưu thay đổi' : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Refund */}
      {isRefundModalOpen && refundingUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-outline-variant rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-outline-variant/50 flex justify-between items-center bg-surface-variant/30">
              <h3 className="text-lg font-bold text-green-400 flex items-center gap-2">
                <span className="material-symbols-outlined">payments</span>
                Hoàn tiền thành viên
              </h3>
              <button onClick={() => setIsRefundModalOpen(false)} className="text-on-surface-variant hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleRefund} className="p-6 flex flex-col gap-4 overflow-y-auto">
              <div className="text-sm text-on-surface-variant mb-2">
                Bạn đang hoàn tiền cho: <span className="font-bold text-white">{refundingUser.name}</span>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-on-surface-variant ml-1">Số tiền hoàn (VNĐ) <span className="text-red-400">*</span></label>
                <input required type="number" min="1" value={refundAmount} onChange={e => setRefundAmount(Number(e.target.value) || '')} className="w-full bg-[#0A0A0F] border border-outline-variant/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-green-500 transition-colors" placeholder="VD: 50000" />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-on-surface-variant ml-1">Lý do (Sẽ hiện trong lịch sử GD)</label>
                <input type="text" value={refundReason} onChange={e => setRefundReason(e.target.value)} className="w-full bg-[#0A0A0F] border border-outline-variant/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-green-500 transition-colors" placeholder="VD: Admin hoàn tiền đơn hàng bị lỗi" />
              </div>

              <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-outline-variant/30">
                <button type="button" onClick={() => setIsRefundModalOpen(false)} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:text-white hover:bg-surface-variant transition-colors">
                  Hủy
                </button>
                <button type="submit" className="bg-green-600 hover:bg-green-500 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg transition-colors">
                  Xác nhận hoàn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Revoke */}
      {isRevokeModalOpen && refundingUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-outline-variant rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-outline-variant/50 flex justify-between items-center bg-surface-variant/30">
              <h3 className="text-lg font-bold text-orange-400 flex items-center gap-2">
                <span className="material-symbols-outlined">money_off</span>
                Thu hồi tiền
              </h3>
              <button onClick={() => setIsRevokeModalOpen(false)} className="text-on-surface-variant hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleRevoke} className="p-6 flex flex-col gap-4 overflow-y-auto">
              <div className="text-sm text-on-surface-variant mb-2">
                Bạn đang THU HỒI tiền của: <span className="font-bold text-white">{refundingUser.name}</span>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-on-surface-variant ml-1">Số tiền thu hồi (VNĐ) <span className="text-red-400">*</span></label>
                <input required type="number" min="1" value={revokeAmount} onChange={e => setRevokeAmount(Number(e.target.value) || '')} className="w-full bg-[#0A0A0F] border border-outline-variant/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors" placeholder="VD: 50000" />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-on-surface-variant ml-1">Lý do (Sẽ hiện trong lịch sử GD)</label>
                <input type="text" value={revokeReason} onChange={e => setRevokeReason(e.target.value)} className="w-full bg-[#0A0A0F] border border-outline-variant/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors" placeholder="VD: Admin thu hồi do gian lận" />
              </div>

              <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-outline-variant/30">
                <button type="button" onClick={() => setIsRevokeModalOpen(false)} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:text-white hover:bg-surface-variant transition-colors">
                  Hủy
                </button>
                <button type="submit" className="bg-orange-600 hover:bg-orange-500 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg transition-colors">
                  Xác nhận Thu hồi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
