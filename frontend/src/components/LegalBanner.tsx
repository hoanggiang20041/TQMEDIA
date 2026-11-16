'use client';
import React from 'react';
import { usePathname } from 'next/navigation';

export default function LegalBanner({ isGlobal = false }: { isGlobal?: boolean }) {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 w-full z-[45] pointer-events-auto">
      <div className="bg-[#1C1A14] border-t-[2px] border-[#EAB308] shadow-[0_-5px_15px_rgba(0,0,0,0.3)] w-full">
        <div className="max-w-[1400px] mx-auto p-1.5 sm:p-2 relative flex items-start sm:items-center gap-1.5 sm:gap-2 w-full">
          <div className="text-blue-500 shrink-0 mt-[1px] sm:mt-0">
            <span className="material-symbols-outlined fill-current text-[14px] sm:text-[16px]">security</span>
          </div>

          <div className="flex-1 text-[9.5px] sm:text-[11px] md:text-[12px] leading-tight text-[#D1D5DB]">
            <strong className="font-bold text-[#FDE047]">TUÂN THỦ PHÁP LUẬT 2026:</strong>{' '}
            Nghiêm cấm mọi hành vi lừa đảo, giả mạo, vi phạm <strong className="font-bold text-[#FDE047]">NĐ 147/2024/NĐ-CP</strong> & <strong className="font-bold text-[#FDE047]">Luật ANM</strong>.{' '}
            <span className="text-[#9CA3AF]">Hệ thống tự động ghi nhận IP/giao dịch để cung cấp cho Công an. Người vi phạm tự chịu trách nhiệm trước pháp luật!</span>
          </div>
        </div>
      </div>
    </div>
  );
}
