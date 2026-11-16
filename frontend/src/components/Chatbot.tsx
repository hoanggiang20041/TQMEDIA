'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { jwtDecode } from 'jwt-decode';
import { useRole } from '@/context/RoleContext';

const removeAccents = (str: string) => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
};

type Message = {
  id?: string;
  role: 'user' | 'model' | 'technician';
  text: string;
  technicianName?: string;
};

export default function Chatbot() {
  const { user } = useRole();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [showGreeting, setShowGreeting] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Xin chào! Em là Oanh - Trợ lý ảo của TQMEDIA. Sếp cần tư vấn về dịch vụ hay báo giá nào ạ?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [status, setStatus] = useState<'AI_MODE' | 'PENDING_LIVE_CHAT' | 'LIVE_CHAT'>('AI_MODE');
  const [socket, setSocket] = useState<any>(null);
  const [userId, setUserId] = useState<string>('');
  
  const audioCtxRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const [bankSettings, setBankSettings] = useState<any>(null);
  useEffect(() => {
    fetch('/api/settings').then(res => res.json()).then(data => setBankSettings(data)).catch(() => {});
  }, []);


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isOpen) {
        setShowGreeting(true);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    const token = localStorage.getItem('tq_token');
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        const uid = decoded.userId || decoded.id;
        setUserId(uid);
        fetchHistory(token);
        setupSocket(uid);
      } catch(e) {}
    }
    
    return () => {
      if (socket) socket.disconnect();
    }
  }, []);

  const fetchHistory = async (token: string) => {
    try {
      const res = await fetch('/api/chat/history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.history && data.history.length > 0) {
        const historyMsgs = data.history.map((m: any) => ({
          id: m.id,
          role: m.senderRole === 'USER' ? 'user' : m.senderRole === 'TECHNICIAN' ? 'technician' : 'model',
          text: m.content
        }));
        setMessages(prev => {
          // keep greeting if history is empty, else replace
          return [...prev.filter(p => p.id === 'greeting'), ...historyMsgs];
        });
        setStatus(data.status);
        scrollToBottom();
      }
    } catch (e) {}
  };
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
      
      oscillator.type = 'triangle'; // more audible than sine on mobile speakers
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      oscillator.frequency.setValueAtTime(1108.73, audioCtx.currentTime + 0.1); // C#6 (creates a nice "ding" sequence if we had 2 oscillators, but we'll just shift frequency)
      
      // Much louder initial volume: 1.0
      gainNode.gain.setValueAtTime(1.0, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch(e) {}
  };

  const setupSocket = (uid: string) => {
    const newSocket = io(process.env.NEXT_PUBLIC_API_URL || '', {
      transports: ['websocket', 'polling'],
      path: '/socket.io'
    });

    newSocket.on('receive_message_' + uid, (msg: any) => {
      setMessages(prev => [...prev, {
        id: msg.id,
        role: msg.senderRole === 'TECHNICIAN' ? 'technician' : msg.senderRole === 'SYSTEM' ? 'model' : 'model',
        text: msg.content,
        technicianName: msg.technicianName
      }]);
      if (msg.senderRole === 'TECHNICIAN' || msg.senderRole === 'SYSTEM') {
        playNotificationSound();
        setIsOpen(true); // Automatically open popup
      }
      scrollToBottom();
    });

    newSocket.on('message_updated_' + uid, (updatedMsg: any) => {
      setMessages(prev => prev.map(m => m.id === updatedMsg.id ? { ...m, text: updatedMsg.content } : m));
    });

    newSocket.on('chat_status_changed_' + uid, (data: any) => {
      setStatus(data.status);
      if (data.status === 'LIVE_CHAT') {
        if (data.technicianName) {
          setMessages(prev => [...prev, { role: 'model', text: `Kỹ thuật viên ${data.technicianName} đã tham gia cuộc trò chuyện.` }]);
          playNotificationSound();
          setIsOpen(true);
        }
      } else if (data.status === 'PENDING_LIVE_CHAT') {
        // Just waiting for KTV
      } else {
        setMessages(prev => [...prev, { role: 'model', text: 'Kỹ thuật viên đã kết thúc phiên hỗ trợ trực tiếp. Trợ lý AI Oanh đã quay trở lại!' }]);
      }
      scrollToBottom();
    });

    setSocket(newSocket);
  };

  const closeGreeting = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowGreeting(false);
  };

  useEffect(() => {
    const handleTrigger = (e: any) => {
      const platform = e.detail?.platform;
      setIsOpen(true);
      setShowGreeting(false);
      // Let it open first, then request if not live
      setTimeout(() => {
        setStatus((prev) => {
          if (prev !== 'LIVE_CHAT') {
            requestLiveChat(platform);
          } else if (platform) {
             const userMsg = `Tôi cần tư vấn dịch vụ ${platform} Ads`;
             setMessages(prevMsgs => [...prevMsgs, { role: 'user', text: userMsg }]);
             fetch('/api/chat', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('tq_token')}` },
               body: JSON.stringify({ message: userMsg, history: [] })
             }).catch(() => {});
          }
          return prev;
        });
      }, 500);
    };
    window.addEventListener('trigger-live-chat', handleTrigger as any);
    return () => window.removeEventListener('trigger-live-chat', handleTrigger as any);
  }, []);

  const requestLiveChat = async (platform?: string) => {
    try {
      const userMsg = platform ? `Tôi cần tư vấn dịch vụ ${platform} Ads` : '';
      const res = await fetch('/api/chat/request-live-chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('tq_token')}` 
        },
        body: JSON.stringify({ message: userMsg })
      });
      const data = await res.json();
      if (data.success) {
        setStatus('PENDING_LIVE_CHAT');
        setMessages(prev => [...prev, { role: 'model', text: 'Đã gửi yêu cầu kết nối Kỹ thuật viên. Vui lòng chờ trong giây lát...' }]);
        scrollToBottom();
        
        if (platform) {
           setMessages(prevMsgs => [...prevMsgs, { role: 'user', text: userMsg }]);
           fetch('/api/chat', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('tq_token')}` },
             body: JSON.stringify({ message: userMsg, history: [] })
           }).catch(() => {});
        }
      }
    } catch(e) {}
  };

  const endSession = async () => {
    if (!confirm('Bạn có chắc chắn muốn kết thúc trò chuyện trực tiếp không?')) return;
    try {
      await fetch('/api/chat/end-session', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('tq_token')}` }
      });
      // socket listener will switch status back to AI_MODE
    } catch(e) {}
  };

  const sendMessage = async (e?: React.FormEvent, textOverride?: string) => {
    if (e) e.preventDefault();
    const userMessage = (textOverride || message).trim();
    if (!userMessage || isLoading) return;

    setMessage('');
    const newMessages: Message[] = [...messages, { role: 'user', text: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const token = localStorage.getItem('tq_token');
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: userMessage,
          history: messages.filter(m => m.role !== 'model' || m.text !== 'Đang gõ...') // remove loading text if any
        })
      });
      
      const data = await res.json();
      
      if (data.reply !== null) {
        let replyText = data.reply || 'Có lỗi xảy ra.';
        
        setMessages([...newMessages, { role: 'model', text: replyText }]);
      }
      // If data.reply === null, it's LIVE_CHAT mode, the socket will receive the echo or admin reply.
    } catch (err) {
      setMessages([...newMessages, { role: 'model', text: 'Rất xin lỗi, đường truyền bị lỗi. Vui lòng thử lại!' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const SUGGESTED_QUESTIONS = [
    "Báo giá dịch vụ Facebook",
    "Tăng tương tác TikTok",
    "Hướng dẫn nạp tiền",
    "Liên hệ CSKH"
  ];

  if (pathname?.startsWith('/dashboard/admin') || pathname?.startsWith('/dashboard/ktv') || pathname?.startsWith('/dashboard/technician')) {
    return null;
  }

  return (
    <>
      {/* Nút Chatbot */}
      <div className={`fixed bottom-[160px] right-4 sm:bottom-32 sm:right-6 z-[110] items-end gap-3 pointer-events-none ${isOpen ? 'hidden' : 'flex'}`}>
        
        {/* Greeting Popup */}
        <div className={`hidden sm:block transition-all duration-500 origin-bottom-right pointer-events-auto ${showGreeting && !isOpen ? 'opacity-100 scale-100 translate-x-0' : 'opacity-0 scale-90 translate-x-4 !pointer-events-none'}`}>
          <div 
            className="bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] p-3 pr-8 relative mb-1 w-[260px] cursor-pointer"
            onClick={() => { setIsOpen(true); setShowGreeting(false); }}
          >
            <button 
              onClick={closeGreeting}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors z-10 w-6 h-6 flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
            <div className="flex gap-3 items-start">
              <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 shadow-sm border border-gray-100 bg-white">
                <img src="/tqbot_avatar.png" alt="Bot Avatar" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 pt-0.5">
                <h4 className="font-bold text-[14px] text-gray-900 leading-none mb-1.5 font-sans">Oanh - Trợ lý TQMEDIA</h4>
                <p className="text-[13px] text-gray-600 leading-snug font-sans">Dạ em chào sếp! Em là Oanh - Trợ lý ảo, sếp cần hỗ trợ gì cứ hỏi em nhé ạ!</p>
              </div>
            </div>
            
            {/* Arrow pointing right to the button */}
            <div className="absolute right-[-5px] bottom-[18px] w-3 h-3 bg-white rotate-45 z-[-1] shadow-[3px_-3px_3px_rgba(0,0,0,0.02)]"></div>
          </div>
        </div>

        <button
          onClick={() => { setIsOpen(!isOpen); setShowGreeting(false); }}
          className="bg-primary text-on-primary w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform duration-300 shrink-0 overflow-hidden p-0.5 pointer-events-auto"
        >
          {isOpen ? (
            <span className="material-symbols-outlined text-3xl">close</span>
          ) : (
            <img src="/tqbot_avatar.png" alt="Bot" className="w-full h-full object-cover rounded-full" />
          )}
        </button>
      </div>

      {/* Cửa sổ Chat */}
      {isOpen && (
        <div className="fixed top-0 left-0 w-full h-[100dvh] sm:top-auto sm:left-auto sm:bottom-[150px] sm:right-6 sm:w-96 sm:h-[500px] z-[110] bg-surface border border-outline-variant/30 sm:rounded-2xl shadow-2xl flex flex-col animate-in fade-in slide-in-from-bottom-5 duration-300 pointer-events-auto">
          
          {/* Header */}
          <div className="bg-surface-variant/80 backdrop-blur-md p-4 flex items-center gap-3 sm:rounded-t-2xl border-b border-outline-variant/30 shadow-sm z-10">
            <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-white p-0.5 border border-outline-variant/50">
              <img src="/tqbot_avatar.png" alt="Bot Avatar" className="w-full h-full object-cover rounded-full" />
            </div>
            <div>
              <h3 className="text-on-surface font-bold text-sm sm:text-base">Oanh - Trợ lý TQMEDIA</h3>
              <p className="text-[11px] text-primary flex items-center gap-1.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.8)]"></span>
                Đang trực tuyến
              </p>
            </div>
            {/* Close button */}
            <button 
              onClick={() => setIsOpen(false)}
              className="ml-auto p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-variant rounded-full transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto custom-scrollbar flex flex-col gap-4 bg-surface/50 relative">
            {messages.map((msg, index) => {
              
              let parsedText = msg.text;
              let redirectPath = null;
              const redirectMatch = parsedText.match(/\[REDIRECT:([^\]]+)\]/);
              if (redirectMatch) {
                redirectPath = redirectMatch[1];
                parsedText = parsedText.replace(redirectMatch[0], '').trim();
              }
              const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
              const parts = [];
              let lastIndex = 0;
              let match;

              while ((match = regex.exec(parsedText)) !== null) {
                if (match.index > lastIndex) {
                  parts.push(<span key={lastIndex}>{msg.text.substring(lastIndex, match.index)}</span>);
                }
                parts.push(
                  <Link 
                    key={`link-${match.index}`} 
                    href={match[2]}
                    onClick={() => setIsOpen(false)} // close chat when clicking link
                    className="inline-flex items-center gap-1 mt-2 mb-1 px-3 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary text-xs font-bold rounded-lg border border-primary/30 transition-all shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">shopping_cart</span>
                    {match[1]}
                  </Link>
                );
                lastIndex = regex.lastIndex;
              }
                            if (lastIndex < parsedText.length) {
                parts.push(<span key={lastIndex}>{parsedText.substring(lastIndex)}</span>);
              }

              return (
                <div 
                  key={index} 
                  className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed shadow-sm break-words [word-break:break-word] ${
                      msg.role === 'user' 
                        ? 'bg-primary text-black dark:bg-primary/20 dark:text-primary rounded-br-sm border border-primary/20' 
                        : msg.role === 'technician'
                          ? 'bg-blue-500 text-white dark:bg-blue-500/10 dark:text-blue-400 rounded-bl-sm border border-blue-500/20'
                          : 'bg-gray-100 text-gray-900 dark:bg-surface-variant/40 dark:text-on-surface-variant rounded-bl-sm border border-gray-200 dark:border-outline-variant/20'
                    }`}
                  >
                    {msg.role === 'technician' && <div className="text-[10px] font-bold text-blue-200 mb-1">KTV {msg.technicianName}</div>}
                    {parsedText.startsWith('[INVOICE:') && parsedText.endsWith(']') ? (
                        <div className="bg-surface rounded-xl p-4 shadow-sm border border-outline-variant/30 mt-2 min-w-[200px]">
                          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-outline-variant/20">
                            <span className="material-symbols-outlined text-primary">qr_code_scanner</span>
                            <span className="font-bold text-on-surface">Đơn Thanh toán</span>
                          </div>
                          <p className="font-bold text-2xl text-primary mb-1">{Number(parsedText.match(/\[INVOICE:\s*(.*?)\|/)?.[1] || 0).toLocaleString('vi-VN')} VNĐ</p>
                          <p className="text-sm text-on-surface-variant mb-4">{parsedText.match(/\|(.*?)(?:\||\])/)?.[1]}</p>
                          
                          {/* QR Code rendering logic */}
                          {(() => {
                            const match = parsedText.match(/\[INVOICE:\s*(.*?)\|(.*?)\|(.*?)\]/);
                            if (match && bankSettings?.bank_name && bankSettings?.bank_account_number) {
                              const amount = match[1];
                              const sessionId = match[3];
                              const shortId = sessionId.substring(0, 6);
                              const formattedName = user?.name ? removeAccents(user.name).toUpperCase().replace(/[^A-Z0-9\s]/g, '').trim() : '';
                              const chatTransferContent = formattedName ? `${formattedName} KTV${shortId}` : `KTV${shortId}`;
                              const qrUrl = `https://img.vietqr.io/image/${bankSettings.bank_name}-${bankSettings.bank_account_number}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(chatTransferContent)}&accountName=${encodeURIComponent(bankSettings.bank_account_name || '')}`;
                              return (
                                <div className="bg-white rounded-lg p-2 flex justify-center mb-3">
                                  <img src={qrUrl} alt="QR Code" className="w-full max-w-[250px] h-auto rounded" />
                                </div>
                              );
                            }
                            return <div className="text-sm text-orange-500 mb-3 text-center">Đang tải mã QR...</div>;
                          })()}
                        </div>
                      ) : parsedText.startsWith('[INVOICE_CANCELLED:') ? (
                        <div className="bg-surface/50 rounded-xl p-4 border border-red-500/20 mt-2 w-[min(200px,100%)] opacity-70">
                          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-red-500/20 text-red-500">
                            <span className="material-symbols-outlined">cancel</span>
                            <span className="font-bold text-sm">Đơn thanh toán đã bị hủy</span>
                          </div>
                          <p className="text-xs text-on-surface-variant text-center break-words">Vui lòng chờ nhân viên tạo đơn mới nếu cần.</p>
                        </div>
                      ) : parsedText.startsWith('[PAYMENT_SUCCESS:') ? (
                        <div className="bg-surface rounded-xl p-4 border border-emerald-500/20 mt-2 w-[min(200px,100%)] flex flex-col items-center justify-center gap-1 shadow-sm relative overflow-hidden">
                           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-500 opacity-80"></div>
                           <span className="material-symbols-outlined text-emerald-500 text-4xl mb-1">check_circle</span>
                           <span className="font-bold text-sm text-on-surface text-center">Thanh toán thành công</span>
                           <span className="font-extrabold text-xl text-emerald-600 mb-1">
                             {Number(parsedText.match(/\[PAYMENT_SUCCESS:\s*([^|\]]+)/)?.[1] || 0).toLocaleString('vi-VN')}đ
                           </span>
                           {parsedText.includes('|') && (
                             <span className="text-xs text-on-surface-variant text-center bg-surface-variant/50 px-2 py-1 rounded-md">
                               Dịch vụ: {parsedText.match(/\|\s*(.*?)(?:\])/)?.[1]}
                             </span>
                           )}
                        </div>
                      ) : (parts.length > 0 ? parts : parsedText)}
                      {redirectPath && (
                        <Link 
                          href={redirectPath} 
                          onClick={() => setIsOpen(false)}
                          className="mt-3 block w-full py-2 bg-cyan-600 text-white text-center text-xs font-bold rounded-xl hover:bg-cyan-500 transition-colors shadow-md"
                        >
                          Đi đến trang dịch vụ ngay
                        </Link>
                      )}
                  </div>
                </div>
              );
            })}
            
            {messages.length === 1 && !isLoading && (
              <div className="flex flex-col gap-2 mt-2 w-full pr-8">
                <p className="text-xs text-on-surface-variant font-medium ml-2">Gợi ý cho bạn:</p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_QUESTIONS.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => sendMessage(undefined, q)}
                      className="px-3 py-1.5 bg-surface text-on-surface border border-outline-variant/50 rounded-xl text-xs hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-colors text-left"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {isLoading && status !== 'LIVE_CHAT' && (
              <div className="flex w-full justify-start">
                <div className="max-w-[80%] bg-surface-variant/40 text-on-surface-variant rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm border border-outline-variant/20 flex items-center justify-center gap-2 shadow-sm">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs text-on-surface-variant">Đang xử lý...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <div className="p-3 bg-surface-variant/30 border-t border-outline-variant/20 sm:rounded-b-2xl flex flex-col gap-2 backdrop-blur-md">
            {messages.length > 1 && status !== 'LIVE_CHAT' && (
              <div className="flex justify-center gap-4 border-b border-outline-variant/20 pb-2 mb-1">
                <button 
                  type="button"
                  onClick={() => {
                    const newMessages: Message[] = [...messages, { role: 'model', text: 'Vui lòng nhập nội dung bạn cần xử lý (Báo lỗi, Nạp tiền, Cần tư vấn thêm...) bên dưới nhé. Quản trị viên sẽ tiếp nhận và phản hồi sớm nhất có thể!' }];
                    setMessages(newMessages);
                    setMessage("Gửi đơn hỗ trợ: ");
                    setTimeout(scrollToBottom, 100);
                  }}
                  className="text-[11px] text-on-surface-variant hover:text-primary transition-colors font-medium flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">edit_document</span> Gửi đơn hỗ trợ
                </button>
                <div className="w-[1px] h-4 bg-outline-variant/30"></div>
                <button 
                  type="button"
                  onClick={() => requestLiveChat()}
                  className="text-[11px] text-on-surface-variant hover:text-primary transition-colors font-medium flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">support_agent</span> Gặp KTV trực tiếp
                </button>
              </div>
            )}
            <form onSubmit={sendMessage} className="flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={status === 'LIVE_CHAT' ? "Nhắn tin với kỹ thuật viên..." : "Nhập câu hỏi của bạn..."}
                className="flex-1 min-w-0 bg-surface-variant/50 border border-outline-variant/30 rounded-xl px-4 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary/50 focus:bg-surface-variant transition-colors"
              />
              <button 
                type="submit" 
                disabled={!message.trim() || isLoading}
                className="btn-primary w-12 h-12 !p-0 rounded-xl flex items-center justify-center shrink-0 disabled:opacity-50"
              >
                <span className="material-symbols-outlined">send</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
