'use client';

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const Modal = ({ isOpen, onClose, children }: { isOpen: boolean, onClose: () => void, children: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface border border-outline-variant/30 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-on-surface-variant hover:bg-surface-variant rounded-full transition-colors">
          <span className="material-symbols-outlined">close</span>
        </button>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

const MySwal = withReactContent(Swal);

interface Ticket {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: string;
  replyMessage: string | null;
  createdAt: string;
}

export default function SupportsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [isComposingEmail, setIsComposingEmail] = useState(false);
  const [newEmailData, setNewEmailData] = useState({ to: '', subject: '', message: '' });
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const res = await fetch('/api/admin/support-tickets', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('tq_token')}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setTickets(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    
    setIsReplying(true);
    try {
      const res = await fetch(`/api/admin/support-tickets/${selectedTicket.id}/reply`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('tq_token')}`
        },
        body: JSON.stringify({ replyMessage: replyText })
      });
      
      if (res.ok) {
        MySwal.fire({ icon: 'success', title: 'Đã gửi phản hồi thành công', timer: 1500, showConfirmButton: false });
        setSelectedTicket(null);
        setReplyText('');
        fetchTickets();
      } else {
        const data = await res.json();
        MySwal.fire({ icon: 'error', title: 'Lỗi', text: data.error || 'Có lỗi xảy ra' });
      }
    } catch (err) {
      MySwal.fire({ icon: 'error', title: 'Lỗi', text: 'Không thể kết nối đến máy chủ' });
    } finally {
      setIsReplying(false);
    }
  };

  const handleSendNewEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingEmail(true);
    try {
      const res = await fetch('/api/admin/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('tq_token')}`
        },
        body: JSON.stringify({
          email: newEmailData.to,
          subject: newEmailData.subject,
          message: newEmailData.message
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        MySwal.fire({ icon: 'success', title: 'Thành công', text: 'Đã gửi email thành công!', timer: 2000, showConfirmButton: false });
        setIsComposingEmail(false);
        setNewEmailData({ to: '', subject: '', message: '' });
      } else {
        MySwal.fire({ icon: 'error', title: 'Lỗi', text: data.error || 'Có lỗi xảy ra' });
      }
    } catch (err) {
      MySwal.fire({ icon: 'error', title: 'Lỗi', text: 'Không thể kết nối đến máy chủ' });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleDelete = async (id: string) => {
    const result = await MySwal.fire({
      title: 'Xoá liên hệ này?',
      text: 'Thao tác này không thể hoàn tác.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Xoá',
      cancelButtonText: 'Huỷ'
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/admin/support-tickets/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('tq_token')}` }
        });
        if (res.ok) {
          fetchTickets();
          MySwal.fire('Đã xoá', '', 'success');
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-on-surface">Yêu cầu hỗ trợ (Liên hệ)</h1>
        <button 
          onClick={() => setIsComposingEmail(true)}
          className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:brightness-110 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-500/30"
        >
          <span className="material-symbols-outlined text-[20px]">mail</span>
          Gửi Email Mới
        </button>
      </div>

      <div className="bg-surface border border-outline-variant/30 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-variant text-on-surface-variant text-sm border-b border-outline-variant/30">
                <th className="p-4 font-semibold">Khách hàng</th>
                <th className="p-4 font-semibold">SĐT</th>
                <th className="p-4 font-semibold">Chủ đề</th>
                <th className="p-4 font-semibold">Ngày gửi</th>
                <th className="p-4 font-semibold">Trạng thái</th>
                <th className="p-4 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center p-6 text-on-surface-variant">Đang tải...</td></tr>
              ) : tickets.length === 0 ? (
                <tr><td colSpan={6} className="text-center p-6 text-on-surface-variant">Chưa có liên hệ nào.</td></tr>
              ) : (
                tickets.map(ticket => (
                  <tr key={ticket.id} className="border-b border-outline-variant/30 hover:bg-surface-variant/30 transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-on-surface">{ticket.name}</div>
                      <div className="text-xs text-on-surface-variant">{ticket.email}</div>
                    </td>
                    <td className="p-4 text-sm text-on-surface">{ticket.phone || '-'}</td>
                    <td className="p-4 text-sm text-on-surface">{ticket.subject}</td>
                    <td className="p-4 text-sm text-on-surface">{new Date(ticket.createdAt).toLocaleString('vi-VN')}</td>
                    <td className="p-4">
                      {ticket.status === 'resolved' ? (
                        <span className="px-3 py-1 bg-green-500/10 text-green-500 text-xs rounded-full font-medium border border-green-500/20">Đã phản hồi</span>
                      ) : (
                        <span className="px-3 py-1 bg-yellow-500/10 text-yellow-500 text-xs rounded-full font-medium border border-yellow-500/20">Chờ xử lý</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => setSelectedTicket(ticket)}
                        className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary hover:text-on-primary transition-colors mr-2"
                      >
                        {ticket.status === 'resolved' ? 'Xem chi tiết' : 'Đọc & Trả lời'}
                      </button>
                      <button 
                        onClick={() => handleDelete(ticket.id)}
                        className="p-1.5 text-error hover:bg-error/10 rounded-lg transition-colors"
                      >
                        <span className="material-symbols-outlined text-lg block">delete</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={!!selectedTicket} onClose={() => setSelectedTicket(null)}>
        {selectedTicket && (
          <div className="w-full max-w-2xl mx-auto p-2">
            <h2 className="text-xl font-bold text-on-surface mb-4">Chi tiết yêu cầu</h2>
            
            <div className="bg-surface-variant/50 rounded-xl p-4 mb-4 border border-outline-variant/30">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-xs text-on-surface-variant mb-1">Người gửi</div>
                  <div className="font-medium text-on-surface">{selectedTicket.name}</div>
                </div>
                <div>
                  <div className="text-xs text-on-surface-variant mb-1">Email</div>
                  <div className="font-medium text-on-surface">{selectedTicket.email}</div>
                </div>
                <div>
                  <div className="text-xs text-on-surface-variant mb-1">Số điện thoại</div>
                  <div className="font-medium text-on-surface">{selectedTicket.phone || 'Không có'}</div>
                </div>
                <div>
                  <div className="text-xs text-on-surface-variant mb-1">Chủ đề</div>
                  <div className="font-medium text-on-surface">{selectedTicket.subject}</div>
                </div>
              </div>
              
              <div>
                <div className="text-xs text-on-surface-variant mb-1">Nội dung tin nhắn:</div>
                <div className="bg-surface p-3 rounded-lg text-on-surface text-sm border border-outline-variant/20 whitespace-pre-wrap">
                  {selectedTicket.message}
                </div>
              </div>
            </div>

            {selectedTicket.status === 'resolved' ? (
              <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/20">
                <div className="flex items-center gap-2 mb-2 text-green-500">
                  <span className="material-symbols-outlined">check_circle</span>
                  <span className="font-bold">Đã phản hồi</span>
                </div>
                <div className="text-sm text-on-surface whitespace-pre-wrap">
                  {selectedTicket.replyMessage}
                </div>
              </div>
            ) : (
              <form onSubmit={handleReply}>
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-on-surface-variant mb-2">Soạn nội dung phản hồi (Sẽ gửi qua email cho khách):</label>
                  <textarea 
                    required
                    rows={6}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Nhập nội dung phản hồi tại đây..."
                    className="w-full input-glass px-4 py-3 rounded-lg text-on-surface text-base focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
                  ></textarea>
                </div>
                <div className="flex justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={() => setSelectedTicket(null)}
                    className="px-4 py-2 rounded-lg font-medium text-on-surface-variant hover:bg-surface-variant transition-colors"
                  >
                    Đóng
                  </button>
                  <button 
                    type="submit" 
                    disabled={isReplying}
                    className="px-6 py-2 bg-primary text-on-primary rounded-lg font-bold hover:shadow-lg hover:shadow-primary/30 transition-all flex items-center gap-2"
                  >
                    {isReplying ? 'Đang gửi...' : 'Gửi phản hồi'}
                    {!isReplying && <span className="material-symbols-outlined text-[18px]">send</span>}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </Modal>

      <Modal isOpen={isComposingEmail} onClose={() => setIsComposingEmail(false)}>
        <div className="w-full max-w-2xl mx-auto p-2">
          <h2 className="text-xl font-bold text-on-surface mb-6 flex items-center gap-3 border-b border-outline-variant/30 pb-4">
            <span className="material-symbols-outlined text-primary text-3xl">mail</span>
            Soạn Email Gửi Trực Tiếp
          </h2>
          
          <form onSubmit={handleSendNewEmail}>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-on-surface-variant mb-2">Email người nhận:</label>
              <input 
                type="email"
                required
                value={newEmailData.to}
                onChange={(e) => setNewEmailData({...newEmailData, to: e.target.value})}
                placeholder="Ví dụ: nguyenvan@gmail.com"
                className="w-full input-glass px-4 py-3 rounded-lg text-on-surface text-base focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all border border-outline-variant/30 bg-surface-variant/20"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-semibold text-on-surface-variant mb-2">Chủ đề (Subject):</label>
              <input 
                type="text"
                required
                value={newEmailData.subject}
                onChange={(e) => setNewEmailData({...newEmailData, subject: e.target.value})}
                placeholder="Nhập tiêu đề email..."
                className="w-full input-glass px-4 py-3 rounded-lg text-on-surface text-base focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all border border-outline-variant/30 bg-surface-variant/20"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-on-surface-variant mb-2">Nội dung thư:</label>
              <textarea 
                required
                rows={8}
                value={newEmailData.message}
                onChange={(e) => setNewEmailData({...newEmailData, message: e.target.value})}
                placeholder="Nhập nội dung thư (có thể xuống dòng)..."
                className="w-full input-glass px-4 py-3 rounded-lg text-on-surface text-base focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none border border-outline-variant/30 bg-surface-variant/20"
              ></textarea>
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/30">
              <button 
                type="button" 
                onClick={() => setIsComposingEmail(false)}
                className="px-5 py-2.5 rounded-lg font-medium text-on-surface-variant hover:bg-surface-variant transition-colors"
              >
                Hủy
              </button>
              <button 
                type="submit" 
                disabled={isSendingEmail}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-bold hover:shadow-lg hover:shadow-blue-500/30 transition-all flex items-center gap-2 disabled:opacity-70"
              >
                {isSendingEmail ? 'Đang gửi...' : 'Gửi Email Ngay'}
                {!isSendingEmail && <span className="material-symbols-outlined text-[18px]">send</span>}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
