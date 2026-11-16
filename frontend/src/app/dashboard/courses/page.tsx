'use client';

import React, { useState } from 'react';

import { useCourses } from '@/hooks/useCourses';
import { useRole } from '@/context/RoleContext';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
const MySwal = withReactContent(Swal);

export default function CoursesStorePage() {
  const { courses, buyCourse, isLoaded, purchasedCourseIds } = useCourses();
  const { balance, deductBalance, getDiscountFor } = useRole();
  const router = useRouter();
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [confirmPurchaseCourse, setConfirmPurchaseCourse] = useState<any>(null);
  const [successPurchaseCourse, setSuccessPurchaseCourse] = useState<any>(null);
  const [demoState, setDemoState] = useState<'idle' | 'playing' | 'finished'>('idle');

  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<any>(null);
  const [voucherError, setVoucherError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isLoaded) return null;

  const activeCourses = courses.filter(c => c.status === 'active');
  const combos = activeCourses.filter(c => c.type === 'combo');
  const singles = activeCourses.filter(c => c.type === 'single');

  const getEffectiveStudents = (course: any) => {
    return course?.realStudentCount || 0;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const getYoutubeEmbedUrl = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}?start=0&end=15&controls=0&rel=0&disablekb=1` : null;
  };

  const handlePlayDemo = () => {
    if (demoState === 'finished') return;
    setDemoState('playing');
    setTimeout(() => {
      setDemoState('finished');
    }, 15000); // Strictly stop after 15 seconds
  };

  const handleOpenModal = (course: any) => {
    setSelectedCourse(course);
    setDemoState('idle');
  };

  const handleCloseModal = () => {
    setSelectedCourse(null);
    setDemoState('idle');
  };

  const resetVoucher = () => {
    setVoucherCode('');
    setAppliedVoucher(null);
    setVoucherError('');
  };

  const handleBuy = async (e: React.MouseEvent, course: any) => {
    e.stopPropagation();
    if (purchasedCourseIds.has(course.id)) {
      MySwal.fire({ icon: 'info', title: 'Thông báo', text: 'Bạn đã sở hữu khóa học này rồi!' })
      return;
    }

    resetVoucher();
    setConfirmPurchaseCourse(course);
  };

  const handleApplyVoucher = async () => {
    setVoucherError('');
    if (!voucherCode) return;
    try {
      const res = await fetch('/api/vouchers/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('tq_token')}` },
        body: JSON.stringify({ code: voucherCode, orderTotal: confirmPurchaseCourse.salePrice, applicableType: 'COURSES', itemId: confirmPurchaseCourse.id })
      });
      const data = await res.json();
      if (data.success) {
        setAppliedVoucher({ ...data.voucher, discountAmount: data.discountAmount });
      } else {
        setVoucherError(data.error);
        setAppliedVoucher(null);
      }
    } catch (err) {
      setVoucherError('Lỗi kết nối.');
    }
  };

  const executePurchase = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    if (!confirmPurchaseCourse) return;
    const course = confirmPurchaseCourse;
    
    const basePrice = course.salePrice * (1 - getDiscountFor('COURSE', course.id)/100);
      const finalPrice = Math.max(0, basePrice - (appliedVoucher?.discountAmount || 0));
    
    if (balance < finalPrice) {
      const __confirmObj = await MySwal.fire({ title: 'Xác nhận', text: `Số dư không đủ! Cần thêm ${formatPrice(finalPrice - balance)} để thanh toán. Bạn có muốn nạp thêm tiền?`, icon: 'warning', showCancelButton: true, confirmButtonText: 'Đồng ý', cancelButtonText: 'Hủy' });
      if (__confirmObj.isConfirmed) {
        setConfirmPurchaseCourse(null);
        router.push('/dashboard/deposit');
      }
      return;
    }
    
    // First, ask backend to enroll
    const success = await buyCourse(course.id, appliedVoucher?.code, appliedVoucher?.discountAmount);
    setIsSubmitting(false);
    if (success) {
      const basePrice = course.salePrice * (1 - getDiscountFor('COURSE', course.id)/100);
    const finalPrice = Math.max(0, basePrice - (appliedVoucher?.discountAmount || 0));
      // Deduct local balance to match backend (already updated)
      deductBalance(finalPrice, `Thanh toán mua Khóa học: ${course.title}`);
      setConfirmPurchaseCourse(null);
      setSuccessPurchaseCourse(course);
      if (selectedCourse) {
        setSelectedCourse(null);
      }
    }
  };

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end">
        <div>
          <h1 className="text-2xl md:text-display-sm font-display-lg text-on-surface">Cửa hàng Khóa học</h1>
          <p className="text-on-surface-variant font-body-md mt-2">
            Nâng cấp kỹ năng với các khóa học và lộ trình được biên soạn chuẩn chuyên gia.
          </p>
        </div>
      </div>

      {/* Hero Banner (Feature Course) */}
      {activeCourses.length > 0 && (
        <div className="relative glass-card rounded-3xl overflow-hidden mb-12 border border-outline-variant/30 shadow-2xl group cursor-pointer" onClick={() => handleOpenModal(activeCourses[0])}>
          <div className="absolute inset-0 bg-gradient-to-r from-surface via-surface/90 to-transparent z-10" />
          <img 
            src={activeCourses[0].thumbnail}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-700 text-transparent"
          />
          <div className="relative z-20 p-4 sm:p-6 lg:p-12 flex flex-col md:flex-row items-center gap-6 md:gap-8">
            <div className="flex-1">
              <div className="flex flex-wrap gap-1.5 sm:gap-3 mb-4 md:mb-6">
                <span className="glass-panel px-2 py-1 md:px-3 md:py-1.5 rounded-full text-[10px] md:text-xs font-medium text-tertiary border border-tertiary/30 flex items-center gap-1 backdrop-blur-md">
                  <span className="material-symbols-outlined text-[14px] md:text-[16px]">verified</span>
                  Người hướng dẫn thực chiến
                </span>
                <span className="glass-panel px-2 py-1 md:px-3 md:py-1.5 rounded-full text-[10px] md:text-xs font-medium text-primary border border-primary/30 flex items-center gap-1 backdrop-blur-md">
                  <span className="material-symbols-outlined text-[14px] md:text-[16px]">update</span>
                  Cập nhật 2026
                </span>
              </div>
              <h2 className="text-xl md:text-display-sm lg:text-display-md font-display-lg text-on-surface mb-2 md:mb-4 leading-tight">
                {activeCourses[0].title}
              </h2>
              <p className="text-on-surface-variant text-xs md:text-body-lg max-w-xl mb-6 md:mb-8 leading-relaxed line-clamp-2 md:line-clamp-3">
                {activeCourses[0].description}
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 w-full">
                <button onClick={(e) => handleBuy(e, activeCourses[0])} className="btn-primary rounded-xl w-full sm:w-auto px-3 sm:px-6 md:px-8 py-2 md:py-3.5 font-bold flex items-center justify-center gap-1 md:gap-2 hover:scale-105 transition-all duration-300 shadow-[0_0_20px_rgba(6,182,212,0.4)] text-xs md:text-base">
                  <span className="material-symbols-outlined text-[16px] md:text-[24px]">shopping_cart</span>
                  Đăng ký ngay - {formatPrice(activeCourses[0].salePrice * (1 - getDiscountFor('COURSE', activeCourses[0].id)/100))}
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleOpenModal(activeCourses[0]); }} style={{ color: 'var(--color-on-surface)' }} className="glass-panel rounded-xl w-full sm:w-auto px-3 sm:px-6 py-2 md:py-3.5 font-semibold hover:bg-surface-variant transition-colors flex items-center justify-center gap-1 md:gap-2 border border-outline-variant/50 backdrop-blur-md text-xs md:text-base">
                  <span className="material-symbols-outlined text-[16px] md:text-[24px]">smart_display</span>
                  Xem lộ trình & Demo
                </button>
              </div>
            </div>
            
            <div className="hidden lg:flex w-full md:w-[320px] shrink-0 flex-col gap-3">
              <div className="glass-panel p-4 rounded-2xl border border-outline-variant/30 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">group</span>
                </div>
                <div>
                  <div className="text-xl font-bold text-on-surface">{activeCourses[0].students}+</div>
                  <div className="text-sm text-on-surface-variant">Học viên tin tưởng</div>
                </div>
              </div>
              <div className="glass-panel p-4 rounded-2xl border border-outline-variant/30 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-tertiary/20 flex items-center justify-center text-tertiary">
                  <span className="material-symbols-outlined">star</span>
                </div>
                <div>
                  <div className="text-xl font-bold text-on-surface">{activeCourses[0].rating} / 5</div>
                  <div className="text-sm text-on-surface-variant">Đánh giá trung bình</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Combos Section */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-headline-sm font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-tertiary text-3xl">workspace_premium</span>
            Combo Siêu Tiết Kiệm
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-2 gap-6">
          {combos.map((combo) => (
            <div key={combo.id} className="glass-card rounded-3xl overflow-hidden group border border-outline-variant/30 hover:border-tertiary/50 transition-all duration-300 shadow-lg hover:shadow-[0_0_30px_rgba(255,183,132,0.15)] flex flex-col cursor-pointer" onClick={() => handleOpenModal(combo)}>
              <div className="relative h-56 bg-surface-container overflow-hidden">
                <img
                  src={combo.thumbnail}
                  alt={combo.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/20 to-transparent" />
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-lg !bg-white dark:!bg-slate-800 border border-outline-variant/30 ${combo.tagColor}`}>
                    {combo.tag}
                  </span>
                </div>
                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                  <div className="flex flex-col">
                    <span className="text-on-surface-variant line-through text-sm">{formatPrice(combo.originalPrice)}</span>
                    <span className="text-tertiary font-display-md text-2xl font-bold">{formatPrice(combo.salePrice * (1 - getDiscountFor('COURSE', combo.id)/100))}</span>
                  </div>
                  <div className="flex items-center gap-1 text-amber-400 bg-black/40 px-2 py-1 rounded backdrop-blur-sm">
                    <span className="material-symbols-outlined text-[16px] fill-current" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    <span className="text-sm font-bold">{combo.rating}</span>
                  </div>
                </div>
              </div>
              <div className="p-4 md:p-6 flex flex-col flex-1 gap-4">
                <h3 className="text-base md:text-headline-sm font-bold text-on-surface group-hover:text-tertiary transition-colors">
                  {combo.title}
                </h3>
                <p className="text-on-surface-variant text-sm line-clamp-2">
                  {combo.description}
                </p>
                <div className="flex items-center gap-4 text-sm text-on-surface-variant mt-2 border-t border-outline-variant/30 pt-4">
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[18px]">collections_bookmark</span>
                    <span>{combo.curriculum?.length || 0} khóa học</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[18px]">group</span>
                    <span>{getEffectiveStudents(combo)} HV</span>
                  </div>
                </div>
                <div className="mt-auto grid grid-cols-2 gap-2 sm:gap-3 pt-2">
                  <button onClick={(e) => { e.stopPropagation(); handleOpenModal(combo); }} style={{ color: 'var(--color-on-surface)' }} className="glass-panel py-2 md:py-3 rounded-xl font-semibold hover:bg-surface-variant transition-colors border border-outline-variant/50 flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm md:text-base">
                    <span className="material-symbols-outlined text-[16px] sm:text-[20px]">menu_book</span>
                    Lộ trình
                  </button>
                  {purchasedCourseIds.has(combo.id) ? (
                  <button disabled className="bg-surface-variant/50 text-on-surface-variant py-2 md:py-3 rounded-xl font-bold flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm md:text-base text-center leading-tight cursor-not-allowed border border-outline-variant/30">
                    <span className="material-symbols-outlined text-[16px] sm:text-[20px]">check_circle</span>
                    Đã sở hữu
                  </button>
                ) : (
                  <button onClick={(e) => handleBuy(e, combo)} className="bg-tertiary hover:bg-tertiary/90 text-surface py-2 md:py-3 rounded-xl font-bold flex items-center justify-center gap-1 sm:gap-2 transition-colors text-xs sm:text-sm md:text-base text-center leading-tight">
                    <span className="material-symbols-outlined text-[16px] sm:text-[20px]">shopping_cart</span>
                    Đăng ký<span className="hidden sm:inline"> Combo</span>
                  </button>
                )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Individual Courses Section */}
      <div className="mb-12">
        <h2 className="text-headline-sm font-bold text-on-surface mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-3xl">play_lesson</span>
          Khóa học Chuyên sâu
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {singles.map((course) => (
            <div key={course.id} className="glass-card rounded-3xl overflow-hidden group border border-outline-variant/30 hover:border-primary/50 transition-all duration-300 shadow-lg hover:shadow-[0_0_30px_rgba(6,182,212,0.1)] flex flex-col cursor-pointer" onClick={() => handleOpenModal(course)}>
              <div className="relative h-48 bg-surface-container overflow-hidden">
                <img
                  src={course.thumbnail}
                  alt={course.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/20 to-transparent" />
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-lg !bg-white dark:!bg-slate-800 border border-outline-variant/30 ${course.tagColor}`}>
                    {course.tag}
                  </span>
                </div>
              </div>
              <div className="p-4 md:p-5 flex flex-col flex-1 gap-3">
                <div className="flex justify-between items-start">
                  <h3 className="text-body-lg font-bold text-on-surface line-clamp-2 group-hover:text-primary transition-colors flex-1 pr-2">
                    {course.title}
                  </h3>
                </div>
                <div className="flex items-center gap-3 text-xs text-on-surface-variant font-medium">
                  <div className="flex items-center gap-1 bg-surface-variant/50 px-2 py-1 rounded-md">
                    <span className="material-symbols-outlined text-[16px]">menu_book</span>
                    <span>{course.curriculum?.length || 0} bài học</span>
                  </div>
                  <div className="flex items-center gap-1 bg-surface-variant/50 px-2 py-1 rounded-md">
                    <span className="material-symbols-outlined text-[16px]">group</span>
                    <span>{getEffectiveStudents(course)} HV</span>
                  </div>
                  <div className="flex items-center gap-1 bg-amber-500/10 text-amber-400 px-2 py-1 rounded-md ml-auto">
                    <span className="material-symbols-outlined text-[14px] fill-current" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    <span>{course.rating}</span>
                  </div>
                </div>
                
                <div className="mt-auto pt-4 border-t border-outline-variant/30 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-on-surface-variant line-through text-xs">{formatPrice(course.originalPrice)}</span>
                    <span className="text-primary font-bold text-lg">{formatPrice(course.salePrice * (1 - getDiscountFor('COURSE', course.id)/100))}</span>
                  </div>
                  {purchasedCourseIds.has(course.id) ? (
                    <button disabled className="w-auto px-4 py-2 rounded-xl bg-surface-variant/50 text-on-surface-variant font-bold flex items-center justify-center gap-2 text-sm cursor-not-allowed border border-outline-variant/30">
                      <span className="material-symbols-outlined text-[18px]">check_circle</span>
                      Đã sở hữu
                    </button>
                  ) : (
                    <button onClick={(e) => handleBuy(e, course)} className="w-auto px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-background font-bold transition-all flex items-center justify-center gap-2 text-sm shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                    <span className="material-symbols-outlined text-[18px]">shopping_cart</span>
                    Đăng ký
                  </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Course Detail Modal */}
      {selectedCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={handleCloseModal}></div>
          <div className="w-full max-w-4xl max-h-[90vh] bg-surface/95 backdrop-blur-2xl relative z-10 rounded-2xl md:rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] animate-fade-in border border-outline-variant/50 flex flex-col">
            
            <button 
              onClick={handleCloseModal}
              className="absolute top-4 right-4 md:top-5 md:right-5 w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-surface border border-outline-variant text-on-surface hover:text-error hover:bg-surface-variant transition-colors z-[100] shadow-lg"
            >
              <span className="material-symbols-outlined text-[18px] md:text-[20px]">close</span>
            </button>

            <div className="flex-1 overflow-y-auto custom-scrollbar rounded-2xl md:rounded-3xl">
              <div className="flex flex-col md:flex-row min-h-full">
                {/* Left side: Video Demo & Info */}
                <div className="md:w-1/2 px-5 py-4 pt-12 md:p-6 lg:p-8 border-b md:border-b-0 md:border-r border-outline-variant/30 bg-surface/50">
                  <span className={`inline-block px-2 py-1 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-bold mb-3 md:mb-4 ${selectedCourse.tagColor}`}>
                {selectedCourse.tag}
              </span>
              <h2 className="text-lg md:text-headline-md font-bold text-on-surface mb-3 md:mb-4 leading-tight">
                {selectedCourse.title}
              </h2>
              
              <div className="flex flex-wrap items-center gap-y-3 gap-x-6 text-sm text-on-surface-variant mb-6 pb-6 border-b border-outline-variant/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center text-secondary shrink-0">
                    <span className="material-symbols-outlined text-[20px]">person</span>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-on-surface-variant font-medium mb-0.5">Người hướng dẫn</p>
                    <p className="text-sm font-bold text-on-surface">{selectedCourse.instructor || 'Giảng viên TQ MEDIA'}</p>
                  </div>
                </div>
                
                <div className="h-8 w-px bg-outline-variant/30 hidden sm:block"></div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 text-amber-400">
                    <span className="material-symbols-outlined text-[18px] fill-current" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    <span className="font-bold">{selectedCourse.rating}</span>
                  </div>
                  <span className="text-outline-variant/50">•</span>
                  <span>{getEffectiveStudents(selectedCourse)} học viên</span>
                  <span className="text-outline-variant/50">•</span>
                  <span>{selectedCourse.type === 'combo' ? `${selectedCourse.curriculum?.length || 0} khóa học` : `${selectedCourse.curriculum?.length || 0} bài học`}</span>
                </div>
              </div>

              {/* Video Demo Player */}
              {selectedCourse.videoDemo ? (
                <div className="relative rounded-2xl overflow-hidden aspect-video bg-black mb-6 shadow-lg border border-outline/20 group">
                  
                  {demoState === 'idle' && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center cursor-pointer bg-black/40 hover:bg-black/20 transition-colors" onClick={handlePlayDemo}>
                      <img src={selectedCourse.thumbnail} alt="Thumbnail" className="absolute inset-0 w-full h-full object-cover opacity-50" />
                      <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-primary/90 flex items-center justify-center text-white z-10 shadow-[0_0_20px_rgba(6,182,212,0.5)] group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-3xl md:text-4xl">play_arrow</span>
                      </div>
                      <span className="z-10 mt-2 md:mt-3 font-bold text-white tracking-wider text-xs md:text-sm">XEM DEMO (15 GIÂY)</span>
                    </div>
                  )}

                  {demoState === 'playing' && (() => {
                    const ytUrl = getYoutubeEmbedUrl(selectedCourse.videoDemo);
                    if (ytUrl) {
                      return (
                        <iframe 
                          src={`${ytUrl}&autoplay=1`}
                          className="w-full h-full border-0 relative z-10"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        ></iframe>
                      );
                    }
                    return (
                      <video 
                        autoPlay
                        controls={false}
                        className="w-full h-full object-cover relative z-10 pointer-events-none"
                      >
                        <source src={selectedCourse.videoDemo} type="video/mp4" />
                        Trình duyệt của bạn không hỗ trợ thẻ video.
                      </video>
                    );
                  })()}

                  {demoState === 'finished' && (
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in z-30">
                      <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary mb-4 shadow-[0_0_30px_rgba(6,182,212,0.3)]">
                        <span className="material-symbols-outlined text-4xl">lock</span>
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">Đã hết thời gian Demo</h3>
                      <p className="text-on-surface-variant text-sm mb-6 max-w-sm">
                        Bạn đã xem hết 15 giây Demo. Vui lòng đăng ký khóa học này để xem trọn bộ nội dung và tài liệu thực hành.
                      </p>
                      <button 
                        onClick={(e) => handleBuy(e, selectedCourse)}
                        className="bg-gradient-to-r from-primary to-tertiary hover:scale-105 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined">shopping_cart</span>
                        Đăng ký ngay
                      </button>
                    </div>
                  )}
                  
                  <div className="absolute top-2 left-2 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded shadow backdrop-blur-sm animate-pulse pointer-events-none z-40">
                    VIDEO DEMO
                  </div>
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden aspect-video bg-surface-variant/30 mb-6 shadow-lg border border-outline-variant/30 flex flex-col items-center justify-center">
                  <span className="material-symbols-outlined text-4xl text-outline-variant mb-2">videocam_off</span>
                  <span className="text-on-surface-variant font-medium">Khóa học này chưa có Video Demo</span>
                </div>
              )}

              <div className="bg-surface-variant/20 border-l-4 border-tertiary p-4 md:p-5 rounded-r-xl md:rounded-r-2xl mb-6 md:mb-8 shadow-sm">
                <p className="text-on-surface text-sm md:font-body-lg leading-relaxed whitespace-pre-line italic">
                  "{selectedCourse.description}"
                </p>
              </div>

              <div className="bg-gradient-to-br from-primary/10 to-tertiary/10 p-4 md:p-6 lg:p-8 rounded-2xl md:rounded-3xl border border-primary/20 shadow-inner">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 md:mb-6 flex-wrap">
                  <div>
                    <span className="text-on-surface-variant line-through text-[10px] md:text-sm block mb-0.5 md:mb-1 font-medium">{formatPrice(selectedCourse.originalPrice)}</span>
                    <span className="text-3xl sm:text-4xl md:text-5xl font-black bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent block">
                      {formatPrice(selectedCourse.salePrice * (1 - getDiscountFor('COURSE', selectedCourse.id)/100))}
                    </span>
                  </div>
                  {selectedCourse.originalPrice > selectedCourse.salePrice && (
                    <div className="bg-error/10 text-error px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl text-[10px] md:text-sm font-bold animate-pulse border border-error/20 self-start sm:self-center shadow-[0_0_15px_rgba(239,68,68,0.3)] shrink-0 whitespace-nowrap">
                      GIẢM {Math.round((1 - selectedCourse.salePrice / selectedCourse.originalPrice) * 100)}%
                    </div>
                  )}
                </div>
                <button onClick={(e) => handleBuy(e, selectedCourse)} className="w-full bg-gradient-to-r from-primary to-tertiary hover:from-primary/90 hover:to-tertiary/90 text-background py-3 md:py-4 rounded-xl md:rounded-2xl font-bold flex items-center justify-center gap-2 md:gap-3 text-sm md:text-lg shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:scale-[1.02] transition-transform uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[20px] md:text-[24px]">shopping_cart_checkout</span>
                  Xác nhận Đăng ký học
                </button>
              </div>
            </div>

            {/* Right side: Curriculum */}
            <div className="md:w-1/2 p-4 md:p-6 lg:p-8 bg-surface-container-lowest">
              <h3 className="text-lg md:text-xl font-bold text-on-surface mb-4 md:mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">menu_book</span>
                Lộ trình học / Giáo trình
              </h3>
              
              <div className="space-y-6 mt-4">
                {selectedCourse.curriculum.map((item: string, index: number) => (
                  <div key={index} className="flex gap-4">
                    {/* Left Column: Circle & Line */}
                    <div className="relative flex flex-col items-center shrink-0">
                      <div className="z-10 w-8 h-8 rounded-full bg-surface border-[3px] border-primary flex items-center justify-center shadow-lg shadow-primary/20">
                        <span className="text-xs font-bold text-primary">{index + 1}</span>
                      </div>
                      {/* Vertical line connecting to next item */}
                      {index !== selectedCourse.curriculum.length - 1 && (
                        <div className="absolute left-1/2 -translate-x-1/2 top-8 bottom-[-24px] w-[2px] bg-primary/40"></div>
                      )}
                    </div>
                    {/* Right Column: Content */}
                    <div className="glass-panel w-full p-4 rounded-xl border border-outline-variant/30 hover:bg-surface-variant/50 hover:border-primary/30 transition-all pb-4">
                      <p className="font-medium text-on-surface text-sm sm:text-base">{item}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-8 p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-start gap-3">
                <span className="material-symbols-outlined text-primary mt-0.5">verified_user</span>
                <div>
                  <h4 className="font-bold text-primary text-sm mb-1">Cam kết chất lượng</h4>
                  <p className="text-xs text-on-surface-variant">Sở hữu vĩnh viễn khóa học, hỗ trợ giải đáp thắc mắc 1-1, hoàn tiền 100% nếu nội dung không như cam kết.</p>
                </div>
              </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Purchase Modal */}
      {confirmPurchaseCourse && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={() => setConfirmPurchaseCourse(null)}></div>
          <div className="glass-panel w-full max-w-md relative z-10 rounded-3xl shadow-2xl animate-fade-in p-6 border border-outline-variant/50 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary mx-auto mb-4">
              <span className="material-symbols-outlined text-3xl">shopping_cart_checkout</span>
            </div>
            <h3 className="text-xl font-bold text-on-surface mb-2">Xác nhận đăng ký</h3>
            <p className="text-on-surface-variant mb-6">
              Bạn có chắc muốn đăng ký khóa học <br/><strong className="text-primary">{confirmPurchaseCourse.title}</strong><br/>
              với giá <strong className="text-tertiary text-lg line-through text-on-surface-variant/50 mr-2">{formatPrice(confirmPurchaseCourse.salePrice * (1 - getDiscountFor('COURSE', confirmPurchaseCourse.id)/100))}</strong>
              {appliedVoucher && <strong className="text-cyan-400 text-lg">{formatPrice(Math.max(0, confirmPurchaseCourse.salePrice * (1 - getDiscountFor('COURSE', confirmPurchaseCourse.id)/100) - appliedVoucher.discountAmount))}</strong>}
              <br/><span className="text-sm mt-2 block">Số tiền này sẽ được trừ vào số dư tài khoản của bạn.</span>
            </p>
            
            {/* Voucher Section inside Modal */}
            <div className="bg-white/5 border border-outline-variant/30 rounded-xl p-4 flex flex-col gap-3 mb-6 text-left">
              <label className="block text-sm font-medium text-on-surface-variant">Mã giảm giá (Nếu có)</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={voucherCode}
                  onChange={(e) => { setVoucherCode(e.target.value); setVoucherError(''); setAppliedVoucher(null); }}
                  className="flex-1 min-w-0 bg-surface-variant/30 border border-outline-variant/30 text-on-surface rounded-lg px-4 py-2 focus:outline-none focus:border-cyan-500/50 uppercase placeholder:text-on-surface-variant/50 placeholder:normal-case"
                  placeholder="Nhập mã giảm giá..."
                />
                <button type="button" onClick={handleApplyVoucher} className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-bold px-3 md:px-4 py-2 rounded-lg transition-all whitespace-nowrap shrink-0 text-sm md:text-base">
                  Áp dụng
                </button>
              </div>
              {voucherError && <p className="text-red-400 text-xs">{voucherError}</p>}
              {appliedVoucher && <p className="text-green-400 text-xs font-medium">Đã áp dụng mã {appliedVoucher.code}: Giảm {formatPrice(appliedVoucher.discountAmount)}</p>}
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setConfirmPurchaseCourse(null)} className="flex-1 py-3 rounded-xl font-bold text-on-surface hover:bg-surface-variant transition-colors border border-outline-variant/50">
                Hủy bỏ
              </button>
              <button type="button" onClick={executePurchase} disabled={isSubmitting} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-primary to-tertiary hover:from-primary/90 hover:to-tertiary/90 text-background font-bold shadow-lg hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all">
                Xác nhận Mua
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Purchase Modal */}
      {successPurchaseCourse && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={() => setSuccessPurchaseCourse(null)}></div>
          <div className="glass-panel w-full max-w-md relative z-10 rounded-3xl shadow-2xl animate-fade-in p-8 border border-outline-variant/50 text-center">
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 mx-auto mb-6 shadow-[0_0_30px_rgba(74,222,128,0.3)]">
              <span className="material-symbols-outlined text-5xl">check_circle</span>
            </div>
            <h3 className="text-2xl font-display-md font-bold text-white mb-3">Đăng ký thành công!</h3>
            <p className="text-on-surface-variant mb-6 leading-relaxed">
              Chào mừng bạn đến với khóa học <strong className="text-primary">{successPurchaseCourse.title}</strong>.
              <br/>Khóa học đã được đăng ký thành công vào tài khoản của bạn!
            </p>
            <div className="p-4 bg-surface-container rounded-2xl border border-outline-variant/30 mb-8 text-left">
              <p className="text-sm text-on-surface mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-sm">info</span>
                <strong>Hướng dẫn tiếp theo:</strong>
              </p>
              <ul className="text-sm text-on-surface-variant list-disc pl-5 space-y-1">
                <li>Vào mục <strong>Khóa học của tôi</strong> để xem nội dung.</li>
                <li>Xem Lịch học Live Class mới nhất.</li>
                <li>Liên hệ Zalo người hướng dẫn để được hỗ trợ.</li>
              </ul>
            </div>
            <button 
              onClick={() => {
                setSuccessPurchaseCourse(null);
                router.push('/dashboard/my-courses');
              }} 
              className="w-full py-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold shadow-lg hover:shadow-[0_0_20px_rgba(74,222,128,0.4)] transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">play_lesson</span>
              Vào học ngay
            </button>
          </div>
        </div>
      )}
    </>
  );
}
