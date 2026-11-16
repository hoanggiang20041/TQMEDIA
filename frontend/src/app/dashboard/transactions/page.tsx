'use client'

import { useState, useEffect } from 'react'

import { useRole } from '@/context/RoleContext'

export default function TransactionsPage() {
  const { transactions } = useRole()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate network delay
    setTimeout(() => setLoading(false), 500)
  }, [])

  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const filteredTransactions = transactions.filter(t => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      if (!t.id?.toLowerCase().includes(term) && !t.desc?.toLowerCase().includes(term)) return false
    }
    return true
  })

  useEffect(() => { setCurrentPage(1) }, [searchTerm])

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage)
  const currentTransactions = filteredTransactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  if (loading) return <div className="p-8 text-center text-on-surface">Đang tải lịch sử giao dịch...</div>;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Lịch sử Luồng tiền</h1>
        <p className="text-on-surface-variant text-sm mt-1">
          Theo dõi toàn bộ biến động số dư (nạp tiền, trừ tiền, hoàn tiền) của tài khoản.
        </p>
      </div>

      <div className="bg-surface-variant/30 border border-outline-variant/30 backdrop-blur-xl rounded-2xl p-6 shadow-lg">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1">
            <input 
              type="text" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm mã giao dịch, nội dung..." 
              className="w-full bg-surface-variant/50 border border-outline-variant/30 text-white rounded-xl px-4 py-2 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder:text-on-surface-variant"
            />
          </div>
          <button className="bg-surface-variant border border-outline-variant/30 text-white px-4 py-2 rounded-xl hover:bg-surface-variant/80 transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">filter_list</span>
            Bộ lọc
          </button>
        </div>

        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-on-surface-variant text-xs uppercase tracking-widest border-b border-outline-variant/30">
                <th className="pb-3 pl-2 pr-4 font-semibold whitespace-nowrap">Mã GD</th>
                <th className="pb-3 pr-4 font-semibold whitespace-nowrap">Thời gian</th>
                <th className="pb-3 pr-4 font-semibold whitespace-nowrap">Loại giao dịch</th>
                <th className="pb-3 pr-4 font-semibold whitespace-nowrap text-right">Số tiền</th>
                <th className="pb-3 pr-4 font-semibold whitespace-nowrap text-right">Số dư cuối</th>
                <th className="pb-3 font-semibold w-full min-w-[300px]">Nội dung</th>
              </tr>
            </thead>
            <tbody>
              {currentTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-on-surface-variant">Chưa có giao dịch nào</td>
                </tr>
              ) : currentTransactions.map((t) => (
                <tr key={t.id} className="border-b border-outline-variant/10 hover:bg-surface-variant/30 transition-colors">
                  <td className="py-4 pl-2 pr-4 text-white text-sm font-mono whitespace-nowrap">{t.id}</td>
                  <td className="py-4 pr-4 text-on-surface-variant text-sm whitespace-nowrap">{t.time}</td>
                  <td className="py-4 pr-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-[11px] font-bold tracking-wider rounded-md border ${t.typeClass}`}>
                      {t.type}
                    </span>
                  </td>
                  <td className={`py-4 pr-4 text-sm font-bold whitespace-nowrap text-right ${t.amount.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                    {t.amount}
                  </td>
                  <td className="py-4 pr-4 text-white text-sm font-semibold whitespace-nowrap text-right">{t.balance}</td>
                  <td className="py-4 text-on-surface-variant text-sm">{t.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="p-4 border-t border-outline-variant/20 flex flex-col sm:flex-row items-center justify-between gap-4 font-body-md text-sm mt-6">
          <span className="text-on-surface-variant">
            Hiển thị {filteredTransactions.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredTransactions.length)} của {filteredTransactions.length} giao dịch
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-outline-variant/30 text-on-surface-variant hover:text-white transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              
              {Array.from({ length: totalPages }).map((_, i) => (
                <button 
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-8 h-8 rounded-lg border font-medium flex items-center justify-center transition-colors ${currentPage === i + 1 ? 'bg-cyan-600 text-white border-cyan-500/30' : 'border-outline-variant/30 text-on-surface-variant hover:text-white'}`}
                >
                  {i + 1}
                </button>
              ))}

              <button 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-outline-variant/30 text-on-surface-variant hover:text-white transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
