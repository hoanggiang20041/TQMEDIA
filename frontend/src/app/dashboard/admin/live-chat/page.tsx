'use client';

import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export default function LiveChatAdmin() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const audioCtxRef = useRef<any>(null);

  useEffect(() => {
    const initAudio = () => {
      try {
        if (!audioCtxRef.current) {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            audioCtxRef.current = new AudioContextClass();
          }
        }
        if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume();
        }
      } catch (e) {}
    };

    document.addEventListener('touchstart', initAudio, { once: true });
    document.addEventListener('click', initAudio, { once: true });

    return () => {
      document.removeEventListener('touchstart', initAudio);
      document.removeEventListener('click', initAudio);
    };
  }, []);
  
  // Invoice state
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [invoiceDesc, setInvoiceDesc] = useState('');
  const [bankSettings, setBankSettings] = useState<any>(null);

  useEffect(() => {
    fetch('/api/settings').then(res => res.json()).then(data => setBankSettings(data)).catch(() => {});
    fetchSessions();

    const playNotificationSound = () => {
      try {
        if (!audioCtxRef.current) {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            audioCtxRef.current = new AudioContextClass();
          }
        }
        const audioCtx = audioCtxRef.current;
        if (!audioCtx) return;
        
        if (audioCtx.state === 'suspended') {
          audioCtx.resume();
        }
        
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
        oscillator.frequency.setValueAtTime(1108.73, audioCtx.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(1.0, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.5);
      } catch(e) {}
    };

    const newSocket = io(process.env.NEXT_PUBLIC_API_URL || '', {
      transports: ['websocket', 'polling'],
      path: '/socket.io'
    });

    newSocket.on('connect', () => {
      newSocket.emit('join', 'admin_room');
    });

    newSocket.on('chat_session_updated', (updatedSession) => {
      setSessions(prev => {
        const exists = prev.find(s => s.id === updatedSession.id);
        if (exists) {
          return prev.map(s => s.id === updatedSession.id ? { ...s, ...updatedSession } : s);
        }
        return [updatedSession, ...prev];
      });
      if (updatedSession.status === 'PENDING_LIVE_CHAT' || updatedSession.status === 'LIVE_CHAT') {
        playNotificationSound();
      }
      if (activeSession?.id === updatedSession.id) {
        setActiveSession((prev: any) => ({ ...prev, ...updatedSession }));
      }
    });

    newSocket.on('new_chat_message', (msg) => {
      if (activeSession?.id === msg.sessionId) {
        setMessages(prev => [...prev, msg]);
        scrollToBottom();
      }
      playNotificationSound();
      // Update session list to show activity
      setSessions(prev => prev.map(s => s.id === msg.sessionId ? { ...s, updatedAt: new Date() } : s));
    });

    newSocket.on('new_admin_message', (msg) => {
      if (activeSession?.id === msg.sessionId) {
        setMessages(prev => [...prev, msg]);
        scrollToBottom();
      }
    });

    newSocket.on('message_updated', (updatedMsg) => {
      setMessages(prev => prev.map(m => m.id === updatedMsg.id ? { ...m, content: updatedMsg.content } : m));
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [activeSession]);

  useEffect(() => {
    if (activeSession) {
      fetchMessages(activeSession.id);
    }
  }, [activeSession]);

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/admin/chat-sessions', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('tq_token')}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) setSessions(data);
    } catch (err) {}
  };

  const fetchMessages = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/chat-sessions/${id}/messages`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('tq_token')}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setMessages(data);
        scrollToBottom();
      }
    } catch (err) {}
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      } else {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
  };

  const joinSession = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/chat-sessions/${id}/join`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('tq_token')}` }
      });
      const data = await res.json();
      if (data.success) {
        setActiveSession(data.session);
        fetchSessions();
      }
    } catch (err) {}
  };

  const endSession = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn kết thúc hỗ trợ trực tiếp và trả khách về cho AI?')) return;
    try {
      const res = await fetch(`/api/admin/chat-sessions/${id}/end`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('tq_token')}` }
      });
      if (res.ok) {
        fetchSessions();
        if (activeSession?.id === id) {
          setActiveSession(null);
          setMessages([]);
          setIsSidebarOpen(true);
        }
      } else {
        const data = await res.json();
        alert('Lỗi: ' + (data.error || 'Không thể kết thúc'));
      }
    } catch (err) {
      alert('Lỗi kết nối máy chủ!');
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeSession) return;

    try {
      const res = await fetch(`/api/admin/chat-sessions/${activeSession.id}/message`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('tq_token')}`
        },
        body: JSON.stringify({ content: input })
      });
      if (res.ok) {
        setInput('');
      }
    } catch (err) {}
  };

  const sendInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceAmount || !invoiceDesc || !activeSession) return;
    
    const content = `[INVOICE: ${invoiceAmount}|${invoiceDesc}|${activeSession.id}]`;
    try {
      const res = await fetch(`/api/admin/chat-sessions/${activeSession.id}/message`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('tq_token')}`
        },
        body: JSON.stringify({ content })
      });
      if (res.ok) {
        setShowInvoiceModal(false);
        setInvoiceAmount('');
        setInvoiceDesc('');
      }
    } catch (err) {}
  };

  const cancelInvoice = async (msgId: string) => {
    if (!activeSession) return;
    try {
      await fetch(`/api/admin/chat-sessions/${activeSession.id}/messages/${msgId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('tq_token')}`
        }
      });
    } catch (err) {}
  };

  const handleSelectSession = (s: any) => {
    setActiveSession(s);
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex h-[calc(100vh-100px)] bg-surface rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden relative">
      {/* Sidebar */}
      <div className={`${isSidebarOpen ? 'flex' : 'hidden'} md:flex w-full md:w-1/3 border-r border-outline-variant/30 flex-col bg-surface md:bg-surface-variant/30 absolute md:relative inset-0 z-20`}>
        <div className="p-4 border-b border-outline-variant/30 bg-surface shrink-0">
          <h2 className="font-bold text-on-surface">Live Chat & Hỗ trợ</h2>
          <p className="text-xs text-on-surface-variant mt-1">Danh sách yêu cầu chat trực tiếp</p>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {sessions.map(s => (
            <div 
              key={s.id} 
              onClick={() => handleSelectSession(s)}
              className={`p-4 border-b border-outline-variant/30 cursor-pointer hover:bg-primary/5 transition-colors ${activeSession?.id === s.id ? 'bg-primary/10 border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'}`}
            >
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-bold text-sm text-on-surface truncate pr-2">{s.user?.name || 'Khách hàng'}</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${s.status === 'LIVE_CHAT' ? 'bg-red-500/20 text-red-400' : 'bg-surface-variant text-on-surface-variant'}`}>
                  {s.status === 'LIVE_CHAT' ? 'ĐANG CHAT' : 'AI MODE'}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant truncate">{s.user?.email}</p>
              {s.technician && (
                <p className="text-[10px] text-primary mt-2 font-medium bg-primary/10 inline-block px-1.5 py-0.5 rounded">
                  Hỗ trợ: {s.technician.name}
                </p>
              )}
            </div>
          ))}
          {sessions.length === 0 && (
            <div className="p-8 text-center text-sm text-on-surface-variant">
              Không có phiên chat nào
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-background relative z-10 w-full">
        {activeSession ? (
          <>
            {/* Header */}
            <div className="h-16 px-4 md:px-6 border-b border-outline-variant/30 flex items-center justify-between bg-surface shrink-0 shadow-sm z-10">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="md:hidden p-2 text-on-surface-variant hover:text-primary -ml-2"
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <div>
                  <h2 className="font-bold text-on-surface">Chat với {activeSession.user?.name}</h2>
                  <p className="text-xs text-on-surface-variant">{activeSession.user?.email}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {activeSession.status !== 'LIVE_CHAT' ? (
                  <button onClick={() => joinSession(activeSession.id)} className="px-4 py-1.5 bg-primary text-on-primary text-sm font-bold rounded-lg hover:bg-primary/90 transition-colors shadow-sm">
                    Tham gia hỗ trợ
                  </button>
                ) : (
                  <button onClick={() => endSession(activeSession.id)} className="px-4 py-1.5 bg-red-500/20 text-red-400 text-sm font-bold rounded-lg hover:bg-red-500/30 transition-colors">
                    Kết thúc Chat
                  </button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div ref={messagesContainerRef} className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-background/50">
              <div className="space-y-4">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.senderRole === 'USER' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm break-words [word-break:break-word] ${
                      m.senderRole === 'USER' 
                        ? 'bg-surface border border-outline-variant/30 text-on-surface rounded-bl-sm' 
                        : m.senderRole === 'AI'
                          ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20 rounded-br-sm'
                          : 'bg-primary/20 text-primary border border-primary/20 rounded-br-sm'
                    }`}>
                      {m.senderRole === 'TECHNICIAN' && <div className="text-[10px] font-bold text-primary-100 mb-1">Kỹ thuật viên</div>}
                      {m.senderRole === 'AI' && <div className="text-[10px] font-bold text-purple-400 mb-1">AI Trả lời</div>}
                      
                      {m.content.startsWith('[INVOICE:') && m.content.endsWith(']') ? (
                        <div className="bg-surface/20 rounded-xl p-3 border border-outline-variant/20 mt-1 backdrop-blur-sm w-[min(250px,100%)]">
                          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-outline-variant/20">
                            <span className="material-symbols-outlined text-sm">qr_code_2</span>
                            <span className="font-bold">Đơn Thanh toán</span>
                          </div>
                          <p className="font-bold text-xl mb-1">{Number(m.content.match(/\[INVOICE:\s*(.*?)\|/)?.[1] || 0).toLocaleString('vi-VN')} VNĐ</p>
                          <p className="text-xs opacity-80 mb-3 break-words">{m.content.match(/\|(.*?)(?:\||\])/)?.[1]}</p>
                          
                          {/* QR Code rendering logic */}
                          {(() => {
                            const match = m.content.match(/\[INVOICE:\s*(.*?)\|(.*?)\|(.*?)\]/);
                            if (match && bankSettings?.bank_name && bankSettings?.bank_account_number) {
                              const amount = match[1];
                              const sessionId = match[3];
                              const shortId = sessionId.substring(0, 6);
                              const qrUrl = `https://img.vietqr.io/image/${bankSettings.bank_name}-${bankSettings.bank_account_number}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent('KTVTQ' + shortId)}&accountName=${encodeURIComponent(bankSettings.bank_account_name || '')}`;
                              return (
                                <div className="flex flex-col items-center">
                                  <div className="bg-white rounded-lg p-2 flex justify-center mb-2 w-full">
                                    <img src={qrUrl} alt="QR Code" className="w-full max-w-[200px] h-auto rounded" />
                                  </div>
                                  <button onClick={() => cancelInvoice(m.id)} className="text-[10px] text-red-400 bg-red-400/10 px-3 py-1 rounded-md hover:bg-red-400/20 transition-colors w-full border border-red-400/20">Hủy đơn này</button>
                                </div>
                              );
                            }
                            return <div className="text-xs text-orange-400">Đang tải cấu hình ngân hàng...</div>;
                          })()}
                        </div>
                      ) : m.content.startsWith('[INVOICE_CANCELLED:') ? (
                        <div className="bg-surface/10 rounded-xl p-3 border border-red-500/20 mt-1 backdrop-blur-sm w-[min(250px,100%)] opacity-70">
                          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-red-500/20 text-red-400">
                            <span className="material-symbols-outlined text-sm">cancel</span>
                            <span className="font-bold">Đơn đã bị hủy</span>
                          </div>
                          <p className="text-xs opacity-80 break-words">Đơn thanh toán này đã bị KTV hủy bỏ.</p>
                        </div>
                      ) : m.content.startsWith('[PAYMENT_SUCCESS:') ? (
                        <div className="bg-green-500/10 rounded-xl p-3 border border-green-500/30 mt-1 backdrop-blur-sm flex flex-col gap-1 text-green-400 w-[min(250px,100%)]">
                           <div className="flex items-center gap-2">
                             <span className="material-symbols-outlined">check_circle</span>
                             <span className="font-bold text-sm">Thanh toán {Number(m.content.match(/\[PAYMENT_SUCCESS:\s*([^|\]]+)/)?.[1] || 0).toLocaleString('vi-VN')}đ thành công!</span>
                           </div>
                           {m.content.includes('|') && (
                             <span className="text-xs text-green-500/80 ml-7 break-words">Dịch vụ: {m.content.match(/\|\s*(.*?)(?:\])/)?.[1]}</span>
                           )}
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input */}
            {activeSession.status === 'LIVE_CHAT' ? (
              <div className="p-4 bg-surface border-t border-outline-variant/30">
                <form onSubmit={sendMessage} className="flex gap-2 w-full">
                  <button 
                    type="button"
                    onClick={() => setShowInvoiceModal(true)}
                    className="px-3 sm:px-4 py-2 bg-emerald-500/10 text-emerald-500 font-bold rounded-xl hover:bg-emerald-500/20 transition-colors shrink-0 flex items-center gap-1 border border-emerald-500/30"
                  >
                    <span className="material-symbols-outlined text-[20px]">qr_code_2</span> <span className="hidden sm:inline">Tạo đơn</span>
                  </button>
                  <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Nhập tin nhắn..."
                    className="input-glass min-w-0 flex-1 bg-surface-variant/30 border-outline-variant/50 focus:bg-surface-variant/50"
                  />
                  <button type="submit" disabled={!input.trim()} className="btn-primary shrink-0 px-4 sm:px-6 py-2.5 rounded-xl disabled:opacity-50">
                    Gửi
                  </button>
                </form>
              </div>
            ) : (
              <div className="p-4 bg-surface-variant/30 border-t border-outline-variant/30 text-center text-sm text-on-surface-variant">
                Bấm "Tham gia hỗ trợ" để bắt đầu chat trực tiếp với khách hàng.
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-on-surface-variant/50 flex-col">
            <span className="material-symbols-outlined text-6xl mb-4 opacity-50">forum</span>
            <p>Chọn một đoạn chat để xem</p>
          </div>
        )}
      </div>

      {/* Invoice Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl shadow-xl p-6 w-[400px] border border-outline-variant/30 mx-4">
            <h3 className="font-bold text-lg mb-4 text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-500">qr_code_2</span> Khởi tạo đơn thanh toán
            </h3>
            <form onSubmit={sendInvoice} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">Số tiền (VNĐ)</label>
                <input 
                  type="number" 
                  value={invoiceAmount} 
                  onChange={e => setInvoiceAmount(e.target.value)}
                  className="input-glass w-full"
                  placeholder="Ví dụ: 500000"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">Mô tả dịch vụ</label>
                <input 
                  type="text" 
                  value={invoiceDesc} 
                  onChange={e => setInvoiceDesc(e.target.value)}
                  className="input-glass w-full"
                  placeholder="Ví dụ: Tăng 1000 Follow Facebook"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-outline-variant/20 mt-4">
                <button 
                  type="button" 
                  onClick={() => setShowInvoiceModal(false)}
                  className="px-4 py-2 bg-surface-variant text-on-surface font-bold rounded-xl hover:bg-surface-variant/80 transition-colors"
                >
                  Hủy
                </button>
                  <button 
                  type="submit" 
                  className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-500 transition-colors shadow-sm shadow-emerald-500/30"
                >
                  Gửi đơn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
