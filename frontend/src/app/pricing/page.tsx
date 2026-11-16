'use client';

import TopNavbar from '@/components/layout/TopNavbar';
import Footer from '@/components/layout/Footer';
import Link from 'next/link';
import { useRole } from '@/context/RoleContext';
import { useEffect, useState } from 'react';

const pricingRanks = [
  { role: 'GUEST', name: 'Khách Hàng', discount: '0%', requirement: 'Mặc định khi đăng ký', color: 'text-gray-500 dark:text-gray-400', borderColor: 'border-gray-400/50', activeBg: 'bg-gray-500' },
  { role: 'DAI_LY_1', name: 'Đại lý Cấp 1', discount: '15%', requirement: 'Tổng nạp 2 triệu', color: 'text-cyan-500 dark:text-cyan-400', borderColor: 'border-cyan-400/50', activeBg: 'bg-cyan-500' },
  { role: 'DAI_LY_2', name: 'Đại lý Cấp 2', discount: '20%', requirement: 'Tổng nạp 10 triệu', color: 'text-teal-500 dark:text-teal-400', borderColor: 'border-teal-400/50', activeBg: 'bg-teal-500' },
  { role: 'DAI_LY_3', name: 'Đại lý Cấp 3', discount: '25%', requirement: 'Tổng nạp 30 triệu', color: 'text-green-500 dark:text-green-400', borderColor: 'border-green-400/50', activeBg: 'bg-green-500' },
  { role: 'DAI_LY_4', name: 'Đại lý Cấp 4', discount: '30%', requirement: 'Tổng nạp 100 triệu', color: 'text-yellow-500 dark:text-yellow-400', borderColor: 'border-yellow-400/50', activeBg: 'bg-yellow-500' },
];

const faqs = [
  {
    question: 'Làm sao để được thăng cấp?',
    answer: 'Hệ thống tự động cộng dồn số tiền bạn đã nạp. Khi tổng nạp đạt các mốc quy định (ví dụ: 2 triệu, 10 triệu), tài khoản của bạn sẽ tự động thăng cấp và áp dụng mức chiết khấu mới trọn đời.',
  },
  {
    question: 'Tôi có bị tụt cấp nếu ngừng sử dụng dịch vụ không?',
    answer: 'Không, cấp bậc của bạn là vĩnh viễn! Chúng tôi chỉ tính tổng số tiền bạn đã nạp từ trước đến nay, và không bao giờ hạ cấp hay thu hồi chiết khấu của bạn.',
  },
  {
    question: 'Làm sao để biết tôi đang ở cấp độ nào?',
    answer: 'Bạn có thể xem cấp độ hiện tại của mình tại trang Cá nhân hoặc trên thanh điều hướng khi đã đăng nhập. Bảng trên cũng sẽ tự động đánh dấu cấp bậc hiện tại của bạn.',
  },
  {
    question: 'Hình thức nạp tiền như thế nào?',
    answer: 'Chúng tôi hỗ trợ nạp tiền tự động 24/7 qua chuyển khoản Ngân hàng (MSB). Hệ thống sẽ tự động cộng tiền và cập nhật cấp bậc của bạn trong vòng vài giây.',
  },
];

export default function PricingPage() {
  const { role } = useRole();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-surface mesh-bg">
      <TopNavbar />
      
      <main className="flex-grow pt-32 pb-24">
        {/* Hero Section */}
        <section className="text-center px-4 mb-12">
          <h1 className="font-display-lg text-primary mb-6">Chính sách Đại lý & Chiết khấu</h1>
          <p className="font-body-lg text-on-surface-variant max-w-2xl mx-auto">
            Hệ thống cấp bậc ưu đãi linh hoạt. Càng nạp nhiều, chiết khấu càng sâu!
          </p>
        </section>

        {/* Admin Notification */}
        {mounted && role === 'ADMIN' && (
          <div className="max-w-[1200px] mx-auto px-4 mb-8">
            <div className="bg-primary/10 border border-primary/30 text-primary px-6 py-3 rounded-lg text-center font-medium shadow-sm">
              Bạn đang đăng nhập bằng tài khoản Quản trị viên (Admin). Bảng bên dưới hiển thị góc nhìn của người dùng.
            </div>
          </div>
        )}

        {/* Pricing Grid */}
        <section className="max-w-[1200px] mx-auto px-4 mb-24">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 items-stretch">
            {pricingRanks.map((plan, index) => {
              const isCurrentRank = mounted && role === plan.role;
              
              return (
                <div 
                  key={index} 
                  className={`glass-card p-6 rounded-2xl relative flex flex-col transition-all duration-300 ${
                    isCurrentRank 
                      ? `ring-4 ring-primary/40 shadow-2xl scale-105 z-10 bg-surface dark:bg-surface-variant` 
                      : 'border border-outline-variant/30 shadow-sm hover:shadow-md hover:-translate-y-1 bg-surface/50 dark:bg-surface/10'
                  }`}
                >
                  {isCurrentRank && (
                    <div className={`absolute -top-4 left-1/2 -translate-x-1/2 ${plan.activeBg} text-white px-4 py-1.5 rounded-full text-xs font-bold tracking-widest shadow-lg whitespace-nowrap uppercase border-2 border-background`}>
                      Cấp Của Bạn
                    </div>
                  )}
                  
                  <div className="mb-4 flex-grow text-center mt-2">
                    <h3 className={`text-xl font-bold mb-2 ${plan.color}`}>{plan.name}</h3>
                    <p className="text-on-surface-variant text-[13px] h-10 flex items-center justify-center font-medium leading-tight">
                      {plan.requirement}
                    </p>
                  </div>
                  
                  <div className={`text-center mb-6 py-5 border-y ${isCurrentRank ? 'border-primary/20' : 'border-outline-variant/30'}`}>
                    <p className="text-sm text-on-surface-variant font-medium mb-1">Chiết khấu</p>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className={`text-4xl font-black ${plan.color}`}>{plan.discount}</span>
                    </div>
                  </div>
                  
                  <Link href="/dashboard/deposit" className="w-full mt-auto">
                    <button 
                      className={`w-full py-3 rounded-xl text-sm font-bold transition-all shadow-sm ${
                        isCurrentRank 
                          ? `${plan.activeBg} text-white hover:brightness-110 shadow-md` 
                          : 'bg-surface-variant/50 text-on-surface hover:bg-surface-variant border border-outline-variant/30'
                      }`}
                    >
                      {isCurrentRank ? 'Nạp Thêm Tiền' : 'Chi tiết'}
                    </button>
                  </Link>
                </div>
              );
            })}
          </div>
        </section>

        {/* FAQ Section */}
        <section className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="font-headline-md mb-4 text-primary">Câu hỏi thường gặp</h2>
          </div>
          
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="glass-panel p-6 rounded-xl border border-outline-variant/30">
                <h3 className="text-lg font-medium mb-3 flex items-center justify-between text-on-surface">
                  {faq.question}
                </h3>
                <p className="text-on-surface-variant leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
