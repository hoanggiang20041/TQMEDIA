'use client';

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
const MySwal = withReactContent(Swal);

type DepositRequest = {
  id: string;
  name: string;
  content: string;
  amount: number;
  date: string;
  status: 'Chờ xử lý' | 'Đã duyệt' | 'Từ chối';
};

export default function AdminDepositsPage() {
  const [requests, setRequests] = useState<DepositRequest[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const loadData = () => {
      const data = localStorage.getItem('tqmedia_deposit_requests');
      if (data) setRequests(JSON.parse(data));
    };
    loadData();
    // Auto refresh every 5 seconds to catch new deposits
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleApprove = async (req: DepositRequest) => {
    const __confirmResult = await MySwal.fire({ title: 'Xác nhận', text: `Bạn chắc chắn muốn duyệt nạp ${req.amount.toLocaleString('vi-VN')}₫ cho ${req.name}?`, icon: 'warning', showCancelButton: true, confirmButtonText: 'Đồng ý', cancelButtonText: 'Hủy' });
    if (__confirmResult.isConfirmed) {
      // Update balance
      const currentBalance = parseInt(localStorage.getItem('tqmedia_balance') || '0', 10);
      localStorage.setItem('tqmedia_balance', (currentBalance + req.amount).toString());

      // Update request status
      const updated = requests.map(r => r.id === req.id ? { ...r, status: 'Đã duyệt' as const } : r);
      setRequests(updated);
      localStorage.setItem('tqmedia_deposit_requests', JSON.stringify(updated));
    }
  };

  const handleReject = async (req: DepositRequest) => {
    const __confirmResult = await MySwal.fire({ title: 'Xác nhận', text: `Bạn muốn TỪ CHỐI yêu cầu nạp tiền này?`, icon: 'warning', showCancelButton: true, confirmButtonText: 'Đồng ý', cancelButtonText: 'Hủy' });
    if (__confirmResult.isConfirmed) {
      const updated = requests.map(r => r.id === req.id ? { ...r, status: 'Từ chối' as const } : r);
      setRequests(updated);
      localStorage.setItem('tqmedia_deposit_requests', JSON.stringify(updated));
    }
  };

  const pendingCount = requests.filter(r => r.status === 'Chờ xử lý').length;

  const totalPages = Math.ceil(requests.length / itemsPerPage);
  const currentRequests = requests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6 max-w-7xl w-full min-w-0 mx-auto p-4 md:p-6 lg:p-8 relative">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-bold text-primary neon-glow flex flex-wrap items-center gap-3">
          Duyệt nạp tiền
          {pendingCount > 0 && (
            <span className="bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full animate-pulse">
              {pendingCount} chờ duyệt
            </span>
          )}
        </h1>
        <p className="text-on-surface-variant text-base">Quản lý và xét duyệt các giao dịch chuyển khoản thủ công của khách hàng.</p>
      </div>

      <div className="glass-panel overflow-hidden border border-outline-variant/30">
        <div className="overflow-x-auto w-full custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-surface-variant/50 border-b border-outline/20">
                <th className="p-4 text-sm font-semibold text-on-surface-variant">Mã Đơn</th>
                <th className="p-4 text-sm font-semibold text-on-surface-variant">Thời gian</th>
                <th className="p-4 text-sm font-semibold text-on-surface-variant">Khách hàng</th>
                <th className="p-4 text-sm font-semibold text-on-surface-variant">Nội dung chuyển khoản</th>
                <th className="p-4 text-sm font-semibold text-on-surface-variant text-right">Số tiền</th>
                <th className="p-4 text-sm font-semibold text-on-surface-variant text-center">Trạng thái</th>
                <th className="p-4 text-sm font-semibold text-on-surface-variant text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline/10">
              {currentRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-on-surface-variant">Chưa có yêu cầu nạp tiền nào.</td>
                </tr>
              ) : currentRequests.map((req) => (
                <tr key={req.id} className="hover:bg-surface-variant/20 transition-colors group">
                  <td className="p-4 text-sm text-secondary font-mono whitespace-nowrap">{req.id}</td>
                  <td className="p-4 text-sm text-on-surface-variant whitespace-nowrap">{req.date}</td>
                  <td className="p-4 text-sm text-on-surface font-bold whitespace-nowrap">{req.name}</td>
                  <td className="p-4 text-sm whitespace-nowrap">
                    <span className="inline-block bg-red-500/10 text-red-500 px-2 py-1 rounded border border-red-500/20 font-mono text-xs">
                      {req.content}
                    </span>
                  </td>
                  <td className="p-4 text-base text-primary font-bold text-right whitespace-nowrap">{req.amount.toLocaleString('vi-VN')}₫</td>
                  <td className="p-4 text-center whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                      req.status === 'Chờ xử lý' ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 animate-pulse' :
                      req.status === 'Đã duyệt' ? 'bg-green-500/20 text-green-500 border border-green-500/30' :
                      'bg-red-500/20 text-red-500 border border-red-500/30'
                    }`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="p-4 text-center whitespace-nowrap">
                    {req.status === 'Chờ xử lý' ? (
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleApprove(req)}
                          className="p-1.5 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white rounded transition-colors"
                          title="Duyệt nạp"
                        >
                          <span className="material-symbols-outlined text-sm">check</span>
                        </button>
                        <button 
                          onClick={() => handleReject(req)}
                          className="p-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded transition-colors"
                          title="Từ chối"
                        >
                          <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                      </div>
                    ) : (
                      <span className="text-on-surface-variant text-sm">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-outline/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm bg-surface-variant/30">
          <span className="text-on-surface-variant">
            Hiển thị {requests.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, requests.length)} của {requests.length} yêu cầu
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-outline/30 text-on-surface-variant hover:bg-surface-variant/50 hover:text-primary transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              
              {Array.from({ length: totalPages }).map((_, i) => (
                <button 
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-8 h-8 rounded-lg border font-medium flex items-center justify-center transition-colors ${currentPage === i + 1 ? 'bg-primary/20 text-primary border-primary/30' : 'border-outline/30 text-on-surface-variant hover:bg-surface-variant/50 hover:text-primary'}`}
                >
                  {i + 1}
                </button>
              ))}

              <button 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-outline/30 text-on-surface-variant hover:bg-surface-variant/50 hover:text-primary transition-colors disabled:opacity-50"
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
