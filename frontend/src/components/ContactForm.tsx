'use client';

import React, { useState } from 'react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

export default function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      subject: formData.get('subject'),
      message: formData.get('message'),
    };

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();

      if (res.ok) {
        MySwal.fire({
          icon: 'success',
          title: 'Đã gửi thành công!',
          text: 'Chúng tôi sẽ liên hệ lại với bạn trong thời gian sớm nhất.'
        });
        (e.target as HTMLFormElement).reset();
      } else {
        MySwal.fire({
          icon: 'error',
          title: 'Lỗi',
          text: result.error || 'Có lỗi xảy ra khi gửi tin nhắn.'
        });
      }
    } catch (err) {
      MySwal.fire({
        icon: 'error',
        title: 'Lỗi kết nối',
        text: 'Vui lòng kiểm tra lại kết nối mạng.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-surface border border-outline-variant/30 backdrop-blur-xl p-8 rounded-2xl h-full relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[50px] rounded-full pointer-events-none"></div>
      <h2 className="text-2xl font-bold text-on-surface mb-6">Gửi tin nhắn cho chúng tôi</h2>
      
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="name" className="block text-sm font-semibold text-on-surface-variant mb-2">Họ và tên</label>
          <input 
            type="text" 
            id="name" 
            name="name"
            required
            placeholder="Nhập tên của bạn" 
            className="w-full input-glass px-4 py-3 rounded-lg text-on-surface text-base focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>
        
        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-on-surface-variant mb-2">Email</label>
          <input 
            type="email" 
            id="email" 
            name="email"
            required
            placeholder="example@gmail.com" 
            className="w-full input-glass px-4 py-3 rounded-lg text-on-surface text-base focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-semibold text-on-surface-variant mb-2">Số điện thoại (Tuỳ chọn)</label>
          <input 
            type="tel" 
            id="phone" 
            name="phone"
            placeholder="0912345678" 
            className="w-full input-glass px-4 py-3 rounded-lg text-on-surface text-base focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>
        
        <div>
          <label htmlFor="subject" className="block text-sm font-semibold text-on-surface-variant mb-2">Chủ đề</label>
          <select 
            id="subject" 
            name="subject"
            className="w-full input-glass px-4 py-3 rounded-lg text-on-surface text-base focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none"
          >
            <option value="Hỗ trợ kỹ thuật" className="bg-surface text-on-surface">Hỗ trợ kỹ thuật</option>
            <option value="Tư vấn dịch vụ" className="bg-surface text-on-surface">Tư vấn dịch vụ</option>
            <option value="Thanh toán & Hóa đơn" className="bg-surface text-on-surface">Thanh toán & Hóa đơn</option>
            <option value="Khác" className="bg-surface text-on-surface">Khác</option>
          </select>
        </div>
        
        <div>
          <label htmlFor="message" className="block text-sm font-semibold text-on-surface-variant mb-2">Nội dung</label>
          <textarea 
            id="message" 
            name="message"
            required
            rows={5}
            placeholder="Nhập nội dung tin nhắn..." 
            className="w-full input-glass px-4 py-3 rounded-lg text-on-surface text-base focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
          ></textarea>
        </div>
        
        <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3 rounded-lg flex items-center justify-center gap-2 group mt-4">
          <span className="text-base font-bold text-on-surface">{isSubmitting ? 'Đang gửi...' : 'Gửi tin nhắn'}</span>
          {!isSubmitting && <span className="material-symbols-outlined text-[20px] text-on-surface group-hover:translate-x-1 transition-transform">send</span>}
        </button>
      </form>
    </div>
  );
}
