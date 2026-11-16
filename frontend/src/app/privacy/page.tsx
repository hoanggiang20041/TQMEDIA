import type { Metadata } from 'next';
import TopNavbar from '@/components/layout/TopNavbar';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Chính sách bảo mật | TQMEDIA',
  description: 'Chính sách bảo mật thông tin của TQMEDIA.',
};

export default async function PrivacyPage() {
  let title = 'Chính sách bảo mật';
  let content = '<p>Đang cập nhật nội dung...</p>';
  try {
    const res = await fetch('http://localhost:4000/api/pages/privacy', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data.title) title = data.title;
      if (data.content) content = data.content;
    }
  } catch (err) {
    console.error('Failed to load page content');
  }

  return (
    <>
      <TopNavbar />
      <main className="min-h-screen bg-background relative overflow-hidden">
        <div className="mesh-bg absolute inset-0 opacity-30 pointer-events-none"></div>

        <div className="max-w-3xl mx-auto px-4 py-32 relative z-10">
          <div className="bg-surface border border-outline-variant/30 backdrop-blur-xl p-8 md:p-12 rounded-2xl">
            <h1 className="text-3xl md:text-4xl font-bold text-on-surface mb-6">{title}</h1>
            
            <div 
              className="text-base text-on-surface-variant leading-relaxed custom-html-content"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
