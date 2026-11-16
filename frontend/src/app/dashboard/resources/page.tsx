'use client';

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { useRole } from '@/context/RoleContext';

const MySwal = withReactContent(Swal);

export default function ClientResourcesPage() {
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingResource, setBuyingResource] = useState<any>(null);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('Tất cả');
  const [voucherCode, setVoucherCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [isApplyingVoucher, setIsApplyingVoucher] = useState(false);
  const { refreshUser, getDiscountFor } = useRole();

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      const res = await fetch('/api/resources', { headers: { 'Authorization': `Bearer ${localStorage.getItem('tq_token')}` } });
      const data = await res.json();
      setResources(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBuyClick = (res: any) => {
    if (!res.variants || res.variants.length === 0) {
      MySwal.fire({ icon: 'warning', title: 'Lỗi cấu hình', text: 'Tài nguyên này chưa được thiết lập phân loại (SKU).' });
      return;
    }

    const totalStock = res.type === 'ACCOUNT' 
      ? (res.variants?.reduce((acc: number, v: any) => acc + (v.stockCount || 0), 0) || 0)
      : Infinity;

    if (res.type === 'ACCOUNT' && totalStock < 1) {
      MySwal.fire({ icon: 'warning', title: 'Hết hàng', text: 'Tài nguyên này tạm thời đã bán hết.' });
      return;
    }
    setBuyingResource(res);
    
    // Find first variant that has stock
    const availableVariant = res.type === 'ACCOUNT' 
      ? res.variants.find((v: any) => v.stockCount > 0) || res.variants[0]
      : res.variants[0];
    setSelectedVariant(availableVariant);
    
    setQuantity(1);
    setVoucherCode('');
    setDiscountAmount(0);
  };

  const applyVoucher = async () => {
    if (!voucherCode || !selectedVariant) return;
    setIsApplyingVoucher(true);
    setDiscountAmount(0);
    const token = localStorage.getItem('tq_token');
    try {
      const res = await fetch('/api/vouchers/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          code: voucherCode,
          orderTotal: selectedVariant.price * (1 - getDiscountFor('RESOURCE', [selectedVariant.id, buyingResource?.id || ''])/100) * quantity,
          applicableType: 'RESOURCES',
          itemId: buyingResource.id
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDiscountAmount(data.discountAmount);
        MySwal.fire({ icon: 'success', title: 'Áp dụng thành công', text: `Đã giảm ${fmt(data.discountAmount)}`, timer: 2000, showConfirmButton: false });
      } else {
        MySwal.fire({ icon: 'error', title: 'Lỗi mã giảm giá', text: data.error || 'Mã không hợp lệ' });
      }
    } catch (err) {
      MySwal.fire({ icon: 'error', title: 'Lỗi', text: 'Không thể kiểm tra mã giảm giá' });
    } finally {
      setIsApplyingVoucher(false);
    }
  };

  const confirmBuy = async () => {
    if (!selectedVariant) return;
    setIsSubmitting(true);
    const token = localStorage.getItem('tq_token');
    try {
      const res = await fetch(`/api/resources/${buyingResource.id}/buy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          quantity, 
          variantId: selectedVariant.id,
          voucherCode: discountAmount > 0 ? voucherCode : undefined, 
          discount: discountAmount 
        })
      });
      const data = await res.json();
      
      if (res.ok) {
        await MySwal.fire({ 
          icon: 'success', 
          title: 'Thành công!', 
          text: 'Mua tài nguyên thành công. Vui lòng vào Lịch sử mua để nhận hàng.',
          confirmButtonText: 'Xem Lịch Sử'
        }).then((result) => {
          if (result.isConfirmed) {
            window.location.href = '/dashboard/my-resources';
          }
        });
        fetchResources();
        refreshUser();
        setBuyingResource(null);
        setSelectedVariant(null);
      } else {
        MySwal.fire({ icon: 'error', title: 'Thất bại', text: data.error || 'Có lỗi xảy ra' });
      }
    } catch (err) {
      MySwal.fire({ icon: 'error', title: 'Lỗi', text: 'Không kết nối được server.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const fmt = (n: number) => n?.toLocaleString('vi-VN') + ' đ';

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'Facebook': return 'https://img.icons8.com/fluency/96/facebook-new.png';
      case 'Instagram': return 'https://img.icons8.com/fluency/96/instagram-new.png';
      case 'TikTok': return 'https://img.icons8.com/fluency/96/tiktok.png';
      case 'YouTube': return 'https://img.icons8.com/color/96/youtube-play.png';
      case 'Gmail': return 'https://img.icons8.com/fluency/96/gmail-new.png';
      case 'Google': return 'https://img.icons8.com/color/96/google-logo.png';
      case 'Hotmail': return 'https://img.icons8.com/color/96/microsoft-outlook-2019--v2.png';
      case 'Twitter': return 'https://img.icons8.com/color/96/twitterx--v1.png';
      case 'Telegram': return 'https://img.icons8.com/color/96/telegram-app.png';
      default: return null;
    }
  };

  if (loading) return <div className="p-8 text-center text-on-surface">Đang tải cửa hàng...</div>;

  return (
    <div className="space-y-6">
      <section className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-6 bg-gradient-to-r from-blue-600/20 to-purple-600/20 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-white/5 backdrop-blur-xl">
        <div className="flex items-center gap-3 md:gap-4 w-full">
          <div className="hidden md:flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <span className="material-symbols-outlined text-4xl">inventory_2</span>
          </div>
          <div className="flex-1">
            <h1 className="text-xl md:text-3xl font-bold text-on-surface tracking-tight">Cửa Hàng Tài Nguyên</h1>
            <p className="text-on-surface-variant text-xs md:text-base mt-0.5 md:mt-1">Mua tài khoản, via, tool và tài nguyên số</p>
          </div>
        </div>
        <a href="/dashboard/my-resources" className="bg-white/10 hover:bg-white/20 text-white w-full md:w-auto justify-center px-4 py-2.5 md:px-6 md:py-3 rounded-xl md:rounded-xl font-bold text-sm md:text-base transition-all flex items-center gap-2 border border-white/10">
          <span className="material-symbols-outlined text-sm md:text-base">receipt_long</span>
          Lịch sử Mua hàng
        </a>
      </section>

      {/* Category Filter */}
      {resources.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
          <button 
            onClick={() => setActiveCategory('Tất cả')}
            className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-all ${activeCategory === 'Tất cả' ? 'bg-cyan-600 text-white' : 'bg-white/5 text-on-surface-variant hover:bg-white/10'}`}
          >
            Tất cả
          </button>
          {Array.from(new Set(resources.map(r => r.category || 'Khác'))).map(cat => (
            <button 
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-all ${activeCategory === cat ? 'bg-cyan-600 text-white' : 'bg-white/5 text-on-surface-variant hover:bg-white/10'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {resources.length === 0 ? (
          <div className="col-span-full p-12 text-center text-on-surface-variant bg-white/5 rounded-2xl border border-white/5">
            Hiện tại chưa có tài nguyên nào đang bán.
          </div>
        ) : resources.filter(r => activeCategory === 'Tất cả' || (r.category || 'Khác') === activeCategory).length === 0 ? (
          <div className="col-span-full p-12 text-center text-on-surface-variant bg-white/5 rounded-2xl border border-white/5">
            Không tìm thấy tài nguyên nào trong danh mục này.
          </div>
        ) : resources.filter(r => activeCategory === 'Tất cả' || (r.category || 'Khác') === activeCategory).map(res => {
          
          const prices = res.variants?.length > 0 ? res.variants.map((v: any) => v.price * (1 - getDiscountFor('RESOURCE', [v.id, res.id])/100)) : [0];
          const minPrice = Math.min(...prices);
          const maxPrice = Math.max(...prices);
          const displayPrice = (minPrice === maxPrice || !isFinite(minPrice)) ? fmt(minPrice === Infinity ? 0 : minPrice) : `${fmt(minPrice)} - ${fmt(maxPrice)}`;
          const totalStock = res.variants?.reduce((acc: number, v: any) => acc + (v.stockCount || 0), 0) || 0;
          const soldCount = res.variants?.reduce((acc: number, v: any) => acc + (v.soldCount || 0), 0) || 0;

          return (
            <div key={res.id} className="bg-white/[0.03] border border-outline-variant/30 rounded-2xl md:rounded-3xl overflow-hidden hover:border-cyan-500/50 transition-all group flex flex-row md:flex-col p-2 md:p-0">
              {res.thumbnail ? (
                <div className="w-24 h-24 md:w-full md:h-48 shrink-0 relative overflow-hidden bg-black rounded-xl md:rounded-none">
                  <img src={res.thumbnail} alt={res.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
              ) : (
                <div className="w-24 h-24 md:w-full md:h-48 shrink-0 bg-gradient-to-br from-surface-variant to-surface flex items-center justify-center rounded-xl md:rounded-none">
                  <span className="material-symbols-outlined text-2xl md:text-4xl text-on-surface-variant/30">image</span>
                </div>
              )}
              
              <div className="p-3 md:p-5 flex-1 flex flex-col min-w-0">
                <div className="flex justify-between items-start mb-1 md:mb-2 gap-2">
                  <span className={`px-2 py-0.5 md:px-2.5 md:py-1 rounded-md text-[8px] md:text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${res.type === 'ACCOUNT' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>
                    {res.type === 'ACCOUNT' ? 'Tài Khoản' : 'Link / File'}
                  </span>
                  <span className="text-[10px] md:text-xs font-medium text-on-surface-variant bg-white/5 px-1.5 py-0.5 md:px-2 md:py-1 rounded border border-white/5 whitespace-nowrap">
                    Đã bán: <strong className="text-green-400">{soldCount}</strong>
                  </span>
                </div>
                
                <h3 className="text-sm md:text-lg font-bold text-on-surface mb-1 md:mb-2 line-clamp-1 md:line-clamp-2 flex items-start gap-1 md:gap-2">
                  {res.iconPlatform && getPlatformIcon(res.iconPlatform) && (
                    <img src={getPlatformIcon(res.iconPlatform)!} alt={res.iconPlatform} className="w-4 h-4 md:w-6 md:h-6 object-contain shrink-0 mt-0.5" />
                  )}
                  <span>{res.name}</span>
                </h3>
                <div className="flex-1 mb-2 md:mb-4 hidden md:block">
                  <p className="text-sm text-on-surface-variant line-clamp-4">{res.description}</p>
                </div>
                
                <div className="flex items-end justify-between mt-auto pt-2 md:pt-4 border-t border-outline-variant/20">
                  <div>
                    <div className="text-[10px] md:text-xs text-on-surface-variant mb-0.5 md:mb-1">
                      Kho: {res.type === 'ACCOUNT' ? totalStock : 'Vô hạn'}
                    </div>
                    <div className="text-sm md:text-xl font-black text-cyan-400 leading-none">{displayPrice}</div>
                  </div>
                  <button 
                    onClick={() => handleBuyClick(res)}
                    disabled={res.type === 'ACCOUNT' && totalStock < 1}
                    className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-1.5 md:px-5 md:py-2.5 rounded-lg md:rounded-xl font-bold transition-all shadow-md active:scale-95 flex items-center gap-1 md:gap-2 text-xs md:text-base"
                  >
                    <span className="material-symbols-outlined text-[14px] md:text-[18px]">shopping_cart</span>
                    Mua
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {buyingResource && selectedVariant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface border border-outline-variant/30 rounded-3xl p-6 w-full max-w-md shadow-2xl relative max-h-[95vh] overflow-y-auto custom-scrollbar">
            <button onClick={() => { setBuyingResource(null); setSelectedVariant(null); }} className="absolute top-4 right-4 text-on-surface-variant hover:text-red-400 transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
            <h2 className="text-2xl font-bold text-on-surface mb-2">Xác nhận mua</h2>
            <div className="mb-4 pb-4 border-b border-white/10">
              <p className="text-on-surface font-bold text-lg leading-tight mb-2">
                {buyingResource.name}
              </p>
              {buyingResource.description && (
                <div className="text-sm text-on-surface-variant max-h-60 overflow-y-auto custom-scrollbar pr-2 whitespace-pre-wrap">
                  {buyingResource.description}
                </div>
              )}
            </div>
            
            <div className="space-y-4">
              
              {buyingResource.variants && buyingResource.variants.length > 0 && (
                <div>
                  <label className="block text-sm mb-2 text-on-surface-variant">Chọn phân loại</label>
                  <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                    {buyingResource.variants.map((v: any) => {
                      const isOutOfStock = buyingResource.type === 'ACCOUNT' && v.stockCount < 1;
                      const isSelected = selectedVariant.id === v.id;
                      return (
                        <button
                          key={v.id}
                          onClick={() => {
                            if (!isOutOfStock) {
                              setSelectedVariant(v);
                              setQuantity(1);
                              setDiscountAmount(0);
                            }
                          }}
                          disabled={isOutOfStock}
                          className={`text-left p-3 rounded-xl border transition-all flex justify-between items-center ${
                            isSelected 
                              ? 'bg-cyan-500/20 border-cyan-500/50' 
                              : isOutOfStock 
                                ? 'bg-white/5 border-white/5 opacity-50 cursor-not-allowed' 
                                : 'bg-black/50 border-white/10 hover:border-white/20'
                          }`}
                        >
                          <div>
                            <div className={`font-bold ${isSelected ? 'text-cyan-400' : 'text-white'}`}>{v.name}</div>
                            {buyingResource.type === 'ACCOUNT' && (
                              <div className="text-[10px] text-on-surface-variant mt-0.5">Kho: {v.stockCount}</div>
                            )}
                          </div>
                          <div className={`font-black ${isSelected ? 'text-cyan-400' : 'text-white'}`}>
                            {fmt(v.price * (1 - getDiscountFor('RESOURCE', [v.id, buyingResource?.id || ''])/100))}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/5">
                <span className="text-on-surface-variant">Đơn giá:</span>
                <span className="text-on-surface font-bold text-lg">{fmt(selectedVariant.price * (1 - getDiscountFor('RESOURCE', [selectedVariant.id, buyingResource?.id || ''])/100))}</span>
              </div>

              {buyingResource.type === 'ACCOUNT' && (
                <div>
                  <label className="block text-sm mb-2 text-on-surface-variant">Số lượng mua (Kho: {selectedVariant.stockCount})</label>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => {
                        setQuantity(Math.max(1, quantity - 1));
                        setDiscountAmount(0);
                      }}
                      className="w-12 h-12 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center transition-colors"
                    >-</button>
                    <input 
                      type="number" 
                      value={quantity}
                      onChange={(e) => {
                        let q = parseInt(e.target.value) || 1;
                        if (q > selectedVariant.stockCount) q = selectedVariant.stockCount;
                        if (q < 1) q = 1;
                        setQuantity(q);
                        setDiscountAmount(0);
                      }}
                      className="flex-1 h-12 bg-black/50 border border-white/10 rounded-xl text-center text-xl font-bold text-white outline-none"
                    />
                    <button 
                      onClick={() => {
                        setQuantity(Math.min(selectedVariant.stockCount, quantity + 1));
                        setDiscountAmount(0);
                      }}
                      className="w-12 h-12 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center transition-colors"
                    >+</button>
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <label className="block text-sm text-on-surface-variant">Mã giảm giá</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={voucherCode} 
                    onChange={e => setVoucherCode(e.target.value.toUpperCase())}
                    placeholder="Nhập mã..." 
                    className="flex-1 min-w-0 bg-surface-variant/50 border border-outline-variant/30 rounded-xl px-4 text-white outline-none focus:border-cyan-500/50"
                  />
                  <button 
                    onClick={applyVoucher}
                    disabled={isApplyingVoucher || !voucherCode}
                    className="px-3 md:px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all whitespace-nowrap shrink-0 text-sm md:text-base"
                  >
                    Áp dụng
                  </button>
                </div>
              </div>

              <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-on-surface-variant">Tạm tính:</span>
                  <span className="text-on-surface">{fmt(selectedVariant.price * (1 - getDiscountFor('RESOURCE', [selectedVariant.id, buyingResource?.id || ''])/100) * quantity)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-green-400">Giảm giá:</span>
                    <span className="text-green-400">-{fmt(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center border-t border-white/10 pt-2 mt-2">
                  <span className="text-cyan-400 font-bold">Tổng thanh toán:</span>
                  <span className="text-cyan-400 font-black text-2xl">{fmt(Math.max(0, selectedVariant.price * (1 - getDiscountFor('RESOURCE', [selectedVariant.id, buyingResource?.id || ''])/100) * quantity - discountAmount))}</span>
                </div>
              </div>
              
              <button 
                onClick={confirmBuy}
                disabled={isSubmitting || (buyingResource.type === 'ACCOUNT' && selectedVariant.stockCount < 1)}
                className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold rounded-xl text-lg transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] active:scale-95 flex items-center justify-center gap-2"
              >
                {isSubmitting ? <span className="material-symbols-outlined animate-spin">refresh</span> : 'Xác nhận Mua'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
      `}} />
    </div>
  );
}
