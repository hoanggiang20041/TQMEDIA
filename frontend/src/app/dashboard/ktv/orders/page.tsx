'use client';

import React, { useState, useEffect } from 'react';
import { useRole } from '@/context/RoleContext';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
const MySwal = withReactContent(Swal);

interface Order {
  id: string;
  date: string;
  platform?: string;
  service: string;
  target: string;
  status: 'processing' | 'running' | 'completed' | 'refund_requested' | 'cancelled';
}

const getPlatformIconUrl = (platform?: string) => {
  if (!platform) return null;
  const p = platform.toLowerCase();
  const iconUrls: Record<string, string> = {
    'tiktok': 'https://img.icons8.com/3d-fluency/94/tiktok.png',
    'facebook': 'https://img.icons8.com/3d-fluency/94/facebook-logo.png',
    'google': 'https://img.icons8.com/3d-fluency/94/google-logo.png',
    'instagram': 'https://img.icons8.com/3d-fluency/94/instagram-new.png',
    'youtube': 'https://img.icons8.com/3d-fluency/94/youtube-play.png',
    'shopee': 'https://img.icons8.com/color/94/shopee.png',
    'telegram': 'https://img.icons8.com/3d-fluency/94/telegram.png',
    'twitter': 'https://img.icons8.com/color/94/twitterx.png',
    'x-twitter': 'https://img.icons8.com/color/94/twitterx.png',
    'threads': 'https://img.icons8.com/nolan/94/threads.png'
  };
  return iconUrls[p];
};

export default function KtvOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');

  const loadOrders = () => {
    const token = localStorage.getItem('tq_token');
    fetch('/api/technician/orders', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setOrders(data);
        } else {
          setOrders([]);
          if (data.error) console.error(data.error);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleStatusChange = async (orderId: string, action: 'approve' | 'reject') => {
    if (action === 'approve') {
      const confirmMsg = `Bạn có chắc muốn duyệt HỦY và HOÀN TIỀN cho đơn ${orderId}?`;
      const __confirmResult = await MySwal.fire({ title: 'Xác nhận duyệt hủy', text: confirmMsg, icon: 'warning', showCancelButton: true, confirmButtonText: 'Duyệt Hủy', cancelButtonText: 'Đóng' });
      if (!__confirmResult.isConfirmed) return;
    } else {
      const confirmMsg = `Bạn có chắc muốn TỪ CHỐI hủy đơn ${orderId}? Đơn sẽ tiếp tục chạy.`;
      const __confirmResult = await MySwal.fire({ title: 'Xác nhận từ chối', text: confirmMsg, icon: 'warning', showCancelButton: true, confirmButtonText: 'Từ chối', cancelButtonText: 'Đóng' });
      if (!__confirmResult.isConfirmed) return;
    }

    try {
      const encodedId = encodeURIComponent(orderId);
      const url = action === 'approve' ? `/api/technician/orders/${encodedId}/approve-refund` : `/api/technician/orders/${encodedId}/reject-refund`;
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('tq_token')}` },
      });
      const data = await res.json();
      if (data.success) {
        MySwal.fire({ icon: 'info', title: 'Thông báo', text: data.message })
        loadOrders();
      } else {
        MySwal.fire({ icon: 'info', title: 'Thông báo', text: data.error || 'Có lỗi xảy ra' })
      }
    } catch (error) {
      console.error(error);
      MySwal.fire({ icon: 'info', title: 'Thông báo', text: 'Lỗi kết nối máy chủ' })
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredOrders = orders.filter(order => {
    if (statusFilter && order.status !== statusFilter) return false;
    if (platformFilter && order.platform?.toLowerCase() !== platformFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (!order.id?.toLowerCase().includes(term) && !order.target?.toLowerCase().includes(term)) return false;
    }
    return true;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, platformFilter]);

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const currentOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-display-lg text-primary neon-glow">Quản Lý Đơn Hàng (KTV)</h1>
        <p className="text-on-surface-variant font-body-md">Tra cứu đơn hàng và duyệt hủy đơn/thu hồi tài nguyên.</p>
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="p-4 border-b border-white/10 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
              search
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Mã đơn, Link..."
              className="input-glass w-full pl-10 pr-4 py-2 rounded-xl font-body-md text-sm"
            />
          </div>
          <div className="relative w-full md:w-48">
            <select 
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="input-glass w-full px-4 py-2 rounded-xl appearance-none bg-surface/50 font-body-md text-sm"
            >
              <option value="">Tất cả nền tảng</option>
              <option value="facebook">Facebook</option>
              <option value="tiktok">TikTok</option>
              <option value="instagram">Instagram</option>
              <option value="youtube">YouTube</option>
              <option value="shopee">Shopee</option>
              <option value="google">Google</option>
            </select>
          </div>
          <div className="relative w-full md:w-48">
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-glass w-full px-4 py-2 rounded-xl appearance-none bg-surface/50 font-body-md text-sm"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="processing">Đang xử lý</option>
              <option value="running">Đang chạy</option>
              <option value="completed">Hoàn thành</option>
              <option value="refund_requested">Yêu cầu hủy</option>
              <option value="cancelled">Đã hủy</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-surface-variant/50 border-b border-outline/20">
                <th className="p-4 font-label-md text-on-surface-variant whitespace-nowrap">Mã Đơn</th>
                <th className="p-4 font-label-md text-on-surface-variant whitespace-nowrap">Ngày tạo</th>
                <th className="p-4 font-label-md text-on-surface-variant whitespace-nowrap">Mã Đối Tác</th>
                <th className="p-4 font-label-md text-on-surface-variant whitespace-nowrap">Nền tảng</th>
                <th className="p-4 font-label-md text-on-surface-variant min-w-[250px]">Dịch vụ</th>
                <th className="p-4 font-label-md text-on-surface-variant min-w-[200px]">Link/Target</th>
                <th className="p-4 font-label-md text-on-surface-variant text-center whitespace-nowrap">Tiến độ</th>
                <th className="p-4 font-label-md text-on-surface-variant text-right whitespace-nowrap">Số lượng</th>
                <th className="p-4 font-label-md text-on-surface-variant text-center whitespace-nowrap">Trạng thái</th>
                <th className="p-4 font-label-md text-on-surface-variant text-center whitespace-nowrap min-w-[180px]">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline/10">
              {loading ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-on-surface">Đang tải...</td>
                </tr>
              ) : currentOrders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-on-surface-variant">Chưa có đơn hàng nào.</td>
                </tr>
              ) : currentOrders.map((order: any) => {
                const iconSrc = getPlatformIconUrl(order.platform);
                return (
                <tr key={order.id} className="hover:bg-surface-variant/20 transition-colors group">
                  <td className="p-4 font-body-sm text-secondary font-mono whitespace-nowrap">{order.id}</td>
                  <td className="p-4 font-body-sm text-on-surface-variant whitespace-nowrap">{order.date}</td>
                  <td className="p-4 font-body-sm text-on-surface-variant font-mono whitespace-nowrap">{order.apiOrderId || '-'}</td>
                  <td className="p-4 text-center whitespace-nowrap">
                    {iconSrc ? (
                      <div className="w-8 h-8 mx-auto relative overflow-hidden premium-icon-wrapper rounded-full flex items-center justify-center">
                        <img src={iconSrc} alt={order.platform} className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <span className="font-body-sm capitalize text-on-surface-variant">{order.platform || '-'}</span>
                    )}
                  </td>
                  <td className="p-4 font-body-sm text-on-surface min-w-[250px]">{order.service}</td>
                  <td className="p-4 font-body-sm truncate max-w-[200px]">
                    <a 
                      href={order.target?.startsWith('http') ? order.target : `https://${order.target}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-secondary hover:text-primary transition-colors hover:underline inline-flex items-center gap-1"
                      title={order.target}
                    >
                      <span className="truncate">{order.target}</span>
                      <span className="material-symbols-outlined text-[14px] shrink-0">open_in_new</span>
                    </a>
                  </td>
                  <td className="p-4 font-body-sm whitespace-nowrap text-center">
                    <div className="text-on-surface-variant">Bắt đầu: <span className="text-[#FF5252] font-medium">{order.startCount || 0}</span></div>
                    <div className="text-on-surface-variant">Còn lại: <span className="text-[#4cd7f6] font-medium">{order.remains || 0}</span></div>
                  </td>
                  <td className="p-4 font-body-md text-primary font-bold text-right whitespace-nowrap">{order.quantity || 0}</td>
                  <td className="p-4 text-center whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      order.status === 'processing' ? 'bg-warning/20 text-warning border border-warning/30 animate-pulse' :
                      order.status === 'running' ? 'bg-primary/20 text-primary border border-primary/30' :
                      order.status === 'refund_requested' ? 'bg-orange-500/20 text-orange-500 border border-orange-500/30 animate-pulse' :
                      order.status === 'completed' ? 'bg-success/20 text-success border border-success/30' :
                      'bg-error/20 text-error border border-error/30'
                    }`}>
                      {order.status === 'processing' ? 'Đang xử lý' : 
                       order.status === 'running' ? 'Đang chạy' :
                       order.status === 'refund_requested' ? 'Yêu cầu hủy' :
                       order.status === 'completed' ? 'Hoàn thành' : 'Đã hủy'}
                    </span>
                  </td>
                  <td className="p-4 text-center whitespace-nowrap">
                    {order.status === 'processing' || order.status === 'running' ? (
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleStatusChange(order.id, 'approve')}
                          className="px-3 py-1 bg-error/10 text-error border border-error/30 hover:bg-error hover:text-white rounded transition-colors text-xs font-bold"
                          title="Hủy đơn ngay lập tức"
                        >
                          Hủy Đơn
                        </button>
                      </div>
                    ) : null}
                    {order.status === 'refund_requested' && (
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleStatusChange(order.id, 'approve')}
                          className="px-3 py-1 bg-orange-500/10 text-orange-500 border border-orange-500/30 hover:bg-orange-500 hover:text-white rounded transition-colors text-xs font-bold"
                          title="Duyệt hoàn tiền cho khách"
                        >
                          Duyệt Hủy
                        </button>
                        <button 
                          onClick={() => handleStatusChange(order.id, 'reject')}
                          className="px-3 py-1 bg-surface-variant text-on-surface-variant hover:bg-primary hover:text-white rounded transition-colors text-xs font-bold"
                          title="Từ chối hủy, tiếp tục chạy"
                        >
                          Từ chối
                        </button>
                      </div>
                    )}
                    {(order.status === 'completed' || order.status === 'cancelled') && (
                      <span className="text-on-surface-variant text-sm">-</span>
                    )}
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
        
        {/* Pagination cho Admin */}
        <div className="p-4 border-t border-outline/20 flex flex-col sm:flex-row items-center justify-between gap-4 font-body-md text-sm bg-surface-variant/30">
          <span className="text-on-surface-variant">
            Hiển thị {filteredOrders.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredOrders.length)} của {filteredOrders.length} đơn hàng
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-outline/30 text-on-surface-variant hover:bg-surface-variant/50 hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              
              {Array.from({ length: totalPages }).map((_, i) => {
                if (totalPages > 5 && (i < currentPage - 3 || i > currentPage + 1)) {
                  if (i === 0 || i === totalPages - 1) {
                    return (
                      <button 
                        key={i}
                        onClick={() => setCurrentPage(i + 1)}
                        className={`w-8 h-8 rounded-lg border font-medium flex items-center justify-center transition-colors ${currentPage === i + 1 ? 'bg-primary/20 text-primary border-primary/30' : 'border-outline/30 text-on-surface-variant hover:bg-surface-variant/50 hover:text-primary'}`}
                      >
                        {i + 1}
                      </button>
                    )
                  }
                  if (i === 1 || i === totalPages - 2) return <span key={i} className="text-on-surface-variant">...</span>;
                  return null;
                }
                return (
                  <button 
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-8 h-8 rounded-lg border font-medium flex items-center justify-center transition-colors ${currentPage === i + 1 ? 'bg-primary/20 text-primary border-primary/30' : 'border-outline/30 text-on-surface-variant hover:bg-surface-variant/50 hover:text-primary'}`}
                  >
                    {i + 1}
                  </button>
                )
              })}

              <button 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-outline/30 text-on-surface-variant hover:bg-surface-variant/50 hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
