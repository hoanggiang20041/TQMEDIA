'use client'

import Link from 'next/link'
import { ROUTES } from '@/lib/constants'
import { useRole } from '@/context/RoleContext'
import { useEffect, useState } from 'react'
import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'

const MySwal = withReactContent(Swal)

export default function DashboardPage() {
  const { user, role, balance, transactions } = useRole()
  const [orders, setOrders] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [adminStats, setAdminStats] = useState<any>(null)

  useEffect(() => {
    const fetchOrdersAndNotifs = async () => {
      try {
        const token = localStorage.getItem('tq_token');
        if (!token) return;
        
        const [ordersRes, notifsRes, adminStatsRes] = await Promise.all([
          fetch('/api/orders', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/notifications'),
          role === 'ADMIN' ? fetch('/api/admin/stats', { headers: { 'Authorization': `Bearer ${token}` } }) : Promise.resolve(null)
        ]);
        
        if (ordersRes.ok) {
          const data = await ordersRes.json();
          if (Array.isArray(data)) setOrders(data);
        }

        if (notifsRes.ok) {
          const data = await notifsRes.json();
          if (Array.isArray(data)) {
            setNotifications(data.slice(0, 3)); // show top 3
            if (data.length > 0) {
              const latest = data[0];
              const lastSeen = localStorage.getItem('lastSeenNotifId');
              
              const snoozedData = localStorage.getItem('snoozedNotif');
              let isSnoozed = false;
              if (snoozedData) {
                try {
                  const parsed = JSON.parse(snoozedData);
                  if (parsed.id === latest.id && Date.now() < parsed.until) {
                    isSnoozed = true;
                  }
                } catch(e) {}
              }

              if (lastSeen !== latest.id && !isSnoozed) {
                MySwal.fire({
                  html: `
                    <div class="text-left relative z-10 font-sans">
                      <div class="absolute -top-10 -right-10 w-32 h-32 bg-cyan-500/20 rounded-full blur-[40px] pointer-events-none"></div>
                      <div class="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-500/10 rounded-full blur-[40px] pointer-events-none"></div>
                      
                      <div class="flex items-start gap-4 mb-5 relative">
                        <div class="w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-br ${latest.type === 'ADMIN_SUCCESS' ? 'from-emerald-400/20 to-teal-600/20' : latest.type === 'ADMIN_WARN' ? 'from-orange-400/20 to-red-600/20' : 'from-cyan-400/20 to-blue-600/20'} flex items-center justify-center border border-white/5 shadow-lg">
                          <span class="material-symbols-outlined text-[26px] ${latest.type === 'ADMIN_SUCCESS' ? 'text-emerald-400' : latest.type === 'ADMIN_WARN' ? 'text-orange-400' : 'text-cyan-400'}">
                            ${latest.type === 'ADMIN_SUCCESS' ? 'check_circle' : latest.type === 'ADMIN_WARN' ? 'warning' : 'campaign'}
                          </span>
                        </div>
                        <div class="pt-1">
                          <h2 class="text-[18px] font-bold text-white tracking-wide leading-tight mb-1">${latest.title}</h2>
                          <p class="text-slate-400 text-[13px] flex items-center gap-1.5 font-medium">
                            <span class="material-symbols-outlined text-[14px]">schedule</span>
                            ${new Date(latest.createdAt).toLocaleString('vi-VN')}
                          </p>
                        </div>
                      </div>
                      
                      <div class="bg-black/20 rounded-2xl p-4 mt-2 text-slate-300 leading-relaxed text-[15px] border border-white/5 relative overflow-hidden">
                        <div class="absolute top-0 left-0 w-1 h-full ${latest.type === 'ADMIN_SUCCESS' ? 'bg-emerald-500/50' : latest.type === 'ADMIN_WARN' ? 'bg-orange-500/50' : 'bg-cyan-500/50'}"></div>
                        ${latest.content}
                      </div>
                    </div>
                  `,
                  showConfirmButton: true,
                  showCancelButton: true,
                  confirmButtonText: 'Đã hiểu (Ẩn)',
                  cancelButtonText: 'Nhắc lại sau 1 giờ',
                  buttonsStyling: false,
                  background: 'transparent',
                  backdrop: 'rgba(0,0,0,0.6) backdrop-blur-md',
                  customClass: {
                    popup: 'rounded-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] !bg-[#0f172a] overflow-hidden p-6 relative',
                    actions: 'mt-6 w-full gap-3 flex-col sm:flex-row-reverse',
                    confirmButton: 'flex-1 w-full bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl px-5 py-3.5 text-[15px] font-bold text-white hover:brightness-110 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all border-none outline-none',
                    cancelButton: 'flex-1 w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3.5 text-[15px] font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-all outline-none',
                  }
                }).then((result) => {
                  if (result.isConfirmed) {
                    localStorage.setItem('lastSeenNotifId', latest.id);
                  } else if (result.dismiss === MySwal.DismissReason.cancel) {
                    localStorage.setItem('snoozedNotif', JSON.stringify({ id: latest.id, until: Date.now() + 60 * 60 * 1000 }));
                  }
                });
              }
            }
          }
        }
        
        if (adminStatsRes && adminStatsRes.ok) {
          const data = await adminStatsRes.json();
          setAdminStats(data);
        }

      } catch (e) {
        console.error(e);
      }
    }
    fetchOrdersAndNotifs();
  }, []);

  const totalOrders = orders.length;
  const totalDeposited = transactions
    .filter(t => t.type === 'CỘNG TIỀN')
    .reduce((sum, t) => sum + (parseInt(t.amount.replace(/[^\d]/g, '')) || 0), 0);

  const fmt = (val: number) => new Intl.NumberFormat('vi-VN').format(val);

  const roleNames: Record<string, string> = {
    'GUEST': 'Khách Hàng',
    'HOC_VIEN': 'Học Viên',
    'DAI_LY_4': 'Đại lý Cấp 4',
    'DAI_LY_3': 'Đại lý Cấp 3',
    'DAI_LY_2': 'Đại lý Cấp 2',
    'DAI_LY_1': 'Đại lý Cấp 1',
    'ADMIN': 'Quản Trị Viên'
  };

  const statCards = role === 'ADMIN' && adminStats ? [
    {
      label: 'Tổng doanh thu (Tổng khách nạp)',
      value: `${fmt(adminStats.totalDeposited)} ₫`,
      icon: 'savings',
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Thu nhập hôm nay (Khách đã tiêu)',
      value: `${fmt(adminStats.todayIncome)} ₫`,
      icon: 'monitoring',
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
    },
    {
      label: 'Tổng số dư User',
      value: `${fmt(adminStats.totalBalances)} ₫`,
      icon: 'account_balance_wallet',
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
    },
    {
      label: 'Tổng thành viên',
      value: fmt(adminStats.totalUsers),
      icon: 'group',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
  ] : [
    {
      label: 'Số dư hiện tại',
      value: `${fmt(balance)} ₫`,
      icon: 'account_balance_wallet',
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
    },
    {
      label: 'Tổng tiền đã nạp',
      value: `${fmt(totalDeposited)} ₫`,
      icon: 'savings',
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Cấp bậc hiện tại',
      value: roleNames[role] || role,
      icon: 'workspace_premium',
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
    },
    {
      label: 'Tổng đơn hàng',
      value: totalOrders.toString(),
      icon: 'shopping_cart',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
  ];

  const recentOrders = orders.slice(0, 7).map(o => {
    let statusClass = 'bg-blue-500/10 border border-blue-500/20 text-blue-400';
    let statusName = 'Đang xử lý';
    if (o.status === 'completed') {
      statusClass = 'bg-green-500/10 border border-green-500/20 text-green-400';
      statusName = 'Hoàn thành';
    } else if (o.status === 'cancelled') {
      statusClass = 'bg-red-500/10 border border-red-500/20 text-red-400';
      statusName = 'Đã hủy';
    } else if (o.status === 'running') {
      statusClass = 'bg-purple-500/10 border border-purple-500/20 text-purple-400';
      statusName = 'Đang chạy';
    } else if (o.status === 'refund_requested') {
      statusClass = 'bg-orange-500/10 border border-orange-500/20 text-orange-400';
      statusName = 'Yêu cầu hủy';
    }
    return {
      orderId: o.id,
      amount: o.total,
      status: statusName,
      statusClass,
      target: o.target,
    }
  });

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-on-surface tracking-tight">
            Xin chào, {user?.name || 'Thành viên'} 👋
          </h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Chào mừng bạn quay trở lại nền tảng TQ MEDIA
          </p>
        </div>
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 w-full sm:w-auto mt-2 sm:mt-0">
          <Link href={ROUTES.deposit} className="flex-1 justify-center bg-surface-variant/50 hover:bg-surface-variant/80 border border-outline-variant/30 px-3 md:px-5 py-2.5 rounded-xl text-xs md:text-sm font-semibold text-white flex items-center gap-2 transition-all">
            <span className="material-symbols-outlined text-[18px] md:text-[20px] text-green-400">payments</span>
            Nạp tiền
          </Link>
          <Link href={ROUTES.services} className="flex-1 justify-center bg-cyan-600 hover:bg-cyan-500 border border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.3)] px-3 md:px-5 py-2.5 rounded-xl text-xs md:text-sm font-semibold text-white flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-95">
            <span className="material-symbols-outlined text-[18px] md:text-[20px]">add</span>
            Tạo đơn
          </Link>
        </div>
      </div>

      {/* Thông báo hệ thống */}
      <div className="bg-gradient-to-r from-blue-500/20 via-purple-500/10 to-transparent border border-blue-500/30 rounded-2xl p-3 md:p-5 shadow-[0_0_15px_rgba(59,130,246,0.15)] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 rounded-l-2xl"></div>
        <div className="flex flex-col md:flex-row items-start gap-3 md:gap-4 relative z-10 w-full">
          <div className="flex items-center gap-2">
            <div className="bg-blue-500/20 p-2 md:p-2.5 rounded-xl border border-blue-500/30 shrink-0">
              <span className="material-symbols-outlined text-blue-400 text-[20px] md:text-[24px]">campaign</span>
            </div>
            <h3 className="text-on-surface font-bold text-sm md:text-lg flex flex-wrap items-center gap-2 md:hidden">
              Thông báo hệ thống
              <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse whitespace-nowrap">New</span>
            </h3>
          </div>
          <div className="flex-1 min-w-0 w-full">
            <h3 className="hidden md:flex text-on-surface font-bold text-lg items-center gap-2 mb-3">
              Thông báo hệ thống mới nhất
              <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse whitespace-nowrap">New</span>
            </h3>
            <ul className="flex flex-col md:flex-col gap-2 md:space-y-3 text-sm text-on-surface-variant w-full max-h-[120px] md:max-h-none overflow-y-auto pr-1">
              {notifications.length === 0 ? (
                <li className="text-on-surface-variant italic text-xs md:text-sm">Chưa có thông báo hệ thống nào.</li>
              ) : notifications.map((n, i) => {
                const isAdminPromo = n.type === 'ADMIN_PROMO' || n.type === 'ADMIN';
                const isAdminInfo = n.type === 'ADMIN_INFO';
                const isAdminWarn = n.type === 'ADMIN_WARN';
                const isAdminSuccess = n.type === 'ADMIN_SUCCESS';
                
                let icon = 'notifications';
                let color = 'text-gray-600 dark:text-gray-400';
                
                if (isAdminPromo) { icon = 'campaign'; color = 'text-orange-600 dark:text-orange-400'; }
                else if (isAdminInfo) { icon = 'info'; color = 'text-blue-600 dark:text-blue-400'; }
                else if (isAdminWarn) { icon = 'warning'; color = 'text-yellow-600 dark:text-yellow-400'; }
                else if (isAdminSuccess) { icon = 'check_circle'; color = 'text-emerald-600 dark:text-emerald-400'; }

                return (
                  <li key={i} className="w-full">
                    <Link href="/dashboard/notifications" className="flex flex-row items-start sm:items-center gap-2 w-full bg-black/20 p-2 sm:p-2.5 rounded-lg hover:bg-black/30 transition-colors">
                      <div className="flex items-start sm:items-center gap-2 flex-1 min-w-0">
                        <span className={`material-symbols-outlined ${color} text-[16px] sm:text-[18px] shrink-0 mt-0.5 sm:mt-0`}>{icon}</span>
                        <span className="text-xs sm:text-sm leading-relaxed flex-1 line-clamp-2 sm:line-clamp-none break-words">
                          <strong className="text-on-surface mr-1">{n.title}:</strong>
                          {n.content}
                        </span>
                      </div>
                      <div className="text-[10px] sm:text-[11px] text-on-surface-variant/70 shrink-0 whitespace-nowrap pt-0.5 sm:pt-0">
                        {new Date(n.createdAt).toLocaleDateString('vi-VN')}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-surface-variant/30 border border-outline-variant/30 backdrop-blur-xl rounded-2xl p-4 md:p-5 flex flex-col gap-3 shadow-lg hover:bg-surface-variant/30 hover:border-outline-variant/30 transition-all relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex items-center justify-between relative z-10">
              <div className={`${card.bgColor} rounded-xl p-2 border border-outline-variant/30`}>
                <span className={`material-symbols-outlined ${card.color} text-[22px]`}>
                  {card.icon}
                </span>
              </div>
            </div>
            <div className="relative z-10 mt-1">
              <p className="text-2xl md:text-[28px] font-bold text-on-surface tracking-tight break-words">{card.value}</p>
              <p className="text-on-surface-variant text-xs font-medium uppercase tracking-wider mt-1">
                {card.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Recent Orders Table (Larger Span) */}
        <div className="lg:col-span-2 bg-surface-variant/30 border border-outline-variant/30 backdrop-blur-xl rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-on-surface tracking-tight">
              Đơn hàng gần đây
            </h2>
            <Link href={ROUTES.orders} className="text-cyan-400 text-sm font-medium hover:text-cyan-300 hover:underline underline-offset-4 transition-colors">Xem tất cả</Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-on-surface-variant text-[11px] uppercase tracking-widest border-b border-outline-variant/30">
                  <th className="pb-3 pl-2 pr-4 font-semibold">Link/Target</th>
                  <th className="pb-3 pr-4 font-semibold">Mã đơn</th>
                  <th className="pb-3 pr-4 font-semibold">Số tiền</th>
                  <th className="pb-3 font-semibold text-right pr-2">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-on-surface-variant">Chưa có đơn hàng nào</td>
                  </tr>
                ) : recentOrders.map((o) => (
                  <tr
                    key={o.orderId}
                    className="border-b border-outline-variant/30 last:border-0 hover:bg-surface-variant/30 transition-colors"
                  >
                    <td className="py-4 pl-2 pr-4 text-on-surface text-sm font-medium max-w-[250px] truncate" title={o.target}>
                      {o.target?.startsWith('http') ? (
                        <a href={o.target} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 hover:underline">
                          {o.target}
                        </a>
                      ) : (
                        o.target
                      )}
                    </td>
                    <td className="py-4 pr-4 text-on-surface-variant text-sm font-mono">
                      {o.orderId}
                    </td>
                    <td className="py-4 pr-4 text-on-surface text-sm font-medium">{o.amount?.replace(/\++/g, '+').replace(/-+/g, '-').replace(/₫+/gi, '₫').replace(/đ+/gi, 'đ').replace(/ +/g, ' ').trim()}</td>
                    <td className="py-4 text-right pr-2">
                      <span
                        className={`inline-block px-3 py-1.5 rounded-lg text-[11px] font-semibold tracking-wide uppercase ${o.statusClass}`}
                      >
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Services / Hot Services */}
        <div className="bg-surface-variant/30 border border-outline-variant/30 backdrop-blur-xl rounded-2xl p-6 shadow-lg flex flex-col">
          <h2 className="text-lg font-semibold text-on-surface tracking-tight mb-5">
            Dịch vụ nổi bật
          </h2>

          <div className="flex flex-col gap-3 flex-1">
            <Link href={ROUTES.tiktok} className="bg-surface-variant/30 border border-outline-variant/30 hover:bg-surface-variant/50 transition-colors rounded-xl p-4 flex flex-col gap-3 group">
              <div className="flex items-center gap-3">
                <img src="https://img.icons8.com/3d-fluency/94/tiktok.png" alt="TikTok" className="w-8 h-8 drop-shadow-md group-hover:scale-110 transition-transform" />
                <div>
                  <p className="text-white font-medium text-sm">Tăng Tương Tác TikTok</p>
                  <p className="text-on-surface-variant text-xs mt-0.5">Tốc độ cao, bảo hành 30 ngày</p>
                </div>
              </div>
            </Link>
            
            <Link href={ROUTES.facebook} className="bg-surface-variant/30 border border-outline-variant/30 hover:bg-surface-variant/50 transition-colors rounded-xl p-4 flex flex-col gap-3 group">
              <div className="flex items-center gap-3">
                <img src="https://img.icons8.com/3d-fluency/94/facebook-logo.png" alt="Facebook" className="w-8 h-8 drop-shadow-md group-hover:scale-110 transition-transform" />
                <div>
                  <p className="text-on-surface font-medium text-sm">Buff Like & Follow Facebook</p>
                  <p className="text-on-surface-variant text-xs mt-0.5">Nick thật, an toàn cho page</p>
                </div>
              </div>
            </Link>

            <Link href={ROUTES.ads_google} className="bg-surface-variant/30 border border-outline-variant/30 hover:bg-surface-variant/50 transition-colors rounded-xl p-4 flex flex-col gap-3 group">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-blue-400 text-[18px]">search</span>
                </div>
                <div>
                  <p className="text-white font-medium text-sm">Quảng cáo Google Ads</p>
                  <p className="text-on-surface-variant text-xs mt-0.5">Lên top tìm kiếm ngay</p>
                </div>
              </div>
            </Link>
          </div>
        </div>

      </div>
    </>
  )
}
