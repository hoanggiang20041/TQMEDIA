'use client';

import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
const MySwal = withReactContent(Swal);

type OrderStatus = 'completed' | 'processing' | 'cancelled' | 'running' | 'refund_requested';

interface Order {
  id: string;
  date: string;
  service: string;
  target: string;
  status: OrderStatus;
  total: string;
  totalNum?: number;
  createdAt?: string;
  updatedAt?: string;
  quantity?: number; // Might not exist in DB yet
  startCount?: number;
  remains?: number;
}

const renderStatus = (status: OrderStatus) => {
  switch (status) {
    case 'completed':
      return <span className="text-[#4cd7f6] font-medium">Hoàn thành</span>;
    case 'processing':
      return <span className="text-[#ffb784] font-medium">Chờ xử lý</span>;
    case 'running':
      return <span className="text-primary font-medium">Đang chạy</span>;
    case 'refund_requested':
      return <span className="text-warning font-medium">Yêu cầu hủy</span>;
    case 'cancelled':
      return <span className="text-[#ffb4ab] font-medium">Đã hủy</span>;
    default:
      return <span>{status}</span>;
  }
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [serverFilter, setServerFilter] = useState('');
  const [limitFilter, setLimitFilter] = useState('10');

  const [currentPage, setCurrentPage] = useState(1);

  const loadOrders = () => {
    const token = localStorage.getItem('tq_token');
    fetch('/api/orders', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          data.forEach((order: Order) => {
            order.totalNum = order.totalNum || 0;
          });
          setOrders(data);
        } else {
          setOrders([]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load orders', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleSupport = (orderId: string) => {
    window.location.href = `/contact?orderId=${encodeURIComponent(orderId)}`;
  };

  const filteredOrders = orders.filter(order => {
    if (statusFilter && order.status !== statusFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (!order.id?.toLowerCase().includes(term) && !order.target?.toLowerCase().includes(term)) return false;
    }
    return true;
  });

  const itemsPerPage = parseInt(limitFilter) || 10;
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const currentOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading) return <div className="p-8 text-center text-on-surface">Đang tải lịch sử đơn hàng...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display-lg text-primary uppercase">NHẬT KÝ ĐƠN HÀNG</h1>
        <div className="text-sm text-on-surface-variant mt-1 flex items-center gap-2">
          <span>Trang chủ</span>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-primary">Nhật ký đơn hàng</span>
        </div>
      </div>

      {/* Filter Box */}
      <div className="glass-card p-6 rounded-xl border border-white/10">
        <h3 className="text-on-surface font-medium mb-4">Lọc tìm kiếm</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-on-surface-variant">Tìm kiếm</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm..."
              className="input-glass w-full px-4 py-2 rounded-lg font-body-md text-sm border-white/10"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-on-surface-variant">Cột</label>
            <select className="input-glass w-full px-4 py-2 rounded-lg appearance-none bg-surface/50 font-body-md text-sm border-white/10">
              <option>--Mã đơn Uid</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-on-surface-variant">servers</label>
            <select 
              value={serverFilter}
              onChange={(e) => setServerFilter(e.target.value)}
              className="input-glass w-full px-4 py-2 rounded-lg appearance-none bg-surface/50 font-body-md text-sm border-white/10"
            >
              <option value="">Tất cả servers</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-on-surface-variant">Trạng thái</label>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-glass w-full px-4 py-2 rounded-lg appearance-none bg-surface/50 font-body-md text-sm border-white/10"
            >
              <option value="">Tất cả</option>
              <option value="processing">Chờ xử lý</option>
              <option value="running">Đang chạy</option>
              <option value="completed">Hoàn thành</option>
              <option value="cancelled">Đã hủy</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-on-surface-variant">Số lượng</label>
            <select 
              value={limitFilter}
              onChange={(e) => setLimitFilter(e.target.value)}
              className="input-glass w-full px-4 py-2 rounded-lg appearance-none bg-surface/50 font-body-md text-sm border-white/10"
            >
              <option value="10">10 đơn</option>
              <option value="20">20 đơn</option>
              <option value="50">50 đơn</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="glass-panel overflow-hidden rounded-xl bg-surface/40">
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="border-b border-white/10 bg-surface-variant/30 text-sm font-medium text-on-surface">
                <th className="p-4 whitespace-nowrap w-[50px]"><input type="checkbox" className="rounded border-white/20 bg-transparent" /></th>
                <th className="p-4 whitespace-nowrap w-[100px]">Mã đơn</th>
                <th className="p-4 whitespace-nowrap w-[120px]">Thao tác <span className="material-symbols-outlined text-[16px] align-middle">expand_more</span></th>
                <th className="p-4 whitespace-nowrap w-[250px]">UID</th>
                <th className="p-4 whitespace-nowrap min-w-[200px]">Dịch vụ</th>
                <th className="p-4 whitespace-nowrap min-w-[150px]">Trạng thái</th>
                <th className="p-4 whitespace-nowrap min-w-[150px]">Số lượng</th>
                <th className="p-4 whitespace-nowrap min-w-[180px]">Thời gian</th>
                <th className="p-4 whitespace-nowrap">Nội dung</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {currentOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-on-surface-variant">Không có dữ liệu</td>
                </tr>
              ) : currentOrders.map((order) => {
                const numericId = order.id.replace('#ORD-', '');
                return (
                  <tr key={order.id} className="hover:bg-surface-variant/20 transition-colors">
                    <td className="p-4 whitespace-nowrap">
                      <input type="checkbox" className="rounded border-white/20 bg-transparent" />
                    </td>
                    <td className="p-4 font-bold text-on-surface whitespace-nowrap">
                      {numericId}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <button 
                        onClick={() => handleSupport(order.id)}
                        className="bg-[#5B58FF] hover:bg-[#4a47e6] text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"
                      >
                        Hỗ trợ
                      </button>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <a href={order.target?.startsWith('http') ? order.target : `https://${order.target}`} target="_blank" rel="noopener noreferrer" className="text-[#5B58FF] hover:underline font-medium text-sm truncate block max-w-[220px]" title={order.target}>
                        {order.target}
                      </a>
                    </td>
                    <td className="p-4 text-sm text-on-surface font-medium max-w-[200px] break-words">
                      {order.service}
                    </td>
                    <td className="p-4 text-sm">
                      <ul className="list-disc list-inside space-y-1">
                        <li className="text-on-surface">Bắt đầu : <span className="text-[#FF5252] font-medium">{(order.startCount || 0).toLocaleString('vi-VN')}</span></li>
                        <li className="text-on-surface">Tình trạng : {renderStatus(order.status)}</li>
                        <li className="text-on-surface">Còn lại : <span className="text-[#4cd7f6] font-medium">{(order.remains || 0).toLocaleString('vi-VN')}</span></li>
                      </ul>
                    </td>
                    <td className="p-4 text-sm">
                      <ul className="list-disc list-inside space-y-1">
                        <li className="text-on-surface">Chi phí : <span className="text-[#8e24aa] font-medium">{order.totalNum ? order.totalNum.toLocaleString('vi-VN') + ' đ' : (Number(order.total) ? Number(order.total).toLocaleString('vi-VN') + ' đ' : order.total)}</span></li>
                        <li className="text-on-surface">Số lượng : <span className="text-primary font-medium">{(order.quantity || 1).toLocaleString('vi-VN')}</span></li>
                        <li className="text-on-surface">Đơn giá : <span className="text-[#4cd7f6] font-medium">{order.totalNum ? (order.totalNum / (order.quantity || 1)).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + ' đ' : (Number(order.total) ? (Number(order.total) / (order.quantity || 1)).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + ' đ' : '0 đ')}</span></li>
                      </ul>
                    </td>
                    <td className="p-4 text-xs text-on-surface">
                      <ul className="list-disc list-inside space-y-1">
                        <li className="whitespace-nowrap"><span className="font-medium">Ngày tạo :</span> <span className="text-[#ffb784] font-medium">{order.createdAt ? new Date(order.createdAt).toLocaleString('sv-SE', {timeZone: 'Asia/Ho_Chi_Minh'}).replace('T', ' ') : ''}</span></li>
                        <li className="whitespace-nowrap"><span className="font-medium">Update :</span> <span className="text-[#ffb784] font-medium">{order.updatedAt ? new Date(order.updatedAt).toLocaleString('sv-SE', {timeZone: 'Asia/Ho_Chi_Minh'}).replace('T', ' ') : ''}</span></li>
                      </ul>
                    </td>
                    <td className="p-4 text-sm font-medium text-[#5B58FF]">
                      Bình luận & ghi chú
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="p-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 font-body-md text-sm">
          <span className="text-on-surface-variant">
            Hiển thị {filteredOrders.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredOrders.length)} của {filteredOrders.length} bản ghi
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-white/10 text-on-surface-variant hover:bg-white/10 hover:text-primary transition-colors disabled:opacity-50 flex items-center"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button 
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-8 h-8 rounded-lg border font-medium flex items-center justify-center transition-colors ${currentPage === i + 1 ? 'bg-[#5B58FF] text-white border-[#5B58FF]' : 'border-white/10 text-on-surface-variant hover:bg-white/10 hover:text-primary'}`}
                >
                  {i + 1}
                </button>
              ))}
              <button 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-white/10 text-on-surface-variant hover:bg-white/10 hover:text-primary transition-colors disabled:opacity-50 flex items-center"
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
