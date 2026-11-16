export const ROUTES = {
  home: '/',
  login: '/login',
  dashboard: '/dashboard',
  services: '/dashboard/services',
  tiktok: '/dashboard/tiktok',
  facebook: '/dashboard/facebook',
  google: '/dashboard/google',
  instagram: '/dashboard/instagram',
  youtube: '/dashboard/youtube',
  ads_tiktok: '/dashboard/ads/tiktok',
  ads_facebook: '/dashboard/ads/facebook',
  ads_google: '/dashboard/ads/google',
  orders: '/dashboard/orders',
  admin_analytics: '/dashboard/admin/analytics',
  users: '/dashboard/admin/users',
  blog: '/dashboard/blog',
  courses: '/dashboard/courses',
  my_courses: '/dashboard/my-courses',
  resources: '/dashboard/resources',
  profile: '/dashboard/profile',
  contact: '/contact',
  about: '/about',
  terms: '/terms',
  privacy: '/privacy',
  admin_services: '/dashboard/admin/services',
  admin_orders: '/dashboard/admin/orders',
  admin_blog: '/dashboard/admin/blog',
  admin_vouchers: '/dashboard/admin/vouchers',
  admin_settings: '/dashboard/admin/settings',
  admin_courses: '/dashboard/admin/courses',
  admin_enrollments: '/dashboard/admin/enrollments',
  instructor_schedule: '/dashboard/instructor/schedule',
  admin_deposits: '/dashboard/admin/deposits',
  admin_transactions: '/dashboard/admin/transactions',
  deposit: '/dashboard/deposit',
  transactions: '/dashboard/transactions',
  refunds: '/dashboard/refunds',
  admin_agencies: '/dashboard/admin/agencies',
  api_docs: '/dashboard/api-docs',
  notifications: '/dashboard/notifications',
  admin_resources: '/dashboard/admin/resources',
  admin_resource_orders: '/dashboard/admin/resource-orders',
  my_resources: '/dashboard/my-resources',
  admin_supports: '/dashboard/admin/supports',
  upgrade: '/dashboard/upgrade',
  affiliate: '/dashboard/affiliate',
  admin_referrals: '/dashboard/admin/referrals',
  admin_live_chat: '/dashboard/admin/live-chat',
  ktv_orders: '/dashboard/ktv/orders',
} as const

export interface NavItem {
  label: string
  href?: string
  icon?: string
  iconFill?: boolean
  subItems?: NavItem[]
}

export const MENU_FINANCE: NavItem[] = [
  { label: 'Trang chủ', href: ROUTES.dashboard, icon: 'home' },
  { label: 'Nạp tiền', href: ROUTES.deposit, icon: 'account_balance_wallet' },
  {
    label: 'Quản lý Tài chính',
    icon: 'account_balance',
    subItems: [
      { label: 'Lịch sử Luồng tiền', href: ROUTES.transactions, icon: 'history' },
      { label: 'Lịch sử Mua hàng', href: ROUTES.orders, icon: 'receipt_long' },
      { label: 'Yêu cầu Hoàn tiền', href: ROUTES.refunds, icon: 'currency_exchange' },
      { label: 'Hoa hồng giới thiệu', href: ROUTES.affiliate, icon: 'handshake' },
    ],
  },
]

export const MENU_SERVICES: NavItem[] = [
  {
    label: 'Đào tạo (Khóa học)',
    icon: 'school',
    subItems: [
      { label: 'Cửa hàng Khóa học', href: ROUTES.courses, icon: 'storefront' },
      { label: 'Khóa học của tôi', href: ROUTES.my_courses, icon: 'local_library' },
    ],
  },
  {
    label: 'Tài Nguyên Số',
    icon: 'inventory_2',
    subItems: [
      { label: 'Cửa hàng Tài Nguyên', href: ROUTES.resources, icon: 'storefront' },
      { label: 'Tài nguyên đã mua', href: ROUTES.my_resources, icon: 'receipt_long' },
    ],
  },
  {
    label: 'Chạy Quảng Cáo (Ads)',
    icon: 'campaign',
    subItems: [
      { label: 'TikTok Ads', href: ROUTES.ads_tiktok, icon: 'subscriptions' },
      { label: 'Facebook - IG Ads', href: ROUTES.ads_facebook, icon: 'thumb_up' },
      { label: 'Google Ads', href: ROUTES.ads_google, icon: 'search' },
    ],
  },
]

export const MENU_SOCIAL: NavItem[] = [
  {
    label: 'Tăng tương tác',
    icon: 'rocket_launch',
    subItems: [
  {
    label: 'Facebook',
    icon: 'Facebook',
    subItems: [
      { label: 'Tăng like bài viết', href: '/dashboard/facebook?type=Tăng like bài viết' },
      { label: 'Tăng follow Profile & Page', href: '/dashboard/facebook?type=Tăng follow Profile %26 Page' },
      { label: 'Tăng Like Page & Follow page', href: '/dashboard/facebook?type=Tăng Like Page %26 Follow page' },
      { label: 'Tăng thành viên nhóm', href: '/dashboard/facebook?type=Tăng thành viên nhóm' },
      { label: 'Tăng bình luận', href: '/dashboard/facebook?type=Tăng bình luận' },
      { label: 'Tăng view video', href: '/dashboard/facebook?type=Tăng view video' },
      { label: 'Tăng mắt livestream', href: '/dashboard/facebook?type=Tăng mắt livestream' },
      { label: 'Tăng chia sẻ bài viết', href: '/dashboard/facebook?type=Tăng chia sẻ bài viết' },
      { label: 'Tăng review Page', href: '/dashboard/facebook?type=Tăng review Page' },
      { label: 'Tăng like bình luận', href: '/dashboard/facebook?type=Tăng like bình luận' },
      { label: 'Tăng view story', href: '/dashboard/facebook?type=Tăng view story' },
      { label: 'Vip like (Tăng like theo tháng)', href: '/dashboard/facebook?type=Vip like (Tăng like theo tháng)' },
      { label: 'Vip comment (Bình luận theo thán)', href: '/dashboard/facebook?type=Vip comment (Bình luận theo thán)' },
    ],
  },
  {
    label: 'TikTok',
    icon: 'TikTok',
    subItems: [
      { label: 'Tăng tim', href: '/dashboard/tiktok?type=Tăng tim' },
      { label: 'Tăng theo dõi', href: '/dashboard/tiktok?type=Tăng theo dõi' },
      { label: 'Tăng view', href: '/dashboard/tiktok?type=Tăng view' },
      { label: 'Tăng share', href: '/dashboard/tiktok?type=Tăng share' },
      { label: 'Tăng save', href: '/dashboard/tiktok?type=Tăng save' },
      { label: 'Tăng bình luận', href: '/dashboard/tiktok?type=Tăng bình luận' },
      { label: 'Tăng mắt livestream', href: '/dashboard/tiktok?type=Tăng mắt livestream' },
      { label: 'Like tự động', href: '/dashboard/tiktok?type=Like tự động' },
    ],
  },
  {
    label: 'Instagram',
    icon: 'Instagram',
    subItems: [
      { label: 'Tăng like', href: '/dashboard/instagram?type=Tăng like' },
      { label: 'Tăng theo dõi', href: '/dashboard/instagram?type=Tăng theo dõi' },
      { label: 'Tăng view & view story', href: '/dashboard/instagram?type=Tăng view %26 view story' },
      { label: 'Tăng bình luận', href: '/dashboard/instagram?type=Tăng bình luận' },
    ],
  },
  {
    label: 'YouTube',
    icon: 'YouTube',
    subItems: [
      { label: 'Tăng đăng ký kênh', href: '/dashboard/youtube?type=Tăng đăng ký kênh' },
      { label: 'Tăng like', href: '/dashboard/youtube?type=Tăng like' },
      { label: 'Tăng view & livestream', href: '/dashboard/youtube?type=Tăng view %26 livestream' },
      { label: 'Tăng bình luận', href: '/dashboard/youtube?type=Tăng bình luận' },
      { label: 'Tăng share', href: '/dashboard/youtube?type=Tăng share' },
    ],
  },
  {
    label: 'Shopee',
    icon: 'Shopee',
    subItems: [
      { label: 'Tăng theo dõi', href: '/dashboard/shopee?type=Tăng theo dõi' },
      { label: 'Tăng tim', href: '/dashboard/shopee?type=Tăng tim' },
      { label: 'Tăng mắt livestream', href: '/dashboard/shopee?type=Tăng mắt livestream' },
    ],
  },
  {
    label: 'Google',
    icon: 'Google',
    subItems: [
      { label: 'Tăng đánh giá map', href: '/dashboard/google?type=Tăng đánh giá map' },
      { label: 'Xác minh map', href: '/dashboard/google?type=Xác minh map' },
    ],
  },
  {
    label: 'Telegram',
    icon: 'Telegram',
    subItems: [
      { label: 'Tăng mem & subscribe', href: '/dashboard/telegram?type=Tăng mem %26 subscribe' },
      { label: 'Tăng view post & cảm xúc', href: '/dashboard/telegram?type=Tăng view post %26 cảm xúc' },
    ],
  },
  {
    label: 'X-Twitter',
    icon: 'Twitter',
    subItems: [
      { label: 'Tăng tim', href: '/dashboard/x-twitter?type=Tăng tim' },
      { label: 'Tăng theo dõi', href: '/dashboard/x-twitter?type=Tăng theo dõi' },
      { label: 'Tăng retweet', href: '/dashboard/x-twitter?type=Tăng retweet' },
      { label: 'Tăng view', href: '/dashboard/x-twitter?type=Tăng view' },
      { label: 'Tăng bình luận', href: '/dashboard/x-twitter?type=Tăng bình luận' },
    ],
  },
  {
    label: 'Threads',
    icon: 'Threads',
    subItems: [
      { label: 'Tăng like', href: '/dashboard/threads?type=Tăng like' },
      { label: 'Tăng theo dõi', href: '/dashboard/threads?type=Tăng theo dõi' },
      { label: 'Tăng share', href: '/dashboard/threads?type=Tăng share' },
      { label: 'Tăng bình luận', href: '/dashboard/threads?type=Tăng bình luận' },
    ],
  },
  {
    label: 'Lazada',
    icon: 'Lazada',
    subItems: [
      { label: 'Tăng theo dõi', href: '/dashboard/lazada?type=Tăng theo dõi' },
    ],
  }
    ]
  }
]

export const MENU_UTILITIES: NavItem[] = [
  { label: 'Bài viết (Blog)', href: ROUTES.blog, icon: 'article' },
  { label: 'Nâng cấp Đại lý', href: ROUTES.upgrade, icon: 'workspace_premium' },
  { label: 'Hỗ trợ & Thông báo', href: ROUTES.notifications, icon: 'support_agent' },
  {
    label: 'Khu vực Admin',
    icon: 'admin_panel_settings',
    subItems: [
      { label: 'Thành viên', href: ROUTES.users, icon: 'group' },
      { label: 'Thống kê Doanh thu', href: ROUTES.admin_analytics, icon: 'insights' },
      { label: 'Tài chính & Dòng tiền', href: ROUTES.admin_transactions, icon: 'account_balance' },
      { label: 'Quản lý Đơn hàng', href: ROUTES.admin_orders, icon: 'shopping_cart_checkout' },
      { label: 'Quản lý Đơn (KTV)', href: ROUTES.ktv_orders, icon: 'fact_check' },
      { label: 'Dịch vụ & Giá', href: ROUTES.admin_services, icon: 'price_change' },
      { label: 'Mã Giảm Giá', href: ROUTES.admin_vouchers, icon: 'local_activity' },
      { label: 'Khóa học', href: ROUTES.admin_courses, icon: 'play_lesson' },
      { label: 'Học viên', href: ROUTES.admin_enrollments, icon: 'assignment_ind' },
      { label: 'Tài nguyên', href: ROUTES.admin_resources, icon: 'inventory_2' },
      { label: 'Đơn hàng Sản phẩm', href: ROUTES.admin_resource_orders, icon: 'receipt' },
      { label: 'Bài viết (Blog)', href: ROUTES.admin_blog, icon: 'edit_document' },
      { label: 'Hệ thống Đại lý', href: ROUTES.admin_agencies, icon: 'handshake' },
      { label: 'Quản lý Hoa hồng', href: ROUTES.admin_referrals, icon: 'diversity_3' },
      { label: 'Yêu cầu hỗ trợ', href: ROUTES.admin_supports, icon: 'contact_support' },
      { label: 'Live Chat CSKH', href: ROUTES.admin_live_chat, icon: 'forum' },
      { label: 'Cài đặt Website', href: ROUTES.admin_settings, icon: 'settings_applications' },
    ],
  },
]

export const MENU_INSTRUCTOR: NavItem[] = [
  {
    label: 'Khu vực Giảng viên',
    icon: 'school',
    subItems: [
      { label: 'Lịch dạy Hôm nay', href: ROUTES.instructor_schedule, icon: 'event_available' },
      { label: 'Học viên', href: ROUTES.admin_enrollments, icon: 'assignment_ind' },
    ],
  },
]

export const SIDEBAR_FOOTER_ITEMS: NavItem[] = [
  { label: 'Cài đặt', href: ROUTES.profile, icon: 'settings' },
  { label: 'Đăng xuất', href: ROUTES.login, icon: 'logout' },
]

export const TOP_NAV_ITEMS: NavItem[] = [
  { label: 'Trang chủ', href: ROUTES.home, icon: 'home' },
  { label: 'Dịch vụ', href: ROUTES.services, icon: 'apps' },
  { label: 'Liên hệ', href: ROUTES.contact, icon: 'contact_support' },
]

export const FOOTER_LINKS = [
  { label: 'Về chúng tôi', href: ROUTES.about },
  { label: 'Điều khoản', href: ROUTES.terms },
  { label: 'Bảo mật', href: ROUTES.privacy },
  { label: 'Liên hệ', href: ROUTES.contact },
]
