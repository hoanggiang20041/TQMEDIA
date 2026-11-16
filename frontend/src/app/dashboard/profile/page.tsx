'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import SuccessModal from '@/components/ui/SuccessModal'
import { useRole } from '@/context/RoleContext'

type Tab = 'info' | 'security' | 'password'

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<Tab>('info')
  const [showApiKey, setShowApiKey] = useState(false)

  // Modal State
  const [showModal, setShowModal] = useState(false)
  const [modalTitle, setModalTitle] = useState('')
  const [modalMessage, setModalMessage] = useState('')

  // Email Verification State
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailCode, setEmailCode] = useState('')
  const [isSendingEmail, setIsSendingEmail] = useState(false)

  // Password State
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')

  // 2FA & Security State
  const [loginLogs, setLoginLogs] = useState<any[]>([])
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [twoFactorSecret, setTwoFactorSecret] = useState('')
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [show2FAModal, setShow2FAModal] = useState(false)
  const [is2FAEnabled, setIs2FAEnabled] = useState(false)
  const [selectedLog, setSelectedLog] = useState<any>(null)

  const { balance, user, role, transactions, refreshUser } = useRole()
  
  const [name, setName] = useState(user?.name || '')
  const [phone, setPhone] = useState(user?.phone || '')

  // Update name, phone and 2FA status when user loads
  React.useEffect(() => {
    if (user?.name) setName(user.name);
    if (user?.phone) setPhone(user.phone);
    if (user?.isTwoFactorEnabled !== undefined) setIs2FAEnabled(user.isTwoFactorEnabled);
  }, [user]);

  // Fetch Login Logs
  React.useEffect(() => {
    if (activeTab === 'security') {
      const fetchLogs = async () => {
        try {
          const token = localStorage.getItem('tq_token');
          const res = await fetch('/api/auth/login-logs', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (data.success) {
            setLoginLogs(data.logs);
          }
        } catch (err) {
          console.error('Failed to fetch login logs', err);
        }
      };
      fetchLogs();
    }
  }, [activeTab]);

  const totalDeposited = transactions
    .filter(t => t.type === 'CỘNG TIỀN')
    .reduce((sum, t) => {
      const numStr = t.amount.replace(/[^\d]/g, '')
      return sum + (parseInt(numStr) || 0)
    }, 0)

  const rankRequirements = [
    { role: 'DAI_LY_1', name: 'Đại lý Cấp 1', required: 2000000 },
    { role: 'DAI_LY_2', name: 'Đại lý Cấp 2', required: 10000000 },
    { role: 'DAI_LY_3', name: 'Đại lý Cấp 3', required: 30000000 },
    { role: 'DAI_LY_4', name: 'Đại lý Cấp 4', required: 100000000 }
  ];

  const formatDate = (isoStr: string | undefined) => {
    if (!isoStr) return '';
    const date = new Date(isoStr);
    return date.toLocaleString('vi-VN', { 
      day: '2-digit', month: '2-digit', year: 'numeric', 
      hour: '2-digit', minute: '2-digit', hour12: false 
    });
  }

  const roleMap: Record<string, string> = {
    'GUEST': 'Khách Hàng',
    'HOC_VIEN': 'Học Viên',
    'DAI_LY_4': 'Đại lý Cấp 4',
    'DAI_LY_3': 'Đại lý Cấp 3',
    'DAI_LY_2': 'Đại lý Cấp 2',
    'DAI_LY_1': 'Đại lý Cấp 1',
    'INSTRUCTOR': 'Giảng Viên',
    'ADMIN': 'Quản Trị Viên'
  }

  const handleUpdateInfo = async () => {
    if (!name) return;
    try {
      const token = localStorage.getItem('tq_token');
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, phone })
      });
      const data = await res.json();
      if (data.success) {
        await refreshUser(); // Refresh user context
        setModalTitle('Cập Nhật Thành Công!');
        setModalMessage('Thông tin tài khoản của bạn đã được cập nhật thành công.');
        setShowModal(true);
      } else {
        alert(data.error || 'Lỗi cập nhật');
      }
    } catch (err) {
      alert('Lỗi kết nối');
    }
  }

  const handleSendVerificationEmail = async () => {
    setIsSendingEmail(true);
    try {
      const token = localStorage.getItem('tq_token');
      const res = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setEmailCode('');
        setShowEmailModal(true);
      } else {
        alert(data.error || 'Gửi email thất bại');
      }
    } catch (err) {
      alert('Lỗi kết nối server');
    } finally {
      setIsSendingEmail(false);
    }
  }

  const handleVerifyEmail = async () => {
    if (!emailCode || emailCode.length !== 6) {
      alert('Vui lòng nhập mã 6 số!');
      return;
    }
    try {
      const token = localStorage.getItem('tq_token');
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ code: emailCode })
      });
      const data = await res.json();
      if (data.success) {
        setShowEmailModal(false);
        await refreshUser(); // Cập nhật lại context để lấy isEmailVerified
        setModalTitle('Xác Thực Thành Công!');
        setModalMessage('Email của bạn đã được xác thực thành công.');
        setShowModal(true);
      } else {
        alert(data.error || 'Mã xác nhận không đúng');
      }
    } catch (err) {
      alert('Lỗi kết nối');
    }
  }

  const handleEnable2FA = async () => {
    try {
      const token = localStorage.getItem('tq_token');
      const res = await fetch('/api/auth/2fa/generate', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setQrCodeUrl(data.qrImageUrl);
        setTwoFactorSecret(data.secret);
        setTwoFactorCode('');
        setShow2FAModal(true);
      } else {
        alert(data.error || 'Failed to generate 2FA');
      }
    } catch (err) {
      alert('Lỗi kết nối');
    }
  }

  const handleConfirm2FA = async () => {
    if (!twoFactorCode || twoFactorCode.length !== 6) {
      alert('Vui lòng nhập mã 6 số hợp lệ');
      return;
    }
    try {
      const token = localStorage.getItem('tq_token');
      const res = await fetch('/api/auth/2fa/enable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ token: twoFactorCode })
      });
      const data = await res.json();
      if (data.success) {
        setShow2FAModal(false);
        setIs2FAEnabled(true);
        setModalTitle('Bật 2FA Thành Công!');
        setModalMessage('Tài khoản của bạn đã được bảo vệ bằng Google Authenticator.');
        setShowModal(true);
      } else {
        alert(data.error || 'Mã không đúng');
      }
    } catch (err) {
      alert('Lỗi kết nối');
    }
  }

  const handleDisable2FA = async () => {
    const code = prompt('Vui lòng nhập mã Authenticator hiện tại để tắt 2FA:');
    if (!code) return;
    
    try {
      const token = localStorage.getItem('tq_token');
      const res = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ token: code })
      });
      const data = await res.json();
      if (data.success) {
        setIs2FAEnabled(false);
        setModalTitle('Tắt 2FA Thành Công!');
        setModalMessage('Tính năng bảo mật 2 lớp đã được tắt.');
        setShowModal(true);
      } else {
        alert(data.error || 'Mã không đúng');
      }
    } catch (err) {
      alert('Lỗi kết nối');
    }
  }

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordError('Vui lòng nhập đầy đủ thông tin!')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Mật khẩu xác nhận không khớp!')
      return
    }
    
    try {
      const token = localStorage.getItem('tq_token');
      const res = await fetch('/api/auth/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ oldPassword, newPassword })
      });
      const data = await res.json();
      
      if (data.success) {
        setPasswordError('')
        setOldPassword('')
        setNewPassword('')
        setConfirmPassword('')
        
        setModalTitle('Đổi Mật Khẩu Thành Công!')
        setModalMessage('Mật khẩu của bạn đã được cập nhật an toàn. Vui lòng sử dụng mật khẩu mới trong lần đăng nhập tới.')
        setShowModal(true)
      } else {
        setPasswordError(data.error || 'Lỗi đổi mật khẩu')
      }
    } catch (err) {
      setPasswordError('Lỗi kết nối server')
    }
  }

  return (
    <div className="max-w-[1200px] mx-auto pb-10">
      
      {/* TABS */}
      <div className="glass-panel rounded-lg shadow-lg shadow-black/5 border border-outline-variant/30 mb-6 flex">
        <button 
          onClick={() => setActiveTab('info')}
          className={`px-6 py-4 text-[15px] font-medium border-b-2 transition-colors ${activeTab === 'info' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant/70 hover:text-on-surface/90'}`}
        >
          Thông tin tài khoản
        </button>
        <button 
          onClick={() => setActiveTab('security')}
          className={`px-6 py-4 text-[15px] font-medium border-b-2 transition-colors ${activeTab === 'security' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant/70 hover:text-on-surface/90'}`}
        >
          Bảo mật
        </button>
        <button 
          onClick={() => setActiveTab('password')}
          className={`px-6 py-4 text-[15px] font-medium border-b-2 transition-colors ${activeTab === 'password' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant/70 hover:text-on-surface/90'}`}
        >
          Đổi mật khẩu
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {activeTab === 'info' && (
            <>
              {/* API Key */}
              <div className="glass-panel rounded-lg shadow-lg shadow-black/5 border border-outline-variant/30 p-6">
                <h3 className="text-[15px] font-semibold text-on-surface mb-4">API Key</h3>
                <div className="flex gap-2">
                  <input 
                    type={showApiKey ? 'text' : 'password'}
                    readOnly
                    value="tqmedia_live_ak39s8f0a8sf09s8f9asf"
                    className="flex-1 input-glass border border-outline-variant/50 rounded px-4 py-2 text-sm text-on-surface-variant focus:outline-none text-center"
                    placeholder="*************"
                  />
                  <button 
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="btn-primary  text-white px-4 py-2 rounded flex items-center gap-1 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">visibility</span>
                    <span className="text-sm font-medium">watch</span>
                  </button>
                </div>
              </div>

              {/* Thông tin tài khoản */}
              <div className="glass-panel rounded-lg shadow-lg shadow-black/5 border border-outline-variant/30 p-6">
                <h3 className="text-[15px] font-semibold text-on-surface mb-5">Thông tin tài khoản</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-x-6 gap-y-4">
                  {/* Họ tên */}
                  <div>
                    <label className="block text-sm font-medium text-on-surface/90 mb-1">Họ tên</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full input-glass border border-outline-variant/50 rounded px-3 py-2.5 text-sm text-on-surface-variant focus:outline-none focus:border-primary" />
                  </div>
                  
                  {/* Số điện thoại */}
                  <div>
                    <label className="block text-sm font-medium text-on-surface/90 mb-1">Số điện thoại</label>
                    <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Nhập số điện thoại" className="w-full input-glass border border-outline-variant/50 rounded px-3 py-2.5 text-sm text-on-surface-variant focus:outline-none focus:border-primary" />
                  </div>

                  {/* Gmail */}
                  <div>
                    <label className="block text-sm font-medium text-on-surface/90 mb-1">Gmail</label>
                    <div className="relative">
                      <input type="email" defaultValue={user?.email || "noemail@temp.com"} readOnly className="w-full input-glass border border-outline-variant/50 rounded pl-3 pr-[100px] py-2.5 text-sm text-on-surface-variant focus:outline-none focus:border-primary" />
                      {user?.isEmailVerified ? (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-green-500 font-medium text-xs">
                          <span className="material-symbols-outlined text-[16px]">check_circle</span>
                          Đã xác thực
                        </div>
                      ) : (
                        <button 
                          onClick={handleSendVerificationEmail}
                          disabled={isSendingEmail}
                          className="absolute right-1 top-1 bottom-1 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-3 rounded text-xs font-medium flex items-center gap-1 hover:bg-cyan-500/30 transition-colors disabled:opacity-50"
                        >
                          {isSendingEmail ? (
                            <span className="material-symbols-outlined text-[14px] animate-spin">sync</span>
                          ) : (
                            <span className="material-symbols-outlined text-[14px]">mail</span>
                          )}
                          {isSendingEmail ? "Đang gửi..." : "Xác thực"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Ảnh đại diện */}
                  <div>
                    <label className="block text-sm font-medium text-on-surface/90 mb-1">Ảnh đại diện</label>
                    <input type="text" defaultValue="/gd0/assets/images/users/avatar-10.jpg" className="w-full input-glass border border-outline-variant/50 rounded px-3 py-2.5 text-sm text-on-surface-variant focus:outline-none focus:border-primary" />
                  </div>

                  {/* Bảo mật 2 lớp */}
                  <div>
                    <label className="block text-sm font-medium text-on-surface/90 mb-1">Bảo mật 2 lớp (2FA)</label>
                    <input type="text" value={is2FAEnabled ? "Đã bật" : "Chưa bật"} readOnly className={`w-full input-glass opacity-70 border border-outline-variant/50 rounded px-3 py-2.5 text-sm focus:outline-none cursor-not-allowed font-medium ${is2FAEnabled ? 'text-green-500' : 'text-on-surface-variant'}`} />
                  </div>

                  {/* Tham gia ngày */}
                  <div>
                    <label className="block text-sm font-medium text-on-surface/90 mb-1">Tham gia ngày</label>
                    <input type="text" value={formatDate(user?.createdAt)} readOnly className="w-full input-glass opacity-70 border border-outline-variant/50 rounded px-3 py-2.5 text-sm text-on-surface-variant focus:outline-none cursor-not-allowed" />
                  </div>

                  {/* Ngôn ngữ */}
                  <div>
                    <label className="block text-sm font-medium text-on-surface/90 mb-1">Ngôn ngữ</label>
                    <input type="text" defaultValue="Tiếng Việt" className="w-full input-glass border border-outline-variant/50 rounded px-3 py-2.5 text-sm text-on-surface-variant focus:outline-none focus:border-primary" />
                  </div>
                </div>

                <div className="flex justify-end mt-6">
                  <button onClick={handleUpdateInfo} className="btn-primary  text-white px-5 py-2.5 rounded text-sm font-medium transition-colors">
                    Cập nhật thông tin
                  </button>
                </div>
              </div>
            </>
          )}

          {activeTab === 'security' && (
            <>
              {/* Xác minh 2 bước */}
              <div className="glass-panel rounded-lg shadow-lg shadow-black/5 border border-outline-variant/30 p-6">
                <h3 className="text-[15px] font-semibold text-on-surface mb-4">Xác minh 2 bước Google Authenticator</h3>
                
                {is2FAEnabled ? (
                  <>
                    <button onClick={handleDisable2FA} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded text-sm font-medium transition-colors mb-5 inline-block">
                      Tắt xác thực 2 yếu tố
                    </button>
                    <div className="bg-green-500/10 border border-green-500/30 text-green-500 px-4 py-3 rounded text-sm flex items-center gap-2">
                      <span className="material-symbols-outlined text-[20px]">check_circle</span>
                      <p>Tính năng bảo mật 2 lớp bằng Google Authenticator đang hoạt động.</p>
                    </div>
                  </>
                ) : (
                  <>
                    <button onClick={handleEnable2FA} className="bg-[#2ecc71] hover:bg-[#27ae60] text-white px-4 py-2.5 rounded text-sm font-medium transition-colors mb-5 inline-block">
                      Bật xác thực 2 yếu tố
                    </button>
                    <div className="bg-[#fff3cd] border border-[#ffeeba] text-[#856404] px-4 py-3 rounded text-sm flex items-center gap-2">
                      <span className="material-symbols-outlined text-[20px]">warning</span>
                      <p>Tài khoản của bạn chưa được bật bảo mật 2 lớp.</p>
                    </div>
                  </>
                )}
              </div>

              {/* Nhật ký đăng nhập */}
              <div className="glass-panel rounded-lg shadow-lg shadow-black/5 border border-outline-variant/30 overflow-hidden">
                <div className="px-6 py-4 border-b border-outline-variant/30 bg-surface-variant/30">
                  <h3 className="text-[15px] font-semibold text-on-surface">Nhật ký đăng nhập</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-on-surface-variant">
                    <thead className="bg-surface-variant/50 text-on-surface/90">
                      <tr>
                        <th className="py-3 px-4 font-bold">Thời gian</th>
                        <th className="py-3 px-4 font-bold">Thiết bị</th>
                        <th className="py-3 px-4 font-bold">Địa chỉ IP</th>
                        <th className="py-3 px-4 font-bold text-center">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {loginLogs.map((log, index) => (
                        <tr key={log.id} className={index % 2 === 0 ? '' : 'bg-surface-variant/30'}>
                          <td className="py-4 px-4 whitespace-nowrap">
                            {formatDate(log.createdAt).replace(' ', '\n')}
                          </td>
                          <td className="py-4 px-4">{log.device}</td>
                          <td className="py-4 px-4 whitespace-nowrap">{log.ip}</td>
                          <td className="py-4 px-4 text-center">
                            <button 
                              onClick={() => setSelectedLog(log)}
                              className="bg-[#17a2b8] hover:bg-[#138496] text-white px-3 py-1.5 rounded text-[13px] font-medium inline-flex items-center gap-1 transition-colors"
                            >
                              Chi tiết
                            </button>
                          </td>
                        </tr>
                      ))}
                      {loginLogs.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-4 px-4 text-center text-on-surface-variant/70">Không có dữ liệu</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {activeTab === 'password' && (
            <div className="glass-panel rounded-lg shadow-lg shadow-black/5 border border-outline-variant/30 p-6">
              <h3 className="text-[15px] font-semibold text-on-surface mb-5">Đổi mật khẩu</h3>
              <div className="flex flex-col gap-4 max-w-md">
                {passwordError && (
                  <div className="bg-error/10 text-error p-3 rounded text-sm border border-error/30">
                    {passwordError}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-on-surface/90 mb-1">Mật khẩu cũ</label>
                  <input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} placeholder="Nhập mật khẩu cũ" className="w-full input-glass border border-outline-variant/50 rounded px-3 py-2.5 text-sm text-on-surface-variant focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface/90 mb-1">Mật khẩu mới</label>
                  <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Nhập mật khẩu mới" className="w-full input-glass border border-outline-variant/50 rounded px-3 py-2.5 text-sm text-on-surface-variant focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface/90 mb-1">Xác nhận mật khẩu mới</label>
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Nhập lại mật khẩu mới" className="w-full input-glass border border-outline-variant/50 rounded px-3 py-2.5 text-sm text-on-surface-variant focus:outline-none focus:border-primary" />
                </div>
                <div className="mt-2">
                  <button onClick={handleChangePassword} className="btn-primary  text-white px-5 py-2.5 rounded text-sm font-medium transition-colors">
                    Đổi mật khẩu
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          
          {/* Main User Card */}
          <div className="rounded-xl overflow-hidden shadow-lg shadow-black/5 border border-outline-variant/30 glass-panel">
            <div className="bg-gradient-to-br from-[#6b66e6] to-[#453fb6] py-6 px-4 flex flex-col items-center">
              <h3 className="text-white text-lg font-bold mb-4">Thông tin tài khoản</h3>
              <div className="relative mb-3">
                <Image
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuB9VDA4XCRqFOQwb8JdSxIY4MfBgWd03gUJrwJkFA-BzAlq4ODAJPZTl-uUfHssfp8Oaa4ADRlcJ2MDCKp9l-qvc7DHdzkk7V3CbLH62YIA2DEF0uL1I90FmX_v80OzTFvXZV_BVonHRqmNfp84XoIHV6_vAeg1b-HqU1IgyQbzNZioiH5UlS1sXeQm2Q8XJVuQfH5CUk5nhVtsYap7AZWdkra4mwxZ4ZrRwT_tmRIzFpUqFIyv4WvHsmlWwm67sO1vMGoosEIzRClx"
                  alt="Avatar"
                  width={80}
                  height={80}
                  className="rounded-full border-[3px] border-white/20 object-cover w-20 h-20 shadow-[0_0_15px_rgba(0,0,0,0.2)]"
                />
                <div className="absolute bottom-0 right-1 bg-gradient-to-tr from-cyan-500 to-blue-500 text-white rounded-full p-0.5 border-2 border-[#514cb9] shadow-lg flex items-center justify-center w-6 h-6">
                  <span className="material-symbols-outlined text-[14px] font-bold">check</span>
                </div>
              </div>
              <h2 className="text-white text-xl font-bold">{user?.name || "NoName"}</h2>
            </div>
            
            <div className="p-4 flex flex-col gap-4">
              
              {/* Balance display */}
              <div className="bg-[#7367f0]/10 border-l-4 border-[#7367f0] rounded p-3 flex justify-between items-center">
                <div>
                  <p className="text-xs text-on-surface-variant mb-0.5">Số dư hiện tại</p>
                  <p className="text-[#7367f0] font-bold text-lg">{balance.toLocaleString('vi-VN')} đ</p>
                </div>
                <div className="text-[#7367f0]/60">
                  <span className="material-symbols-outlined text-3xl">account_balance_wallet</span>
                </div>
              </div>

              {/* Total recharge display */}
              <div className="bg-[#28c76f]/10 border-l-4 border-[#28c76f] rounded p-3 flex justify-between items-center">
                <div>
                  <p className="text-xs text-on-surface-variant mb-0.5">Tổng nạp</p>
                  <p className="text-[#28c76f] font-bold text-lg">{totalDeposited.toLocaleString('vi-VN')} đ</p>
                </div>
                <div className="text-[#28c76f]/60">
                  <span className="material-symbols-outlined text-3xl">payments</span>
                </div>
              </div>

              {/* Next rank progress */}
              {user?.agencyLevel !== undefined && user.agencyLevel < 4 && (
                <div className="bg-surface/50 border border-outline-variant/30 rounded p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-on-surface-variant">Mục tiêu nâng cấp:</span>
                    <span className="font-bold text-primary">Đại lý Cấp {user.agencyLevel + 1}</span>
                  </div>
                  <div className="w-full bg-surface-variant rounded-full h-2">
                     <div className="bg-primary h-2 rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (totalDeposited / (rankRequirements[user.agencyLevel]?.required || 1)) * 100)}%` }}></div>
                  </div>
                  <p className="text-xs text-on-surface-variant text-center">
                    Cần nạp thêm <span className="font-bold text-primary">{Math.max(0, (rankRequirements[user.agencyLevel]?.required || 0) - totalDeposited).toLocaleString('vi-VN')} đ</span> để lên cấp.
                  </p>
                </div>
              )}
            </div>

            <div className="px-4 py-3 border-t border-outline-variant/30 flex justify-between glass-panel text-sm">
              <div>
                <p className="text-on-surface-variant/70 mb-0.5">Cấp bậc</p>
                <p className="font-bold text-on-surface">
                  {role === 'ADMIN' ? 'Quản Trị Viên' : 
                   role === 'INSTRUCTOR' ? 'Giảng Viên' : 
                   (user?.agencyLevel && user.agencyLevel > 0) ? `Đại lý Cấp ${user.agencyLevel}` : 
                   "Khách Hàng"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-on-surface-variant/70 mb-0.5">Ngày tham gia</p>
                <p className="font-bold text-on-surface">{formatDate(user?.createdAt) || "N/A"}</p>
              </div>
            </div>
          </div>

        </div>
      </div>

      <SuccessModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onContinue={() => setShowModal(false)}
        title={modalTitle}
        message={modalMessage}
      />

      {/* 2FA SETUP MODAL */}
      {show2FAModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface border border-outline-variant/30 rounded-2xl w-full max-w-md shadow-2xl p-6 relative">
            <button 
              onClick={() => setShow2FAModal(false)}
              className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <h3 className="text-xl font-bold text-on-surface mb-2">Bật Google Authenticator</h3>
            <p className="text-sm text-on-surface-variant mb-6">Mở ứng dụng Google Authenticator hoặc Authy trên điện thoại và quét mã QR bên dưới.</p>
            
            <div className="flex justify-center mb-4 bg-white p-4 rounded-xl border border-outline-variant/30">
              <img src={qrCodeUrl} alt="2FA QR Code" className="w-48 h-48" />
            </div>

            <div className="mb-6">
              <p className="text-xs text-center text-on-surface-variant mb-2">Hoặc nhập mã thiết lập thủ công:</p>
              <div className="flex items-center gap-2 bg-surface-variant/30 border border-outline-variant/30 rounded px-3 py-2">
                <code className="text-[13px] font-mono text-primary flex-1 tracking-wider text-center">{twoFactorSecret}</code>
                <button 
                  onClick={() => {
                    try {
                      if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(twoFactorSecret);
                      } else {
                        const textArea = document.createElement("textarea");
                        textArea.value = twoFactorSecret;
                        document.body.appendChild(textArea);
                        textArea.focus();
                        textArea.select();
                        try {
                          document.execCommand('copy');
                        } catch (err) {}
                        document.body.removeChild(textArea);
                      }
                      alert('Đã copy mã thiết lập!');
                    } catch (e) {
                      alert('Trình duyệt không hỗ trợ copy tự động, vui lòng copy thủ công!');
                    }
                  }}
                  className="text-on-surface-variant hover:text-primary transition-colors p-1"
                  title="Copy mã"
                >
                  <span className="material-symbols-outlined text-[18px]">content_copy</span>
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">Mã xác nhận (6 số)</label>
                <input 
                  type="text" 
                  maxLength={6}
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full input-glass border border-outline-variant rounded-lg px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono focus:border-primary focus:outline-none"
                  placeholder="000000"
                />
              </div>
              <button 
                onClick={handleConfirm2FA}
                className="w-full btn-primary text-white font-medium py-3 rounded-lg shadow-lg"
              >
                Xác nhận & Bật 2FA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EMAIL VERIFICATION MODAL */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface border border-outline-variant/30 rounded-2xl w-full max-w-sm shadow-2xl p-6 relative">
            <button 
              onClick={() => setShowEmailModal(false)}
              className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-3xl text-cyan-500">mark_email_read</span>
              </div>
              <h3 className="text-xl font-bold text-on-surface mb-2">Nhập mã xác nhận</h3>
              <p className="text-sm text-on-surface-variant mb-6">Chúng tôi vừa gửi một mã xác nhận gồm 6 chữ số tới email của bạn. Vui lòng kiểm tra hộp thư (và thư mục Spam).</p>
              
              <div className="w-full space-y-4">
                <input 
                  type="text" 
                  maxLength={6}
                  value={emailCode}
                  onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full input-glass border border-outline-variant rounded-lg px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono focus:border-primary focus:outline-none"
                  placeholder="000000"
                />
                <button 
                  onClick={handleVerifyEmail}
                  className="w-full btn-primary text-white font-medium py-3 rounded-lg shadow-lg"
                >
                  Xác thực Email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* LOG DETAIL MODAL */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface border border-outline-variant/30 rounded-2xl w-full max-w-md shadow-2xl p-6 relative">
            <button 
              onClick={() => setSelectedLog(null)}
              className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <h3 className="text-xl font-bold text-on-surface mb-4">Chi tiết đăng nhập</h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-on-surface-variant">Thời gian:</p>
                <p className="text-on-surface font-medium">{formatDate(selectedLog.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm text-on-surface-variant">Thiết bị / Trình duyệt:</p>
                <p className="text-on-surface font-medium break-all">{selectedLog.device}</p>
              </div>
              <div>
                <p className="text-sm text-on-surface-variant">Địa chỉ IP:</p>
                <p className="text-on-surface font-medium">{selectedLog.ip}</p>
              </div>
              <button 
                onClick={() => setSelectedLog(null)}
                className="w-full mt-4 btn-primary text-white font-medium py-2.5 rounded-lg shadow-lg"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
