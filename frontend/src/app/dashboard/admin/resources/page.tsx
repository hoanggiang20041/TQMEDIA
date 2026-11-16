'use client';

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

export default function AdminResourcesPage() {
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<any>(null);
  const [viewingStockResource, setViewingStockResource] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State for dynamic variants
  const [variants, setVariants] = useState<any[]>([{ id: '', name: 'Mặc định', importPrice: 0, price: 0, stockData: '' }]);

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    const token = localStorage.getItem('tq_token');
    try {
      const res = await fetch('/api/admin/resources', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setResources(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (resource: any = null) => {
    setEditingResource(resource);
    if (resource && resource.variants && resource.variants.length > 0) {
      setVariants(resource.variants);
    } else {
      setVariants([{ id: '', name: 'Mặc định', importPrice: 0, price: 0, stockData: '' }]);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingResource(null);
    setVariants([]);
  };

  const updateVariant = (index: number, field: string, value: any) => {
    const newVariants = [...variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setVariants(newVariants);
  };

  const addVariant = () => {
    setVariants([...variants, { id: '', name: 'Phân loại mới', importPrice: 0, price: 0, stockData: '' }]);
  };

  const removeVariant = (index: number) => {
    if (variants.length === 1) return MySwal.fire('Lỗi', 'Phải có ít nhất 1 phân loại', 'error');
    const newVariants = [...variants];
    newVariants.splice(index, 1);
    setVariants(newVariants);
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const formData = new FormData(e.currentTarget);
    const payload = {
      name: formData.get('name'),
      category: formData.get('category') || 'Khác',
      iconPlatform: formData.get('iconPlatform'),
      description: formData.get('description'),
      type: formData.get('type'),
      thumbnail: formData.get('thumbnail'),
      status: formData.get('status'),
      variants: variants
    };

    try {
      const url = editingResource 
        ? `/api/admin/resources/${editingResource.id}` 
        : '/api/admin/resources';
      
      const token = localStorage.getItem('tq_token');
      const res = await fetch(url, {
        method: editingResource ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        MySwal.fire({ icon: 'success', title: 'Thành công!', text: 'Đã lưu tài nguyên.' });
        fetchResources();
        closeModal();
      } else {
        const err = await res.json();
        MySwal.fire({ icon: 'error', title: 'Thất bại', text: err.error || 'Có lỗi xảy ra' });
      }
    } catch (error) {
      MySwal.fire({ icon: 'error', title: 'Lỗi', text: 'Không thể kết nối đến server.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const result = await MySwal.fire({
      title: 'Xóa tài nguyên này?',
      text: "Hành động này không thể hoàn tác!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#3b82f6',
      confirmButtonText: 'Có, xóa!',
      cancelButtonText: 'Hủy'
    });

    if (result.isConfirmed) {
      const token = localStorage.getItem('tq_token');
      try {
        const res = await fetch(`/api/admin/resources/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          MySwal.fire('Đã xóa!', 'Tài nguyên đã bị xóa.', 'success');
          fetchResources();
        } else {
          MySwal.fire('Lỗi!', 'Không thể xóa tài nguyên.', 'error');
        }
      } catch (err) {
        MySwal.fire('Lỗi!', 'Không thể kết nối.', 'error');
      }
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

  if (loading) return <div className="p-8 text-center text-on-surface">Đang tải...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white/5 p-6 rounded-2xl border border-outline-variant/30 backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-bold text-on-surface tracking-tight">Quản lý Tài nguyên</h1>
          <p className="text-on-surface-variant text-sm mt-1">Kho tài khoản, link, công cụ số (Phân loại SKU)</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          Thêm Tài nguyên
        </button>
      </div>

      <div className="bg-white/5 border border-outline-variant/30 rounded-2xl overflow-hidden backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-on-surface-variant">
            <thead className="bg-surface-variant/30 text-on-surface font-semibold uppercase text-xs">
              <tr>
                <th className="px-6 py-4">Tên tài nguyên</th>
                <th className="px-6 py-4">Danh mục</th>
                <th className="px-6 py-4 text-center">SKU</th>
                <th className="px-6 py-4 text-center">Loại</th>
                <th className="px-6 py-4 text-center">Trạng thái</th>
                <th className="px-6 py-4 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {resources.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center">Chưa có tài nguyên nào.</td></tr>
              ) : resources.map(res => {
                const skuCount = res.variants?.length || 0;
                return (
                  <tr key={res.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-cyan-400 flex items-center gap-2">
                        {res.iconPlatform && getPlatformIcon(res.iconPlatform) && (
                          <img src={getPlatformIcon(res.iconPlatform)!} alt={res.iconPlatform} className="w-5 h-5 object-contain" />
                        )}
                        {res.name}
                      </div>
                      <div className="text-xs truncate max-w-[200px] mt-1">{res.description}</div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-on-surface-variant">
                      {res.category || 'Khác'}
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-yellow-400">
                      {skuCount} loại
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${res.type === 'ACCOUNT' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                        {res.type === 'ACCOUNT' ? 'TÀI KHOẢN' : 'LINK/FILE'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${res.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {res.status === 'active' ? 'Hoạt động' : 'Đã ẩn'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => setViewingStockResource(res)} className="p-2 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 rounded-lg transition-colors" title="Xem kho phân loại">
                          <span className="material-symbols-outlined text-[18px]">inventory</span>
                        </button>
                        <button onClick={() => openModal(res)} className="p-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors">
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button onClick={() => handleDelete(res.id)} className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors">
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface border border-outline-variant/30 rounded-2xl p-6 w-full max-w-4xl shadow-2xl relative max-h-[95vh] flex flex-col">
            <button onClick={closeModal} className="absolute top-4 right-4 text-on-surface-variant hover:text-red-400 transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
            <h2 className="text-xl font-bold text-on-surface mb-6">
              {editingResource ? 'Chỉnh sửa Tài nguyên' : 'Thêm Tài nguyên mới'}
            </h2>
            
            <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
              <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1 pb-4">
                
                {/* Thông tin chung */}
                <div className="bg-white/5 p-4 rounded-xl border border-outline-variant/30">
                  <h3 className="font-bold text-cyan-400 mb-4 border-b border-outline-variant/30 pb-2">1. Thông tin chung</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-1">
                      <label className="block text-sm mb-1 text-on-surface-variant">Tên Tài nguyên *</label>
                      <input type="text" name="name" defaultValue={editingResource?.name} className="input-glass w-full" required />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-sm mb-1 text-on-surface-variant">Danh mục</label>
                      <input type="text" name="category" defaultValue={editingResource?.category || 'Khác'} className="input-glass w-full" placeholder="Ví dụ: Tài khoản, Link, Tool..." />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-sm mb-1 text-on-surface-variant">Biểu tượng Nền tảng</label>
                      <select name="iconPlatform" defaultValue={editingResource?.iconPlatform || ''} className="input-glass w-full">
                        <option value="">(Không có)</option>
                        <option value="Facebook">Facebook</option>
                        <option value="Instagram">Instagram</option>
                        <option value="TikTok">TikTok</option>
                        <option value="YouTube">YouTube</option>
                        <option value="Gmail">Gmail</option>
                        <option value="Google">Google</option>
                        <option value="Hotmail">Hotmail/Outlook</option>
                        <option value="Twitter">X/Twitter</option>
                        <option value="Telegram">Telegram</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm mb-1 text-on-surface-variant">Loại *</label>
                      <select name="type" defaultValue={editingResource?.type || 'ACCOUNT'} className="input-glass w-full">
                        <option value="ACCOUNT">Bán Tài Khoản (Clone/Via)</option>
                        <option value="LINK">Bán Link / File (Dùng chung)</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm mb-1 text-on-surface-variant">Mô tả ngắn</label>
                      <textarea name="description" defaultValue={editingResource?.description} className="input-glass w-full h-24 custom-scrollbar whitespace-pre-wrap" placeholder="Nhập mô tả chi tiết..."></textarea>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm mb-1 text-on-surface-variant">Link Ảnh Thumbnail</label>
                      <input type="url" name="thumbnail" defaultValue={editingResource?.thumbnail} className="input-glass w-full" placeholder="https://..." />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm mb-1 text-on-surface-variant">Trạng thái</label>
                      <select name="status" defaultValue={editingResource?.status || 'active'} className="input-glass w-full">
                        <option value="active">Đang bán</option>
                        <option value="inactive">Đã ẩn</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Phân loại SKU */}
                <div className="bg-white/5 p-4 rounded-xl border border-outline-variant/30">
                  <div className="flex justify-between items-center mb-4 border-b border-outline-variant/30 pb-2">
                    <h3 className="font-bold text-yellow-400">2. Phân loại (SKU) & Kho hàng</h3>
                    <button type="button" onClick={addVariant} className="text-xs bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1 rounded-lg font-bold transition-colors">
                      + Thêm phân loại
                    </button>
                  </div>
                  
                  <div className="space-y-6">
                    {variants.map((v, idx) => (
                      <div key={idx} className="p-4 bg-surface-variant/30 rounded-lg border border-outline-variant/50 relative">
                        <button type="button" onClick={() => removeVariant(idx)} className="absolute top-2 right-2 p-1 text-on-surface-variant hover:text-red-400 transition-colors">
                          <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                        <h4 className="font-bold text-on-surface mb-3 text-sm">Phân loại #{idx + 1}</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <label className="block text-xs mb-1 text-on-surface-variant">Tên phân loại * (VD: Clone, Xịn)</label>
                            <input type="text" required value={v.name} onChange={(e) => updateVariant(idx, 'name', e.target.value)} className="input-glass w-full text-sm py-1.5" />
                          </div>
                          <div>
                            <label className="block text-xs mb-1 text-on-surface-variant">Giá nhập (đ)</label>
                            <input type="number" required value={v.importPrice} onChange={(e) => updateVariant(idx, 'importPrice', e.target.value)} className="input-glass w-full text-sm py-1.5 font-bold text-on-surface" />
                          </div>
                          <div>
                            <label className="block text-xs mb-1 text-on-surface-variant">Giá bán (đ) *</label>
                            <input type="number" required value={v.price} onChange={(e) => updateVariant(idx, 'price', e.target.value)} className="input-glass w-full text-sm py-1.5 font-bold text-green-400" />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs mb-1 text-on-surface-variant">
                            Dữ liệu Kho (Stock) *
                          </label>
                          <textarea 
                            required 
                            value={v.stockData} 
                            onChange={(e) => updateVariant(idx, 'stockData', e.target.value)}
                            className="input-glass w-full h-24 font-mono text-xs leading-relaxed whitespace-pre-wrap custom-scrollbar" 
                            placeholder="Mỗi dòng 1 tài khoản (user|pass|...)"
                          ></textarea>
                          <div className="text-xs text-cyan-400 mt-1 font-bold">
                            Tồn kho: {v.stockData ? v.stockData.split(/\r?\n/).filter((l: string) => l.trim()).length : 0}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
              
              <div className="mt-6 flex gap-3 pt-4 border-t border-outline-variant/30">
                <button type="button" onClick={closeModal} className="flex-1 px-4 py-3 rounded-xl font-bold bg-surface-variant text-on-surface hover:bg-surface-variant/80 transition-all">
                  Hủy
                </button>
                <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-3 rounded-xl font-bold bg-cyan-600 text-white hover:bg-cyan-500 transition-all shadow-lg flex items-center justify-center gap-2">
                  {isSubmitting ? <span className="material-symbols-outlined animate-spin">refresh</span> : 'Lưu lại'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Viewing Stock Modal */}
      {viewingStockResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface border border-outline-variant/30 rounded-2xl p-6 w-full max-w-5xl shadow-2xl relative max-h-[90vh] flex flex-col">
            <button onClick={() => setViewingStockResource(null)} className="absolute top-4 right-4 text-on-surface-variant hover:text-red-400 transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
            <div className="flex justify-between items-center mb-6 pr-8 border-b border-outline-variant/30 pb-4">
              <h2 className="text-xl font-bold text-on-surface">
                Kho tài khoản - {viewingStockResource.name}
              </h2>
            </div>
            
            <div className="flex-1 overflow-auto custom-scrollbar space-y-6">
              {viewingStockResource.variants?.map((variant: any, vIdx: number) => {
                const lines = variant.stockData ? variant.stockData.split(/\r?\n/).filter((l: string) => l.trim()) : [];
                return (
                  <div key={vIdx} className="border border-outline-variant/30 rounded-xl overflow-hidden">
                    <div className="bg-surface-variant/50 p-4 flex justify-between items-center">
                      <div>
                        <h3 className="font-bold text-yellow-400">{variant.name}</h3>
                        <p className="text-xs text-on-surface-variant">Tồn kho: {lines.length} | Đã bán: {variant.soldCount}</p>
                      </div>
                      <button 
                        onClick={() => {
                          const data = variant.stockData || '';
                          const element = document.createElement('a');
                          const file = new Blob([data], {type: 'text/plain'});
                          element.href = URL.createObjectURL(file);
                          element.download = `chuaban_${viewingStockResource.id}_${variant.name}.txt`;
                          document.body.appendChild(element);
                          element.click();
                          document.body.removeChild(element);
                        }}
                        className="bg-green-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-green-600 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[14px]">download</span> Tải kho (.txt)
                      </button>
                    </div>
                    <table className="w-full text-left text-sm bg-white/5">
                      <thead className="text-on-surface-variant">
                        <tr>
                          <th className="p-3 w-12 text-center border-b border-outline-variant/20">STT</th>
                          <th className="p-3 border-b border-outline-variant/20">Dữ liệu</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/20">
                        {lines.length === 0 ? (
                          <tr><td colSpan={2} className="p-4 text-center text-on-surface-variant">Trống</td></tr>
                        ) : lines.map((line: string, i: number) => (
                          <tr key={i} className="hover:bg-white/5">
                            <td className="p-3 text-center text-on-surface-variant text-xs">{i + 1}</td>
                            <td className="p-3 font-mono text-cyan-400 text-xs break-all">{line}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        .input-glass {
          background: var(--color-surface-container-high);
          border: 1px solid var(--color-outline-variant);
          color: var(--color-on-surface);
          padding: 0.75rem 1rem;
          border-radius: 0.5rem;
          outline: none;
          transition: all 0.2s;
        }
        .input-glass:focus {
          border-color: #06b6d4;
          box-shadow: 0 0 0 1px rgba(6,182,212,0.5);
        }
        .input-glass option { background: var(--color-surface-bright); color: var(--color-on-surface); }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
      `}} />
    </div>
  );
}
