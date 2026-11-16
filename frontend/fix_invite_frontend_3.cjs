const fs = require('fs');
let content = fs.readFileSync('d:/TQMEDIA/frontend/src/app/login/page.tsx', 'utf8');

const targetSuccess = `        if (data.success) {
          localStorage.setItem('tq_token', data.token)
          setRole(data.user.role as UserRole)
          router.push('/dashboard')
        }`;

// Replace in verify-login-email
const emailVerificationSuccess = `        if (data.success) {
          localStorage.setItem('tq_token', data.token)
          setRole(data.user.role as UserRole)
          
          if (data.user?.agencyLevel > 0 && inviteCode) {
            await MySwal.fire({
              icon: 'success',
              title: 'Thành công!',
              text: \`Chúc mừng! Tài khoản của bạn đã được nâng cấp lên Đại lý Cấp \${data.user.agencyLevel}.\`,
              confirmButtonColor: '#06b6d4'
            })
          }
          
          router.push('/dashboard')
        }`;

// Replace in login
const loginSuccess = `        if (data.success) {
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

// Replace in register
const registerSuccess = `        if (data.success) {
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


// 1. Find isEmailVerification index
let idx1 = content.indexOf('if (isEmailVerification) {');
let idx1End = content.indexOf('return;', idx1);
let str1 = content.substring(idx1, idx1End);
str1 = str1.replace(targetSuccess, emailVerificationSuccess);
content = content.substring(0, idx1) + str1 + content.substring(idx1End);

// 2. Find isLogin index
let idx2 = content.indexOf('if (isLogin) {');
let idx2End = content.indexOf('} else {', idx2);
let str2 = content.substring(idx2, idx2End);
str2 = str2.replace(targetSuccess, loginSuccess);
content = content.substring(0, idx2) + str2 + content.substring(idx2End);

// 3. Find register index
let idx3 = content.indexOf('} else {', idx2); // This is the else block of isLogin
let idx3End = content.indexOf('const fillTestCredentials', idx3);
let str3 = content.substring(idx3, idx3End);
str3 = str3.replace(targetSuccess, registerSuccess);
content = content.substring(0, idx3) + str3 + content.substring(idx3End);

fs.writeFileSync('d:/TQMEDIA/frontend/src/app/login/page.tsx', content, 'utf8');
console.log('Done!');
