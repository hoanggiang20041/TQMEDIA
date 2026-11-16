'use client';
import React, { useEffect } from 'react';
import type { Metadata } from 'next';

export default function MaintenancePage() {
  
  // Hiệu ứng hạt nền (như login)
  useEffect(() => {
    const canvas = document.getElementById('maintenance-canvas') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let animationId: number;
    const particles: any[] = [];
    
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();
    
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.5 + 0.1
      });
    }
    
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(249, 115, 22, ${p.alpha})`; // Orange tint
        ctx.fill();
      });
      animationId = requestAnimationFrame(animate);
    }
    animate();
    
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090b] relative overflow-hidden font-body-md">
      
      {/* Background FX */}
      <canvas id="maintenance-canvas" className="absolute inset-0 z-0 opacity-50"></canvas>
      
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-orange-600/10 blur-[120px] pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-rose-600/10 blur-[120px] pointer-events-none mix-blend-screen" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMikiLz48L3N2Zz4=')] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)] pointer-events-none" />

      {/* Main Content */}
      <div className="relative z-10 p-8 md:p-16 max-w-3xl w-full text-center flex flex-col items-center">
        
        {/* Animated Icon */}
        <div className="relative mb-12">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-rose-500 blur-2xl opacity-40 animate-pulse rounded-full" />
          <div className="w-28 h-28 bg-surface/80 backdrop-blur-xl border border-orange-500/30 rounded-[32px] flex items-center justify-center relative z-10 shadow-[0_0_50px_rgba(249,115,22,0.2)] transform rotate-3 hover:rotate-0 transition-transform duration-500">
            <span className="material-symbols-outlined text-[56px] text-transparent bg-clip-text bg-gradient-to-br from-orange-400 to-rose-500 font-light">
              construction
            </span>
          </div>
        </div>
        
        {/* Heading */}
        <h1 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight">
          Hệ thống đang <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-rose-500">Nâng cấp</span>
        </h1>
        
        {/* Message */}
        <p className="text-on-surface-variant text-lg md:text-xl leading-relaxed max-w-2xl mx-auto mb-12 font-medium">
          TQ MEDIA đang được tối ưu hóa hệ thống máy chủ để mang lại tốc độ và trải nghiệm dịch vụ tốt nhất. Vui lòng quay lại sau ít phút.
        </p>
        
        {/* Status indicator */}
        <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-surface-variant/30 border border-outline-variant/30 backdrop-blur-md">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
          </span>
          <span className="text-sm font-mono tracking-widest text-orange-200/80 uppercase">
            Deploying Updates ...
          </span>
        </div>

      </div>
      
      {/* Footer / Copyright */}
      <div className="absolute bottom-8 text-center w-full z-10 pointer-events-none">
         <p className="text-xs text-on-surface-variant/50 uppercase tracking-[0.2em] font-mono">
          © 2026 TQ MEDIA CORP.
         </p>
      </div>

    </div>
  );
}
