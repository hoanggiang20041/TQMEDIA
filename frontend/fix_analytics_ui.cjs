const fs = require('fs');
let content = fs.readFileSync('d:/TQMEDIA/frontend/src/app/dashboard/admin/analytics/page.tsx', 'utf8');

// Normalize line endings
content = content.replace(/\r\n/g, '\n');

// 1. Add totalProfit to initial state
content = content.replace(
  /totalIncome: 0,\n\s*totalUsers: 0,/,
  `totalIncome: 0,\n    totalProfit: 0,\n    totalUsers: 0,`
);

// 2. Add totalProfit to topStats
const topStatsOriginal = `  const topStats = [
    { label: 'Tổng doanh thu (Tổng khách nạp)', value: fmt(stats.totalDeposited), trend: trends.depositTrend, isPositive: !trends.depositTrend.startsWith('-'), icon: 'savings' },
    { label: 'Thu nhập (Khách đã tiêu)', value: fmt(stats.totalIncome), trend: trends.incomeTrend, isPositive: !trends.incomeTrend.startsWith('-'), icon: 'monitoring' },
    { label: 'Tổng thành viên', value: stats.totalUsers.toString(), trend: trends.usersTrend, isPositive: !trends.usersTrend.startsWith('-'), icon: 'group' },
    { label: 'Số dư người dùng', value: fmt(stats.totalBalance), trend: 'Theo thời gian thực', isPositive: true, icon: 'account_balance_wallet' },
  ];`;

const topStatsNew = `  const topStats = [
    { label: 'Tổng doanh thu (Tổng khách nạp)', value: fmt(stats.totalDeposited), trend: trends.depositTrend, isPositive: !trends.depositTrend.startsWith('-'), icon: 'savings' },
    { label: 'Thu nhập (Khách đã tiêu)', value: fmt(stats.totalIncome), trend: trends.incomeTrend, isPositive: !trends.incomeTrend.startsWith('-'), icon: 'monitoring' },
    { label: 'Tổng lợi nhuận', value: fmt(stats.totalProfit || 0), trend: trends.incomeTrend, isPositive: !trends.incomeTrend.startsWith('-'), icon: 'payments', customColor: 'text-green-400' },
    { label: 'Tổng thành viên', value: stats.totalUsers.toString(), trend: trends.usersTrend, isPositive: !trends.usersTrend.startsWith('-'), icon: 'group' },
    { label: 'Số dư người dùng', value: fmt(stats.totalBalance), trend: 'Theo thời gian thực', isPositive: true, icon: 'account_balance_wallet' },
  ];`;

content = content.replace(
  /const topStats = \[\n\s*\{ label: 'Tổng doanh thu.*?account_balance_wallet' \},\n\s*\];/s,
  topStatsNew
);

// 3. Render customColor in UI (if exists)
content = content.replace(
  /<div className="w-12 h-12 rounded-full bg-primary\/20 flex items-center justify-center text-primary">/,
  `<div className={\`w-12 h-12 rounded-full \${stat.customColor ? stat.customColor.replace('text-', 'bg-').replace('400', '400/20') + ' ' + stat.customColor : 'bg-primary/20 text-primary'} flex items-center justify-center\`}>`
);

fs.writeFileSync('d:/TQMEDIA/frontend/src/app/dashboard/admin/analytics/page.tsx', content, 'utf8');
console.log('Done!');
