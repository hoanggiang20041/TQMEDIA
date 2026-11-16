const fs = require('fs');
let code = fs.readFileSync('src/app/login/page.tsx', 'utf8');

// Add import
if (!code.includes('Turnstile')) {
  code = code.replace(
    /import \{ useRole, UserRole \} from '@\/context\/RoleContext'/,
    `import { useRole, UserRole } from '@/context/RoleContext'
import { Turnstile } from '@marsidev/react-turnstile'`
  );
}

// Add state
if (!code.includes('turnstileToken')) {
  code = code.replace(
    /const \[emailCode, setEmailCode\] = useState\(''\)/,
    `const [emailCode, setEmailCode] = useState('')
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null)`
  );
}

// Add turnstileToken to login request
if (!code.includes('turnstileToken: turnstileToken')) {
  code = code.replace(
    /body: JSON\.stringify\(\{ email, password \}\)/,
    `body: JSON.stringify({ email, password, turnstileToken: turnstileToken || undefined })`
  );
}

// Add turnstileToken to register request
if (!code.includes('turnstileToken: turnstileToken || undefined')) {
  code = code.replace(
    /body: JSON\.stringify\(\{ email, name, password \}\)/,
    `body: JSON.stringify({ email, name, password, turnstileToken: turnstileToken || undefined })`
  );
}

// Insert Turnstile component before submit button
if (!code.includes('<Turnstile')) {
  const turnstileJSX = `
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
`;
  code = code.replace(
    /<button type="submit"/,
    turnstileJSX + '\n              <button type="submit"'
  );
}

// Disable submit button if no turnstileToken
if (!code.includes('disabled={!(isEmailVerification || is2FA) && !turnstileToken}')) {
  code = code.replace(
    /<button type="submit" className="w-full/,
    '<button type="submit" disabled={!(isEmailVerification || is2FA) && !turnstileToken} className="w-full disabled:opacity-50 disabled:cursor-not-allowed '
  );
}

fs.writeFileSync('src/app/login/page.tsx', code);
console.log('Login page updated!');
