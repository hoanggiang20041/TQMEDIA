'use client';

import React, { useState, useEffect } from 'react';
import { useRole } from '@/context/RoleContext';

const removeAccents = (str: string) => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
};

const REASONS = [
  'TIEN AN TRUA',
  'TRA TIEN CA PHE',
  'TIEN MUA DO',
  'TRA TIEN AN',
  'TIEN DI CHOI',
  'TRA TIEN NUOC',
  'TIEN MUA SACH'
];

const getBankCode = (name: string) => {
  if (!name) return 'VCB';
  const n = name.toUpperCase();
  if (n.includes('VIETCOM') || n.includes('VCB')) return 'VCB';
  if (n.includes('VIETIN') || n.includes('CTG')) return 'ICB';
  if (n.includes('BIDV')) return 'BIDV';
  if (n.includes('AGRI') || n.includes('VBA')) return 'VBA';
  if (n.includes('TECHCOM') || n.includes('TCB')) return 'TCB';
  if (n.includes('MB')) return 'MB';
  if (n.includes('VPB') || n.includes('VP BANK')) return 'VPB';
  if (n.includes('ACB')) return 'ACB';
  if (n.includes('SHB')) return 'SHB';
  if (n.includes('HDB')) return 'HDB';
  if (n.includes('TPB') || n.includes('TP BANK')) return 'TPB';
  if (n.includes('SACOM') || n.includes('STB')) return 'STB';
  if (n.includes('VIB')) return 'VIB';
  if (n.includes('MSB')) return 'MSB';
  if (n.includes('OCB')) return 'OCB';
  if (n.includes('SEABANK') || n.includes('SSB')) return 'SSB';
  if (n.includes('SCB')) return 'SCB';
  if (n.includes('LPB') || n.includes('LIENVIET')) return 'LPB';
  if (n.includes('EXIM') || n.includes('EIB')) return 'EIB';
  return n.split(' ')[0]; // fallback
};

export default function DepositPage() {
  const { balance, user } = useRole();
  const [copied, setCopied] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [randomReason, setRandomReason] = useState('');
  
  const [activeTab, setActiveTab] = useState('bank');
  const [paymentSettings, setPaymentSettings] = useState({
    bankName: 'MB Bank',
    accountNumber: '',
    accountName: '',
    branch: '',
    bankStatus: 'true',
    momoNumber: '',
    momoName: '',
    momoStatus: 'false',
    depositBonusPercent: '0',
    depositBonusMinAmount: '0'
  });

  // Load random reason and bank details on mount
  useEffect(() => {
    const random = REASONS[Math.floor(Math.random() * REASONS.length)];
    setRandomReason(random);

    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
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
      })
      .catch(err => console.error(err));
  }, []);

  // Keep spaces, but remove special characters and accents
  const formattedName = removeAccents(customerName).toUpperCase().replace(/[^A-Z0-9\s]/g, '').trim();
  const hasName = formattedName.length > 0;
  
  // Lấy 6 ký tự đầu của User ID làm mã nhận diện cho SePay
  const transferCode = user?.id ? user.id.substring(0, 6).toUpperCase() : 'LOADING';
  
  // Nội dung chuyển khoản chuẩn mực và chuyên nghiệp
  const transferContent = hasName ? `${formattedName} NAPTQ${transferCode}` : `NAPTQ${transferCode}`;
  
  const qrUrl = activeTab === 'bank' 
    ? `https://img.vietqr.io/image/${getBankCode(paymentSettings.bankName)}-${paymentSettings.accountNumber}-compact2.png?amount=0&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(paymentSettings.accountName)}`
    : `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`2|99|${paymentSettings.momoNumber}|||0|0|0|${transferContent}`)}`;

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-4xl mx-auto animate-fade-in pb-10">
      
      {/* Header matching user screenshot */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white mb-2">Nạp tiền vào tài khoản</h1>
        <p className="text-sm text-gray-400">
          Quét mã QR hoặc chuyển khoản thủ công để tự động cộng số dư vào ví của bạn.
        </p>
      </div>

      {/* Balance Summary matching user screenshot */}
      <div className="bg-[#0b1325] border border-[#1e293b] rounded-lg p-4 md:p-5 flex items-center gap-4 md:gap-5 w-full lg:w-2/3 mb-4">
        <div className="w-12 h-12 md:w-14 md:h-14 rounded-full border border-gray-600 flex items-center justify-center shrink-0">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-[#0ea5e9]/20 flex items-center justify-center rounded">
            <span className="material-symbols-outlined text-[#0ea5e9] text-[20px] md:text-[24px]">account_balance_wallet</span>
          </div>
        </div>
        <div>
          <div className="text-[10px] md:text-[11px] font-bold text-[#0ea5e9] uppercase tracking-wider mb-1 bg-[#0ea5e9]/10 inline-block px-2 py-0.5 rounded">
            SỐ DƯ HIỆN TẠI
          </div>
          <div className="text-white text-2xl md:text-3xl font-semibold tracking-tight">
            {balance.toLocaleString('vi-VN')}<span className="text-lg md:text-xl text-gray-300 ml-1">đ</span>
          </div>
        </div>
      </div>

      {/* Deposit Bonus Banner */}
      {Number(paymentSettings.depositBonusPercent) > 0 && (
        <div className="bg-gradient-to-r from-orange-500/20 to-orange-400/10 border border-orange-500/30 rounded-xl p-4 md:p-5 flex items-center gap-4 animate-fade-in-up mb-4">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-orange-500/20 rounded-full flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-orange-400 text-[24px]">celebration</span>
          </div>
          <div>
            <h3 className="text-orange-400 font-bold text-sm md:text-base">Khuyến mãi Nạp tiền!</h3>
            <p className="text-orange-300/80 text-xs md:text-sm mt-0.5">
              Tặng ngay <span className="text-orange-400 font-bold text-sm md:text-base">+{paymentSettings.depositBonusPercent}%</span> giá trị nạp
              {Number(paymentSettings.depositBonusMinAmount) > 0 && ` cho giao dịch từ ${Number(paymentSettings.depositBonusMinAmount).toLocaleString('vi-VN')}đ`}! 
              Tiền thưởng sẽ tự động cộng vào số dư ngay khi bạn chuyển khoản thành công.
            </p>
          </div>
        </div>
      )}

      {/* Name Input Section */}
      <div className="glass-panel p-6 border-l-4 border-l-secondary">
        <h2 className="font-heading text-body-lg font-semibold text-on-surface mb-2">1. Thông tin người nạp</h2>
        <p className="text-body-sm text-on-surface-variant mb-4">
          Vui lòng nhập chính xác <strong>Họ và Tên</strong> của bạn.
        </p>
        <div className="relative max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">person</span>
          <input 
            type="text" 
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="VD: Nguyen Van A"
            className="input-glass w-full pl-10 pr-4 py-3 text-on-surface font-body-md focus:border-secondary transition-colors"
          />
        </div>
      </div>

      {/* Conditional Warning */}
      {!hasName && (
        <div className="bg-error/10 border border-error/20 p-4 rounded-lg flex items-start gap-3">
          <span className="material-symbols-outlined text-error">warning</span>
          <p className="text-error font-body-sm pt-0.5">Vui lòng nhập Họ và Tên của bạn ở ô phía trên để hiển thị thông tin chuyển khoản.</p>
        </div>
      )}

      {/* Method Tabs */}
      <div className="flex gap-2">
        <button 
          onClick={() => setActiveTab('bank')}
          className={`flex-1 py-2 md:py-3 px-2 md:px-4 rounded-xl font-semibold text-xs md:text-sm transition-all flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 border-b-2 ${
            activeTab === 'bank' 
              ? 'bg-primary/10 text-primary border-primary shadow-inner' 
              : 'bg-surface-variant/30 text-on-surface-variant border-transparent hover:bg-surface-variant/50'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">account_balance</span>
          Ngân hàng
        </button>
        <button 
          onClick={() => setActiveTab('momo')}
          className={`flex-1 py-2 md:py-3 px-2 md:px-4 rounded-xl font-semibold text-xs md:text-sm transition-all flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 border-b-2 ${
            activeTab === 'momo' 
              ? 'bg-[#d82d8b]/10 text-[#d82d8b] border-[#d82d8b] shadow-inner' 
              : 'bg-surface-variant/30 text-on-surface-variant border-transparent hover:bg-surface-variant/50'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
          Ví Momo
        </button>
      </div>

      {/* Transfer Details - Locked state if no name or if maintenance */}
      {((activeTab === 'bank' && paymentSettings.bankStatus === 'false') || (activeTab === 'momo' && paymentSettings.momoStatus === 'false')) ? (
        <div className="bg-orange-500/10 border border-orange-500/20 p-6 md:p-8 rounded-2xl flex flex-col items-center justify-center text-center gap-4 animate-fade-in">
          <span className="material-symbols-outlined text-[64px] text-orange-400">engineering</span>
          <div>
            <h3 className="text-xl font-bold text-orange-400 mb-2">Hệ thống đang bảo trì phương thức này</h3>
            <p className="text-orange-400/80">Phương thức thanh toán bạn chọn tạm thời không khả dụng. Vui lòng thử phương thức khác hoặc quay lại sau!</p>
          </div>
        </div>
      ) : (
        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 transition-all duration-300 relative ${!hasName ? 'opacity-50 grayscale pointer-events-none select-none' : ''}`}>
        
        {/* Lock Overlay */}
        {!hasName && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/40 backdrop-blur-[2px] rounded-2xl">
            <div className="bg-white/90 p-4 rounded-full shadow-lg border border-gray-200 mb-2">
              <span className="material-symbols-outlined text-[32px] text-gray-500 block">lock</span>
            </div>
            <p className="font-bold text-gray-800 bg-white/90 px-4 py-2 rounded-lg shadow-sm">Nhập Họ Tên để mở khóa nạp tiền</p>
          </div>
        )}
        
        {/* QR Code Section */}
        <div className="glass-panel p-6 md:p-8 flex flex-col items-center justify-center text-center gap-6 border-t-4 border-t-primary h-fit">
          <div>
            <h2 className="font-heading text-body-lg font-semibold text-on-surface">2. Quét mã QR (Tự động)</h2>
            <p className="text-body-sm text-on-surface-variant mt-1">Sử dụng App Ngân hàng để quét mã</p>
          </div>
          
          <div className="bg-white p-4 rounded-2xl shadow-xl w-48 h-48 md:w-64 md:h-64 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 border-4 border-dashed border-primary/20 rounded-2xl pointer-events-none"></div>
            {hasName && (
              <div className="w-full h-full relative p-2">
                <img 
                  src={qrUrl} 
                  alt="QR Code"
                  className="w-full h-full object-contain mix-blend-multiply"
                  crossOrigin="anonymous"
                />
              </div>
            )}
          </div>

          <div className="bg-primary/10 border border-primary/20 text-primary px-4 py-2 rounded-lg font-label-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">bolt</span>
            Xử lý tự động trong vòng 3-5 phút
          </div>
        </div>

        {/* Manual Transfer Section */}
        <div className="flex flex-col gap-6">
          <div className="glass-panel p-6 md:p-8 flex flex-col gap-6">
            <div>
              <h2 className="font-heading text-body-lg font-semibold text-on-surface">Hoặc Chuyển khoản thủ công</h2>
              <p className="text-body-sm text-on-surface-variant mt-1">Sao chép thông tin bên dưới để chuyển khoản</p>
            </div>

            <div className="flex flex-col gap-4">
              {/* Ngân hàng/Ví */}
              <div className="flex flex-col gap-1">
                <label className="text-label-sm text-on-surface-variant uppercase tracking-wider">{activeTab === 'bank' ? 'Ngân hàng' : 'Ví điện tử'}</label>
                <div className="flex justify-between items-center bg-surface-variant/30 px-4 py-3 rounded-lg border border-outline-variant/30">
                  <span className="font-body-md text-on-surface font-semibold">{activeTab === 'bank' ? paymentSettings.bankName : 'MOMO'}</span>
                </div>
              </div>

              {/* Số tài khoản/SĐT */}
              <div className="flex flex-col gap-1">
                <label className="text-label-sm text-on-surface-variant uppercase tracking-wider">{activeTab === 'bank' ? 'Số tài khoản' : 'Số điện thoại'}</label>
                <div className="flex justify-between items-center bg-surface-variant/30 px-4 py-3 rounded-lg border border-outline-variant/30 group">
                  <span className="font-body-lg text-primary font-bold tracking-wider">{activeTab === 'bank' ? paymentSettings.accountNumber : paymentSettings.momoNumber}</span>
                  <button 
                    onClick={() => handleCopy(activeTab === 'bank' ? paymentSettings.accountNumber : paymentSettings.momoNumber, 'acc')}
                    className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[20px]">{copied === 'acc' ? 'check_circle' : 'content_copy'}</span>
                    <span className="text-sm">{copied === 'acc' ? 'Đã chép' : 'Sao chép'}</span>
                  </button>
                </div>
              </div>

              {/* Chủ tài khoản */}
              <div className="flex flex-col gap-1">
                <label className="text-label-sm text-on-surface-variant uppercase tracking-wider">Chủ tài khoản</label>
                <div className="flex justify-between items-center bg-surface-variant/30 px-4 py-3 rounded-lg border border-outline-variant/30">
                  <span className="font-body-md text-on-surface font-semibold">{activeTab === 'bank' ? paymentSettings.accountName : paymentSettings.momoName}</span>
                </div>
              </div>

              {/* Nội dung */}
              <div className="flex flex-col gap-1">
                <label className="text-label-sm text-on-surface-variant uppercase tracking-wider">Nội dung chuyển khoản (Bắt buộc)</label>
                <div className="flex justify-between items-center bg-error/10 px-4 py-3 rounded-lg border border-error/20 group">
                  <span className="font-body-md text-error font-bold break-words">{transferContent}</span>
                  <button 
                    onClick={() => handleCopy(transferContent, 'content')}
                    className="text-error hover:text-error/80 transition-colors flex items-center gap-1 flex-shrink-0 ml-2"
                  >
                    <span className="material-symbols-outlined text-[20px]">{copied === 'content' ? 'check_circle' : 'content_copy'}</span>
                    <span className="text-sm">{copied === 'content' ? 'Đã chép' : 'Sao chép'}</span>
                  </button>
                </div>
              </div>

            </div>
            <div className="mt-2 text-sm text-on-surface-variant flex gap-2 p-3 bg-surface-container-high/50 rounded-lg">
              <span className="material-symbols-outlined text-[20px] text-secondary flex-shrink-0">info</span>
              <p>Vui lòng ghi đúng nội dung chuyển khoản như trên để hệ thống tự động cộng tiền sau 1-3 phút.</p>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
