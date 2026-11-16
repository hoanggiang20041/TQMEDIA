'use client'

import React, { useEffect, useState } from 'react'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem('tq_token');
        if (!token) return;
        
        const [transRes, notifRes] = await Promise.all([
          fetch('/api/transactions', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/notifications')
        ]);

        let allNotifs: any[] = [];

        if (transRes.ok) {
          const transData = await transRes.json();
          const mappedTrans = transData.map((t: any) => ({
            ...t,
            isSystem: true,
            dateObj: new Date(t.createdAt)
          }));
          allNotifs = [...allNotifs, ...mappedTrans];
        }

        if (notifRes.ok) {
          const adminData = await notifRes.json();
          const mappedAdmin = adminData.map((a: any) => ({
            ...a,
            isSystem: false,
            desc: a.title,
            type: a.type || 'ADMIN_PROMO',
            dateObj: new Date(a.createdAt),
            time: new Intl.DateTimeFormat('vi-VN', {
              day: '2-digit', month: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit'
            }).format(new Date(a.createdAt))
          }));
          allNotifs = [...allNotifs, ...mappedAdmin];
        }

        allNotifs.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
        setNotifications(allNotifs);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-display-sm font-bold text-on-background">Tất cả thông báo</h1>
        <p className="text-on-surface-variant font-body-md">Xem tất cả thông báo hệ thống và giao dịch của bạn.</p>
      </div>

      <div className="glass-panel p-6">
        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-12 text-center text-on-surface-variant font-body-md">
            Bạn chưa có thông báo nào.
          </div>
        ) : (
          <div className="flex flex-col">
            {notifications.map((n, i) => {
              const isDeposit = n.type === 'CỘNG TIỀN';
              const isOrder = n.type === 'TRỪ TIỀN';
              const isRefund = n.type === 'HOÀN TIỀN';
              
              const isAdminPromo = n.type === 'ADMIN' || n.type === 'ADMIN_PROMO';
              const isAdminInfo = n.type === 'ADMIN_INFO';
              const isAdminWarn = n.type === 'ADMIN_WARN';
              const isAdminSuccess = n.type === 'ADMIN_SUCCESS';
              const isAdmin = isAdminPromo || isAdminInfo || isAdminWarn || isAdminSuccess;
              
              let icon = 'notifications';
              let color = 'text-gray-600 dark:text-gray-400';
              let bg = 'bg-gray-500/10';
              let titleColor = 'text-on-surface';
              let sideColor = 'bg-orange-500';
              
              if (isAdminPromo) {
                icon = 'campaign'; color = 'text-orange-600 dark:text-orange-400'; bg = 'bg-orange-500/10'; titleColor = 'text-orange-600 dark:text-orange-400'; sideColor = 'bg-orange-500';
              } else if (isAdminInfo) {
                icon = 'info'; color = 'text-blue-600 dark:text-blue-400'; bg = 'bg-blue-500/10'; titleColor = 'text-blue-600 dark:text-blue-400'; sideColor = 'bg-blue-500';
              } else if (isAdminWarn) {
                icon = 'warning'; color = 'text-yellow-600 dark:text-yellow-400'; bg = 'bg-yellow-500/10'; titleColor = 'text-yellow-600 dark:text-yellow-400'; sideColor = 'bg-yellow-500';
              } else if (isAdminSuccess) {
                icon = 'check_circle'; color = 'text-emerald-600 dark:text-emerald-400'; bg = 'bg-emerald-500/10'; titleColor = 'text-emerald-600 dark:text-emerald-400'; sideColor = 'bg-emerald-500';
              } else if (isDeposit) {
                icon = 'payments'; color = 'text-emerald-600 dark:text-emerald-400'; bg = 'bg-emerald-500/10';
              } else if (isOrder) {
                icon = 'shopping_cart'; color = 'text-blue-600 dark:text-blue-400'; bg = 'bg-blue-500/10';
              } else if (isRefund) {
                icon = 'currency_exchange'; color = 'text-teal-600 dark:text-teal-400'; bg = 'bg-teal-500/10';
              }

              return (
                <div key={i} className="group relative flex gap-4 p-5 border-b border-outline-variant/30 hover:bg-surface-variant/30 transition-colors last:border-0 rounded-2xl">
                  {isAdmin && <span className={`absolute left-0 top-3 bottom-3 w-1 ${sideColor} rounded-r-md`}></span>}
                  
                  <div className={`w-12 h-12 rounded-2xl ${bg} flex items-center justify-center shrink-0 shadow-inner`}>
                    <span className={`material-symbols-outlined text-[24px] ${color}`}>{icon}</span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex flex-col gap-1">
                        <h4 className={`font-semibold text-lg ${titleColor}`}>{n.desc}</h4>
                        {isAdmin && (
                          <p className="text-on-surface/90 text-sm leading-relaxed mt-1">{n.content}</p>
                        )}
                        {n.amount && (
                          <p className="text-on-surface-variant text-sm mt-1">
                            Số tiền: <span className={`font-bold ${isDeposit ? 'text-emerald-400' : 'text-blue-400'}`}>
                              {n.amount.replace(/\++/g, '+').replace(/-+/g, '-').replace(/₫+/gi, '₫').replace(/đ+/gi, 'đ').replace(/ +/g, ' ').trim()}
                            </span>
                          </p>
                        )}
                        <p className="text-on-surface-variant/70 text-xs mt-2 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">schedule</span>
                          {n.time}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  )
}
