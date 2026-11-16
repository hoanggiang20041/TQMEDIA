'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'
const MySwal = withReactContent(Swal)
import Link from 'next/link'
import Image from 'next/image'
import { useRole, UserRole } from '@/context/RoleContext'
import dynamic from 'next/dynamic'
const Turnstile = dynamic(() => import('@marsidev/react-turnstile').then(m => m.Turnstile), { ssr: false })



const DICT = {
  vi: {
    title1: 'Kiến tạo chuẩn mực',
    title2: 'truyền thông số.',
    subtitle: 'Hệ thống vận hành tự động, tối ưu hiệu suất và đo lường chính xác chiến dịch mạng xã hội của doanh nghiệp.',
    feat1_title: 'Quản trị tập trung',
    feat1_desc: 'Hệ thống hóa mọi tương tác từ các nền tảng vào một màn hình duy nhất.',
    feat2_title: 'Phân tích chuyên sâu',
    feat2_desc: 'Theo dõi chỉ số hiệu quả chiến dịch với biểu đồ và báo cáo chi tiết.',
    feat3_title: 'Phân quyền linh hoạt',
    feat3_desc: 'Quản lý không gian làm việc độc lập cho chi nhánh và đại lý.',
    login: 'Đăng nhập',
    register: 'Tạo tài khoản',
    login_sub: 'Chào mừng bạn quay trở lại nền tảng TQ MEDIA.',
    register_sub: 'Bắt đầu hành trình truyền thông số của bạn.',
    name: 'Họ và tên',
    name_ph: 'Nguyễn Văn A',
    email: 'Email truy cập',
    email_ph: 'name@company.com',
    password: 'Mật khẩu',
    forgot_pw: 'Quên mật khẩu?',
    continue: 'Tiếp tục',
    create: 'Xác nhận tạo',
    or: 'Hoặc tiếp tục với',
    no_account: 'Chưa có tài khoản? ',
    has_account: 'Đã có tài khoản? ',
    register_now: 'Đăng ký ngay',
    login_now: 'Đăng nhập',
    err_invalid: 'Thông tin đăng nhập không hợp lệ.',
    err_exists: 'Email này đã tồn tại trong hệ thống.',
    err_incomplete: 'Vui lòng hoàn tất thông tin.',
  },
  en: {
    title1: 'Defining the new standard',
    title2: 'of digital media.',
    subtitle: 'Automated operations, performance optimization, and precise measurement for enterprise social media campaigns.',
    feat1_title: 'Centralized Management',
    feat1_desc: 'Systemize all cross-platform interactions into a single unified dashboard.',
    feat2_title: 'In-depth Analytics',
    feat2_desc: 'Track campaign performance metrics with detailed charts and comprehensive reports.',
    feat3_title: 'Flexible Access Control',
    feat3_desc: 'Manage independent workspaces for branches and agency partners effortlessly.',
    login: 'Sign In',
    register: 'Create Account',
    login_sub: 'Welcome back to the TQ MEDIA enterprise platform.',
    register_sub: 'Start your digital media journey with us today.',
    name: 'Full Name',
    name_ph: 'John Doe',
    email: 'Work Email',
    email_ph: 'name@company.com',
    password: 'Password',
    forgot_pw: 'Forgot password?',
    continue: 'Continue',
    create: 'Confirm Creation',
    or: 'Or continue with',
    no_account: "Don't have an account? ",
    has_account: 'Already have an account? ',
    register_now: 'Sign up now',
    login_now: 'Sign in',
    err_invalid: 'Invalid login credentials.',
    err_exists: 'This email already exists in the system.',
    err_incomplete: 'Please complete all fields.',
  }
}

function Particles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let animationId: number
    const particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number }[] = []
    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
    resize()
    window.addEventListener('resize', resize)
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.offsetWidth,
        y: Math.random() * canvas.offsetHeight,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.2 + 0.1,
      })
    }
    const animate = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight)
      particles.forEach((p) => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0) p.x = canvas.offsetWidth
        if (p.x > canvas.offsetWidth) p.x = 0
        if (p.y < 0) p.y = canvas.offsetHeight
        if (p.y > canvas.offsetHeight) p.y = 0
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${p.alpha})`
        ctx.fill()
      })
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 120) {
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `rgba(255,255,255,${0.03 * (1 - dist / 120)})`
            ctx.stroke()
          }
        }
      }
      animationId = requestAnimationFrame(animate)
    }
    animate()
    return () => { cancelAnimationFrame(animationId); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
}

export default function LoginPage() {
  const router = useRouter()
  const { setRole, settings, user } = useRole()
  
  const [lang, setLang] = useState<'vi'|'en'>('vi')
  const t = DICT[lang]

  useEffect(() => {
    if (user) {
      router.push('/dashboard')
    }
  }, [user, router])

  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // 2FA states
  const [is2FA, setIs2FA] = useState(false)
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [tempToken, setTempToken] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [refCode, setRefCode] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inv = params.get('invite') || localStorage.getItem('pending_invite_code');
    const ref = params.get('ref');
    
    if (inv) {
      setInviteCode(inv);
      setIsLogin(false); // auto switch to register tab
    }
    if (ref) {
      setRefCode(ref);
      setIsLogin(false);
    }
  }, [])

  // Email Verification states
  const [isEmailVerification, setIsEmailVerification] = useState(false)
  const [emailCode, setEmailCode] = useState('')
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null)



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (isEmailVerification) {
      try {
        const res = await fetch('/api/auth/verify-login-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tempToken, code: emailCode })
        })
        const data = await res.json()
        if (data.require2FA) {
          setIsEmailVerification(false)
          setIs2FA(true)
          setTempToken(data.tempToken)
          return
        }
        if (data.success) {
          localStorage.setItem('tq_token', data.token)
          localStorage.removeItem('pending_invite_code')
          setRole(data.user.role as UserRole)
          
          if (data.user?.agencyLevel > 0 && inviteCode) {
            await MySwal.fire({
              icon: 'success',
              title: 'Thành công!',
              text: `Chúc mừng! Tài khoản của bạn đã được nâng cấp lên Đại lý Cấp ${data.user.agencyLevel}.`,
              confirmButtonColor: '#06b6d4'
            })
          }
          
          router.push('/dashboard')
        } else {
          setErrorMsg(data.error || 'Mã xác thực không hợp lệ')
        }
      } catch (err) {
        setErrorMsg('Lỗi kết nối máy chủ')
      }
      return;
    }

    if (is2FA) {
      try {
        const res = await fetch('/api/auth/2fa/verify-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tempToken, code: twoFactorCode })
        })
        const data = await res.json()
        if (data.success) {
          localStorage.setItem('tq_token', data.token)
          localStorage.removeItem('pending_invite_code')
          setRole(data.user.role as UserRole)
          router.push('/dashboard')
        } else {
          setErrorMsg(data.error || 'Mã xác thực không hợp lệ')
        }
      } catch (err) {
        setErrorMsg('Lỗi kết nối máy chủ')
      }
      return;
    }

    if (isLogin) {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, turnstileToken: turnstileToken || undefined, inviteCode })
        })
        const data = await res.json()
        
        if (data.requireEmailVerification) {
          setIsEmailVerification(true)
          setTempToken(data.tempToken)
          return
        }

        if (data.require2FA) {
          setIs2FA(true)
          setTempToken(data.tempToken)
          return
        }

        if (data.success) {
          localStorage.setItem('tq_token', data.token)
          localStorage.removeItem('pending_invite_code')
          setRole(data.user.role as UserRole)
          
          if (data.upgradedLevel) {
            await MySwal.fire({
              icon: 'success',
              title: 'Thành công!',
              text: `Chúc mừng! Tài khoản của bạn đã được nâng cấp lên Đại lý Cấp ${data.upgradedLevel} nhờ mã mời.`,
              confirmButtonColor: '#06b6d4'
            })
          }
          
          router.push('/dashboard')
        } else {
          setErrorMsg(data.error || t.err_invalid)
        }
      } catch (err) {
        setErrorMsg('Lỗi kết nối máy chủ')
      }
    } else {
      if (!name || !email || !password) { setErrorMsg(t.err_incomplete); return }
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password, turnstileToken: turnstileToken || undefined, inviteCode, ref: refCode })
        })
        const data = await res.json()
        
        if (data.requireEmailVerification) {
          setIsEmailVerification(true)
          setTempToken(data.tempToken)
          return
        }

        if (data.success) {
          localStorage.setItem('tq_token', data.token)
          localStorage.removeItem('pending_invite_code')
          setRole(data.user.role as UserRole)

          if (data.user?.agencyLevel > 0) {
            await MySwal.fire({
              icon: 'success',
              title: 'Thành công!',
              text: `Chúc mừng! Bạn đã đăng ký thành công và được nâng cấp lên Đại lý Cấp ${data.user.agencyLevel}.`,
              confirmButtonColor: '#06b6d4'
            })
          }

          router.push('/dashboard')
        } else {
          setErrorMsg(data.error || t.err_exists)
        }
      } catch (err) {
        setErrorMsg('Lỗi kết nối máy chủ')
      }
    }
  }

  const fillTestCredentials = (testEmail: string) => { setEmail(testEmail); setPassword('123') }

  return (
    <div className="bg-background text-on-background min-h-screen flex items-center justify-center overflow-hidden relative font-body-md selection:bg-cyan-500/30 px-6 py-12">
      

      {/* LANGUAGE TOGGLE */}
      <div className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-surface-variant/30 border border-outline-variant/30 backdrop-blur-xl p-1 rounded-full shadow-xl">
        <button 
          onClick={() => setLang('vi')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${lang === 'vi' ? 'bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'text-on-surface-variant hover:text-white'}`}
        >
          VI
        </button>
        <button 
          onClick={() => setLang('en')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${lang === 'en' ? 'bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'text-on-surface-variant hover:text-white'}`}
        >
          ENG
        </button>
      </div>

      {/* BACKGROUND ELEMENTS (Simplified) */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-background">
      </div>

      {/* WIDE GLASS CARD (Simplified) */}
      <div className="relative z-10 w-full max-w-[1200px] bg-surface border border-outline-variant rounded-[32px] shadow-sm overflow-hidden flex flex-col lg:flex-row animate-fade-in-up">
        
        {/* LEFT SIDE - BRANDING */}
        <div className="lg:w-1/2 p-6 md:p-10 lg:p-16 flex flex-col justify-between bg-surface-variant/20 relative border-b lg:border-b-0 lg:border-r border-outline-variant">
          <div className="relative z-10">
            {/* TQ MEDIA Logo Area */}
            <div className="flex items-center gap-4 mb-10">
              <div className="relative w-14 h-14 overflow-hidden rounded-full flex items-center justify-center bg-black/5 dark:bg-transparent shrink-0">
                <Image
                  src={settings?.ui_logo || "/logo.png"}
                  alt="TQ Media Logo"
                  width={56}
                  height={56}
                  className="w-full h-full object-cover"
                  priority
                />
              </div>
              <div className="flex flex-col">
                <h1 className="text-3xl sm:text-4xl font-black tracking-[0.1em] uppercase whitespace-nowrap text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-teal-400 animate-gradient-x leading-none">
                  TQ MEDIA
                </h1>
                <div className="flex items-center gap-2 mt-2">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.8)]"></span>
                  <span className="text-sm font-semibold tracking-[0.2em] text-on-surface-variant uppercase">Enterprise System</span>
                </div>
              </div>
            </div>

            <h2 className="text-[36px] sm:text-[40px] font-semibold text-on-surface mb-6 tracking-tight leading-[1.1]">
              {settings?.login_title1 || t.title1}<br/>{settings?.login_title2 || t.title2}
            </h2>
            <p className="text-on-surface-variant leading-relaxed mb-10 max-w-md">
              {settings?.login_subtitle || t.subtitle}
            </p>

            <div className="space-y-5">
              {(() => {
                let features = [];
                try {
                  if (settings?.login_features_list) {
                    features = JSON.parse(settings.login_features_list);
                  }
                } catch(e) {}
                
                if (features.length === 0) {
                  features = [
                    { icon: 'dashboard', color: 'text-secondary', title: t.feat1_title, desc: t.feat1_desc },
                    { icon: 'analytics', color: 'text-primary', title: t.feat2_title, desc: t.feat2_desc },
                    { icon: 'groups', color: 'text-primary', title: t.feat3_title, desc: t.feat3_desc }
                  ];
                }

                return features.map((f: any, idx: number) => (
                  <div key={idx} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-surface-variant/50 border border-outline-variant/50 flex items-center justify-center shrink-0">
                      <span className={`material-symbols-outlined ${f.color || 'text-primary'} text-[20px]`}>{f.icon || 'star'}</span>
                    </div>
                    <div>
                      <h4 className="text-on-surface font-medium text-sm">{f.title}</h4>
                      <p className="text-on-surface-variant text-xs mt-1">{f.desc}</p>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-outline-variant/30 flex items-center gap-6 text-[10px] text-on-surface-variant font-mono uppercase tracking-widest relative z-10">
            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> ONLINE</span>
            <span>NODE: VN-01</span>
            <span>99.9% UPTIME</span>
          </div>
          
          {/* Subtle Decorative Elements behind text */}
          <div className="absolute bottom-10 right-10 opacity-20 hidden sm:block" style={{ animation: 'float 8s ease-in-out infinite' }}>
            <svg width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="url(#grad)" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round">
              <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
              <path d="M12 2L2 22h20L12 2z" />
            </svg>
          </div>
        </div>

        {/* RIGHT SIDE - AUTH FORM */}
        <div className="lg:w-1/2 p-6 md:p-10 lg:p-16 flex flex-col justify-center bg-surface-variant/30 relative">
          <div className="max-w-md w-full mx-auto">
            <div className="mb-10">
              <h2 className="text-3xl font-semibold text-on-surface mb-2 tracking-tight">
                {isEmailVerification ? 'Xác thực Email' : (is2FA ? 'Xác thực 2 bước' : (isLogin ? t.login : t.register))}
              </h2>
              <p className="text-on-surface-variant text-sm">
                {isEmailVerification ? 'Vui lòng nhập mã 6 số được gửi tới email của bạn.' : (is2FA ? 'Vui lòng nhập mã 6 số từ ứng dụng Google Authenticator của bạn.' : (isLogin ? t.login_sub : t.register_sub))}
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              {errorMsg && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  {errorMsg}
                </div>
              )}

              {isEmailVerification ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-on-surface-variant ml-1" htmlFor="emailcode">Mã Xác Thực Email</label>
                  <div className="relative group">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-secondary transition-colors">mark_email_read</span>
                    <input autoFocus className="w-full bg-surface border border-outline-variant rounded-xl py-3.5 pl-12 pr-4 text-on-surface text-sm placeholder:text-on-surface-variant/50 focus:border-secondary focus:bg-surface-variant/50 focus:outline-none transition-all tracking-[0.5em] text-center font-mono text-xl" id="emailcode" placeholder="000000" type="text" maxLength={6} value={emailCode} onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, ''))} />
                  </div>
                </div>
              ) : is2FA ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-on-surface-variant ml-1" htmlFor="code">Mã Authenticator</label>
                  <div className="relative group">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-secondary transition-colors">pin</span>
                    <input autoFocus className="w-full bg-surface border border-outline-variant rounded-xl py-3.5 pl-12 pr-4 text-on-surface text-sm placeholder:text-on-surface-variant/50 focus:border-secondary focus:bg-surface-variant/50 focus:outline-none transition-all tracking-[0.5em] text-center font-mono text-xl" id="code" placeholder="000000" type="text" maxLength={6} value={twoFactorCode} onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))} />
                  </div>
                </div>
              ) : (
                <>
                  {!isLogin && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-on-surface-variant ml-1" htmlFor="name">{t.name}</label>
                      <div className="relative group">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-secondary transition-colors">badge</span>
                        <input className="w-full bg-surface border border-outline-variant rounded-xl py-3.5 pl-12 pr-4 text-on-surface text-sm placeholder:text-on-surface-variant/50 focus:border-secondary focus:bg-surface-variant/50 focus:outline-none transition-all" id="name" placeholder={t.name_ph} type="text" value={name} onChange={(e) => setName(e.target.value)} />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-on-surface-variant ml-1" htmlFor="email">{t.email}</label>
                    <div className="relative group">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-secondary transition-colors">mail</span>
                      <input className="w-full bg-surface border border-outline-variant rounded-xl py-3.5 pl-12 pr-4 text-on-surface text-sm placeholder:text-on-surface-variant/50 focus:border-secondary focus:bg-surface-variant/50 focus:outline-none transition-all" id="email" placeholder={t.email_ph} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between ml-1">
                      <label className="text-xs font-medium text-on-surface-variant" htmlFor="password">{t.password}</label>
                      {isLogin && <Link className="text-xs text-secondary hover:brightness-110 transition-colors" href="/forgot-password">{t.forgot_pw}</Link>}
                    </div>
                    <div className="relative group">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-secondary transition-colors">lock</span>
                      <input className="w-full bg-surface border border-outline-variant rounded-xl py-3.5 pl-12 pr-12 text-on-surface text-sm placeholder:text-on-surface-variant/50 focus:border-secondary focus:bg-surface-variant/50 focus:outline-none transition-all" id="password" placeholder="••••••••" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors">
                        <span className="material-symbols-outlined text-[18px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                      </button>
                    </div>
                  </div>
                </>
              )}

              
              {/* Turnstile Captcha */}
              {!(isEmailVerification || is2FA) && (
                <div className="flex justify-center mt-2">
                  <Turnstile
                    siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'}
                    onSuccess={(token) => setTurnstileToken(token)}
                    onError={() => setTurnstileToken(null)}
                    onExpire={() => setTurnstileToken(null)}
                  />
                </div>
              )}

              <button type="submit" disabled={!(isEmailVerification || is2FA) && !turnstileToken} className="w-full disabled:opacity-50 disabled:cursor-not-allowed bg-primary hover:bg-primary-container hover:text-on-primary-container text-white rounded-xl mt-4 relative overflow-hidden transition-all">
                <div className="relative py-4 flex items-center justify-center gap-2 font-semibold text-sm tracking-wide">
                  {(isEmailVerification || is2FA) ? 'Xác thực' : (isLogin ? t.continue : t.create)}
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </div>
              </button>
              
              {(isEmailVerification || is2FA) && (
                <button type="button" onClick={() => { setIsEmailVerification(false); setIs2FA(false); setTempToken(''); setEmailCode(''); setTwoFactorCode('') }} className="w-full text-center text-sm text-on-surface-variant hover:text-on-surface mt-2">
                  Quay lại
                </button>
              )}
            </form>

            {!(isEmailVerification || is2FA) && (
              <>
                <div className="mt-8 text-center">
                  <p className="text-sm text-on-surface-variant">
                    {isLogin ? t.no_account : t.has_account}
                    <button onClick={() => { setIsLogin(!isLogin); setErrorMsg('') }} className="text-secondary hover:brightness-110 font-medium hover:underline underline-offset-4 transition-all ml-1">
                      {isLogin ? t.register_now : t.login_now}
                    </button>
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="absolute bottom-6 left-0 right-0 text-center z-0 pointer-events-none">
        <p className="text-neutral-600 text-[10px] uppercase tracking-[0.2em] font-mono">
          © 2026 TQ MEDIA CORP. All rights reserved.
        </p>
      </div>

    </div>
  )
}
