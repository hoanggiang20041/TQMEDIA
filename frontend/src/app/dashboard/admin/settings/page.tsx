'use client';

import React, { useState } from 'react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import RichTextEditor from '@/components/ui/RichTextEditor';
const MySwal = withReactContent(Swal);

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState('home');

  const [homeSettings, setHomeSettings] = useState({
    title: '',
    desc: '',
    slogan: '',
    videoLink: '',
    copyright: '',
    maintenance_mode: 'false',
    affiliate_enabled: 'true',
    affiliate_milestone_count: '3',
    affiliate_milestone_reward: '50000'
  });

  const [contactSettings, setContactSettings] = useState({
    hotline: '',
    email: '',
    facebook: '',
    zalo: '',
    tiktok: '',
    map_iframe: '',
    address: '',
    working_hours: ''
  });

  const [uiSettings, setUiSettings] = useState({
    logo: '',
    favicon: ''
  });

  const [paymentSettings, setPaymentSettings] = useState({
    bankName: 'MB Bank',
    accountNumber: '1234567890',
    accountName: 'NGUYEN VAN A',
    branch: 'Chi nhánh Hà Nội',
    bankStatus: 'true',
    momoNumber: '',
    momoName: '',
    momoStatus: 'false',
    depositBonusPercent: '0',
    depositBonusMinAmount: '0'
  });

  // Page CMS settings
  const [selectedPage, setSelectedPage] = useState('terms');
  const [pageContent, setPageContent] = useState('');
  const [pageTitle, setPageTitle] = useState('');

  // Notification settings
  const [notifTitle, setNotifTitle] = useState('');
  const [notifContent, setNotifContent] = useState('');
  const [notifType, setNotifType] = useState('ADMIN_PROMO');
  const [notifications, setNotifications] = useState<any[]>([]);

  // Discount settings
  
  const [telegramSettings, setTelegramSettings] = useState({
      telegram_bot_token: '',
      telegram_chat_id: '',
      groq_api_key: ''
    });

  const [discountSettings, setDiscountSettings] = useState({
    discount_HOC_VIEN: '10',
    discount_DAI_LY_1: '15',
    discount_DAI_LY_2: '20',
    discount_DAI_LY_3: '25',
    discount_DAI_LY_4: '30'
  });

  // Landing page dynamic sections
  const [loginSettings, setLoginSettings] = useState({
    title1: '',
    title2: '',
    subtitle: '',
    features: [
      { icon: 'dashboard', color: 'text-secondary', title: 'Quản trị tập trung', desc: 'Hệ thống hóa mọi tương tác từ các nền tảng vào một màn hình duy nhất.' },
      { icon: 'analytics', color: 'text-primary', title: 'Phân tích chuyên sâu', desc: 'Theo dõi chỉ số hiệu quả chiến dịch với biểu đồ và báo cáo chi tiết.' },
      { icon: 'groups', color: 'text-primary', title: 'Phân quyền linh hoạt', desc: 'Quản lý không gian làm việc độc lập cho chi nhánh và đại lý.' }
    ] as any[]
  });

  const [homeStats, setHomeStats] = useState({
    orders: '1,284',
    revenue: '45.2M',
    users: '342',
    growth: '+24.8%'
  });

  const [homeFeatures, setHomeFeatures] = useState({
    title: 'Tính năng nổi bật',
    desc: 'Công nghệ hàng đầu được tích hợp sẵn để giúp bạn bứt phá doanh thu.',
    list: [
      { icon: 'bolt', color: 'text-cyan-400', bgColor: 'bg-cyan-500/10', title: 'Tự động hóa toàn diện', desc: 'Thiết lập kịch bản một lần, hệ thống sẽ tự động chạy chiến dịch 24/7 mà không cần giám sát.' },
      { icon: 'analytics', color: 'text-blue-400', bgColor: 'bg-blue-500/10', title: 'Phân tích AI', desc: 'Thuật toán AI liên tục đánh giá và điều hướng dòng tiền vào các chiến dịch hiệu quả nhất.' },
      { icon: 'shield_lock', color: 'text-teal-400', bgColor: 'bg-teal-500/10', title: 'Bảo mật tuyệt đối', desc: 'Dữ liệu khách hàng và ngân sách được mã hóa đa tầng, chống gian lận click (click tặc) 100%.' }
    ] as any[]
  });

  const [homeServices, setHomeServices] = useState({
    title: 'Dịch vụ cung cấp',
    desc: 'Mở rộng phễu khách hàng trên các nền tảng mạng xã hội tỷ người dùng.',
    list: [
      { icon: 'play_circle', color: 'text-[#00f2fe]', title: 'TikTok Ads', desc: 'Bắt trend thần tốc. Phân phối video viral đến hàng triệu Gen Z và Millennials.', glow: 'rgba(0,242,254,0.1)', link: '/dashboard/tiktok' },
      { icon: 'thumb_up', color: 'text-[#1877F2]', title: 'Facebook Ads', desc: 'Tối ưu chi phí chuyển đổi (CPA). Re-targeting chính xác từng tệp khách truy cập.', glow: 'rgba(24,119,242,0.1)', link: '/dashboard/facebook' },
      { icon: 'search', color: 'text-[#EA4335]', title: 'Google SEO & Ads', desc: 'Chiếm lĩnh Top 1 Google. Đón đầu nhu cầu tìm kiếm của khách hàng có ý định mua cao.', glow: 'rgba(234,67,53,0.1)', link: '/dashboard/google' }
    ] as any[]
  });

  // Fetch settings
  React.useEffect(() => {
    fetch('/api/admin/settings', { headers: { 'Authorization': `Bearer ${localStorage.getItem('tq_token')}` } })
      .then(res => res.json())
      .then(data => {
        if (data.contact_hotline !== undefined) {
          setContactSettings({
            hotline: data.contact_hotline || '',
            email: data.contact_email || '',
            facebook: data.contact_facebook || '',
            zalo: data.contact_zalo || '',
            tiktok: data.contact_tiktok || '',
            map_iframe: data.contact_map_iframe || '',
            address: data.contact_address || '123 Đường Tôn Đức Thắng, Quận 1, TP. Hồ Chí Minh',
            working_hours: data.contact_working_hours || 'Thứ 2 - Thứ 6: 08:00 - 18:00\\nThứ 7: 08:00 - 12:00'
          });
        }
        
        if (data.telegram_bot_token !== undefined || data.groq_api_key !== undefined) {
          setTelegramSettings({
            telegram_bot_token: data.telegram_bot_token || '',
            telegram_chat_id: data.telegram_chat_id || '',
            groq_api_key: data.groq_api_key || ''
          });
        }

        setHomeSettings({ 
          title: data.home_title || '',
          desc: data.home_desc || '',
          videoLink: data.home_video_link || '',
          slogan: data.footer_desc || '',
          copyright: data.footer_copyright || '',
          maintenance_mode: data.maintenance_mode || 'false',
          affiliate_enabled: data.affiliate_enabled || 'true',
          affiliate_milestone_count: data.affiliate_milestone_count || '3',
          affiliate_milestone_reward: data.affiliate_milestone_reward || '50000'
        });
        setPaymentSettings({
          bankName: data.bank_name || 'MB Bank',
          accountNumber: data.bank_account_number || '',
          accountName: data.bank_account_name || '',
          branch: data.bank_branch || '',
          bankStatus: data.bank_status || 'true',
          momoNumber: data.momo_number || '',
          momoName: data.momo_name || '',
          momoStatus: data.momo_status || 'false',
          depositBonusPercent: data.deposit_bonus_percent || '0',
          depositBonusMinAmount: data.deposit_bonus_min_amount || '0'
        });
        setUiSettings({
          logo: data.ui_logo || '',
          favicon: data.ui_favicon || ''
        });
        setDiscountSettings({
          discount_HOC_VIEN: data.discount_HOC_VIEN || '10',
          discount_DAI_LY_1: data.discount_DAI_LY_1 || '15',
          discount_DAI_LY_2: data.discount_DAI_LY_2 || '20',
          discount_DAI_LY_3: data.discount_DAI_LY_3 || '25',
          discount_DAI_LY_4: data.discount_DAI_LY_4 || '30'
        });
        setLoginSettings(prev => ({
          title1: data.login_title1 !== undefined ? data.login_title1 : prev.title1,
          title2: data.login_title2 !== undefined ? data.login_title2 : prev.title2,
          subtitle: data.login_subtitle !== undefined ? data.login_subtitle : prev.subtitle,
          features: data.login_features_list ? JSON.parse(data.login_features_list) : prev.features
        }));
        
        try {
          if (data.home_features_list) {
            setHomeFeatures({
              title: data.home_features_title || 'Tính năng nổi bật',
              desc: data.home_features_desc || 'Công nghệ hàng đầu được tích hợp sẵn để giúp bạn bứt phá doanh thu.',
              list: JSON.parse(data.home_features_list)
            });
          }
          if (data.home_services_list) {
            setHomeServices({
              title: data.home_services_title || 'Dịch vụ cung cấp',
              desc: data.home_services_desc || 'Mở rộng phễu khách hàng trên các nền tảng mạng xã hội tỷ người dùng.',
              list: JSON.parse(data.home_services_list)
            });
          }
          if (data.home_stats_orders) {
            setHomeStats({
              orders: data.home_stats_orders || '1,284',
              revenue: data.home_stats_revenue || '45.2M',
              users: data.home_stats_users || '342',
              growth: data.home_stats_growth || '+24.8%'
            });
          }
        } catch(e) { console.error('Parse JSON failed', e) }
      })
      .catch(err => console.error(err));
  }, []);

  // Fetch page content when selectedPage changes
  React.useEffect(() => {
    if (activeTab === 'pages') {
      fetch(`/api/pages/${selectedPage}`)
        .then(res => res.ok ? res.json() : { title: '', content: '' })
        .then(data => {
          setPageTitle(data.title || '');
          setPageContent(data.content || '');
        })
        .catch(err => console.error(err));
    } else if (activeTab === 'notifications') {
      fetchNotifications();
    }
  }, [activeTab, selectedPage]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error('Lỗi tải thông báo', err);
    }
  };

  const handleSave = async () => {
    if (activeTab === 'pages') {
      try {
        const token = localStorage.getItem('tq_token');
        const res = await fetch(`/api/admin/pages/${selectedPage}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ title: pageTitle, content: pageContent })
        });
        if (res.ok) {
          MySwal.fire({ icon: 'success', title: 'Thành công', text: 'Đã lưu nội dung trang!' });
        } else {
        MySwal.fire({ icon: 'error', title: 'Lỗi', text: 'Lưu cài đặt thất bại.' });
      }
    } catch (err) {
      console.error(err);
      MySwal.fire({ icon: 'error', title: 'Lỗi', text: 'Đã có lỗi xảy ra.' });
    }
    return;
    }

    // Save global settings
    try {
      const token = localStorage.getItem('tq_token');
      const payload = {
        home_title: homeSettings.title,
        home_desc: homeSettings.desc,
        home_video_link: homeSettings.videoLink,
        footer_desc: homeSettings.slogan,
        footer_copyright: homeSettings.copyright,
        maintenance_mode: homeSettings.maintenance_mode,
        affiliate_enabled: homeSettings.affiliate_enabled,
        affiliate_milestone_count: homeSettings.affiliate_milestone_count,
        affiliate_milestone_reward: homeSettings.affiliate_milestone_reward,
        ui_logo: uiSettings.logo,
        ui_favicon: uiSettings.favicon,
        bank_name: paymentSettings.bankName,
        bank_account_number: paymentSettings.accountNumber,
        bank_account_name: paymentSettings.accountName,
        bank_branch: paymentSettings.branch,
        bank_status: paymentSettings.bankStatus,
        momo_number: paymentSettings.momoNumber,
        momo_name: paymentSettings.momoName,
        momo_status: paymentSettings.momoStatus,
        deposit_bonus_percent: paymentSettings.depositBonusPercent,
        deposit_bonus_min_amount: paymentSettings.depositBonusMinAmount,
        
        telegram_bot_token: telegramSettings.telegram_bot_token,
          telegram_chat_id: telegramSettings.telegram_chat_id,
          groq_api_key: telegramSettings.groq_api_key,

        contact_hotline: contactSettings.hotline,
        contact_email: contactSettings.email,
        contact_facebook: contactSettings.facebook,
        contact_zalo: contactSettings.zalo,
        contact_tiktok: contactSettings.tiktok,
        contact_map_iframe: contactSettings.map_iframe,
        contact_address: contactSettings.address,
        contact_working_hours: contactSettings.working_hours,
        discount_HOC_VIEN: discountSettings.discount_HOC_VIEN,
        discount_DAI_LY_4: discountSettings.discount_DAI_LY_4,
        discount_DAI_LY_3: discountSettings.discount_DAI_LY_3,
        discount_DAI_LY_2: discountSettings.discount_DAI_LY_2,
        discount_DAI_LY_1: discountSettings.discount_DAI_LY_1,
        login_title1: loginSettings.title1,
        login_title2: loginSettings.title2,
        login_subtitle: loginSettings.subtitle,
        login_features_list: JSON.stringify(loginSettings.features),
        home_features_title: homeFeatures.title,
        home_features_desc: homeFeatures.desc,
        home_features_list: JSON.stringify(homeFeatures.list),
        home_services_title: homeServices.title,
        home_services_desc: homeServices.desc,
        home_services_list: JSON.stringify(homeServices.list),
        home_stats_orders: homeStats.orders,
        home_stats_revenue: homeStats.revenue,
        home_stats_users: homeStats.users,
        home_stats_growth: homeStats.growth
      };
      await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      MySwal.fire({ icon: 'success', title: 'Thành công', text: 'Đã lưu thay đổi cấu hình!' })
    } catch (err) {
      MySwal.fire({ icon: 'error', title: 'Lỗi', text: 'Không thể lưu cài đặt' });
    }
  };

  const handleSendNotification = async () => {
    if (!notifTitle || !notifContent) {
      return MySwal.fire({ icon: 'warning', title: 'Chưa đủ thông tin', text: 'Vui lòng nhập tiêu đề và nội dung thông báo.' });
    }
    try {
      const token = localStorage.getItem('tq_token');
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title: notifTitle, content: notifContent, type: notifType })
      });
      if (res.ok) {
        MySwal.fire({ icon: 'success', title: 'Đã phát sóng!', text: 'Thông báo đã được gửi đến tất cả người dùng.' });
        setNotifTitle('');
        setNotifContent('');
        fetchNotifications();
      } else {
        MySwal.fire({ icon: 'error', title: 'Lỗi', text: 'Không thể gửi thông báo.' });
      }
    } catch (err) {
      MySwal.fire({ icon: 'error', title: 'Lỗi', text: 'Đã xảy ra lỗi kết nối.' });
    }
  };

  const handleDeleteNotification = async (id: string) => {
    const result = await MySwal.fire({
      title: 'Xóa thông báo này?',
      text: "Người dùng sẽ không nhìn thấy thông báo này nữa.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Đồng ý, Xóa',
      cancelButtonText: 'Hủy'
    });
    if (!result.isConfirmed) return;

    try {
      const token = localStorage.getItem('tq_token');
      const res = await fetch(`/api/admin/notifications/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        MySwal.fire('Đã xóa', 'Xóa thông báo thành công', 'success');
        fetchNotifications();
      } else {
        MySwal.fire('Lỗi', 'Không thể xóa', 'error');
      }
    } catch (err) {
      MySwal.fire('Lỗi', 'Có lỗi xảy ra', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-display-lg text-primary neon-glow">Cài đặt hệ thống</h1>
        <p className="text-on-surface-variant font-body-md text-sm md:text-base">Quản lý cấu hình, giao diện và thông tin liên hệ của Website</p>
      </div>

      <div className="glass-panel p-4 md:p-6 space-y-6">
        {/* Tabs */}
        <div className="flex border-b border-outline-variant/30 mt-6 overflow-x-auto custom-scrollbar">
          {['home', 'landing', 'login_ui', 'contact', 'ui', 'bank', 'pages', 'notifications', 'telegram'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-body-md transition-all rounded-t-lg flex items-center gap-2 whitespace-nowrap flex-shrink-0 ${
                activeTab === tab 
                  ? 'text-primary border-b-2 border-primary bg-surface-variant/50' 
                  : 'text-on-surface-variant hover:text-white hover:bg-surface-variant/50'
              }`}
            >
              {tab === 'home' && (
                <>
                  <span className="material-symbols-outlined text-sm">home</span>
                  Cấu hình chung
                </>
              )}
              {tab === 'landing' && (
                <>
                  <span className="material-symbols-outlined text-sm">web</span>
                  Giao diện Trang chủ
                </>
              )}
              {tab === 'login_ui' && (
                <>
                  <span className="material-symbols-outlined text-sm">login</span>
                  Giao diện Đăng nhập
                </>
              )}
              {tab === 'contact' && (
                <>
                  <span className="material-symbols-outlined text-sm">contact_support</span>
                  Liên hệ
                </>
              )}
              {tab === 'ui' && (
                <>
                  <span className="material-symbols-outlined text-sm">palette</span>
                  Giao diện
                </>
              )}
              {tab === 'bank' && (
                <>
                  <span className="material-symbols-outlined text-sm">account_balance</span>
                  Thanh toán
                </>
              )}
              {tab === 'pages' && (
                <>
                  <span className="material-symbols-outlined text-sm">article</span>
                  Nội dung trang
                </>
              )}

              
              {tab === 'telegram' && (
                <>
                  <span className="material-symbols-outlined text-sm">smart_toy</span>
                  API & Bot
                </>
              )}
              {tab === 'notifications' && (
                <>
                  <span className="material-symbols-outlined text-sm">campaign</span>
                  Phát thông báo
                </>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[300px]">
          {activeTab === 'home' && (
            <div className="space-y-4 max-w-2xl">
              <div className="space-y-2 p-4 rounded-xl bg-orange-500/10 border border-orange-500/30 mb-6">
                <div className="flex items-center justify-between">
                  <label className="text-base font-bold text-orange-400 flex items-center gap-2">
                    <span className="material-symbols-outlined">engineering</span>
                    Chế độ Bảo trì Web
                  </label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={homeSettings.maintenance_mode === 'true'}
                      onChange={(e) => setHomeSettings({...homeSettings, maintenance_mode: e.target.checked ? 'true' : 'false'})}
                    />
                    <div className="w-11 h-6 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                  </label>
                </div>
                <p className="text-sm text-orange-400/80 mt-2">Khi bật, tất cả người dùng (trừ Admin) sẽ bị chuyển hướng đến trang Bảo trì hệ thống.</p>
              </div>

              <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-blue-400">Chương trình Hoa hồng (Affiliate)</h3>
                    <p className="text-sm text-on-surface-variant mt-1">Bật/tắt chương trình giới thiệu nhận hoa hồng cho tất cả thành viên.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={homeSettings.affiliate_enabled === 'true'}
                      onChange={(e) => setHomeSettings({...homeSettings, affiliate_enabled: e.target.checked ? 'true' : 'false'})}
                    />
                    <div className="w-11 h-6 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                  </label>
                </div>
                {homeSettings.affiliate_enabled === 'true' && (
                  <div className="mt-4 grid grid-cols-2 gap-4 pt-4 border-t border-blue-500/20">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-blue-400">Số lượng giới thiệu yêu cầu</label>
                      <input 
                        type="number" 
                        min="1"
                        value={homeSettings.affiliate_milestone_count}
                        onChange={e => setHomeSettings({...homeSettings, affiliate_milestone_count: e.target.value})}
                        className="w-full bg-slate-900/50 border border-blue-500/20 rounded-lg px-3 py-2 text-sm text-blue-100 focus:outline-none focus:border-blue-500"
                        placeholder="VD: 3"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-blue-400">Tiền thưởng (VNĐ)</label>
                      <input 
                        type="number" 
                        min="0"
                        step="1000"
                        value={homeSettings.affiliate_milestone_reward}
                        onChange={e => setHomeSettings({...homeSettings, affiliate_milestone_reward: e.target.value})}
                        className="w-full bg-slate-900/50 border border-blue-500/20 rounded-lg px-3 py-2 text-sm text-blue-100 focus:outline-none focus:border-blue-500"
                        placeholder="VD: 50000"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-label-sm text-on-surface">Slogan</label>
                <RichTextEditor 
                  value={homeSettings.slogan}
                  onChange={(val) => setHomeSettings({...homeSettings, slogan: val})}
                  placeholder="Nhập slogan / mô tả Footer..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-label-sm text-on-surface">Link Video Banner</label>
                <input 
                  type="text" 
                  value={homeSettings.videoLink}
                  onChange={(e) => setHomeSettings({...homeSettings, videoLink: e.target.value})}
                  className="input-glass w-full text-on-surface placeholder-white/30"
                  placeholder="Nhập link video banner..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-label-sm text-on-surface">Copyright Footer</label>
                <input 
                  type="text" 
                  value={homeSettings.copyright}
                  onChange={(e) => setHomeSettings({...homeSettings, copyright: e.target.value})}
                  className="input-glass w-full text-on-surface placeholder-white/30"
                  placeholder="VD: © 2024 TQ MEDIA. Tất cả quyền được bảo lưu."
                />
              </div>
            </div>
          )}

          {activeTab === 'contact' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
              <div className="space-y-2">
                <label className="text-sm font-label-sm text-on-surface">Hotline</label>
                <input 
                  type="text" 
                  value={contactSettings.hotline}
                  onChange={(e) => setContactSettings({...contactSettings, hotline: e.target.value})}
                  className="input-glass w-full text-on-surface placeholder-white/30"
                  placeholder="Nhập hotline..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-label-sm text-on-surface">Email</label>
                <input 
                  type="email" 
                  value={contactSettings.email}
                  onChange={(e) => setContactSettings({...contactSettings, email: e.target.value})}
                  className="input-glass w-full text-on-surface placeholder-white/30"
                  placeholder="Nhập email..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-label-sm text-on-surface">Link Facebook</label>
                <input 
                  type="text" 
                  value={contactSettings.facebook}
                  onChange={(e) => setContactSettings({...contactSettings, facebook: e.target.value})}
                  className="input-glass w-full text-on-surface placeholder-white/30"
                  placeholder="Nhập link facebook..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-label-sm text-on-surface">Link Zalo / Số điện thoại (Zalo.me)</label>
                <input 
                  type="text" 
                  value={contactSettings.zalo}
                  onChange={(e) => setContactSettings({...contactSettings, zalo: e.target.value})}
                  className="input-glass w-full text-on-surface placeholder-white/30"
                  placeholder="Nhập link zalo..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-label-sm text-on-surface">Link TikTok</label>
                <input 
                  type="text" 
                  value={contactSettings.tiktok}
                  onChange={(e) => setContactSettings({...contactSettings, tiktok: e.target.value})}
                  className="input-glass w-full text-on-surface placeholder-white/30"
                  placeholder="Nhập link TikTok..."
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-label-sm text-on-surface">Địa chỉ</label>
                <input 
                  type="text" 
                  value={contactSettings.address}
                  onChange={(e) => setContactSettings({...contactSettings, address: e.target.value})}
                  className="input-glass w-full text-on-surface placeholder-white/30"
                  placeholder="Nhập địa chỉ..."
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-label-sm text-on-surface">Giờ làm việc</label>
                <textarea 
                  rows={2}
                  value={contactSettings.working_hours}
                  onChange={(e) => setContactSettings({...contactSettings, working_hours: e.target.value})}
                  className="input-glass w-full text-on-surface placeholder-white/30"
                  placeholder="Nhập giờ làm việc..."
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-label-sm text-on-surface">Mã nhúng Bản đồ Google Maps (iframe)</label>
                <input 
                  type="text" 
                  value={contactSettings.map_iframe}
                  onChange={(e) => setContactSettings({...contactSettings, map_iframe: e.target.value})}
                  className="input-glass w-full text-on-surface placeholder-white/30"
                  placeholder='VD: <iframe src="https://www.google.com/maps/embed?..." ...></iframe>'
                />
              </div>
            </div>
          )}

          {activeTab === 'ui' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
              <div className="space-y-2">
                <label className="text-sm font-label-sm text-on-surface">Link Logo</label>
                <input 
                  type="text" 
                  value={uiSettings.logo}
                  onChange={(e) => setUiSettings({...uiSettings, logo: e.target.value})}
                  className="input-glass w-full text-on-surface placeholder-white/30"
                  placeholder="Nhập đường dẫn logo (URL)..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-label-sm text-on-surface">Link Favicon</label>
                <input 
                  type="text" 
                  value={uiSettings.favicon}
                  onChange={(e) => setUiSettings({...uiSettings, favicon: e.target.value})}
                  className="input-glass w-full text-on-surface placeholder-white/30"
                  placeholder="Nhập đường dẫn favicon (URL)..."
                />
              </div>
            </div>
          )}
          {activeTab === 'bank' && (
            <div className="space-y-8 animate-fade-in-up">
              {/* Deposit Bonus Settings */}
              <div className="bg-surface/50 border border-outline-variant/30 rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-outline-variant/30 pb-2">
                  <h3 className="text-xl font-bold text-orange-400 flex items-center gap-2">
                    <span className="material-symbols-outlined text-orange-400">celebration</span>
                    Khuyến mãi nạp tiền
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
                  <div className="space-y-2">
                    <label className="text-sm font-label-sm text-on-surface">Phần trăm tặng thêm (%)</label>
                    <input 
                      type="number" 
                      value={paymentSettings.depositBonusPercent}
                      onChange={(e) => setPaymentSettings({...paymentSettings, depositBonusPercent: e.target.value})}
                      className="input-glass w-full text-on-surface placeholder-white/30"
                      placeholder="VD: 10"
                    />
                    <p className="text-xs text-on-surface-variant">Nhập 0 để tắt. Nếu nhập 10, khách được cộng thêm 10%.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-label-sm text-on-surface">Điều kiện: Nạp tối thiểu (VNĐ)</label>
                    <input 
                      type="number" 
                      value={paymentSettings.depositBonusMinAmount}
                      onChange={(e) => setPaymentSettings({...paymentSettings, depositBonusMinAmount: e.target.value})}
                      className="input-glass w-full text-on-surface placeholder-white/30"
                      placeholder="VD: 50000"
                    />
                    <p className="text-xs text-on-surface-variant">VD: 50000. Chỉ áp dụng tặng % khi khách nạp từ số tiền này trở lên.</p>
                  </div>
                </div>
              </div>

              {/* Bank Settings */}
              <div className="bg-surface/50 border border-outline-variant/30 rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-outline-variant/30 pb-2">
                  <h3 className="text-xl font-bold text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">account_balance</span>
                    Chuyển khoản Ngân hàng
                  </h3>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={paymentSettings.bankStatus === 'true'}
                      onChange={(e) => setPaymentSettings({...paymentSettings, bankStatus: e.target.checked ? 'true' : 'false'})}
                    />
                    <div className="w-11 h-6 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                  </label>
                </div>
                
                <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl transition-all ${paymentSettings.bankStatus === 'false' ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="space-y-2">
                    <label className="text-sm font-label-sm text-on-surface">Tên Ngân hàng</label>
                    <input 
                      type="text" 
                      value={paymentSettings.bankName}
                      onChange={(e) => setPaymentSettings({...paymentSettings, bankName: e.target.value})}
                      className="input-glass w-full text-on-surface placeholder-white/30"
                      placeholder="VD: MB Bank"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-label-sm text-on-surface">Số tài khoản</label>
                    <input 
                      type="text" 
                      value={paymentSettings.accountNumber}
                      onChange={(e) => setPaymentSettings({...paymentSettings, accountNumber: e.target.value})}
                      className="input-glass w-full text-on-surface placeholder-white/30"
                      placeholder="Nhập số tài khoản..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-label-sm text-on-surface">Chủ tài khoản</label>
                    <input 
                      type="text" 
                      value={paymentSettings.accountName}
                      onChange={(e) => setPaymentSettings({...paymentSettings, accountName: e.target.value})}
                      className="input-glass w-full text-on-surface placeholder-white/30"
                      placeholder="VD: NGUYEN VAN A"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-label-sm text-on-surface">Chi nhánh</label>
                    <input 
                      type="text" 
                      value={paymentSettings.branch}
                      onChange={(e) => setPaymentSettings({...paymentSettings, branch: e.target.value})}
                      className="input-glass w-full text-on-surface placeholder-white/30"
                      placeholder="VD: Chi nhánh Hà Nội"
                    />
                  </div>
                </div>
              </div>

              {/* Momo Settings */}
              <div className="bg-surface/50 border border-outline-variant/30 rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-outline-variant/30 pb-2">
                  <h3 className="text-xl font-bold text-[#A50064] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#A50064]">account_balance_wallet</span>
                    Ví điện tử Momo
                  </h3>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={paymentSettings.momoStatus === 'true'}
                      onChange={(e) => setPaymentSettings({...paymentSettings, momoStatus: e.target.checked ? 'true' : 'false'})}
                    />
                    <div className="w-11 h-6 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                  </label>
                </div>
                
                <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl transition-all ${paymentSettings.momoStatus === 'false' ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="space-y-2">
                    <label className="text-sm font-label-sm text-on-surface">Số điện thoại Momo</label>
                    <input 
                      type="text" 
                      value={paymentSettings.momoNumber}
                      onChange={(e) => setPaymentSettings({...paymentSettings, momoNumber: e.target.value})}
                      className="input-glass w-full text-on-surface placeholder-white/30"
                      placeholder="VD: 0987654321"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-label-sm text-on-surface">Tên chủ ví</label>
                    <input 
                      type="text" 
                      value={paymentSettings.momoName}
                      onChange={(e) => setPaymentSettings({...paymentSettings, momoName: e.target.value})}
                      className="input-glass w-full text-on-surface placeholder-white/30"
                      placeholder="VD: NGUYEN VAN A"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pages' && (
            <div className="space-y-4 max-w-4xl">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="space-y-2 md:w-1/3">
                  <label className="text-sm font-label-sm text-on-surface">Chọn trang để sửa</label>
                  <select 
                    value={selectedPage}
                    onChange={(e) => setSelectedPage(e.target.value)}
                    className="input-glass w-full text-on-surface bg-surface"
                  >
                    <option value="terms">Điều khoản dịch vụ</option>
                    <option value="privacy">Chính sách bảo mật</option>
                  </select>
                </div>
                <div className="space-y-2 flex-1">
                  <label className="text-sm font-label-sm text-on-surface">Tiêu đề trang</label>
                  <input 
                    type="text" 
                    value={pageTitle}
                    onChange={(e) => setPageTitle(e.target.value)}
                    className="input-glass w-full text-on-surface placeholder-white/30"
                    placeholder="VD: Điều khoản sử dụng..."
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-label-sm text-on-surface">Nội dung HTML / Văn bản</label>
                <RichTextEditor 
                  value={pageContent}
                  onChange={(val) => setPageContent(val)}
                  placeholder="Nhập nội dung..."
                />
              </div>
            </div>
          )}

          
          {activeTab === 'telegram' && (
            <div className="space-y-6 max-w-2xl animate-fade-in-up">
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
                <p className="text-sm text-blue-400 font-medium">Hệ thống sẽ gửi thông báo (đơn hàng mới, đăng ký, đăng nhập...) về Telegram của bạn qua Bot này.</p>
              </div>
              <div className="space-y-4 bg-surface/50 border border-outline-variant/30 rounded-xl p-6">
                <div className="space-y-2">
                  <label className="text-sm font-label-sm text-on-surface">Telegram Bot Token</label>
                  <input
                    type="text"
                    value={telegramSettings.telegram_bot_token || ''}
                    onChange={(e) => setTelegramSettings({ ...telegramSettings, telegram_bot_token: e.target.value })}
                    className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2 text-on-surface focus:outline-none focus:border-primary transition-colors"
                    placeholder="VD: 123456789:ABCdefGHIjklMNOpqr"
                  />
                  <p className="text-xs text-on-surface-variant">Tạo bot mới tại @BotFather để lấy Token.</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-label-sm text-on-surface">Telegram Chat ID</label>
                  <input
                    type="text"
                    value={telegramSettings.telegram_chat_id || ''}
                    onChange={(e) => setTelegramSettings({ ...telegramSettings, telegram_chat_id: e.target.value })}
                    className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2 text-on-surface focus:outline-none focus:border-primary transition-colors"
                    placeholder="VD: 123456789"
                  />
                  <p className="text-xs text-on-surface-variant">ID của tài khoản hoặc group muốn nhận thông báo (Lấy từ @userinfobot).</p>
                  </div>
                  <div className="space-y-2 mt-4 pt-4 border-t border-outline-variant/30">
                    <label className="text-sm font-label-sm text-on-surface">Groq API Key (Dành cho AI Chatbot)</label>
                    <input
                      type="text"
                      value={telegramSettings.groq_api_key || ''}
                      onChange={(e) => setTelegramSettings({ ...telegramSettings, groq_api_key: e.target.value })}
                      className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2 text-on-surface focus:outline-none focus:border-primary transition-colors"
                      placeholder="VD: gsk_..."
                    />
                    <p className="text-xs text-on-surface-variant">AI sẽ sử dụng mã này để phản hồi tự động. Lấy mã tại console.groq.com.</p>
                  </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6 max-w-2xl">
              <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30">
                <p className="text-sm text-orange-400 font-medium">Thông báo sẽ được gửi và hiển thị ở mục Chuông Thông báo của tất cả người dùng trên hệ thống.</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-label-sm text-on-surface">Tiêu đề thông báo</label>
                <input 
                  type="text" 
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  className="input-glass w-full text-on-surface placeholder-white/30"
                  placeholder="Ví dụ: Khuyến mãi 50% nạp tiền hôm nay!"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-label-sm text-on-surface">Mục đích thông báo</label>
                <select 
                  value={notifType}
                  onChange={(e) => setNotifType(e.target.value)}
                  className="input-glass w-full text-on-surface placeholder-white/30"
                >
                  <option value="ADMIN_PROMO" className="bg-surface text-on-surface">🎉 Khuyến mãi / Sự kiện</option>
                  <option value="ADMIN_INFO" className="bg-surface text-on-surface">ℹ️ Thông tin chung</option>
                  <option value="ADMIN_WARN" className="bg-surface text-on-surface">⚠️ Cảnh báo / Bảo trì</option>
                  <option value="ADMIN_SUCCESS" className="bg-surface text-on-surface">✅ Thông báo thành công</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-label-sm text-on-surface">Nội dung chi tiết</label>
                <textarea 
                  rows={4}
                  value={notifContent}
                  onChange={(e) => setNotifContent(e.target.value)}
                  className="input-glass w-full text-on-surface placeholder-white/30 resize-none py-3"
                  placeholder="Nhập nội dung thông báo..."
                />
              </div>
              <div className="flex justify-end pt-4 border-b border-white/10 pb-6">
                <button 
                  onClick={handleSendNotification}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(249,115,22,0.3)]"
                >
                  <span className="material-symbols-outlined">campaign</span>
                  Phát sóng ngay
                </button>
              </div>

              <div className="mt-8">
                <h3 className="text-xl font-bold text-on-surface mb-4">Lịch sử thông báo đã gửi</h3>
                <div className="space-y-3">
                  {notifications.map((n: any) => (
                    <div key={n.id} className="bg-surface-variant/20 p-4 rounded-xl border border-outline-variant/20 flex justify-between items-start gap-4 hover:bg-surface-variant/40 transition-colors">
                      <div>
                        <h4 className="font-bold text-on-surface">{n.title}</h4>
                        <p className="text-sm text-on-surface-variant mt-1 line-clamp-2">{n.content}</p>
                        <span className="text-xs text-on-surface-variant/70 mt-2 block">{new Date(n.createdAt).toLocaleString('vi-VN')}</span>
                      </div>
                      <button 
                        onClick={() => handleDeleteNotification(n.id)}
                        className="text-red-400 hover:text-red-300 p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors shrink-0"
                        title="Xóa thông báo"
                      >
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  ))}
                  {notifications.length === 0 && (
                    <p className="text-on-surface-variant text-center py-4">Chưa có thông báo nào</p>
                  )}
                </div>
              </div>
            </div>
          )}
          {activeTab === 'login_ui' && (
            <div className="space-y-8 animate-fade-in-up max-w-4xl">
              <div className="bg-surface/50 border border-outline-variant/30 rounded-xl p-6 space-y-4">
                <h3 className="text-xl font-bold text-on-surface border-b border-outline-variant/30 pb-2">Nội dung Trang Đăng nhập</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-on-surface">Tiêu đề dòng 1</label>
                    <input type="text" className="input-glass w-full" value={loginSettings.title1} onChange={e => setLoginSettings({...loginSettings, title1: e.target.value})} placeholder="VD: Kiến tạo chuẩn mực" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-on-surface">Tiêu đề dòng 2</label>
                    <input type="text" className="input-glass w-full" value={loginSettings.title2} onChange={e => setLoginSettings({...loginSettings, title2: e.target.value})} placeholder="VD: truyền thông số." />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-on-surface">Mô tả ngắn</label>
                    <input type="text" className="input-glass w-full" value={loginSettings.subtitle} onChange={e => setLoginSettings({...loginSettings, subtitle: e.target.value})} placeholder="VD: Hệ thống vận hành tự động..." />
                  </div>
                </div>

                <div className="space-y-4 mt-8">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold text-primary">Danh sách Tính năng (Tối đa 3) <a href="https://fonts.google.com/icons?icon.set=Material+Symbols" target="_blank" rel="noreferrer" className="text-sm font-normal text-blue-400 hover:underline ml-2">(Tra cứu mã Icon)</a></h4>
                    <button onClick={() => setLoginSettings({...loginSettings, features: [...loginSettings.features, { icon: 'star', color: 'text-cyan-400', title: 'Tính năng mới', desc: 'Mô tả tính năng' }]})} className="btn-primary py-1.5 px-3 text-sm">
                      <span className="material-symbols-outlined text-sm mr-1">add</span> Thêm Tính năng
                    </button>
                  </div>
                  
                  {loginSettings.features.map((item, index) => (
                    <div key={index} className="flex flex-col gap-3 p-4 bg-background/50 rounded-lg border border-outline-variant/30">
                      <div className="flex justify-between items-center">
                         <span className="font-bold text-on-surface-variant">Tính năng #{index + 1}</span>
                         <button onClick={() => setLoginSettings({...loginSettings, features: loginSettings.features.filter((_, i) => i !== index)})} className="text-red-400 hover:text-red-300">
                           <span className="material-symbols-outlined">delete</span>
                         </button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <input type="text" placeholder="Tiêu đề (VD: Tăng tương tác)" className="input-glass" value={item.title} onChange={e => { const newList = [...loginSettings.features]; newList[index].title = e.target.value; setLoginSettings({...loginSettings, features: newList}); }} />
                        <input type="text" placeholder="Icon (VD: thumb_up)" className="input-glass" value={item.icon} onChange={e => { const newList = [...loginSettings.features]; newList[index].icon = e.target.value; setLoginSettings({...loginSettings, features: newList}); }} />
                        <input type="text" placeholder="Màu Icon (Tailwind class, VD: text-blue-400)" className="input-glass" value={item.color} onChange={e => { const newList = [...loginSettings.features]; newList[index].color = e.target.value; setLoginSettings({...loginSettings, features: newList}); }} />
                      </div>
                      <input type="text" placeholder="Mô tả" className="input-glass w-full" value={item.desc} onChange={e => { const newList = [...loginSettings.features]; newList[index].desc = e.target.value; setLoginSettings({...loginSettings, features: newList}); }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'landing' && (
            <div className="space-y-8 animate-fade-in-up">
              {/* Hero Section */}
              <div className="bg-surface/50 border border-outline-variant/30 rounded-xl p-6 space-y-4">
                <h3 className="text-xl font-bold text-on-surface border-b border-outline-variant/30 pb-2">Phần: Tiêu đề & Giới thiệu</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-2">Tiêu đề chính <span className="text-cyan-400 font-normal">(Bôi đen chữ và chọn B (In đậm) để tạo hiệu ứng phát sáng)</span></label>
                    <RichTextEditor
                      value={homeSettings.title}
                      onChange={(val) => setHomeSettings({ ...homeSettings, title: val })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-2">Mô tả ngắn (Dưới tiêu đề)</label>
                    <RichTextEditor
                      value={homeSettings.desc}
                      onChange={(val) => setHomeSettings({ ...homeSettings, desc: val })}
                    />
                  </div>
                </div>
              </div>

              {/* Stats Section */}
              <div className="bg-surface/50 border border-outline-variant/30 rounded-xl p-6 space-y-4">
                <h3 className="text-xl font-bold text-on-surface border-b border-outline-variant/30 pb-2">Phần: Các con số ấn tượng (Thống kê ảo)</h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-on-surface">Đơn hàng</label>
                    <input type="text" className="input-glass w-full" value={homeStats.orders} onChange={e => setHomeStats({...homeStats, orders: e.target.value})} placeholder="VD: 1,284" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-on-surface">Doanh thu</label>
                    <input type="text" className="input-glass w-full" value={homeStats.revenue} onChange={e => setHomeStats({...homeStats, revenue: e.target.value})} placeholder="VD: 45.2M" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-on-surface">Người dùng</label>
                    <input type="text" className="input-glass w-full" value={homeStats.users} onChange={e => setHomeStats({...homeStats, users: e.target.value})} placeholder="VD: 342" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-on-surface">Tăng trưởng</label>
                    <input type="text" className="input-glass w-full" value={homeStats.growth} onChange={e => setHomeStats({...homeStats, growth: e.target.value})} placeholder="VD: +24.8%" />
                  </div>
                </div>
              </div>

              {/* Features Section */}
              <div className="bg-surface/50 border border-outline-variant/30 rounded-xl p-6 space-y-4">
                <h3 className="text-xl font-bold text-on-surface border-b border-outline-variant/30 pb-2">Phần: Tính năng nổi bật</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-on-surface">Tiêu đề (Title)</label>
                    <input type="text" className="input-glass w-full" value={homeFeatures.title} onChange={e => setHomeFeatures({...homeFeatures, title: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-on-surface">Mô tả (Description)</label>
                    <input type="text" className="input-glass w-full" value={homeFeatures.desc} onChange={e => setHomeFeatures({...homeFeatures, desc: e.target.value})} />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold text-primary">Danh sách Tính năng <a href="https://fonts.google.com/icons?icon.set=Material+Symbols" target="_blank" rel="noreferrer" className="text-sm font-normal text-blue-400 hover:underline ml-2">(Tra cứu mã Icon tại đây)</a></h4>
                    <button onClick={() => setHomeFeatures({...homeFeatures, list: [...homeFeatures.list, { icon: 'star', color: 'text-cyan-400', bgColor: 'bg-cyan-500/10', title: 'Tính năng mới', desc: 'Mô tả tính năng' }]})} className="btn-primary py-1.5 px-3 text-sm">
                      <span className="material-symbols-outlined text-sm mr-1">add</span> Thêm Tính năng
                    </button>
                  </div>
                  
                  {homeFeatures.list.map((item, index) => (
                    <div key={index} className="flex flex-col gap-3 p-4 bg-background/50 rounded-lg border border-outline-variant/30">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-on-surface-variant">Thẻ #{index + 1}</span>
                        <button onClick={() => setHomeFeatures({...homeFeatures, list: homeFeatures.list.filter((_, i) => i !== index)})} className="text-red-400 hover:text-red-300">
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <input type="text" placeholder="Tiêu đề" className="input-glass" value={item.title} onChange={e => { const newList = [...homeFeatures.list]; newList[index].title = e.target.value; setHomeFeatures({...homeFeatures, list: newList}); }} />
                        <input type="text" placeholder="Icon (Tên Google Font Icon)" className="input-glass" value={item.icon} onChange={e => { const newList = [...homeFeatures.list]; newList[index].icon = e.target.value; setHomeFeatures({...homeFeatures, list: newList}); }} />
                        <input type="text" placeholder="Màu Icon (Tailwind class)" className="input-glass" value={item.color} onChange={e => { const newList = [...homeFeatures.list]; newList[index].color = e.target.value; setHomeFeatures({...homeFeatures, list: newList}); }} />
                        <input type="text" placeholder="Màu Nền (Tailwind class)" className="input-glass" value={item.bgColor} onChange={e => { const newList = [...homeFeatures.list]; newList[index].bgColor = e.target.value; setHomeFeatures({...homeFeatures, list: newList}); }} />
                      </div>
                      <input type="text" placeholder="Mô tả" className="input-glass w-full" value={item.desc} onChange={e => { const newList = [...homeFeatures.list]; newList[index].desc = e.target.value; setHomeFeatures({...homeFeatures, list: newList}); }} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Services Section */}
              <div className="bg-surface/50 border border-outline-variant/30 rounded-xl p-6 space-y-4">
                <h3 className="text-xl font-bold text-on-surface border-b border-outline-variant/30 pb-2">Phần: Dịch vụ cung cấp</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-on-surface">Tiêu đề (Title)</label>
                    <input type="text" className="input-glass w-full" value={homeServices.title} onChange={e => setHomeServices({...homeServices, title: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-on-surface">Mô tả (Description)</label>
                    <input type="text" className="input-glass w-full" value={homeServices.desc} onChange={e => setHomeServices({...homeServices, desc: e.target.value})} />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold text-primary">Danh sách Dịch vụ <a href="https://fonts.google.com/icons?icon.set=Material+Symbols" target="_blank" rel="noreferrer" className="text-sm font-normal text-blue-400 hover:underline ml-2">(Tra cứu mã Icon tại đây)</a></h4>
                    <button onClick={() => setHomeServices({...homeServices, list: [...homeServices.list, { icon: 'star', color: 'text-[#00f2fe]', title: 'Dịch vụ mới', desc: 'Mô tả dịch vụ', glow: 'rgba(6,182,212,0.1)', link: '/dashboard' }]})} className="btn-primary py-1.5 px-3 text-sm">
                      <span className="material-symbols-outlined text-sm mr-1">add</span> Thêm Dịch vụ
                    </button>
                  </div>
                  
                  {homeServices.list.map((item, index) => (
                    <div key={index} className="flex flex-col gap-3 p-4 bg-background/50 rounded-lg border border-outline-variant/30">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-on-surface-variant">Thẻ #{index + 1}</span>
                        <button onClick={() => setHomeServices({...homeServices, list: homeServices.list.filter((_, i) => i !== index)})} className="text-red-400 hover:text-red-300">
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <input type="text" placeholder="Tiêu đề" className="input-glass" value={item.title} onChange={e => { const newList = [...homeServices.list]; newList[index].title = e.target.value; setHomeServices({...homeServices, list: newList}); }} />
                        <input type="text" placeholder="Icon (Google Font)" className="input-glass" value={item.icon} onChange={e => { const newList = [...homeServices.list]; newList[index].icon = e.target.value; setHomeServices({...homeServices, list: newList}); }} />
                        <input type="text" placeholder="Màu Icon (Tailwind/HEX)" className="input-glass" value={item.color} onChange={e => { const newList = [...homeServices.list]; newList[index].color = e.target.value; setHomeServices({...homeServices, list: newList}); }} />
                        <input type="text" placeholder="Màu Glow (rgba)" className="input-glass" value={item.glow} onChange={e => { const newList = [...homeServices.list]; newList[index].glow = e.target.value; setHomeServices({...homeServices, list: newList}); }} />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input type="text" placeholder="Mô tả dịch vụ" className="input-glass w-full" value={item.desc} onChange={e => { const newList = [...homeServices.list]; newList[index].desc = e.target.value; setHomeServices({...homeServices, list: newList}); }} />
                        <input type="text" placeholder="Link chuyển hướng (VD: /dashboard/tiktok)" className="input-glass w-full" value={item.link || ''} onChange={e => { const newList = [...homeServices.list]; newList[index].link = e.target.value; setHomeServices({...homeServices, list: newList}); }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {activeTab !== 'notifications' && (
        <div className="flex justify-start pt-4 border-t border-white/10">
          <button 
            onClick={handleSave}
            className="btn-primary px-6 py-2.5 rounded-full font-body-md font-bold flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">save</span>
            Lưu thay đổi
          </button>
        </div>
        )}
      </div>
    </div>
  );
}
