const fs = require('fs'); 
let page = fs.readFileSync('src/app/page.tsx', 'utf8');

const correctBlock =         <div className="absolute w-[800px] h-[800px] bottom-[-20%] right-[-10%] bg-teal-600/10 rounded-full blur-[150px] mix-blend-screen"></div>
        <div className="absolute top-[30%] right-[20%] w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[120px] mix-blend-screen"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiLz48L3N2Zz4=')] [mask-image:radial-gradient(ellipse_at_center,black_50%,transparent_100%)] opacity-30"></div>
      </div>

      {/* MAIN CONTENT */}
      <div className="relative z-10 w-full pt-16">
        
        {/* Hero Section */}
        <section className="pt-36 pb-24 px-6 md:px-10 max-w-[1200px] mx-auto flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-variant/30 border border-outline-variant/30 mb-10 backdrop-blur-sm animate-fade-in-up">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.6)]"></span>
            <span className="text-xs font-medium text-on-surface tracking-wide">Phiên b?n 2.0 dã s?n sàng</span>
          </div>

          {settings?.home_title ? (
            <h1 
              className="text-5xl md:text-7xl lg:text-[80px] font-black tracking-tight leading-[1.1] mb-8 animate-fade-in-up" 
              style={{ animationDelay: '0.1s' }}
              dangerouslySetInnerHTML={{ __html: settings.home_title }}
            />
          ) : (
            <h1 className="text-5xl md:text-7xl lg:text-[80px] font-black tracking-tight leading-[1.1] mb-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              N?n t?ng Marketing<br/>
              <span className="gradient-text">M?ng Xã H?i</span> Ð?nh Cao
            </h1>
          )}
          
          <p className="text-lg md:text-xl text-on-surface-variant font-light leading-relaxed max-w-2xl mb-12 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            Gi?i pháp tang tru?ng toàn di?n cho TikTok, Facebook và Google.
            T?i uu hóa chi?n d?ch v?i s?c m?nh c?a công ngh? AI và h? th?ng t? d?ng hóa thông minh.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-5 mb-20 w-full sm:w-auto animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <Link
              href="/login"
              className="relative overflow-hidden rounded-xl group px-10 py-4 w-full sm:w-auto shadow-[0_0_30px_rgba(6,182,212,0.3)] hover:shadow-[0_0_40px_rgba(6,182,212,0.5)] transition-all active:scale-[0.98]"
            >
              <div className="absolute inset-0 btn-gradient opacity-90 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative flex items-center justify-center gap-2 text-white font-semibold tracking-wide">
                B?t d?u ngay;

const startIdx = page.indexOf('<div className="absolute w-[800px] h-[800px] bottom-[-20%] right-[-10%] bg-teal-600/10 rounded-full blur-[150px] mix-blend-screen"></div>');
const endIdx = page.indexOf('B?t d?u ngay') + 'B?t d?u ngay'.length;

if (startIdx !== -1 && endIdx !== -1) {
  page = page.substring(0, startIdx) + correctBlock + page.substring(endIdx);
  fs.writeFileSync('src/app/page.tsx', page);
  console.log('Fixed page.tsx');
} else {
  console.log('Could not find boundaries');
}
