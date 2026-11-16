'use client';

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
const MySwal = withReactContent(Swal);

type Transaction = {
  id: string;
  type: string;
  amount: string;
  balance: string;
  desc: string;
  typeClass: string;
  date: string;
  user?: {
    name: string;
    email: string;
  };
};

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/transactions?limit=500', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('tq_token')}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setTransactions(data);
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = 
      searchQuery === '' ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.user?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.user?.email || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === 'ALL') return true;
    if (filterType === 'NẠP TIỀN') return t.type === 'CỘNG TIỀN' && !t.desc.includes('Admin');
    if (filterType === 'DỊCH VỤ') return t.type === 'DỊCH VỤ' || t.type === 'MUA DỊCH VỤ' || t.desc.toLowerCase().includes('tạo đơn');
    if (filterType === 'HÓA ĐƠN CHAT') return t.type === 'HÓA ĐƠN CHAT';
    if (filterType === 'MUA KHÓA HỌC') return t.type === 'MUA KHÓA HỌC' || t.type === 'MUA KHOÁ HỌC' || t.desc.toLowerCase().includes('mua khóa học') || t.desc.toLowerCase().includes('mua khoá học');
    if (filterType === 'MUA TÀI NGUYÊN') return t.type === 'MUA TÀI NGUYÊN' || t.desc.toLowerCase().includes('mua tài nguyên');
    if (filterType === 'HOÀN TIỀN') return t.type === 'HOÀN TIỀN' || t.type === 'HOÀN TIỀN LỖI';
    return t.type === filterType;
  });

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const currentItems = filteredTransactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const filterOptions = [
    { value: 'ALL', label: 'Tất cả giao dịch' },
    { value: 'NẠP TIỀN', label: 'Nạp tiền vào ví' },
    { value: 'HÓA ĐƠN CHAT', label: 'Hóa đơn Live Chat' },
    { value: 'DỊCH VỤ', label: 'Mua dịch vụ Auto' },
    { value: 'MUA KHÓA HỌC', label: 'Mua khóa học' },
    { value: 'MUA TÀI NGUYÊN', label: 'Mua tài nguyên' },
    { value: 'HOÀN TIỀN', label: 'Hoàn tiền lỗi' }
  ];

  return (
    <div className="space-y-6 max-w-7xl w-full min-w-0 mx-auto p-4 md:p-6 lg:p-8 relative">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-bold text-primary flex flex-wrap items-center gap-3">
          Tài chính & Dòng tiền
        </h1>
        <p className="text-on-surface-variant text-base">Quản lý và thống kê toàn bộ các giao dịch, dòng tiền phát sinh trên hệ thống.</p>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2 flex-1">
          {filterOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => { setFilterType(opt.value); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${
                filterType === opt.value 
                  ? 'bg-primary text-on-primary shadow-sm' 
                  : 'bg-surface-variant/30 text-on-surface-variant hover:bg-surface-variant'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        
        <div className="relative w-full md:w-64 shrink-0">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50">search</span>
          <input 
            type="text" 
            placeholder="Tìm mã GD, tên, email..." 
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2 bg-surface-variant/30 border border-outline-variant/30 rounded-xl text-sm focus:outline-none focus:border-primary/50 text-on-surface placeholder:text-on-surface-variant/50"
          />
        </div>
      </div>

      <div className="glass-panel overflow-hidden border border-outline-variant/30">
        <div className="overflow-x-auto w-full custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-surface-variant/50 border-b border-outline/20">
                <th className="p-4 text-sm font-semibold text-on-surface-variant">Mã Giao dịch</th>
                <th className="p-4 text-sm font-semibold text-on-surface-variant">Thời gian</th>
                <th className="p-4 text-sm font-semibold text-on-surface-variant">Khách hàng</th>
                <th className="p-4 text-sm font-semibold text-on-surface-variant">Loại</th>
                <th className="p-4 text-sm font-semibold text-on-surface-variant text-right">Biến động</th>
                <th className="p-4 text-sm font-semibold text-on-surface-variant text-right">Số dư cuối</th>
                <th className="p-4 text-sm font-semibold text-on-surface-variant">Nội dung chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline/10">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-on-surface-variant">
                    <span className="material-symbols-outlined animate-spin text-primary text-3xl">refresh</span>
                    <p className="mt-2 text-sm">Đang tải dữ liệu...</p>
                  </td>
                </tr>
              ) : currentItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-on-surface-variant">Không có giao dịch nào phù hợp.</td>
                </tr>
              ) : currentItems.map((tx) => (
                <tr key={tx.id} className="hover:bg-surface-variant/20 transition-colors group">
                  <td className="p-4 text-sm text-secondary font-mono whitespace-nowrap">{tx.id}</td>
                  <td className="p-4 text-sm text-on-surface-variant whitespace-nowrap">{tx.date}</td>
                  <td className="p-4 text-sm text-on-surface font-bold whitespace-nowrap">
                    {tx.user?.name || 'Unknown'}
                    <div className="text-xs text-on-surface-variant font-normal">{tx.user?.email}</div>
                  </td>
                  <td className="p-4 text-sm whitespace-nowrap">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-bold border ${tx.typeClass || 'bg-surface-variant text-on-surface-variant border-outline-variant/30'}`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className={`p-4 text-base font-bold text-right whitespace-nowrap ${tx.amount.includes('+') ? 'text-green-500' : 'text-red-500'}`}>
                    {tx.amount}
                  </td>
                  <td className="p-4 text-sm font-bold text-primary text-right whitespace-nowrap">{tx.balance}</td>
                  <td className="p-4 text-sm text-on-surface-variant max-w-[400px] whitespace-pre-wrap break-words" title={tx.desc}>
                    {tx.desc}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="p-4 border-t border-outline/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm bg-surface-variant/30">
          <span className="text-on-surface-variant">
            Hiển thị {filteredTransactions.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredTransactions.length)} của {filteredTransactions.length} giao dịch
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
              
              {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                let pageNum = i + 1;
                if (totalPages > 5 && currentPage > 3) {
                  pageNum = currentPage - 2 + i;
                  if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                }
                return (
                  <button 
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-lg border font-medium flex items-center justify-center transition-colors ${currentPage === pageNum ? 'bg-primary/20 text-primary border-primary/30' : 'border-outline/30 text-on-surface-variant hover:bg-surface-variant/50 hover:text-primary'}`}
                  >
                    {pageNum}
                  </button>
                );
              })}

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
