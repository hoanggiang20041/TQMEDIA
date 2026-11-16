'use client'

import React, { useState, useEffect } from 'react'
import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'
import ConfigTab from './ConfigTab'

const MySwal = withReactContent(Swal)

export default function AgenciesManagementPage() {
  const [activeLevel, setActiveLevel] = useState(1)
  const [discounts, setDiscounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [formData, setFormData] = useState({
    itemType: 'SERVICE',
    itemId: 'ALL',
    discountPercent: 0
  })

  const [itemsList, setItemsList] = useState<{id: string, name: string}[]>([])
  const [applyAll, setApplyAll] = useState(true)
  const [selectedItems, setSelectedItems] = useState<string[]>([])

  const itemTypes = [
    { id: 'SERVICE', name: 'Dịch vụ SMM' },
    { id: 'RESOURCE', name: 'Tài nguyên' },
    { id: 'COURSE', name: 'Khóa học' }
  ]

  useEffect(() => {
    fetchDiscounts()
  }, [])

  useEffect(() => {
    fetchItemsList(formData.itemType)
    setApplyAll(true)
    setSelectedItems([])
  }, [formData.itemType])

  const fetchItemsList = async (type: string) => {
    try {
      let url = ''
      if (type === 'SERVICE') url = '/api/admin/services'
      else if (type === 'RESOURCE') url = '/api/admin/resources'
      else if (type === 'COURSE') url = '/api/courses'
      
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${localStorage.getItem('tq_token')}` } })
      const data = await res.json()
      
      if (type === 'SERVICE') {
        setItemsList(data.map((s:any) => ({ id: s.id.toString(), name: `[${(s.platform || 'Khác').toUpperCase()}] - ${s.name}` })))
      } else if (type === 'RESOURCE') {
        setItemsList(data.map((r:any) => ({ id: r.id.toString(), name: r.name, variants: r.variants })))
      } else if (type === 'COURSE') {
        setItemsList(data.map((c:any) => ({ id: c.id.toString(), name: c.title })))
      }
    } catch (err) {
      console.error(err)
    }
  }

  const fetchDiscounts = async () => {
    try {
      const res = await fetch('/api/admin/agency-discounts', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('tq_token')}` }
      })
      const data = await res.json()
      if (data.success) {
        setDiscounts(data.discounts)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const itemsToSave = applyAll ? ['ALL'] : selectedItems
      
      if (itemsToSave.length === 0) {
        return MySwal.fire({ icon: 'warning', title: 'Cảnh báo', text: 'Vui lòng chọn ít nhất 1 sản phẩm!' })
      }

      await Promise.all(itemsToSave.map(id => 
        fetch('/api/admin/agency-discounts', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('tq_token')}` },
          body: JSON.stringify({
            agencyLevel: activeLevel,
            itemType: formData.itemType,
            itemId: id,
            discountPercent: Number(formData.discountPercent)
          })
        })
      ))

      MySwal.fire({ icon: 'success', title: 'Thành công', text: 'Đã lưu cấu hình giảm giá!' })
      fetchDiscounts()
      setFormData({ ...formData, discountPercent: 0 })
      if (!applyAll) setSelectedItems([])
    } catch (err) {
      MySwal.fire({ icon: 'error', title: 'Lỗi', text: 'Không thể lưu dữ liệu' })
    }
  }

  const handleDelete = async (itemType: string, itemId: string | string[]) => {
    const result = await MySwal.fire({
      title: 'Xóa cấu hình?',
      text: "Bạn có chắc chắn muốn xóa cấu hình giảm giá này?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#3b82f6',
      confirmButtonText: 'Xóa',
      cancelButtonText: 'Hủy'
    })

    if (result.isConfirmed) {
      try {
        const itemsToDelete = Array.isArray(itemId) ? itemId : [itemId];
        await Promise.all(itemsToDelete.map(id => 
          fetch('/api/admin/agency-discounts', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('tq_token')}` },
            body: JSON.stringify({ agencyLevel: activeLevel, itemType, itemId: id })
          })
        ));
        MySwal.fire('Đã xóa!', 'Cấu hình đã được xóa.', 'success')
        fetchDiscounts()
      } catch (err) { }
    }
  }

  const currentDiscounts = discounts.filter(d => d.agencyLevel === activeLevel)

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display-lg text-primary neon-glow">Hệ thống Đại lý</h1>
        <p className="font-body-md text-on-surface-variant mt-1">Cấu hình phần trăm chiết khấu cho 10 cấp đại lý</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
        {[0, 1, 2, 3, 4].map(level => (
          <button
            key={level}
            onClick={() => setActiveLevel(level)}
            className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors ${activeLevel === level ? 'bg-primary text-on-primary shadow-lg shadow-primary/20' : 'bg-surface-variant text-on-surface-variant hover:text-white hover:bg-surface-variant/80'}`}
          >
            {level === 0 ? 'Cấu hình Mời & Nâng cấp' : `Đại lý Cấp ${level}`}
          </button>
        ))}
      </div>

      {activeLevel === 0 ? (
        <ConfigTab />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Add */}
        <div className="glass-panel p-6">
          <h2 className="font-headline-sm text-on-surface mb-6">Thêm/Sửa Chiết khấu (Cấp {activeLevel})</h2>
          
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-1">Loại danh mục</label>
              <select
                value={formData.itemType}
                onChange={e => setFormData({ ...formData, itemType: e.target.value })}
                className="input-glass w-full"
              >
                {itemTypes.map(t => <option key={t.id} value={t.id} className="bg-surface">{t.name}</option>)}
              </select>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-on-surface-variant">Sản phẩm áp dụng</label>
              
              <label className="flex items-center gap-3 p-3 rounded-lg border border-primary/30 bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors">
                <input
                  type="checkbox"
                  checked={applyAll}
                  onChange={e => setApplyAll(e.target.checked)}
                  className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary bg-surface"
                />
                <span className="font-semibold text-primary">Tất cả sản phẩm trong danh mục này (ALL)</span>
              </label>

              {!applyAll && (
                <div className="max-h-72 overflow-y-auto space-y-2 pr-2 custom-scrollbar border border-outline-variant/30 p-2 rounded-lg bg-surface/50">
                  {(() => {
                    const groupedItemsList: Record<string, typeof itemsList> = {};
                    if (formData.itemType === 'SERVICE') {
                      itemsList.forEach(item => {
                        const match = item.name.match(/^(.*?)(?:\s*\([^)]*\))?$/);
                        const baseName = match ? match[1].trim() : item.name;
                        if (!groupedItemsList[baseName]) groupedItemsList[baseName] = [];
                        groupedItemsList[baseName].push(item);
                      });
                    } else if (formData.itemType === 'RESOURCE') {
                      itemsList.forEach((resource: any) => {
                        if (resource.variants && resource.variants.length > 0) {
                           groupedItemsList[resource.name] = resource.variants;
                        } else {
                           groupedItemsList[resource.name] = [resource];
                        }
                      });
                    } else {
                      itemsList.forEach(item => {
                        groupedItemsList[item.name] = [item];
                      });
                    }
                    
                    return Object.entries(groupedItemsList).map(([groupName, items]) => {
                      const isAllSelected = items.length > 0 && items.every(i => selectedItems.includes(i.id));
                      const isSomeSelected = items.length > 0 && items.some(i => selectedItems.includes(i.id));
                      
                      return (
                        <div key={groupName} className="border border-outline-variant/20 rounded bg-white/[0.02]">
                          <label className="flex items-center gap-3 p-2 rounded hover:bg-surface-variant/30 cursor-pointer transition-colors font-medium">
                            <input
                              type="checkbox"
                              checked={isAllSelected}
                              ref={el => { if (el) el.indeterminate = isSomeSelected && !isAllSelected; }}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  const newSet = new Set([...selectedItems, ...items.map(i => i.id)]);
                                  setSelectedItems(Array.from(newSet));
                                } else {
                                  setSelectedItems(selectedItems.filter(id => !items.find(i => i.id === id)));
                                }
                              }}
                              className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary bg-surface"
                            />
                            <span className="text-sm text-primary line-clamp-1">{groupName} {items.length > 1 ? `(${items.length})` : ''}</span>
                          </label>
                          
                          {items.length > 1 && (
                            <div className="pl-6 pr-2 pb-2 space-y-1">
                              {items.map(item => (
                                <label key={item.id} className="flex items-center gap-3 p-1.5 rounded hover:bg-surface-variant/30 cursor-pointer transition-colors">
                                  <input
                                    type="checkbox"
                                    checked={selectedItems.includes(item.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) setSelectedItems([...selectedItems, item.id])
                                      else setSelectedItems(selectedItems.filter(id => id !== item.id))
                                    }}
                                    className="w-3.5 h-3.5 rounded border-outline-variant text-primary focus:ring-primary bg-surface"
                                  />
                                  <span className="text-xs text-on-surface/80 line-clamp-1">{item.name}</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                  {itemsList.length === 0 && (
                    <div className="text-center text-sm text-on-surface-variant p-4">Không có sản phẩm nào</div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-1">Phần trăm giảm giá (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.discountPercent}
                onChange={e => setFormData({ ...formData, discountPercent: Number(e.target.value) })}
                className="input-glass w-full"
                required
              />
            </div>

            <button type="submit" className="btn-primary w-full py-2.5 rounded-xl font-semibold">
              Lưu Cấu hình
            </button>
          </form>
        </div>

        {/* List */}
        <div className="lg:col-span-2 glass-panel p-6">
          <h2 className="font-headline-sm text-on-surface mb-6">Danh sách Chiết khấu (Cấp {activeLevel})</h2>
          
          {loading ? (
            <div className="text-center py-10 text-on-surface-variant">Đang tải...</div>
          ) : currentDiscounts.length === 0 ? (
            <div className="text-center py-10 text-on-surface-variant">Chưa có cấu hình nào cho Đại lý Cấp {activeLevel}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-outline-variant/30">
                    <th className="text-left font-semibold text-xs text-on-surface-variant uppercase tracking-wider py-4 pr-4">Danh mục</th>
                    <th className="text-left font-semibold text-xs text-on-surface-variant uppercase tracking-wider py-4 pr-4">ID Gói / Áp dụng</th>
                    <th className="text-left font-semibold text-xs text-on-surface-variant uppercase tracking-wider py-4 pr-4">Chiết khấu</th>
                    <th className="text-right font-semibold text-xs text-on-surface-variant uppercase tracking-wider py-4">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {(() => {
                    const groupedDiscounts: Record<string, any[]> = {};
                    currentDiscounts.forEach(d => {
                      let groupName = d.itemName || d.itemId;
                      if (d.itemType === 'SERVICE' && d.itemId !== 'ALL') {
                        const match = groupName.match(/^(.*?)(?:\s*\([^)]*\))?$/);
                        groupName = match ? match[1].trim() : groupName;
                      }
                      const key = `${d.itemType}_${groupName}_${d.discountPercent}`;
                      if (!groupedDiscounts[key]) groupedDiscounts[key] = [];
                      groupedDiscounts[key].push(d);
                    });

                    return Object.values(groupedDiscounts).map((groupItems, idx) => {
                      const first = groupItems[0];
                      const isGroup = groupItems.length > 1;
                      const groupName = isGroup ? (() => {
                         const match = (first.itemName || first.itemId).match(/^(.*?)(?:\s*\([^)]*\))?$/);
                         return match ? match[1].trim() : (first.itemName || first.itemId);
                      })() : (first.itemName || first.itemId);

                      return (
                        <tr key={idx} className="hover:bg-surface-variant/20 transition-colors">
                          <td className="py-4 pr-4">
                            <span className="font-medium text-sm text-on-surface">{itemTypes.find(t => t.id === first.itemType)?.name}</span>
                          </td>
                          <td className="py-4 pr-4">
                            {first.itemId === 'ALL' ? (
                              <span className="font-mono text-xs px-2 py-1 rounded bg-primary/20 text-primary">
                                Tất cả (Mặc định)
                              </span>
                            ) : (
                              <div>
                                <div className="text-sm font-medium text-on-surface line-clamp-2">
                                  {groupName} {isGroup && <span className="text-primary text-xs ml-1 font-bold">({groupItems.length} dịch vụ)</span>}
                                </div>
                                {!isGroup && first.itemName !== first.itemId && <div className="text-xs text-on-surface-variant font-mono mt-1 opacity-70">{first.itemId}</div>}
                              </div>
                            )}
                          </td>
                          <td className="py-4 pr-4">
                            <span className="text-green-400 font-bold">-{first.discountPercent}%</span>
                          </td>
                          <td className="py-4 text-right">
                            <button 
                              onClick={() => handleDelete(first.itemType, isGroup ? groupItems.map(i => i.itemId) : first.itemId)}
                              className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center ml-auto"
                              title={isGroup ? `Xóa cả ${groupItems.length} cấu hình` : "Xóa cấu hình"}
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
