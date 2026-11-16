'use client';

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

export default function AdminVouchersPage() {
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // For specific targeting
  const [courses, setCourses] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [applicableType, setApplicableType] = useState('ALL');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('tq_token');
      
      const [resV, resC, resS] = await Promise.all([
        fetch('/api/admin/vouchers', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/courses', { headers: { 'Authorization': `Bearer ${localStorage.getItem('tq_token')}` } }),
        fetch('/api/admin/services', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      const dataV = await resV.json();
      const dataC = await resC.json();
      const dataS = await resS.json();
      
      setVouchers(Array.isArray(dataV) ? dataV : []);
      setCourses(Array.isArray(dataC) ? dataC : []);
      setServices(Array.isArray(dataS) ? dataS : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInitialData(); }, []);

  const openModal = (voucher: any = null) => {
    setEditingVoucher(voucher);
    
    if (voucher && voucher.applicableTo.startsWith('SPECIFIC:')) {
      setApplicableType('SPECIFIC');
      const ids = voucher.applicableTo.replace('SPECIFIC:', '').split(',');
      setSelectedItems(new Set(ids));
    } else {
      setApplicableType(voucher?.applicableTo || 'ALL');
      setSelectedItems(new Set());
    }
    
    setIsModalOpen(true);
  };
  
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingVoucher(null);
  };

  const handleToggleItem = (id: string) => {
    const next = new Set(selectedItems);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedItems(next);
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const formData = new FormData(e.currentTarget);
    
    let finalApplicableTo = applicableType;
    if (applicableType === 'SPECIFIC') {
      if (selectedItems.size === 0) {
        MySwal.fire({ icon: 'warning', title: 'Cảnh báo', text: 'Vui lòng chọn ít nhất 1 sản phẩm/dịch vụ' });
        setIsSubmitting(false);
        return;
      }
      finalApplicableTo = 'SPECIFIC:' + Array.from(selectedItems).join(',');
    }

    const payload = {
      code: formData.get('code')?.toString().toUpperCase(),
      discountType: formData.get('discountType'),
      discountValue: Number(formData.get('discountValue')),
      minOrderValue: Number(formData.get('minOrderValue')) || 0,
      maxDiscount: formData.get('maxDiscount') ? Number(formData.get('maxDiscount')) : null,
      usageLimit: formData.get('usageLimit') ? Number(formData.get('usageLimit')) : null,
      validFrom: formData.get('validFrom') as string,
      validTo: formData.get('validTo') as string,
      applicableTo: finalApplicableTo,
      isActive: formData.get('isActive') === 'on',
    };

    try {
      const url = editingVoucher 
        ? `/api/admin/vouchers/${editingVoucher.id}` 
        : '/api/admin/vouchers';
      
      const res = await fetch(url, {
        method: editingVoucher ? 'PUT' : 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('tq_token')}`
        },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi hệ thống');

      await fetchInitialData(); // Refresh all
      closeModal();
      MySwal.fire({ icon: 'success', title: 'Thành công', text: 'Đã lưu mã giảm giá!' });
    } catch (err: any) {
      MySwal.fire({ icon: 'error', title: 'Thất bại', text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const result = await MySwal.fire({
      title: 'Xóa mã giảm giá?',
      text: 'Hành động này không thể hoàn tác!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Đồng ý',
      cancelButtonText: 'Hủy'
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/admin/vouchers/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('tq_token')}` }
        });
        if (!res.ok) throw new Error('Failed');
        fetchInitialData();
        MySwal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Đã xóa', showConfirmButton: false, timer: 1500 });
      } catch (err) {
        MySwal.fire({ icon: 'error', title: 'Lỗi', text: 'Không thể xóa!' });
      }
    }
  };

  const fmtDate = (d: string) => new Date(d).toLocaleString('vi-VN');
  const fmt = (n: number) => n.toLocaleString('vi-VN');

  return (
    <div className="max-w-7xl w-full min-w-0 mx-auto space-y-6 p-4 md:p-6 lg:p-8 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-on-surface">Mã Giảm Giá (Vouchers)</h1>
          <p className="text-on-surface-variant text-base mt-1">Quản lý các chương trình khuyến mãi</p>
        </div>
        <button onClick={() => openModal()} className="btn-primary flex items-center gap-2 whitespace-nowrap">
          <span className="material-symbols-outlined">add_box</span> Thêm Mã Mới
        </button>
      </div>

      <div className="glass-panel overflow-hidden border border-outline-variant/30">
        {loading ? (
          <div className="p-12 text-center text-on-surface-variant">Đang tải...</div>
        ) : (
          <div className="overflow-x-auto w-full custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-surface/80 border-b border-outline-variant/50 text-on-surface-variant uppercase text-xs tracking-wider">
                  <th className="px-6 py-4 font-semibold whitespace-nowrap">Mã Code</th>
                  <th className="px-6 py-4 font-semibold whitespace-nowrap">Mức Giảm</th>
                  <th className="px-6 py-4 font-semibold whitespace-nowrap">Lượt Dùng</th>
                  <th className="px-6 py-4 font-semibold whitespace-nowrap">Phạm vi</th>
                  <th className="px-6 py-4 font-semibold whitespace-nowrap">Thời Gian Hạn</th>
                  <th className="px-6 py-4 font-semibold whitespace-nowrap">Trạng thái</th>
                  <th className="px-6 py-4 font-semibold text-right whitespace-nowrap">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30 text-sm md:text-base">
                {vouchers.map((v) => (
                  <tr key={v.id} className="hover:bg-surface-variant/30 transition-colors">
                    <td className="px-6 py-4 font-bold text-cyan-400 whitespace-nowrap">{v.code}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {v.discountType === 'PERCENT' ? `${v.discountValue}%` : `${fmt(v.discountValue)}đ`}
                      {v.maxDiscount && <div className="text-xs text-on-surface-variant mt-1">Tối đa: {fmt(v.maxDiscount)}đ</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {v.usedCount} / {v.usageLimit || '∞'}
                    </td>
                    <td className="px-6 py-4 text-xs font-medium whitespace-nowrap">
                      {v.applicableTo === 'ALL' && <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded">Tất cả</span>}
                      {v.applicableTo === 'COURSES' && <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded">Khóa học</span>}
                      {v.applicableTo === 'SERVICES' && <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded">Dịch vụ MXH</span>}
                      {v.applicableTo.startsWith('SPECIFIC:') && <span className="px-2 py-1 bg-orange-500/20 text-orange-400 rounded">Sản phẩm cụ thể</span>}
                    </td>
                    <td className="px-6 py-4 text-xs text-on-surface-variant whitespace-nowrap">
                      <div className="text-green-400">Từ: {fmtDate(v.validFrom)}</div>
                      <div className="text-red-400 mt-1">Đến: {fmtDate(v.validTo)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {!v.isActive ? (
                        <span className="text-red-400 font-medium">Khóa</span>
                      ) : new Date(v.validTo).getTime() < new Date().getTime() ? (
                        <span className="text-orange-400 font-medium">Hết hạn</span>
                      ) : (
                        <span className="text-green-400 font-medium">Hoạt động</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <button onClick={() => openModal(v)} className="p-2 hover:bg-surface-variant/80 rounded-lg text-on-surface-variant hover:text-primary transition-colors"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                      <button onClick={() => handleDelete(v.id)} className="p-2 hover:bg-red-500/20 rounded-lg text-on-surface-variant hover:text-red-400 transition-colors"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/90 backdrop-blur-sm" onClick={closeModal}></div>
          <div className="glass-panel relative w-full max-w-2xl p-6 shadow-2xl border border-primary/20 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h2 className="text-xl font-bold mb-6 text-on-surface">
              {editingVoucher ? 'Chỉnh sửa Mã Giảm Giá' : 'Tạo Mã Giảm Giá Mới'}
            </h2>
            <form id="voucher-form" onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm mb-1 text-on-surface-variant">Mã Code (Tự động in hoa)</label>
                <input type="text" name="code" defaultValue={editingVoucher?.code} className="input-glass w-full uppercase font-bold text-cyan-400" required />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1 text-on-surface-variant">Loại giảm giá</label>
                  <select name="discountType" defaultValue={editingVoucher?.discountType || 'FIXED'} className="input-glass w-full">
                    <option value="FIXED">Giảm số tiền cố định (đ)</option>
                    <option value="PERCENT">Giảm theo Phần trăm (%)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1 text-on-surface-variant">Mức giảm</label>
                  <input type="number" name="discountValue" defaultValue={editingVoucher?.discountValue} className="input-glass w-full font-bold" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1 text-on-surface-variant">Đơn tối thiểu (đ)</label>
                  <input type="number" name="minOrderValue" defaultValue={editingVoucher?.minOrderValue} className="input-glass w-full" />
                </div>
                <div>
                  <label className="block text-sm mb-1 text-on-surface-variant">Giảm tối đa (đ) (Nếu dùng %)</label>
                  <input type="number" name="maxDiscount" defaultValue={editingVoucher?.maxDiscount} className="input-glass w-full" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1 text-on-surface-variant">Từ ngày</label>
                  <input type="datetime-local" name="validFrom" defaultValue={editingVoucher?.validFrom ? new Date(new Date(editingVoucher.validFrom).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0,16) : ''} className="input-glass w-full" required />
                </div>
                <div>
                  <label className="block text-sm mb-1 text-on-surface-variant">Đến ngày</label>
                  <input type="datetime-local" name="validTo" defaultValue={editingVoucher?.validTo ? new Date(new Date(editingVoucher.validTo).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0,16) : ''} className="input-glass w-full" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1 text-on-surface-variant">Giới hạn lượt dùng (Bỏ trống = Vô hạn)</label>
                  <input type="number" name="usageLimit" defaultValue={editingVoucher?.usageLimit} className="input-glass w-full" />
                </div>
                <div>
                  <label className="block text-sm mb-1 text-on-surface-variant">Phạm vi áp dụng</label>
                  <select 
                    name="applicableTypeSelect" 
                    value={applicableType} 
                    onChange={(e) => setApplicableType(e.target.value)} 
                    className="input-glass w-full"
                  >
                    <option value="ALL">Toàn bộ Sản phẩm/Dịch vụ</option>
                    <option value="COURSES">Chỉ Khóa Học</option>
                    <option value="SERVICES">Chỉ Dịch vụ MXH</option>
                    <option value="SPECIFIC">Chỉ các SP/DV được chọn</option>
                  </select>
                </div>
              </div>

              {/* Specific Items Selection */}
              {applicableType === 'SPECIFIC' && (
                <div className="bg-surface-variant/30 p-4 rounded-xl border border-outline-variant/30 space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar">
                  <div>
                    <h3 className="font-bold text-cyan-400 mb-2 sticky top-0 bg-surface/90 py-1 backdrop-blur z-10">Khóa Học</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {courses.map(c => (
                        <label key={c.id} className="flex items-center gap-2 text-sm text-on-surface cursor-pointer p-2 hover:bg-white/5 rounded">
                          <input 
                            type="checkbox" 
                            checked={selectedItems.has(c.id)} 
                            onChange={() => handleToggleItem(c.id)} 
                            className="w-4 h-4 rounded text-cyan-500" 
                          />
                          <span className="truncate">{c.title}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-cyan-400 mb-2 sticky top-0 bg-surface/90 py-1 backdrop-blur z-10">Máy Chủ Dịch Vụ</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {services.map(s => (
                        <label key={s.id} className="flex items-center gap-2 text-sm text-on-surface cursor-pointer p-2 hover:bg-white/5 rounded">
                          <input 
                            type="checkbox" 
                            checked={selectedItems.has(s.id)} 
                            onChange={() => handleToggleItem(s.id)} 
                            className="w-4 h-4 rounded text-cyan-500" 
                          />
                          <span className="truncate">{s.platform} - {s.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <input type="checkbox" name="isActive" id="isActive" defaultChecked={editingVoucher ? editingVoucher.isActive : true} className="w-5 h-5 rounded" />
                <label htmlFor="isActive" className="text-on-surface font-medium cursor-pointer">Kích hoạt mã này</label>
              </div>
            </form>
            <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-outline-variant/30">
              <button onClick={closeModal} className="btn-social px-6">Hủy</button>
              <button type="submit" form="voucher-form" disabled={isSubmitting} className="btn-primary px-6">
                {isSubmitting ? 'Đang lưu...' : 'Lưu lại'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
