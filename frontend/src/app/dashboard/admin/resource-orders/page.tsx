'use client';

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { useRole } from '@/context/RoleContext';
const MySwal = withReactContent(Swal);

interface ResourceOrder {
  id: string;
  userId: string;
  resourceId: string;
  variantId?: string;
  quantity: number;
  totalAmount: number;
  totalImportAmount: number;
  deliveredData: string;
  createdAt: string;
  user: { email: string };
  resource: { name: string; category: string; type: string };
  variant?: { name: string };
}

export default function AdminResourceOrdersPage() {
  const { role } = useRole();
  const [orders, setOrders] = useState<ResourceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadOrders = () => {
    const token = localStorage.getItem('tq_token');
    fetch('/api/admin/resource-orders', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setOrders(data);
        } else {
          setOrders([]);
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
    const interval = setInterval(loadOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  const filteredOrders = orders.filter(order => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (!order.id?.toLowerCase().includes(term) && 
          !order.user?.email?.toLowerCase().includes(term) &&
          !order.resource?.name?.toLowerCase().includes(term) &&
          !order.variant?.name?.toLowerCase().includes(term)) {
        return false;
      }
    }
    return true;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const currentOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  
  const handleRevoke = async (order: any) => {
    const result = await MySwal.fire({
      title: 'Thu hồi sản phẩm?',
      html: `
        <p class="text-sm text-on-surface-variant mb-4">Bạn có chắc muốn thu hồi sản phẩm của đơn hàng <b>${order.id}</b>? Sản phẩm sẽ được đưa lại vào kho.</p>
        <div class="flex items-center gap-2 justify-center mt-2">
          <input type="checkbox" id="refundCheckbox" class="w-4 h-4 rounded border-outline-variant bg-surface" />
          <label for="refundCheckbox" class="text-sm font-medium text-on-surface">Hoàn lại tiền (${fmt(order.totalAmount)}) cho khách hàng?</label>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Đồng ý Thu hồi',
      cancelButtonText: 'Hủy bỏ',
      customClass: {
        popup: 'bg-surface border border-outline-variant/30 rounded-2xl',
        title: 'text-on-surface',
        htmlContainer: 'text-on-surface-variant',
        confirmButton: 'bg-red-500 hover:bg-red-600 text-white rounded-xl px-6 py-2.5 font-bold transition-colors',
        cancelButton: 'bg-surface-variant/50 hover:bg-surface-variant text-on-surface rounded-xl px-6 py-2.5 font-bold transition-colors'
      },
      preConfirm: () => {
        return (document.getElementById('refundCheckbox') as HTMLInputElement).checked;
      }
    });

    if (result.isConfirmed) {
      const refund = result.value;
      try {
        const token = localStorage.getItem('tq_token');
        const res = await fetch(`/api/admin/resource-orders/${encodeURIComponent(order.id)}/revoke`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ refund })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        MySwal.fire({
          title: 'Thành công!',
          text: 'Đã thu hồi sản phẩm thành công.',
          icon: 'success',
          customClass: {
            popup: 'bg-surface border border-outline-variant/30 rounded-2xl',
            title: 'text-on-surface',
            htmlContainer: 'text-on-surface-variant',
            confirmButton: 'bg-primary hover:bg-primary/90 text-on-primary rounded-xl px-6 py-2.5 font-bold transition-colors'
          }
        });
        
        window.location.reload();
      } catch (err: any) {
        MySwal.fire({
          title: 'Lỗi',
          text: err.message,
          icon: 'error',
          customClass: {
            popup: 'bg-surface border border-outline-variant/30 rounded-2xl',
            title: 'text-on-surface',
            htmlContainer: 'text-on-surface-variant',
            confirmButton: 'bg-primary hover:bg-primary/90 text-on-primary rounded-xl px-6 py-2.5 font-bold transition-colors'
          }
        });
      }
    }
  };

  const showDeliveredData = (order: ResourceOrder) => {
    const rawData = order.deliveredData || '';
    const formattedData = rawData.replace(/\\n/g, '\\n');
    const resourceName = order.resource?.name || 'Tài nguyên đã bị xóa';
    const variantName = order.variant?.name ? `(${order.variant.name})` : '';

    MySwal.fire({
      title: 'Chi tiết Đơn hàng ' + order.id,
      html: `
        <div class="text-left bg-surface border border-outline-variant/30 rounded-xl p-4 mt-4 text-on-surface">
          <p class="text-sm text-on-surface-variant mb-3">
            Người mua: <strong class="text-white">${order.user?.email}</strong><br/>
            Tên: <strong class="text-cyan-400">${resourceName} ${variantName}</strong><br/>
            Số lượng: <strong class="text-white">${order.quantity}</strong><br/>
            ${role !== 'TECHNICIAN' ? `Tổng tiền: <strong class="text-green-400">${order.totalAmount.toLocaleString('vi-VN')} đ</strong><br/>
            Lợi nhuận: <strong class="text-yellow-400">${(order.totalAmount - (order.totalImportAmount || 0)).toLocaleString('vi-VN')} đ</strong>` : ''}
          </p>
          <div class="flex gap-2 justify-end mb-2">
             <button id="copyBtn" class="bg-blue-500/20 text-blue-400 hover:bg-blue-500/40 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">Sao chép</button>
             <button id="downloadBtn" class="bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/40 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">download</span> Tải về</button>
          </div>
          <div class="bg-black/50 p-4 rounded-lg border border-white/10 font-mono text-sm max-h-[40vh] overflow-y-auto whitespace-pre-wrap select-all">${formattedData}</div>
        </div>
      `,
      didOpen: () => {
         const copyBtn = document.getElementById('copyBtn');
         if (copyBtn) {
            copyBtn.onclick = () => {
               navigator.clipboard.writeText(formattedData);
               copyBtn.innerText = 'Đã sao chép!';
               setTimeout(() => copyBtn.innerText = 'Sao chép', 2000);
            };
         }
         const downloadBtn = document.getElementById('downloadBtn');
         if (downloadBtn) {
            downloadBtn.onclick = () => {
              const element = document.createElement('a');
              const file = new Blob([formattedData], {type: 'text/plain'});
              element.href = URL.createObjectURL(file);
              element.download = `don_hang_${order.id}.txt`;
              document.body.appendChild(element);
              element.click();
              document.body.removeChild(element);
            };
         }
      },
      width: '600px',
      showConfirmButton: false,
      showCloseButton: true,
      background: 'var(--color-surface-container)'
    });
  };

  const fmt = (n: number) => n?.toLocaleString('vi-VN') + ' đ';

  if (loading) return <div className="p-8 text-center text-on-surface">Đang tải...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/5 p-6 rounded-2xl border border-outline-variant/30 backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-bold text-on-surface tracking-tight">Khách đã sử dụng</h1>
          <p className="text-on-surface-variant text-sm mt-1">Lịch sử mua tài nguyên</p>
        </div>
        <div className="relative w-full md:w-64">
          <input 
            type="text"
            placeholder="Tìm mã đơn, email, tài nguyên..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-surface-variant/50 border border-outline-variant/30 text-on-surface text-sm rounded-xl px-4 py-2.5 pl-10 focus:outline-none focus:border-cyan-500/50 transition-colors"
          />
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-[20px]">search</span>
        </div>
      </div>

      <div className="bg-white/5 border border-outline-variant/30 rounded-2xl overflow-hidden backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-on-surface-variant">
            <thead className="bg-surface-variant/30 text-on-surface font-semibold uppercase text-xs">
              <tr>
                <th className="px-6 py-4">Mã Đơn / Ngày</th>
                <th className="px-6 py-4">Khách hàng</th>
                <th className="px-6 py-4">Tài nguyên & SKU</th>
                <th className="px-6 py-4 text-center">SL</th>
                {role !== 'TECHNICIAN' && <th className="px-6 py-4 text-right">Giá nhập</th>}
                {role !== 'TECHNICIAN' && <th className="px-6 py-4 text-right">Giá bán</th>}
                {role !== 'TECHNICIAN' && <th className="px-6 py-4 text-right">Lợi nhuận</th>}
                <th className="px-6 py-4 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {currentOrders.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center">Chưa có dữ liệu.</td></tr>
              ) : currentOrders.map(order => {
                const importPrice = order.totalImportAmount || 0;
                const salePrice = order.totalAmount;
                const profit = salePrice - importPrice;
                return (
                  <tr key={order.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-on-surface">{order.id}</div>
                      <div className="text-xs mt-1 text-on-surface-variant whitespace-nowrap">{new Date(order.createdAt).toLocaleString('vi-VN')}</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-cyan-400">
                      {order.user?.email || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-on-surface max-w-[200px] truncate" title={order.resource?.name}>
                        {order.resource?.name || 'Tài nguyên đã xóa'}
                      </div>
                      <div className="text-xs text-yellow-400 mt-1">
                        {order.variant?.name ? `[${order.variant.name}]` : '[Mặc định]'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-white">
                      {order.quantity}
                    </td>
                    {role !== 'TECHNICIAN' && (
                      <td className="px-6 py-4 text-right font-bold text-on-surface-variant">
                        {fmt(importPrice)}
                      </td>
                    )}
                    {role !== 'TECHNICIAN' && (
                      <td className="px-6 py-4 text-right font-bold text-green-400">
                        {fmt(salePrice)}
                      </td>
                    )}
                    {role !== 'TECHNICIAN' && (
                      <td className="px-6 py-4 text-right font-bold text-yellow-400">
                        {fmt(profit)}
                      </td>
                    )}
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                          {role !== 'TECHNICIAN' && (
                            <button onClick={() => showDeliveredData(order)} className="bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors whitespace-nowrap">
                              Xem
                            </button>
                          )}
                          {role !== 'TECHNICIAN' && (
                            <button onClick={() => handleRevoke(order)} className="bg-red-500/10 text-red-400 hover:bg-red-500/20 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors whitespace-nowrap">
                              Thu hồi
                            </button>
                          )}
                        </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 p-4 border-t border-outline-variant/20 bg-surface-variant/10">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg bg-white/5 text-on-surface hover:bg-white/10 disabled:opacity-30 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <span className="text-sm font-bold text-on-surface-variant px-2">
              {currentPage} / {totalPages}
            </span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg bg-white/5 text-on-surface hover:bg-white/10 disabled:opacity-30 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
