const fs = require('fs');

// --- Create frontend/src/app/register/page.tsx ---
const registerPageDir = 'd:/TQMEDIA/frontend/src/app/register';
if (!fs.existsSync(registerPageDir)) {
  fs.mkdirSync(registerPageDir, { recursive: true });
}

const registerPageContent = `'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function RegisterRedirectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const invite = searchParams.get('invite')
    if (invite) {
      router.replace(\`/login?invite=\${invite}\`)
    } else {
      router.replace('/login')
    }
  }, [router, searchParams])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <span className="material-symbols-outlined animate-spin text-4xl text-cyan-400">progress_activity</span>
    </div>
  )
}
`;
fs.writeFileSync(registerPageDir + '/page.tsx', registerPageContent, 'utf8');

// --- Update frontend/src/app/login/page.tsx ---
let loginContent = fs.readFileSync('d:/TQMEDIA/frontend/src/app/login/page.tsx', 'utf8');

// Add SweetAlert import
if (!loginContent.includes('sweetalert2')) {
  loginContent = loginContent.replace("import { useRouter } from 'next/navigation'", "import { useRouter } from 'next/navigation'\nimport Swal from 'sweetalert2'\nimport withReactContent from 'sweetalert2-react-content'\nconst MySwal = withReactContent(Swal)");
}

// 1. Update login body to include inviteCode
loginContent = loginContent.replace(
  `body: JSON.stringify({ email, password, turnstileToken: turnstileToken || undefined })`,
  `body: JSON.stringify({ email, password, turnstileToken: turnstileToken || undefined, inviteCode })`
);

// 2. Add upgradedLevel popup for Login
const oldLoginSuccess = `        if (data.success) {
          localStorage.setItem('tq_token', data.token)
          setRole(data.user.role as UserRole)
          router.push('/dashboard')
        }`;

const newLoginSuccess = `        if (data.success) {
          localStorage.setItem('tq_token', data.token)
          setRole(data.user.role as UserRole)
          
          if (data.upgradedLevel) {
            await MySwal.fire({
              icon: 'success',
              title: 'Thành công!',
              text: \`Chúc mừng! Tài khoản của bạn đã được nâng cấp lên Đại lý Cấp \${data.upgradedLevel} nhờ mã mời.\`,
              confirmButtonColor: '#06b6d4'
            })
          }
          
          router.push('/dashboard')
        }`;

loginContent = loginContent.replace(oldLoginSuccess, newLoginSuccess);


// 3. Add upgradedLevel popup for Register (Wait, register requires email verification, so it doesn't immediately log them in, BUT if it does, wait)
// Actually, register returns `requireEmailVerification: true` and a tempToken!
// So it doesn't hit `data.success` block immediately.
// If email verification is off (which it might not be), it hits `data.success`.
const oldRegisterSuccess = `        if (data.success) {
          localStorage.setItem('tq_token', data.token)
          setRole(data.user.role as UserRole)
          router.push('/dashboard')
        }`;

const newRegisterSuccess = `        if (data.success) {
          localStorage.setItem('tq_token', data.token)
          setRole(data.user.role as UserRole)

          if (data.user?.agencyLevel > 0) {
            await MySwal.fire({
              icon: 'success',
              title: 'Thành công!',
              text: \`Chúc mừng! Bạn đã đăng ký thành công và được nâng cấp lên Đại lý Cấp \${data.user.agencyLevel}.\`,
              confirmButtonColor: '#06b6d4'
            })
          }

          router.push('/dashboard')
        }`;

loginContent = loginContent.replace(oldRegisterSuccess, newRegisterSuccess);

fs.writeFileSync('d:/TQMEDIA/frontend/src/app/login/page.tsx', loginContent, 'utf8');
console.log('Done modifying frontend');
