'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

const PLATFORM_SERVICES = {
  facebook: [
    { id: 'like', label: 'Tăng Like Fanpage' },
    { id: 'live', label: 'Tăng Mắt Live' },
    { id: 'group', label: 'Tăng Group Member' },
    { id: 'comment', label: 'Auto Comment' },
    { id: 'follow', label: 'Tăng Theo Dõi (Profile)' },
    { id: 'like_post', label: 'Tăng Like Bài Viết' },
  ],
  tiktok: [
    { id: 'comment', label: 'Auto Comment' },
    { id: 'reup', label: 'Reup Live' },
    { id: 'remove_strike', label: 'Gỡ gậy Live' },
  ],
  instagram: [
    { id: 'like', label: 'Tăng Tim (Like)' },
    { id: 'live', label: 'Tăng Mắt Live' },
    { id: 'group', label: 'Tăng Tương Tác' },
    { id: 'comment', label: 'Auto Comment' },
    { id: 'follow', label: 'Tăng Follower' },
    { id: 'like_post', label: 'Tăng Like Reels' },
  ],
  youtube: [
    { id: 'view', label: 'Tăng View' },
    { id: 'sub', label: 'Tăng Sub' },
  ],
  google: [
    { id: 'review', label: 'Đánh giá 5 Sao (Maps)' },
    { id: 'traffic', label: 'Traffic Website' },
  ],
};

export default function AdminServersPage() {
  const [servers, setServers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkDiscountModalOpen, setIsBulkDiscountModalOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState('facebook');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('');
  const [flashSaleTarget, setFlashSaleTarget] = useState('SELECTED');

  const fetchServers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('tq_token');
      const res = await fetch('/api/admin/servers', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setServers(data);
      } else {
        setServers([]);
      }
    } catch (err) {
      console.error('Failed to fetch servers', err);
      setServers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();
  }, []);

  const toggleStatus = async (server: any) => {
    const newStatus = server.status === 'hoat_dong' ? 'bao_tri' : 'hoat_dong';
    
    // Optimistic update
    setServers(servers.map(s => s.id === server.id ? { ...s, status: newStatus } : s));
    
    try {
      const res = await fetch(`/api/admin/servers/${server.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('tq_token')}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!res.ok) throw new Error('Failed');
      
      MySwal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Đã đổi trạng thái',
        showConfirmButton: false,
        timer: 1500
      });
    } catch (err) {
      // Revert if error
      setServers(servers.map(s => s.id === server.id ? { ...s, status: server.status } : s));
      MySwal.fire({
        icon: 'error',
        title: 'Lỗi',
        text: 'Không thể đổi trạng thái. Lỗi kết nối!'
      });
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === servers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(servers.map(s => s.id));
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const openModal = (server: any = null) => {
    setEditingServer(server);
    setSelectedPlatform(server?.platform || 'facebook');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingServer(null);
  };

  const handleSaveServer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const formData = new FormData(e.currentTarget);
    const payload = {
      name: formData.get('name') as string,
      platform: formData.get('platform') as string,
      serviceType: formData.get('serviceType') as string,
      apiServiceId: formData.get('apiServiceId') as string,
      apiProvider: formData.get('apiProvider') as string,
      price: Number(formData.get('price')),
      costPrice: Number(formData.get('costPrice')),
      min: Number(formData.get('min')),
      max: Number(formData.get('max')),
      tags: formData.get('tags') as string || '',
      desc: formData.get('desc') as string,
      hot: formData.get('hot') === 'on',
      status: formData.get('status') as string,
    };

    try {
      let res;
      if (editingServer) {
        res = await fetch(`/api/admin/servers/${editingServer.id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('tq_token')}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/admin/servers', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('tq_token')}`
          },
          body: JSON.stringify(payload)
        });
      }
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Lỗi hệ thống');
      }

      await fetchServers();
      closeModal();
      
      MySwal.fire({
        icon: 'success',
        title: 'Thành công',
        text: editingServer ? 'Đã cập nhật máy chủ!' : 'Đã thêm máy chủ mới!',
        confirmButtonColor: '#06b6d4'
      });
    } catch (err: any) {
      MySwal.fire({
        icon: 'error',
        title: 'Thất bại',
        text: err.message || 'Có lỗi xảy ra khi lưu Máy chủ!',
        confirmButtonColor: '#06b6d4'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteServer = async (id: string) => {
    const result = await MySwal.fire({
      title: 'Xóa máy chủ?',
      text: 'Sếp có chắc chắn muốn XÓA VĨNH VIỄN máy chủ này? Mọi đơn hàng liên quan có thể bị lỗi!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Đồng ý xóa',
      cancelButtonText: 'Hủy'
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/admin/servers/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('tq_token')}`
          }
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed');
        
        setServers(servers.filter(s => s.id !== id));
        MySwal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Đã xóa máy chủ',
          showConfirmButton: false,
          timer: 1500
        });
      } catch (err: any) {
        MySwal.fire({
          icon: 'error',
          title: 'Lỗi',
          text: err.message || 'Lỗi kết nối, không thể xóa!'
        });
      }
    }
  };

  const handleApplyBulkDiscount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const payload = {
      target: flashSaleTarget === 'SPECIFIC' ? 'SELECTED' : flashSaleTarget,
      targetIds: selectedIds,
      discountType: formData.get('discountType') as string,
      discountValue: Number(formData.get('discountValue')),
      flashSaleEndTime: formData.get('flashSaleEndTime') ? new Date(formData.get('flashSaleEndTime') as string).toISOString() : null
    };

    if (payload.target === 'SELECTED' && selectedIds.length === 0) {
      MySwal.fire({ icon: 'warning', title: 'Cảnh báo', text: 'Vui lòng chọn ít nhất 1 dịch vụ!' });
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/services/bulk-discount', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('tq_token')}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to apply discount');
      
      MySwal.fire({ icon: 'success', title: 'Thành công', text: `Đã cập nhật ${data.updatedCount} dịch vụ!` });
      setIsBulkDiscountModalOpen(false);
      fetchServers();
    } catch (err: any) {
      MySwal.fire({ icon: 'error', title: 'Lỗi', text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveBulkDiscount = async () => {
    if (selectedIds.length === 0) {
      MySwal.fire({ icon: 'warning', title: 'Cảnh báo', text: 'Vui lòng chọn ít nhất 1 dịch vụ!' });
      return;
    }
    try {
      setIsSubmitting(true);
      const res = await fetch('/api/admin/services/remove-discount', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('tq_token')}`
        },
        body: JSON.stringify({ target: 'SELECTED', targetIds: selectedIds })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove discount');
      
      MySwal.fire({ icon: 'success', title: 'Thành công', text: `Đã khôi phục giá cho ${data.updatedCount} dịch vụ!` });
      fetchServers();
    } catch (err: any) {
      MySwal.fire({ icon: 'error', title: 'Lỗi', text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveSingleFlashSale = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/services/remove-discount-single/${id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('tq_token')}` }
      });
      if (res.ok) {
        MySwal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Đã hủy Flash Sale', showConfirmButton: false, timer: 1500 });
        fetchServers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fmt = (val: number) => new Intl.NumberFormat('vi-VN').format(val);

  const getPlatformIcon = (platform: string | null | undefined) => {
    switch ((platform || '').toLowerCase()) {
      case 'facebook': return { icon: 'thumb_up', color: 'text-[#1877F2]' };
      case 'tiktok': return { icon: 'music_note', color: 'text-pink-500' };
      case 'instagram': return { icon: 'photo_camera', color: 'text-purple-500' };
      case 'youtube': return { icon: 'play_circle', color: 'text-red-500' };
      case 'google': return { icon: 'travel_explore', color: 'text-orange-500' };
      default: return { icon: 'dns', color: 'text-primary' };
    }
  }

  const filteredServers = servers.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchPlatform = filterPlatform ? s.platform === filterPlatform : true;
    return matchSearch && matchPlatform;
  });

  const activeServers = servers.filter(s => s.status === 'hoat_dong').length;
  const maintenanceServers = servers.filter(s => s.status === 'bao_tri').length;

  return (
    <div className="max-w-7xl w-full min-w-0 mx-auto space-y-6 p-4 md:p-6 lg:p-8 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-on-surface">Quản lý Máy Chủ (Servers)</h1>
          <p className="text-on-surface-variant text-base mt-1">
            Điều phối giá bán, giá vốn, trạng thái của từng Máy chủ dịch vụ
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-4 sm:mt-0">
          <button onClick={() => setIsBulkDiscountModalOpen(true)} className="btn-social flex items-center gap-2 whitespace-nowrap bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/30">
            <span className="material-symbols-outlined text-[20px]">percent</span>
            Giảm giá Flash Sale
          </button>
          <button onClick={() => openModal()} className="btn-primary flex items-center gap-2 whitespace-nowrap shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            <span className="material-symbols-outlined text-[20px]">add_box</span>
            Thêm Máy Chủ Mới
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary border border-primary/30">
            <span className="material-symbols-outlined text-3xl">dns</span>
          </div>
          <div>
            <div className="text-on-surface-variant text-sm font-semibold">Tổng số Máy chủ</div>
            <div className="text-2xl font-bold text-on-surface">{servers.length}</div>
          </div>
        </div>
        <div className="glass-card p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#10b981]/20 flex items-center justify-center text-[#10b981] border border-[#10b981]/30">
            <span className="material-symbols-outlined text-3xl">check_circle</span>
          </div>
          <div>
            <div className="text-on-surface-variant text-sm font-semibold">Đang Hoạt Động</div>
            <div className="text-2xl font-bold text-on-surface">{activeServers}</div>
          </div>
        </div>
        <div className="glass-card p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#f59e0b]/20 flex items-center justify-center text-[#f59e0b] border border-[#f59e0b]/30">
            <span className="material-symbols-outlined text-3xl">build_circle</span>
          </div>
          <div>
            <div className="text-on-surface-variant text-sm font-semibold">Đang Bảo Trì</div>
            <div className="text-2xl font-bold text-on-surface">{maintenanceServers}</div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel p-4 flex flex-col md:flex-row gap-4 items-center border border-outline-variant/30">
        <div className="relative flex-1 w-full">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
            search
          </span>
          <input
            type="text"
            placeholder="Tìm kiếm máy chủ theo ID, Tên..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-glass pl-10 w-full bg-surface-variant/20 focus:bg-surface-variant/50"
          />
        </div>
        <div className="w-full md:w-64 relative">
          <select 
            value={filterPlatform}
            onChange={(e) => setFilterPlatform(e.target.value)}
            className="input-glass w-full appearance-none pr-10 bg-surface-variant/20 focus:bg-surface-variant/50"
          >
            <option value="">Tất cả Nền tảng</option>
            {Array.from(new Set(servers.map(s => s.platform).filter(Boolean))).map((platform: any) => (
              <option key={platform} value={platform} className="capitalize">
                {platform}
              </option>
            ))}
          </select>
          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">
            expand_more
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel overflow-hidden border border-outline-variant/30">
        {selectedIds.length > 0 && (
          <div className="bg-primary/10 border-b border-primary/20 px-6 py-3 flex items-center justify-between">
            <span className="text-primary font-medium text-sm">Đã chọn {selectedIds.length} máy chủ</span>
            <button onClick={handleRemoveBulkDiscount} disabled={isSubmitting} className="text-xs bg-surface border border-outline-variant/50 hover:bg-surface-variant px-3 py-1.5 rounded-lg text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px]">history</span> Khôi phục giá gốc
            </button>
          </div>
        )}
        {loading ? (
          <div className="p-12 text-center text-on-surface-variant flex flex-col items-center">
            <span className="material-symbols-outlined text-4xl animate-spin mb-2">sync</span>
            Đang tải dữ liệu máy chủ...
          </div>
        ) : (
                    <div className="overflow-x-auto w-full custom-scrollbar pb-10">
            {Object.entries(
              filteredServers.reduce((acc, server) => {
                const plat = server.platform || 'Khác';
                const type = server.serviceType || 'Khác';
                if (!acc[plat]) acc[plat] = {};
                if (!acc[plat][type]) acc[plat][type] = [];
                acc[plat][type].push(server);
                return acc;
              }, {} as Record<string, Record<string, typeof servers>>)
            ).map(([platform, types]: [string, any]) => {
              const platformInfo = getPlatformIcon(platform);
              return (
                <div key={platform} className="mb-6 mx-4 mt-4 border border-outline-variant/30 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-surface-variant/40 px-6 py-4 flex items-center gap-3 border-b border-outline-variant/30">
                    <span className={`material-symbols-outlined text-[24px] ${platformInfo.color}`}>{platformInfo.icon}</span>
                    <h2 className="text-lg font-bold capitalize text-on-surface">{platform}</h2>
                  </div>
                  
                  {Object.entries(types).map(([type, svcs]: [string, any]) => {
                    const displaySvcs = svcs.filter((srv: any) => !srv.name.match(/\(\s*(love|care|haha|wow|sad|angry|30\s*phút|45\s*phút|60\s*phút|90\s*phút|120\s*phút|150\s*phút|180\s*phút|240\s*phút|2\s*tháng|3\s*tháng|6\s*tháng)\s*\)$/i));
                    return (
                    <div key={type} className="border-b border-outline-variant/20 last:border-0">
                      <div className="bg-surface/80 px-6 py-3 font-semibold text-primary text-sm flex items-center gap-2 border-b border-outline-variant/10">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                        <span className="uppercase tracking-wider">{type}</span>
                        <span className="text-on-surface-variant text-xs font-normal ml-2">({svcs.length} máy chủ)</span>
                      </div>
                      <div className="overflow-x-auto w-full custom-scrollbar">
                        <table className="w-full text-left border-collapse min-w-[1000px]">
                          <thead>
                            <tr className="bg-surface/30 border-b border-outline-variant/20 text-on-surface-variant text-xs font-semibold uppercase tracking-wider">
                              <th className="px-6 py-3 font-medium w-12">
                                 <input type="checkbox" className="rounded border-outline/30 bg-surface/50 text-primary" 
                                    checked={svcs.every((s: any) => selectedIds.includes(s.id))}
                                    onChange={(e) => {
                                    if (e.target.checked) {
                                        const newIds = svcs.map((s: any) => s.id).filter((id: string) => !selectedIds.includes(id));
                                        setSelectedIds([...selectedIds, ...newIds]);
                                    } else {
                                        setSelectedIds(selectedIds.filter((id: string) => !svcs.find((s: any) => s.id === id)));
                                    }
                                 }} />
                              </th>
                              <th className="px-6 py-3 font-medium min-w-[250px]">Tên Máy Chủ</th>
                              <th className="px-6 py-3 font-medium">Giá vốn</th>
                              <th className="px-6 py-3 font-medium text-cyan-400">Giá bán</th>
                              <th className="px-6 py-3 font-medium">Min/Max</th>
                              <th className="px-6 py-3 font-medium text-center">Trạng thái</th>
                              <th className="px-6 py-3 font-medium text-right">Thao tác</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-variant/10 text-on-surface text-sm">
                            {displaySvcs.map((server: any) => (
                              <tr key={server.id} className={`hover:bg-surface-variant/30 transition-colors ${selectedIds.includes(server.id) ? 'bg-primary/5' : ''}`}>
                                <td className="px-6 py-3">
                                  <input 
                                    type="checkbox" 
                                    className="rounded border-outline/30 bg-surface/50 text-primary focus:ring-primary focus:ring-offset-background"
                                    checked={selectedIds.includes(server.id)}
                                    onChange={() => toggleSelect(server.id)}
                                  />
                                </td>
                                <td className="px-6 py-3">
                                  <div className="font-medium flex items-center gap-2">
                                    {server.name}
                                    {server.hot && <span className="bg-red-500/20 text-red-400 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">Hot</span>}
                                  </div>
                                  <div className="text-xs text-on-surface-variant mt-1 line-clamp-1" title={server.desc}>
                                    {server.desc}
                                  </div>
                                  {server.tags && (
                                    <div className="mt-1 flex gap-1 flex-wrap">
                                      {server.tags.split(',').map((tag: string, i: number) => (
                                        <span key={i} className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[9px] uppercase font-bold tracking-wider">
                                          {tag.trim()}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </td>
                                <td className="px-6 py-3 text-red-500 font-medium">{fmt(server.costPrice || 0)}đ</td>
                                <td className="px-6 py-3">
                                  {server.originalPrice && (
                                    <div className="text-xs text-on-surface-variant line-through mb-0.5">{fmt(server.originalPrice)}đ</div>
                                  )}
                                  <div className="text-cyan-400 font-bold">{fmt(server.price)}đ</div>
                                  {server.flashSaleEndTime && (
                                    <div className="text-[10px] text-orange-400 flex items-center justify-between mt-1 p-1 bg-orange-500/10 rounded w-fit gap-2">
                                      <span>Đến: {new Date(server.flashSaleEndTime).toLocaleString('vi-VN')}</span>
                                      <button onClick={() => handleRemoveSingleFlashSale(server.id)} className="text-red-400 hover:text-red-300">
                                        <span className="material-symbols-outlined text-[12px]">close</span>
                                      </button>
                                    </div>
                                  )}
                                </td>
                                <td className="px-6 py-3 text-on-surface-variant text-xs">
                                  {fmt(server.min)} - {fmt(server.max)}
                                </td>
                                <td className="px-6 py-3 text-center">
                                  <button 
                                    onClick={() => toggleStatus(server)}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${server.status === 'hoat_dong' ? 'bg-[#10b981]' : 'bg-surface border border-outline/30'}`}
                                    title={server.status === 'hoat_dong' ? 'Đang hoạt động' : 'Bảo trì'}
                                  >
                                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${server.status === 'hoat_dong' ? 'translate-x-4 ml-0' : 'translate-x-1 ml-0'}`} />
                                  </button>
                                </td>
                                <td className="px-6 py-3">
                                  <div className="flex items-center justify-end gap-1">
                                    <button onClick={() => openModal(server)} className="p-1.5 rounded-lg hover:bg-surface-variant/80 text-on-surface-variant hover:text-primary transition-all" title="Sửa">
                                      <span className="material-symbols-outlined text-[16px]">edit_square</span>
                                    </button>
                                    <button onClick={() => handleDeleteServer(server.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-on-surface-variant hover:text-red-400 transition-all" title="Xóa">
                                      <span className="material-symbols-outlined text-[16px]">delete</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Thêm/Sửa */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/90 backdrop-blur-sm" onClick={closeModal}></div>
          <div className="glass-panel relative w-full max-w-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200 shadow-2xl border border-primary/20 max-h-[90vh] overflow-y-auto">
            <button 
              onClick={closeModal}
              className="absolute right-4 top-4 p-2 rounded-full hover:bg-surface-variant text-on-surface-variant transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            
            <h2 className="text-xl md:text-2xl font-bold text-on-surface mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">{editingServer ? 'edit_document' : 'add_circle'}</span>
              {editingServer ? 'Chỉnh sửa Máy Chủ' : 'Tạo Máy Chủ Mới'}
            </h2>
            
            <form id="server-form" onSubmit={handleSaveServer} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-1">Nền tảng (Platform) <span className="text-red-500">*</span></label>
                  <input type="text" name="platform" list="platforms-list" className="input-glass w-full font-medium" defaultValue={editingServer?.platform || 'facebook'} placeholder="VD: facebook, shopee..." required />
                  <datalist id="platforms-list">
                    <option value="facebook" /><option value="tiktok" /><option value="instagram" /><option value="youtube" /><option value="shopee" /><option value="google" /><option value="telegram" /><option value="x-twitter" /><option value="threads" /><option value="lazada" />
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-1">Loại Dịch vụ <span className="text-red-500">*</span></label>
                  <input type="text" name="serviceType" className="input-glass w-full font-medium" defaultValue={editingServer?.serviceType} placeholder="VD: Tăng Like Bài Viết..." required />
                  <p className="text-[11px] text-on-surface-variant/70 mt-1">Gõ tự do. Dịch vụ cùng Tên Nền Tảng + Loại sẽ gom chung.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                <div className="md:col-span-6">
                  <label className="block text-sm font-medium text-on-surface-variant mb-1">Tên Máy Chủ <span className="text-red-500">*</span></label>
                  <input type="text" name="name" className="input-glass w-full text-base font-medium text-cyan-100" defaultValue={editingServer?.name} placeholder="VD: Server 1" required />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-on-surface-variant mb-1">Nguồn API</label>
                  <select name="apiProvider" className="input-glass w-full appearance-none font-medium text-purple-400" defaultValue={editingServer?.apiProvider || ''}>
                    <option value="" className="text-gray-400">Không có (Thủ công)</option>
                    <option value="baostar">Baostar</option>
                    <option value="subgiare">SubGiaRe</option>
                    <option value="1dg">1DG</option>
                  </select>
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-on-surface-variant mb-1">ID Gói API</label>
                  <input type="text" name="apiServiceId" className="input-glass w-full text-base font-medium" defaultValue={editingServer?.apiServiceId} placeholder="VD: 3123" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-1">Thẻ (Tags) - Ngăn cách phẩy</label>
                  <input type="text" name="tags" className="input-glass w-full text-sm" defaultValue={editingServer?.tags} placeholder="VD: Nhanh, VIP" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-1">Mô tả chi tiết</label>
                  <textarea name="desc" rows={2} className="input-glass w-full resize-none text-sm" defaultValue={editingServer?.desc} placeholder="Quy định..." />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-4 rounded-xl border border-primary/20 bg-primary/5">
                <div>
                  <label className="block text-sm font-medium text-red-500 mb-1">Giá Vốn (Cost Price)</label>
                  <div className="relative">
                    <input type="number" step="any" name="costPrice" className="input-glass w-full pr-8 text-red-500 font-bold" defaultValue={editingServer?.costPrice || 0} required />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant">đ</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-cyan-400 mb-1">Giá Bán (Selling Price) <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input type="number" step="any" name="price" className="input-glass w-full pr-8 text-cyan-400 font-bold" defaultValue={editingServer?.price} required />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant">đ</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-1">Mua tối thiểu (Min) <span className="text-red-500">*</span></label>
                  <input type="number" name="min" className="input-glass w-full" defaultValue={editingServer?.min || 100} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-1">Mua tối đa (Max) <span className="text-red-500">*</span></label>
                  <input type="number" name="max" className="input-glass w-full" defaultValue={editingServer?.max || 10000} required />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 border-t border-outline-variant/30 pt-4">
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-2">Trạng thái Server</label>
                  <select name="status" className="input-glass w-full appearance-none" defaultValue={editingServer?.status || 'hoat_dong'}>
                    <option value="hoat_dong">Đang Hoạt Động</option>
                    <option value="bao_tri">Bảo Trì</option>
                    <option value="cham">Lên Chậm</option>
                  </select>
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <input type="checkbox" name="hot" id="hot-check" defaultChecked={editingServer?.hot} className="w-5 h-5 rounded border-outline-variant/50 text-red-500 focus:ring-red-500 bg-surface-variant" />
                  <label htmlFor="hot-check" className="text-sm font-medium text-on-surface flex items-center gap-2 cursor-pointer">
                    Đánh dấu <span className="bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">Hot</span>
                  </label>
                </div>
              </div>
            </form>
            <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-outline-variant/30">
              <button onClick={closeModal} className="btn-social w-24 justify-center">
                Hủy
              </button>
              <button type="submit" form="server-form" disabled={isSubmitting} className="btn-primary flex items-center gap-2 shadow-lg">
                {isSubmitting ? (
                  <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
                ) : (
                  <span className="material-symbols-outlined text-[18px]">save</span>
                )}
                {isSubmitting ? 'Đang lưu...' : 'Lưu Máy Chủ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Bulk Discount */}
      {isBulkDiscountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/90 backdrop-blur-sm" onClick={() => setIsBulkDiscountModalOpen(false)}></div>
          <div className="glass-panel relative w-full max-w-md p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200 shadow-2xl border border-purple-500/30">
            <button 
              onClick={() => setIsBulkDiscountModalOpen(false)}
              className="absolute right-4 top-4 p-2 rounded-full hover:bg-surface-variant text-on-surface-variant transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            
            <h2 className="text-xl md:text-2xl font-bold text-on-surface mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-purple-400">percent</span>
              Flash Sale / Giảm Giá Hàng Loạt
            </h2>
            
            <form onSubmit={handleApplyBulkDiscount} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">Đối tượng áp dụng</label>
                <select 
                  name="target" 
                  className="input-glass w-full appearance-none font-medium"
                  value={flashSaleTarget}
                  onChange={(e) => setFlashSaleTarget(e.target.value)}
                >
                  <option value="SELECTED">Chỉ các dịch vụ đang được tick ở bảng ({selectedIds.length})</option>
                  <option value="ALL">Toàn bộ dịch vụ trong hệ thống</option>
                  <option value="SPECIFIC">Chọn dịch vụ cụ thể tại đây</option>
                </select>
              </div>

              {flashSaleTarget === 'SPECIFIC' && (
                <div className="bg-surface-variant/30 p-4 rounded-xl border border-outline-variant/30 space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar">
                   {filteredServers.map(s => (
                     <label key={s.id} className="flex items-center gap-2 text-sm text-on-surface cursor-pointer p-2 hover:bg-white/5 rounded">
                       <input 
                         type="checkbox" 
                         checked={selectedIds.includes(s.id)} 
                         onChange={() => toggleSelect(s.id)} 
                         className="w-4 h-4 rounded text-cyan-500" 
                       />
                       <span className="truncate">{s.name} ({s.platform})</span>
                     </label>
                   ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-1">Loại giảm giá</label>
                  <select name="discountType" className="input-glass w-full appearance-none font-medium">
                    <option value="PERCENT">Phần trăm (%)</option>
                    <option value="FIXED">Số tiền (đ)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-1">Mức giảm</label>
                  <input type="number" name="discountValue" className="input-glass w-full font-bold text-cyan-400" placeholder="VD: 10" required />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">Thời gian kết thúc (Bỏ trống = Không hẹn giờ)</label>
                <input type="datetime-local" name="flashSaleEndTime" className="input-glass w-full" />
              </div>

              <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-outline-variant/30">
                <button type="button" onClick={() => setIsBulkDiscountModalOpen(false)} className="btn-social w-24 justify-center">
                  Hủy
                </button>
                <button type="submit" disabled={isSubmitting} className="btn-primary bg-purple-500 hover:bg-purple-600 border-purple-400 flex items-center gap-2 shadow-lg">
                  {isSubmitting ? (
                    <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
                  ) : (
                    <span className="material-symbols-outlined text-[18px]">flash_on</span>
                  )}
                  {isSubmitting ? 'Đang chạy...' : 'Áp Dụng Khuyến Mãi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

