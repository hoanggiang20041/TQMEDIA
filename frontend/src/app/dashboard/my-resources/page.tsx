'use client';

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

export default function MyResourcesPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    const token = localStorage.getItem('tq_token');
    try {
      const res = await fetch('/api/resources/my-orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const showDeliveredData = (order: any) => {
    const rawData = order.deliveredData || '';
    const formattedData = rawData.replace(/\\n/g, '\n');
    
    MySwal.fire({
      title: 'Tài nguyên đã nhận',
      html: `
        <div class="text-left bg-surface border border-outline-variant/30 rounded-xl p-4 mt-4 text-on-surface">
          <p class="text-sm text-on-surface-variant mb-3">
            Tên: <strong class="text-cyan-400">${order.resource?.name || 'Tài nguyên đã bị xóa'} ${order.variant?.name ? `(${order.variant.name})` : ''}</strong><br/>
            Số lượng: <strong class="text-white">${order.quantity}</strong><br/>
            Mã đơn: <strong class="text-white">${order.id}</strong>
          </p>
          <div class="flex gap-2 justify-end mb-2">
             <button id="copyBtn" class="bg-blue-500/20 text-blue-400 hover:bg-blue-500/40 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">Sao chép tất cả</button>
             <button id="downloadBtn" class="bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/40 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">download</span> Tải về (.txt)</button>
          </div>
          <div class="bg-black/50 p-4 rounded-lg border border-white/10 font-mono text-sm max-h-[40vh] overflow-y-auto whitespace-pre-wrap select-all">${formattedData}</div>
          <div class="text-xs text-center mt-3 text-orange-400">
            * Vui lòng sao chép hoặc tải về và lưu trữ an toàn!
          </div>
        </div>
      `,
      didOpen: () => {
         const copyBtn = document.getElementById('copyBtn');
         if (copyBtn) {
            copyBtn.onclick = () => {
               navigator.clipboard.writeText(formattedData);
               copyBtn.innerText = 'Đã sao chép!';
               setTimeout(() => copyBtn.innerText = 'Sao chép tất cả', 2000);
            };
         }
         const downloadBtn = document.getElementById('downloadBtn');
         if (downloadBtn) {
            downloadBtn.onclick = () => {
               const element = document.createElement('a');
               const file = new Blob([formattedData], {type: 'text/plain;charset=utf-8'});
               element.href = URL.createObjectURL(file);
               element.download = `tainguyen_${order.id}.txt`;
               document.body.appendChild(element);
               element.click();
               document.body.removeChild(element);
            };
         }
      },
      width: '600px',
      showCloseButton: true,
      confirmButtonText: 'Đóng',
      confirmButtonColor: '#0891b2',
      background: '#1e293b'
    });
  };

  const fmt = (n: number) => n?.toLocaleString('vi-VN') + ' đ';

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'Facebook': return 'https://img.icons8.com/fluency/96/facebook-new.png';
      case 'Instagram': return 'https://img.icons8.com/fluency/96/instagram-new.png';
      case 'TikTok': return 'https://img.icons8.com/fluency/96/tiktok.png';
      case 'YouTube': return 'https://img.icons8.com/color/96/youtube-play.png';
      case 'Gmail': return 'https://img.icons8.com/fluency/96/gmail-new.png';
      case 'Google': return 'https://img.icons8.com/color/96/google-logo.png';
      case 'Hotmail': return 'https://img.icons8.com/color/96/microsoft-outlook-2019--v2.png';
      case 'Twitter': return 'https://img.icons8.com/color/96/twitterx--v1.png';
      case 'Telegram': return 'https://img.icons8.com/color/96/telegram-app.png';
      default: return null;
    }
  };

  if (loading) return <div className="p-8 text-center text-on-surface">Đang tải lịch sử...</div>;

  return (
    <div className="space-y-6">
      <section className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-6 bg-gradient-to-r from-blue-600/10 to-purple-600/10 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-white/5 backdrop-blur-xl">
        <div className="flex items-center gap-3 md:gap-4 w-full">
          <div className="hidden md:flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/5 text-white border border-white/10">
            <span className="material-symbols-outlined text-4xl">receipt_long</span>
          </div>
          <div className="flex-1">
            <h1 className="text-xl md:text-3xl font-bold text-on-surface tracking-tight">Tài Nguyên Đã Mua</h1>
            <p className="text-on-surface-variant text-xs md:text-base mt-0.5 md:mt-1">Danh sách tài khoản, link, tool bạn đã sở hữu</p>
          </div>
        </div>
        <a href="/dashboard/resources" className="bg-cyan-600 hover:bg-cyan-500 text-white w-full md:w-auto justify-center px-4 py-2.5 md:px-6 md:py-3 rounded-xl md:rounded-xl font-bold transition-all shadow-lg flex items-center gap-2 text-sm md:text-base">
          <span className="material-symbols-outlined text-sm md:text-base">storefront</span>
          Về Cửa Hàng
        </a>
      </section>

      <div className="bg-white/5 border border-outline-variant/30 rounded-2xl md:rounded-3xl overflow-hidden backdrop-blur-xl">
        
        {/* Mobile Cards View */}
        <div className="block md:hidden divide-y divide-outline-variant/20">
          {orders.length === 0 ? (
            <div className="p-8 text-center text-on-surface-variant text-sm">Bạn chưa mua tài nguyên nào.</div>
          ) : orders.map(order => (
            <div key={order.id} className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div className="font-mono text-cyan-400 font-bold text-xs">Mã: {order.id}</div>
                <div className="text-[10px] text-on-surface-variant">{new Date(order.createdAt).toLocaleDateString('vi-VN')}</div>
              </div>
              
              <div className="flex items-start gap-2">
                {order.resource?.iconPlatform && getPlatformIcon(order.resource.iconPlatform) && (
                  <img src={getPlatformIcon(order.resource.iconPlatform)!} alt={order.resource.iconPlatform} className="w-5 h-5 object-contain shrink-0 mt-0.5" />
                )}
                <div className="font-medium text-on-surface text-sm leading-tight line-clamp-2">{order.resource?.name || 'Tài nguyên đã bị xóa'} {order.variant?.name ? `(${order.variant.name})` : ''}</div>
              </div>
              
              <div className="flex justify-between items-center bg-black/20 rounded-lg p-2 border border-white/5">
                <div className="text-xs"><span className="text-on-surface-variant">SL:</span> <strong className="text-white">{order.quantity}</strong></div>
                <div className="text-xs"><span className="text-on-surface-variant">Tổng:</span> <strong className="text-red-400">-{fmt(order.totalAmount)}</strong></div>
              </div>
              
              <button 
                onClick={() => showDeliveredData(order)}
                className="w-full py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 font-bold rounded-lg transition-colors flex justify-center items-center gap-1 text-xs uppercase"
              >
                <span className="material-symbols-outlined text-[16px]">visibility</span>
                Xem tài khoản
              </button>
            </div>
          ))}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm text-on-surface-variant">
            <thead className="bg-surface-variant/30 text-on-surface font-semibold uppercase text-xs">
              <tr>
                <th className="px-6 py-5">Mã đơn</th>
                <th className="px-6 py-5">Tên tài nguyên</th>
                <th className="px-6 py-5 text-center">Số lượng</th>
                <th className="px-6 py-5 text-right">Tổng tiền</th>
                <th className="px-6 py-5 text-center">Ngày mua</th>
                <th className="px-6 py-5 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {orders.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant text-base">Bạn chưa mua tài nguyên nào.</td></tr>
              ) : orders.map(order => (
                <tr key={order.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-mono text-cyan-400 font-bold">{order.id}</td>
                  <td className="px-6 py-4 font-medium text-on-surface">
                    <div className="flex items-center gap-2">
                      {order.resource?.iconPlatform && getPlatformIcon(order.resource.iconPlatform) && (
                        <img src={getPlatformIcon(order.resource.iconPlatform)!} alt={order.resource.iconPlatform} className="w-5 h-5 object-contain" />
                      )}
                      {order.resource?.name || 'Tài nguyên đã bị xóa'}
                      {order.variant?.name ? ` (${order.variant.name})` : ''}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center font-bold text-white">
                    {order.quantity}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-red-400">
                    -{fmt(order.totalAmount)}
                  </td>
                  <td className="px-6 py-4 text-center text-xs">
                    {new Date(order.createdAt).toLocaleString('vi-VN')}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => showDeliveredData(order)}
                      className="px-4 py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 font-bold rounded-lg transition-colors inline-flex items-center gap-1 text-xs uppercase"
                    >
                      <span className="material-symbols-outlined text-[16px]">visibility</span>
                      Xem tài khoản
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
