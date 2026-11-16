'use client';
import React, { useState, useEffect } from 'react';

const names = ['Nguyễn T***', 'Trần H***', 'Lê V***', 'Phạm M***', 'Hoàng T***', 'Đặng Q***', 'Bùi X***', 'Đỗ Y***', 'Vũ K***', 'Ngô P***', 'Dương Q***', 'Lý T***', 'Phan B***'];
const actionGenerators = [
  () => `vừa tạo đơn Tăng Like Facebook (#ORD-${Math.floor(1000 + Math.random() * 9000)})`,
  () => `vừa nạp thành công 100.000đ (#TRX-${Date.now().toString().slice(-10)})`,
  () => `vừa tạo đơn Tăng Follow TikTok (#ORD-${Math.floor(1000 + Math.random() * 9000)})`,
  () => `vừa đăng ký tài khoản mới`,
  () => `vừa nạp thành công 50.000đ (#TRX-${Date.now().toString().slice(-10)})`,
  () => `vừa tạo đơn Tăng View YouTube (#ORD-${Math.floor(1000 + Math.random() * 9000)})`,
  () => `vừa nạp thành công 200.000đ (#TRX-${Date.now().toString().slice(-10)})`,
  () => `vừa tạo đơn Tăng Member Telegram (#ORD-${Math.floor(1000 + Math.random() * 9000)})`,
  () => `vừa tạo đơn Tăng Like Bài Viết Instagram (#ORD-${Math.floor(1000 + Math.random() * 9000)})`,
  () => `vừa nạp thành công 500.000đ (#TRX-${Date.now().toString().slice(-10)})`
];

export default function SocialProofPopup() {
  const [visible, setVisible] = useState(false);
  const [data, setData] = useState({ name: '', action: '', time: '' });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let timeoutId: NodeJS.Timeout;
    let hideTimeoutId: NodeJS.Timeout;

    const showPopup = () => {
      const name = names[Math.floor(Math.random() * names.length)];
      const actionGenerator = actionGenerators[Math.floor(Math.random() * actionGenerators.length)];
      const action = actionGenerator();
      const time = Math.floor(Math.random() * 59) + 1 + ' giây trước';
      
      setData({ name, action, time });
      setVisible(true);

      hideTimeoutId = setTimeout(() => {
        setVisible(false);
        const nextDelay = Math.floor(Math.random() * (10 * 60 * 1000 - 1 * 60 * 1000 + 1)) + 1 * 60 * 1000;
        timeoutId = setTimeout(showPopup, nextDelay);
      }, 5000); // Hiển thị 5 giây
    };

    // Lần đầu hiện sau 15 - 30 giây
    const initialDelay = Math.floor(Math.random() * 15000) + 15000;
    timeoutId = setTimeout(showPopup, initialDelay);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(hideTimeoutId);
    };
  }, []);

  if (!mounted) return null;

  return (
    <div 
      className={`fixed bottom-[140px] left-4 md:bottom-24 md:left-6 z-[9998] transition-all duration-500 ease-in-out pointer-events-none ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
    >
      <div className="bg-surface/95 backdrop-blur-xl border border-outline-variant/30 rounded-2xl p-3 shadow-2xl flex items-center gap-3 max-w-[260px] md:max-w-[300px] w-full relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -inset-2 bg-gradient-to-r from-primary/10 to-secondary/10 opacity-50 blur-xl"></div>
        
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary p-0.5 shrink-0 relative z-10">
          <div className="w-full h-full bg-surface rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-transparent bg-clip-text bg-gradient-to-br from-primary to-secondary text-[20px]">person</span>
          </div>
        </div>
        
        <div className="flex-1 min-w-0 relative z-10">
          <div className="text-[13px] md:text-sm font-bold text-on-surface truncate">{data.name}</div>
          <div className="text-[11px] md:text-xs text-on-surface-variant truncate">{data.action}</div>
          <div className="text-[10px] text-primary mt-0.5 font-medium">{data.time}</div>
        </div>
      </div>
    </div>
  );
}
