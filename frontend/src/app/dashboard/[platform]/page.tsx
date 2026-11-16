"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { useRole } from '@/context/RoleContext'
import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'
import Link from 'next/link'
import { useSearchParams, useParams, useRouter } from 'next/navigation'
import { MENU_SERVICES, MENU_SOCIAL } from '@/lib/constants'

const MySwal = withReactContent(Swal)

export default function GenericServicePage() {
  const { user, refreshUser, getDiscountFor } = useRole()
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const platform = (params.platform as string) || 'facebook'
  const typeParam = searchParams.get('type')

  const platformMenu = MENU_SERVICES.find(m => m.label.toLowerCase() === platform.toLowerCase()) 
                    || MENU_SOCIAL.find(m => m.label.toLowerCase() === platform.toLowerCase())
  const fixedTypes = platformMenu?.subItems?.map(s => s.label) || []

  const [servers, setServers] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)
  const [currentServiceType, setCurrentServiceType] = useState('')
  const [currentServerIdx, setCurrentServerIdx] = useState(-1)
  const [url, setUrl] = useState('')
  const [quantity, setQuantity] = useState(0)
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Custom Data Fields
  const [comments, setComments] = useState('')
  const [reactionTypes, setReactionTypes] = useState<string[]>(['LIKE'])
  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single')
  const [bulkData, setBulkData] = useState('')

  useEffect(() => {
    fetch(`/api/services/${platform}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('tq_token')}` } })
      .then(res => res.json())
      .then(data => {
        setServers(data)
        
        let initialType = ''
        if (typeParam && (fixedTypes.includes(typeParam) || data[typeParam])) {
          initialType = typeParam
        } else if (fixedTypes.length > 0) {
          initialType = fixedTypes[0]
        } else {
          const types = Object.keys(data)
          if (types.length > 0) initialType = types[0]
        }

        if (initialType) {
          setCurrentServiceType(initialType)
        }
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load servers', err)
        setLoading(false)
      })
  }, [platform])

  const availableServers = servers[currentServiceType] || []
  
  const groupedServers = useMemo(() => {
    const groups: { baseServer: any, reactions: Record<string, any> }[] = [];
    const groupMap: Record<string, number> = {};
    
    availableServers.forEach(srv => {
      const match = srv.name.match(/^(.*?)\(\s*(like|love|care|haha|wow|sad|angry|\d+\s*phút|\d+\s*tháng)\s*\)$/i);
      if (match) {
        const baseName = match[1].trim();
        const reaction = match[2].toUpperCase();
        
        if (groupMap[baseName] === undefined) {
          groupMap[baseName] = groups.length;
          groups.push({ baseServer: { ...srv, name: baseName }, reactions: {} });
        }
        groups[groupMap[baseName]].reactions[reaction] = srv;
      } else {
        if (groupMap[srv.name] === undefined) {
          groupMap[srv.name] = groups.length;
          groups.push({ baseServer: srv, reactions: {} });
        }
      }
    });
    return groups;
  }, [availableServers]);

  const currentServerGroup = groupedServers[currentServerIdx] ?? null;
  const hasReactions = currentServerGroup && Object.keys(currentServerGroup.reactions).length > 0;
  
  let currentServer = currentServerGroup?.baseServer ?? null;
  if (hasReactions && reactionTypes.length > 0 && currentServerGroup.reactions[reactionTypes[0]]) {
    currentServer = currentServerGroup.reactions[reactionTypes[0]];
  } else if (hasReactions && currentServerGroup.reactions) {
    const firstReaction = Object.keys(currentServerGroup.reactions)[0];
    if (firstReaction) currentServer = currentServerGroup.reactions[firstReaction];
  }

  const typeAndName = (currentServiceType + ' ' + (currentServer?.name || '')).toLowerCase();
  const isCommentService = typeAndName.includes('comment') || typeAndName.includes('bình luận') || typeAndName.includes('review') || typeAndName.includes('đánh giá');
  const isReactionService = hasReactions || typeAndName.includes('reaction') || typeAndName.includes('cảm xúc');

  // Auto calculate quantity for comments
  useEffect(() => {
    if (isCommentService) {
      const lines = comments.split('\n').filter(l => l.trim() !== '')
      const newQuantity = lines.length
      if (newQuantity < (currentServer?.min || 1)) {
        setQuantity(currentServer?.min || 1)
      } else if (newQuantity > (currentServer?.max || 10000)) {
        setQuantity(currentServer?.max || 10000)
      } else {
        setQuantity(newQuantity)
      }
    }
  }, [comments, isCommentService, currentServer])

  const handleServiceTypeChange = (type: string) => {
    setCurrentServiceType(type)
    setCurrentServerIdx(-1)
    setQuantity(0)
    setReactionTypes(['LIKE'])
    router.push(`/dashboard/${platform}?type=${encodeURIComponent(type)}`)
  }

  // Handle URL typeParam changes from sidebar clicks
  useEffect(() => {
    if (Object.keys(servers).length > 0 && typeParam) {
      if (fixedTypes.includes(typeParam) || servers[typeParam]) {
        setCurrentServiceType(typeParam)
        setCurrentServerIdx(-1)
        setQuantity(0)
        setReactionTypes(['LIKE'])
      }
    }
  }, [typeParam, servers])

  const handleServerChange = (idx: number) => {
    setCurrentServerIdx(idx)
    setQuantity(groupedServers[idx]?.baseServer?.min || 0)
    if (groupedServers[idx] && Object.keys(groupedServers[idx].reactions).length > 0) {
      setReactionTypes([Object.keys(groupedServers[idx].reactions)[0]]);
    } else {
      setReactionTypes([]);
    }
  }

  const total = useMemo(() => {
    const basePrice = currentServer?.price || 0;
    const disc = currentServer ? getDiscountFor('SERVICE', currentServer.id) : 0;
    const discountedPrice = basePrice * (1 - disc / 100);
    const baseTotal = discountedPrice * quantity;
    if (isReactionService && reactionTypes.length > 0) {
      return baseTotal * reactionTypes.length;
    }
    return baseTotal;
  }, [currentServer, quantity, isReactionService, reactionTypes]);

  const fmt = (val: number) => new Intl.NumberFormat('vi-VN').format(val)

  const handleCreateOrder = async () => {
    if (!currentServer) return MySwal.fire({ icon: 'info', title: 'Thông báo', text: 'Vui lòng chọn máy chủ!' })
    if (currentServer?.status === 'bao_tri') return MySwal.fire({ icon: 'error', title: 'Bảo trì', text: 'Máy chủ đang bảo trì!' })
    
    let ordersToCreate: any[] = [];
    let bulkTotal = 0;

    if (activeTab === 'bulk') {
        const lines = bulkData.split('\n').map(l => l.trim()).filter(l => l !== '');
        if (lines.length === 0) return MySwal.fire({ icon: 'info', title: 'Thông báo', text: 'Vui lòng nhập dữ liệu đặt đơn hàng loạt!' })
        
        for (const line of lines) {
           const parts = line.split('|').map(p => p.trim());
           if (parts.length < 2) continue;
           const targetUrl = parts[0];
           const targetQty = parseInt(parts[1]);
           if (isNaN(targetQty)) continue;
           
           if (currentServer && targetQty < currentServer.min) {
              return MySwal.fire({ icon: 'error', title: 'Lỗi số lượng', text: `Link ${targetUrl} có số lượng (${targetQty}) nhỏ hơn tối thiểu (${currentServer.min})!` })
           }
           if (currentServer && targetQty > currentServer.max) {
              return MySwal.fire({ icon: 'error', title: 'Lỗi số lượng', text: `Link ${targetUrl} có số lượng (${targetQty}) lớn hơn tối đa (${currentServer.max})!` })
           }
           
           const itemTotal = ((currentServer.price || 0) * (1 - getDiscountFor('SERVICE', currentServer.id)/100)) * targetQty;
           bulkTotal += itemTotal;
           
           ordersToCreate.push({
             platform: platform,
             serviceType: currentServiceType,
             serverId: currentServer.id,
             serverName: currentServer.name,
             target: targetUrl,
             quantity: targetQty,
             total: itemTotal,
             note: note,
           });
        }
        if (ordersToCreate.length === 0) return MySwal.fire({ icon: 'error', title: 'Thông báo', text: 'Sai định dạng dữ liệu (Link | Số lượng)!' })
        
        const confirmObj = await MySwal.fire({
          title: 'Xác nhận tạo nhiều đơn',
          text: `Bạn có chắc chắn muốn thanh toán ${fmt(bulkTotal)}đ cho ${ordersToCreate.length} đơn hàng?`,
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'Đồng ý',
          cancelButtonText: 'Hủy'
        });
        if (!confirmObj.isConfirmed) return;
    } else {
        if (!url) return MySwal.fire({ icon: 'info', title: 'Thông báo', text: 'Vui lòng nhập link!' })
        if (isCommentService && comments.split('\n').filter(l=>l.trim()).length === 0) {
          return MySwal.fire({ icon: 'info', title: 'Thông báo', text: 'Vui lòng nhập nội dung bình luận!' })
        }
        
        if (currentServer && quantity < currentServer.min) {
           return MySwal.fire({ icon: 'error', title: 'Lỗi số lượng', text: `Số lượng đặt tối thiểu của máy chủ này là ${currentServer.min}!` })
        }
        if (currentServer && quantity > currentServer.max) {
           return MySwal.fire({ icon: 'error', title: 'Lỗi số lượng', text: `Số lượng đặt tối đa của máy chủ này là ${currentServer.max}!` })
        }
        
        const confirmObj = await MySwal.fire({
          title: 'Xác nhận tạo đơn',
          text: `Bạn có chắc chắn muốn thanh toán ${fmt(total)}đ cho đơn hàng này?`,
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'Đồng ý',
          cancelButtonText: 'Hủy'
        });
        if (!confirmObj.isConfirmed) return;
        
        const customData: any = {}
        if (isCommentService) customData.comments = comments
        
        if (isReactionService && reactionTypes.length > 0) {
           reactionTypes.forEach((rType, index) => {
              const q = quantity;
              const rServer = currentServerGroup?.reactions[rType] || currentServerGroup?.baseServer;
              
              ordersToCreate.push({
                 platform: platform,
                 serviceType: currentServiceType,
                 serverId: rServer.id,
                 serverName: rServer.name,
                 target: url,
                 quantity: q,
                 total: q * ((rServer.price || 0) * (1 - getDiscountFor('SERVICE', rServer.id)/100)),
                 note: note,
                 customData: { reactionType: rType }
              })
           });
        } else {
           ordersToCreate.push({
             platform: platform,
             serviceType: currentServiceType,
             serverId: currentServer.id,
             serverName: currentServer.name,
             target: url,
             quantity: quantity,
             total: total,
             note: note,
             customData: Object.keys(customData).length > 0 ? customData : undefined
           })
        }
    }

    setIsSubmitting(true)
    try {

      let successCount = 0;
      let lastError = '';

      for (const payload of ordersToCreate) {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('tq_token')}` },
          body: JSON.stringify(payload)
        })
        const data = await res.json()
        if (data.success) {
           successCount++;
        } else {
           lastError = data.error;
        }
      }

      if (successCount > 0) {
        refreshUser()
        
        MySwal.fire({
          icon: 'success',
          title: 'Thành công!',
          text: `Bạn đã tạo thành công ${successCount} đơn hàng với tổng trị giá ${fmt((total / ordersToCreate.length) * successCount)}đ.`,
          showCancelButton: true,
          confirmButtonText: 'Xem đơn hàng',
          cancelButtonText: 'Tiếp tục mua',
          confirmButtonColor: '#10B981',
          cancelButtonColor: '#6B7280'
        }).then((result) => {
          if (result.isConfirmed) {
            router.push('/dashboard/orders');
          } else {
            setUrl('');
            setNote('');
            setComments('');
            setBulkData('');
          }
        });
      } else {
        MySwal.fire({ icon: 'info', title: 'Thông báo', text: lastError || 'Có lỗi xảy ra!' })
      }
    } catch (err) {
      MySwal.fire({ icon: 'error', title: 'Thông báo', text: 'Không thể kết nối đến máy chủ!' })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-on-surface flex flex-col items-center"><span className="material-symbols-outlined text-4xl animate-spin mb-2">sync</span>Đang tải dữ liệu máy chủ...</div>
  if (Object.keys(servers).length === 0 && fixedTypes.length === 0) return <div className="p-8 text-center text-on-surface">Không có dịch vụ nào cho nền tảng này.</div>

  return (
    <>
      <section className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/20 text-primary border border-primary/30">
          <span className="material-symbols-outlined text-[28px]">rocket_launch</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-on-surface tracking-tight capitalize">Dịch Vụ {platform}</h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Hệ thống tự động tăng tương tác an toàn và nhanh chóng
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6 pb-24 md:pb-0">
        {/* Left Column: Form */}
        <div className="space-y-6">
          <div className="glass-panel p-4 md:p-6 border border-outline-variant/30 relative overflow-hidden">
            <div className="flex items-center gap-6 border-b border-outline-variant/30 mb-6">
               <button onClick={() => setActiveTab('single')} className={`pb-3 text-[15px] font-medium transition-colors border-b-2 ${activeTab === 'single' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}>Đặt đơn</button>
               <button onClick={() => setActiveTab('bulk')} className={`pb-3 text-[15px] font-medium transition-colors border-b-2 ${activeTab === 'bulk' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}>Đặt nhiều đơn</button>
               <Link href="/dashboard/orders" className="pb-3 text-[15px] font-medium transition-colors border-b-2 border-transparent text-on-surface-variant hover:text-on-surface">Lịch sử đơn hàng</Link>
            </div>
            <h2 className="text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">shopping_cart</span>
              Tạo đơn mới
            </h2>

            <div className="space-y-5">
              {/* Service Types Tabs */}
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-2">Dịch vụ <span className="text-red-500">*</span></label>
                <select
                  value={currentServiceType}
                  onChange={(e) => handleServiceTypeChange(e.target.value)}
                  className="w-full bg-surface border border-outline-variant/30 text-on-surface text-sm p-3 rounded-lg focus:outline-none focus:border-[#5942E9] transition-colors"
                >
                  {(fixedTypes.length > 0 ? fixedTypes : Object.keys(servers)).map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Servers */}
              <div className="flex flex-col md:flex-row gap-2 md:gap-4">
                <div className="md:w-[150px] shrink-0 font-bold text-sm text-on-surface-variant flex items-center gap-2 mt-2 md:mt-0">
                  <span className="material-symbols-outlined">dns</span>
                  Máy chủ
                </div>
                <div className="flex-1 flex flex-col gap-2">
                  {availableServers.length === 0 ? (
                    <div className="text-sm text-on-surface-variant italic p-4 text-center border rounded-xl border-dashed border-outline-variant/50">
                      Chưa có máy chủ nào cho dịch vụ này
                    </div>
                  ) : (
                    groupedServers.map((group, idx) => (
                    <label
                      key={group.baseServer.id}
                      className={`relative flex items-center justify-between cursor-pointer group p-3 rounded-lg border transition-all duration-200 ease-in-out ${currentServerIdx === idx ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20 z-10' : 'border-outline-variant/30 hover:border-primary/40 hover:bg-surface'}`}
                    >
                      <input
                        type="radio"
                        name="server"
                        className="hidden"
                        checked={currentServerIdx === idx}
                        onChange={() => handleServerChange(idx)}
                      />
                      
                      <div className="flex items-center gap-3">
                        {currentServerIdx === idx ? (
                          <span className="material-symbols-outlined text-primary text-[20px] shrink-0">radio_button_checked</span>
                        ) : (
                          <span className="material-symbols-outlined text-outline-variant text-[20px] shrink-0">radio_button_unchecked</span>
                        )}
                        
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                           <span className={`font-bold text-[14px] leading-tight ${currentServerIdx === idx ? 'text-primary' : 'text-on-surface group-hover:text-primary/90 transition-colors'}`}>
                             {group.baseServer.name}
                           </span>
                           {group.baseServer.hot && (
                              <span className="bg-gradient-to-r from-red-500 to-orange-500 text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded shadow-sm flex items-center gap-0.5 w-fit">
                                <span className="material-symbols-outlined text-[10px] leading-none">local_fire_department</span>
                                HOT
                              </span>
                           )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 ml-2">
                        <div className="flex flex-col items-end">
                          <div className="flex items-end gap-1">
                            <span className="text-primary font-black text-lg leading-none">{fmt(group.baseServer.price * (1 - getDiscountFor('SERVICE', group.baseServer.id)/100))}</span>
                            <span className="text-[10px] text-on-surface-variant font-bold pb-[1px]">VND</span>
                          </div>
                          
                          <div className="flex items-center gap-1 mt-1">
                            {group.baseServer.status === 'bao_tri' && (
                              <span className="text-error text-[10px] font-bold uppercase">Bảo trì</span>
                            )}
                            {group.baseServer.status === 'cham' && (
                              <span className="text-warning text-[10px] font-bold uppercase">Chậm</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </label>
                  )))}
                </div>
              </div>

              {/* Ghi chú dịch vụ - Only show when server is selected */}
              {currentServerIdx >= 0 && currentServer && (
                <div className="flex flex-col md:flex-row gap-2 md:gap-4 md:items-start mt-2">
                  <div className="md:w-[150px] shrink-0 font-bold text-sm text-on-surface-variant flex items-center gap-2 pt-2 hidden md:flex">
                    <span className="material-symbols-outlined">info</span>
                    Thông tin
                  </div>
                  <div className="flex-1 bg-primary/10 border border-primary/20 rounded-xl p-4 shadow-sm">
                    <div className="font-bold text-primary flex items-center gap-2 mb-2 md:hidden">
                      <span className="material-symbols-outlined text-[18px]">info</span>
                      Thông tin máy chủ
                    </div>
                    {currentServer.desc ? (
                      <div className="text-on-surface text-[13.5px] leading-relaxed whitespace-pre-wrap">
                        {currentServer.desc}
                      </div>
                    ) : (
                      <div className="text-on-surface-variant text-[13px] italic">
                        Luôn để tài khoản công khai trước khi mua
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* URL */}
              <div className="flex flex-col md:flex-row gap-2 md:gap-4 md:items-center mt-2">
                <div className="md:w-[150px] shrink-0 font-bold text-sm text-on-surface-variant flex flex-col md:mt-0">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined">link</span>
                    Liên kết
                  </div>
                </div>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Nhập link hoặc ID cần lên đơn..."
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    className="w-full bg-surface border border-outline-variant/30 text-on-surface text-sm p-3.5 rounded-xl focus:outline-none focus:border-primary transition-colors pr-24 shadow-sm"
                  />
                  <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary/10 text-primary text-[12px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-primary hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-[14px]">content_paste</span>
                    Dán
                  </button>
                </div>
              </div>

              {/* Custom Fields - Only show if server selected */}
              {currentServerIdx >= 0 && isReactionService && (
                <div className="flex flex-col md:flex-row gap-2 md:gap-4 md:items-center">
                  <div className="md:w-[150px] shrink-0 font-bold text-sm text-on-surface-variant">
                    {Object.keys(currentServerGroup?.reactions || {})[0]?.includes('PHÚT') || Object.keys(currentServerGroup?.reactions || {})[0]?.includes('THÁNG') ? 'Thời gian' : 'Cảm xúc'}
                  </div>
                  <div className="flex gap-2.5 text-2xl flex-wrap">
                    {hasReactions && Object.keys(currentServerGroup.reactions).map(rVal => {
                      const emojiMap: Record<string, string> = { 'LIKE': '👍', 'LOVE': '❤️', 'CARE': '🥰', 'HAHA': '😆', 'WOW': '😮', 'SAD': '😢', 'ANGRY': '😡' };
                      const emoji = emojiMap[rVal];
                      
                      return (
                      <button 
                        key={rVal}
                        onClick={() => {
                           if (reactionTypes.includes(rVal)) {
                              if (reactionTypes.length > 1) {
                                 setReactionTypes(reactionTypes.filter(x => x !== rVal));
                              }
                           } else {
                              if (rVal.includes('PHÚT') || rVal.includes('THÁNG')) {
                                setReactionTypes([rVal]);
                              } else {
                                setReactionTypes([...reactionTypes, rVal]);
                              }
                           }
                        }}
                        className={`flex items-center justify-center transition-all ${reactionTypes.includes(rVal) ? 'border-primary scale-110 bg-primary/10 text-primary shadow-sm' : 'border-outline-variant/30 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 hover:border-primary/50 text-on-surface'} ${emoji ? 'w-12 h-12 rounded-full border-2' : 'px-4 py-2 rounded-xl border-2 text-[13px] font-bold uppercase'}`}
                      >
                        {emoji || rVal}
                      </button>
                    )})}
                  </div>
                </div>
              )}

              {currentServerIdx >= 0 && isCommentService && (
                <div className="flex flex-col md:flex-row md:items-start gap-2 md:gap-4">
                  <div className="md:w-[150px] shrink-0 font-bold text-sm text-on-surface-variant mt-2">
                    Nội dung bình luận
                  </div>
                  <div className="flex-1">
                    <textarea
                      rows={5}
                      placeholder="Mỗi dòng 1 bình luận..."
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      className="w-full bg-surface border border-outline-variant/30 text-on-surface text-sm p-3.5 rounded-xl focus:outline-none focus:border-primary transition-colors resize-none shadow-sm"
                    />
                    <div className="text-right text-primary text-[12px] font-bold mt-1">
                      {comments.split('\n').filter(l=>l.trim()).length} dòng
                    </div>
                  </div>
                </div>
              )}

              {/* Quantity - Only show if server selected */}
              {currentServerIdx >= 0 && (
                <div className="flex flex-col md:flex-row gap-2 md:gap-4 md:items-center">
                  <div className="md:w-[150px] shrink-0 font-bold text-sm text-on-surface-variant flex flex-col mt-2 md:mt-0">
                    {isReactionService ? "Số lượng / Cảm xúc" : "Số lượng"}
                    {currentServer && (
                      <span className="text-error text-[11px] font-normal">({fmt(currentServer.min)} ~ {fmt(currentServer.max)})</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="number"
                      value={quantity}
                      min={currentServer?.min || 1}
                      max={currentServer?.max || 1000000}
                      onChange={e => {
                        if (!isCommentService) setQuantity(Number(e.target.value))
                      }}
                      onBlur={e => {
                        if (!isCommentService && currentServer) {
                          setQuantity(Number(e.target.value));
                        }
                      }}
                      readOnly={isCommentService}
                      className="w-full bg-surface border border-outline-variant/30 text-on-surface text-base p-3.5 rounded-xl focus:outline-none focus:border-primary transition-colors font-bold shadow-sm"
                    />
                  </div>
                </div>
              )}

              {/* Total & Submit */}
              <div className="flex flex-col md:flex-row gap-2 md:gap-4 md:items-start">
                <div className="md:w-[150px] shrink-0 font-bold text-sm text-on-surface-variant mt-2 md:mt-4">
                  Tổng thanh toán
                </div>
                <div className="flex-1">
                  <div className="w-full bg-surface border border-outline-variant/30 text-on-surface p-4 rounded-xl flex flex-col shadow-sm">
                    <div className="flex justify-between items-center">
                      {currentServerIdx >= 0 ? (
                        <>
                          <span className="font-black text-2xl text-primary">{fmt(total)}<span className="text-sm font-bold ml-1 text-on-surface-variant">đ</span></span>
                          <div className="border-l-2 border-outline-variant/30 pl-4 text-on-surface-variant text-[13px] font-medium">
                            {fmt(currentServer?.price || 0)} đ / 1
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="font-black text-2xl text-primary">0<span className="text-sm font-bold ml-1 text-on-surface-variant">đ</span></span>
                          <div className="border-l-2 border-outline-variant/30 pl-4 text-on-surface-variant text-[13px] font-medium">
                            0 đ / 1
                          </div>
                        </>
                      )}
                    </div>
                    
                    {isReactionService && reactionTypes.length > 1 && (
                      <div className="mt-3 pt-3 border-t border-outline-variant/20 text-xs text-warning font-medium flex items-start gap-1.5">
                        <span className="material-symbols-outlined text-[16px] leading-none">info</span>
                        <span>
                          Bạn đã chọn <b>{reactionTypes.length}</b> cảm xúc. Hệ thống sẽ tạo <b>{reactionTypes.length} đơn độc lập</b> (mỗi đơn {fmt(quantity)} lượt). Tổng số lượt bạn nhận được là: <b>{fmt(quantity * reactionTypes.length)} lượt</b>.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Note */}
              <div className="flex flex-col md:flex-row md:items-start gap-2 md:gap-4">
                <div className="md:w-[150px] shrink-0 font-bold text-sm text-on-surface-variant mt-2 md:mt-0 pt-2">
                  Ghi chú
                </div>
                <div className="flex-1">
                  <textarea
                    rows={2}
                    placeholder="Nhập ghi chú đơn hàng (nếu có)"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    className="w-full bg-surface border border-outline-variant/30 text-on-surface text-sm p-3.5 rounded-xl focus:outline-none focus:border-primary transition-colors resize-none shadow-sm"
                  />
                </div>
              </div>

              <button
                onClick={handleCreateOrder}
                disabled={isSubmitting || !currentServer || currentServer.status === 'bao_tri'}
                className="hidden md:flex w-full py-3.5 bg-primary hover:bg-primary/90 text-on-primary rounded-xl font-bold justify-center items-center gap-2 transition-colors mt-6 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_14px_0_rgba(6,182,212,0.39)] hover:shadow-[0_6px_20px_rgba(6,182,212,0.23)] hover:-translate-y-0.5"
              >
                {isSubmitting ? (
                  <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
                ) : (
                  <span className="material-symbols-outlined text-[20px]">local_mall</span>
                )}
                Đặt đơn ngay
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Info */}
        <div className="space-y-6">
          <div className="glass-panel p-5 border border-outline-variant/30">
            <h3 className="text-on-surface font-bold flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-warning">warning</span>
              Lưu ý quan trọng
            </h3>
            <div className="space-y-3 text-sm text-on-surface-variant">
              <p>• Hệ thống ưu tiên chất lượng và tốc độ hoàn thành.</p>
              <p>• Vui lòng kiểm tra kỹ link trước khi đặt đơn.</p>
              <p>• Đơn sai link sẽ không được hoàn tiền.</p>
              <p>• Nếu máy chủ bảo trì, đơn sẽ tự động hủy và hoàn tiền.</p>
              <p>• Tốc độ chạy phụ thuộc vào máy chủ và thuật toán nền tảng tại thời điểm đó.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Footer */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-outline-variant/30 p-4 pb-[70px] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-40 flex items-center gap-4">
        <div className="flex-1">
          <div className="text-[12px] text-on-surface-variant font-bold mb-0.5">Tổng thanh toán</div>
          <div className="text-xl font-black text-primary leading-none">{fmt(total)} đ</div>
        </div>
        <button
          onClick={handleCreateOrder}
          disabled={isSubmitting || !currentServer || currentServer.status === 'bao_tri'}
          className="px-6 py-3.5 bg-primary hover:bg-primary/90 text-on-primary rounded-xl font-bold flex justify-center items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_14px_0_rgba(6,182,212,0.39)]"
        >
          {isSubmitting ? (
            <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
          ) : (
            <span className="material-symbols-outlined text-[20px]">local_mall</span>
          )}
          Đặt đơn
        </button>
      </div>
    </>
  )
}
