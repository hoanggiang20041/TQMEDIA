'use client'

import React, { createContext, useContext, useState, useEffect, useRef } from 'react'

export type UserRole = 'GUEST' | 'HOC_VIEN' | 'DAI_LY_1' | 'DAI_LY_2' | 'DAI_LY_3' | 'DAI_LY_4' | 'INSTRUCTOR' | 'ADMIN' | 'TECHNICIAN'

interface UserData {
  agencyDiscounts?: any[];
  id: string
  name: string
  email: string
  balance: number
  role: UserRole
  agencyLevel: number
  phone?: string
  isTwoFactorEnabled?: boolean
  isEmailVerified?: boolean
  createdAt: string
}

export interface Transaction {
  id: string
  type: string
  amount: string
  balance: string
  desc: string
  time: string
  typeClass: string
}

interface RoleContextType {
  role: UserRole
  setRole: (role: UserRole) => void
  balance: number
  user: UserData | null
  isLoading: boolean
  refreshUser: () => Promise<void>
  getDiscountPercentage: () => number
  getDiscountFor: (itemType: string, itemIds: string | string[]) => number
  addBalance: (amount: number, desc: string, methodType?: string) => void
  deductBalance: (amount: number, desc: string) => boolean
  transactions: Transaction[]
  logout: () => void
  settings: any
}

const RoleContext = createContext<RoleContextType | undefined>(undefined)

export const RoleProvider = ({ children }: { children: React.ReactNode }) => {
  const [role, setRole] = useState<UserRole>('ADMIN')
  const [balance, setBalance] = useState<number>(0)
  const [user, setUser] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [settings, setSettings] = useState<any>({})
  const initialFetchDone = useRef(false);
  const lastKnownUserRef = useRef<UserData | null>(null);

  const logout = () => {
    localStorage.removeItem('tq_token')
    setUser(null)
    setRole('ADMIN')
    setBalance(0)
    setTransactions([])
    lastKnownUserRef.current = null;
    window.location.href = '/login'
  }

  const fetchUser = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      // 1. Fetch settings first for maintenance check
      const settingsRes = await fetch('/api/settings');
      let currentSettings: any = {};
      if (settingsRes.ok) {
        currentSettings = await settingsRes.json();
        const formatUrl = (url: string) => {
          if (!url) return '';
          if (!url.startsWith('http://') && !url.startsWith('https://')) {
            return `https://${url}`;
          }
          return url;
        };
        currentSettings.contact_zalo = formatUrl(currentSettings.contact_zalo);
        currentSettings.contact_facebook = formatUrl(currentSettings.contact_facebook);
        currentSettings.contact_telegram = formatUrl(currentSettings.contact_telegram);
        setSettings(currentSettings);
      }

      const token = localStorage.getItem('tq_token');
      let currentRole = 'GUEST';

      if (token) {
        const headers = { 'Authorization': `Bearer ${token}` };
        const userRes = await fetch('/api/auth/me', { headers });
        
        if (userRes.ok) {
          const userData = await userRes.json();
          currentRole = userData.role || 'GUEST';
          setRole(currentRole as UserRole);
          setBalance(userData.balance || 0);
          setUser(userData);
          lastKnownUserRef.current = userData;

          const txRes = await fetch('/api/transactions', { headers });
          if (txRes.ok) {
            const txData = await txRes.json();
            setTransactions(txData);
          }
        } else {
          localStorage.removeItem('tq_token');
          lastKnownUserRef.current = null;
          if (window.location.pathname.startsWith('/dashboard')) {
            window.location.href = '/login';
            return;
          }
        }
      }

      // 2. Check maintenance mode
      if (currentSettings.maintenance_mode === 'true' && currentRole !== 'ADMIN') {
        if (window.location.pathname !== '/maintenance' && window.location.pathname !== '/login') {
          window.location.href = '/maintenance';
        }
        return;
      }

      // 3. Enforce login for dashboard
      if (!token && window.location.pathname.startsWith('/dashboard')) {
        window.location.href = '/login';
        return;
      }

    } catch (err) {
      console.error('Failed to fetch user data', err);
    } finally {
      setIsLoading(false);
      initialFetchDone.current = true;
    }
  }

  useEffect(() => {
    fetchUser()
    
    // Auto polling for new balance
    const interval = setInterval(async () => {
      const token = localStorage.getItem('tq_token');
      if (token && initialFetchDone.current) {
        try {
          const headers = { 'Authorization': `Bearer ${token}` };
          const userRes = await fetch('/api/auth/me', { headers });
          if (userRes.ok) {
            const userData = await userRes.json();
            setBalance((prev) => {
              if (lastKnownUserRef.current && userData.balance > prev) {
                const diff = userData.balance - prev;
                import('sweetalert2').then((Swal) => {
                   Swal.default.fire({
                     title: 'Ting Ting! 💸',
                     text: `Hệ thống vừa tự động cộng ${new Intl.NumberFormat('vi-VN').format(diff)}đ vào tài khoản của bạn!`,
                     icon: 'success',
                     timer: 5000
                   });
                });
                fetch('/api/transactions', { headers })
                  .then(r => r.ok && r.json())
                  .then(tx => setTransactions(tx));
              }
              lastKnownUserRef.current = userData;
              return userData.balance || 0;
            });
            setUser(userData);
          }
        } catch (e) {}
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [])

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  }

  const addBalance = async (amount: number, desc: string, methodType: string = 'bank') => {
    try {
      const res = await fetch('/api/deposits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('tq_token')}` },
        body: JSON.stringify({ amount, method: desc, methodType })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.error) {
          throw new Error(data.error);
        }
        await fetchUser(true);
      } else {
        const data = await res.json();
        if (data.error) throw new Error(data.error);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Có lỗi xảy ra');
    }
  }

  const deductBalance = (amount: number, desc: string) => {
    // Đã chuyển logic xử lý sang backend trong API tạo đơn hàng, nên hàm này chỉ cần refresh
    fetchUser(true);
    return true;
  }


  const handleSetRole = async (newRole: UserRole) => {
    setRole(newRole)
    // Thường sẽ gọi API để đổi role, nhưng tạm thời fake UI
  }

  const getDiscountPercentage = () => {
    switch (role) {
      case 'ADMIN': return 100 // Miễn phí hoặc tuỳ chỉnh
      case 'DAI_LY_4': return parseInt(settings.discount_DAI_LY_4) || 30
      case 'DAI_LY_3': return parseInt(settings.discount_DAI_LY_3) || 25
      case 'DAI_LY_2': return parseInt(settings.discount_DAI_LY_2) || 20
      case 'DAI_LY_1': return parseInt(settings.discount_DAI_LY_1) || 15
      case 'HOC_VIEN': return parseInt(settings.discount_HOC_VIEN) || 10
      case 'GUEST':
      default: return 0
    }
  }

  const getDiscountFor = (itemType: string, itemIds: string | string[]) => {
    if (role === 'ADMIN') return 100;
    
    let maxPercent = -1;
    
    // 1. Check specific Agency Discounts if they exist
    if (user?.agencyDiscounts && user.agencyDiscounts.length > 0) {
      const ids = Array.isArray(itemIds) ? itemIds : [itemIds];
      for (const id of ids) {
        const specific = user.agencyDiscounts.find((d: any) => d.itemType === itemType && d.itemId === id);
        if (specific && specific.discountPercent > maxPercent) {
          maxPercent = specific.discountPercent;
        }
      }
      
      const all = user.agencyDiscounts.find((d: any) => d.itemType === itemType && d.itemId === 'ALL');
      if (all && all.discountPercent > maxPercent) {
        maxPercent = all.discountPercent;
      }
    }
    
    if (maxPercent > -1) return maxPercent;
    
    // 2. Fallback to global settings discount for the user's role
    const globalDiscountKey = `discount_${role}`;
    if (settings && settings[globalDiscountKey]) {
      return parseFloat(settings[globalDiscountKey]) || 0;
    }
    
    return 0;
  }

  return (
    <RoleContext.Provider value={{ 
      role, 
      setRole: handleSetRole, 
      balance, 
      user, 
      isLoading,
      refreshUser: fetchUser, 
      getDiscountPercentage,
      getDiscountFor,
      addBalance, 
      deductBalance, 
      transactions,
      logout,
      settings
    }}>
      {children}
    </RoleContext.Provider>
  )
}


export const useRole = () => {
  const context = useContext(RoleContext)
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider')
  }
  return context
}
