'use client'

import React, { useEffect, useState } from 'react';
import DateRangePicker from '@/components/DateRangePicker';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

export default function AnalyticsPage() {
  const [range, setRange] = useState<any>({ label: '30 Ngày qua', days: 30 });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const RANGES: any[] = [
    { label: 'Toàn thời gian', days: 9999 },
    { label: 'Hôm nay', days: 1 },
    { label: 'Hôm qua', days: 1, offset: 1 },
    { label: '7 Ngày qua', days: 7 },
    { label: 'Tháng này', month: currentMonth, year: currentYear },
    { label: 'Tháng trước', month: currentMonth === 1 ? 12 : currentMonth - 1, year: currentMonth === 1 ? currentYear - 1 : currentYear },
    { label: 'Tuỳ chỉnh', isCustom: true }
  ];

  const [stats, setStats] = useState({
    totalDeposited: 0,
    totalIncome: 0,
    totalProfit: 0,
    totalUsers: 0,
    totalBalance: 0,
    totalOrders: 0
  });
  const [trends, setTrends] = useState({
    depositTrend: '+0%',
    incomeTrend: '+0%',
    usersTrend: '+0%'
  });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([
    { name: 'Ngân hàng', value: 0 },
    { name: 'Momo', value: 0 },
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (range.isCustom && !range.startDate) return;
    
    setLoading(true);
    const token = localStorage.getItem('tq_token');
    
    let url = `/api/admin/analytics?days=${range.days || 30}`;
    if (range.offset) {
      url += `&offset=${range.offset}`;
    }
    if (range.month && range.year) {
      url = `/api/admin/analytics?month=${range.month}&year=${range.year}`;
    } else if (range.startDate && range.endDate) {
      url = `/api/admin/analytics?startDate=${range.startDate.toISOString()}&endDate=${range.endDate.toISOString()}`;
    }
    
    fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStats(data.stats);
          if (data.trends) setTrends(data.trends);
          setTransactions(data.transactions);
          if (data.monthlyData) setMonthlyData(data.monthlyData);
          if (data.paymentMethods) setPaymentMethods(data.paymentMethods);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [range]);

  const handleApplyCustomDate = (start: Date, end: Date) => {
    setRange({
      label: `${start.toLocaleDateString('vi-VN')} - ${end.toLocaleDateString('vi-VN')}`,
      isCustom: true,
      startDate: start,
      endDate: end
    });
  };

  const fmt = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

    const topStats = [
    { label: 'Tổng doanh thu (Tổng khách nạp)', value: fmt(stats.totalDeposited), trend: trends.depositTrend, isPositive: !trends.depositTrend.startsWith('-'), icon: 'savings' },
    { label: 'Thu nhập (Khách đã tiêu)', value: fmt(stats.totalIncome), trend: trends.incomeTrend, isPositive: !trends.incomeTrend.startsWith('-'), icon: 'monitoring' },
    { label: 'Tổng lợi nhuận', value: fmt(stats.totalProfit || 0), trend: trends.incomeTrend, isPositive: !trends.incomeTrend.startsWith('-'), icon: 'payments', customColor: 'text-green-400' },
    { label: 'Tổng thành viên', value: stats.totalUsers.toString(), trend: trends.usersTrend, isPositive: !trends.usersTrend.startsWith('-'), icon: 'group' },
    { label: 'Số dư người dùng', value: fmt(stats.totalBalance), trend: 'Theo thời gian thực', isPositive: true, icon: 'account_balance_wallet' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-display-lg text-primary neon-glow">Thống kê Doanh thu</h1>
          <p className="font-body-md text-on-surface-variant mt-1">
            Theo dõi dòng tiền, doanh thu và biến động số dư hệ thống.
          </p>
        </div>
        <div className="relative">
          <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="input-glass px-4 py-2 flex items-center gap-2 hover:bg-surface-variant/50 transition-colors bg-surface-variant/30 rounded-lg border border-outline-variant/30">
            <span className="material-symbols-outlined text-on-surface-variant">calendar_month</span>
            <span className="font-label-sm text-on-surface">{range.label}</span>
            <span className={`material-symbols-outlined text-on-surface-variant text-sm transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}>expand_more</span>
          </button>
          
          {isDropdownOpen && (
            <div className="absolute top-full right-0 mt-2 w-48 bg-surface border border-outline-variant/30 rounded-xl shadow-xl overflow-hidden z-50 animate-fade-in">
              {RANGES.map((r, idx) => (
                <button
                  key={idx}
                  onClick={() => { 
                    if (r.isCustom) {
                      setIsDatePickerOpen(true);
                      setIsDropdownOpen(false);
                    } else {
                      setRange(r); 
                      setIsDropdownOpen(false); 
                    }
                  }}
                  className={`w-full text-left px-4 py-3 text-sm transition-colors hover:bg-surface-variant/50 ${range.label === r.label ? 'text-cyan-400 font-semibold bg-surface-variant/20' : 'text-on-surface-variant hover:text-white'}`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <DateRangePicker 
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        onApply={handleApplyCustomDate}
        initialStart={range.startDate}
        initialEnd={range.endDate}
      />

      {loading ? (
        <div className="text-center py-20 text-on-surface-variant flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-4xl animate-spin text-cyan-400">progress_activity</span>
          <span>Đang tải dữ liệu...</span>
        </div>
      ) : (
        <>
          {/* Top Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {topStats.map((stat, idx) => (
              <div key={idx} className="glass-card p-5 neon-border-glow flex flex-col gap-3 hover:scale-[1.02] transition-transform">
                <div className="flex justify-between items-start">
                  <div className="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined">{stat.icon}</span>
                  </div>
                  <span className={`font-label-sm px-2 py-1 rounded-full ${stat.isPositive ? 'bg-green-500/10 text-green-400' : 'bg-on-surface-variant/10 text-on-surface-variant'}`}>
                    {stat.trend}
                  </span>
                </div>
                <div>
                  <p className="font-body-md text-on-surface-variant">{stat.label}</p>
                  <h3 className="font-headline-md text-on-surface mt-1">{stat.value}</h3>
                </div>
              </div>
            ))}
          </div>

          {/* Monthly Revenue Chart */}
          <div className="glass-panel overflow-hidden p-6">
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h3 className="font-headline-md text-on-surface">Biểu đồ doanh thu</h3>
                <p className="font-label-sm text-on-surface-variant mt-1">{range.label}</p>
              </div>
            </div>
            
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData.length === 1 ? [{ name: '', income: 0 }, monthlyData[0], { name: ' ', income: 0 }] : monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(value: any) => new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(value)} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#22d3ee' }}
                    formatter={(value: any) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)}
                  />
                  <Area type="monotone" dataKey="income" stroke="#22d3ee" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Methods Chart */}
            <div className="glass-panel overflow-hidden p-6">
              <h3 className="font-headline-md text-on-surface mb-6">Nguồn tiền nạp</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={paymentMethods} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={80} stroke="rgba(255,255,255,0.5)" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <Tooltip
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                      formatter={(value: any) => [`${value}%`, 'Tỷ trọng']}
                    />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Transactions List */}
            <div className="glass-panel overflow-hidden p-6 flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-headline-md text-on-surface">Dòng tiền gần đây</h3>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                {transactions.length > 0 ? transactions.map((t: any) => (
                  <div key={t.id} className="flex justify-between items-center p-3 rounded-lg hover:bg-surface-variant/30 transition-colors border border-transparent hover:border-outline-variant/30">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${t.type === 'CỘNG TIỀN' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                        <span className="material-symbols-outlined">{t.type === 'CỘNG TIỀN' ? 'south_west' : 'north_east'}</span>
                      </div>
                      <div>
                        <p className="font-label-md text-on-surface truncate max-w-[150px]">{t.user?.name || 'Khách'}</p>
                        <p className="text-xs text-on-surface-variant mt-0.5">{new Date(t.createdAt).toLocaleDateString('vi-VN')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-label-md ${t.type === 'CỘNG TIỀN' ? 'text-green-400' : 'text-red-400'}`}>{t.amount}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${t.type === 'CỘNG TIỀN' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>{t.type}</span>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-10 text-on-surface-variant">Không có giao dịch nào gần đây</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
