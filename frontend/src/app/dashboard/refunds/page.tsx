'use client';

import { useState, useEffect } from 'react'

export default function RefundsPage() {
  const [refunds, setRefunds] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('tq_token');
    fetch('/api/orders', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          // Chỉ lấy các đơn đã hủy hoặc đang yêu cầu hủy
          const refundOrders = data.filter(o => o.status === 'cancelled' || o.status === 'refund_requested');
          setRefunds(refundOrders);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [])

  if (loading) return <div className="p-8 text-center text-on-surface">Đang tải dữ liệu hoàn tiền...</div>;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Yêu cầu Hoàn tiền</h1>
        <p className="text-on-surface-variant text-sm mt-1">
          Theo dõi các đơn hàng bạn đã gửi yêu cầu hủy và tiến trình hoàn tiền về tài khoản.
        </p>
      </div>

      <div className="bg-surface-variant/30 border border-outline-variant/30 backdrop-blur-xl rounded-2xl p-6 shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-on-surface-variant text-xs uppercase tracking-widest border-b border-outline-variant/30">
                <th className="pb-3 pl-2 pr-4 font-semibold whitespace-nowrap">Mã Đơn</th>
                <th className="pb-3 pr-4 font-semibold whitespace-nowrap">Thời gian</th>
                <th className="pb-3 pr-4 font-semibold min-w-[200px]">Dịch vụ</th>
                <th className="pb-3 pr-4 font-semibold whitespace-nowrap text-right">Số tiền ban đầu</th>
                <th className="pb-3 pr-4 font-semibold whitespace-nowrap text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {refunds.map((r) => (
                <tr key={r.id} className="border-b border-outline-variant/10 hover:bg-surface-variant/30 transition-colors">
                  <td className="py-4 pl-2 pr-4 text-cyan-400 hover:underline cursor-pointer text-sm font-mono whitespace-nowrap">{r.id}</td>
                  <td className="py-4 pr-4 text-on-surface-variant text-sm whitespace-nowrap">{r.date}</td>
                  <td className="py-4 pr-4 text-white text-sm font-medium">{r.service}</td>
                  <td className="py-4 pr-4 text-white text-sm font-bold whitespace-nowrap text-right">
                    {r.total}
                  </td>
                  <td className="py-4 pr-4 text-center">
                    <span className={`px-2 py-1 text-[11px] font-bold tracking-wider uppercase rounded-md border ${
                      r.status === 'refund_requested' 
                        ? 'text-orange-500 border-orange-500/30 bg-orange-500/10' 
                        : 'text-error border-error/30 bg-error/10'
                    }`}>
                      {r.status === 'refund_requested' ? 'Đang chờ duyệt' : 'Đã hủy'}
                    </span>
                  </td>
                </tr>
              ))}
              {refunds.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-on-surface-variant">
                    Bạn chưa có yêu cầu hoàn tiền nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
