import type { Metadata } from 'next';
import TopNavbar from '@/components/layout/TopNavbar';
import Footer from '@/components/layout/Footer';
import ContactForm from '@/components/ContactForm';

export const metadata: Metadata = {
  title: 'Liên hệ | TQMEDIA',
  description: 'Liên hệ với TQMEDIA - Chúng tôi luôn sẵn sàng hỗ trợ bạn 24/7',
};

export default async function ContactPage() {
  let settings: any = {};
  try {
    const res = await fetch('http://localhost:4000/api/settings', { cache: 'no-store' });
    if (res.ok) {
      settings = await res.json();
    }
  } catch (err) {}

  let mapIframe = settings.contact_map_iframe || '';
  mapIframe = mapIframe.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
  if (!mapIframe) {
    mapIframe = '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3919.319350036697!2d106.7027581152604!3d10.786834992314644!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31752f4ae1b99a9b%3A0x6b44766d6d7bbda4!2zMTIzIMSQxrDhu51uZyBUw7RuIMSQ4bupYyBUaOG6r25nLCBC4bq_biBOZ2jDqSwgUXXhuq1uIDEsIEjhu5MgQ2jDrSBNaW5oLCBWaeG7h3QgTmFt!5e0!3m2!1svi!2s!4v1717234567890!5m2!1svi!2s" width="100%" height="100%" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade" class="filter invert-[90%] hue-rotate-180 contrast-80 w-full h-full"></iframe>';
  } else if (mapIframe.includes('<iframe')) {
    if (!mapIframe.includes('class=')) {
      mapIframe = mapIframe.replace('<iframe', '<iframe class="filter invert-[90%] hue-rotate-180 contrast-80 w-full h-full"');
    }
  }

  const hotline = settings.contact_hotline || "090 123 4567";
  const email = settings.contact_email || "support@tqmedia.com";
  const address = settings.contact_address || "123 Đường Tôn Đức Thắng, Quận 1, TP. Hồ Chí Minh";
  const workingHours = settings.contact_working_hours || "Thứ 2 - Thứ 6: 08:00 - 18:00\nThứ 7: 08:00 - 12:00";

  return (
    <main className="min-h-screen flex flex-col bg-background text-on-surface">
      <TopNavbar />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden border-b border-outline-variant/30">
        <div className="absolute inset-0 mesh-bg opacity-30"></div>
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold text-on-surface mb-6 drop-shadow-lg">
            Liên hệ với TQMEDIA
          </h1>
          <p className="text-lg md:text-xl text-on-surface-variant max-w-2xl mx-auto">
            Chúng tôi luôn sẵn sàng hỗ trợ bạn 24/7. Hãy để lại tin nhắn hoặc liên hệ trực tiếp với chúng tôi qua các kênh dưới đây.
          </p>
        </div>
      </section>

      {/* Main Content: 2-column layout */}
      <section className="max-w-5xl mx-auto px-4 py-20 w-full flex-grow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          
          {/* Left Col (Info) */}
          <div className="space-y-8">
            <div className="bg-surface border border-outline-variant/30 backdrop-blur-xl p-8 rounded-2xl relative overflow-hidden group hover:bg-surface-variant/30 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              
              <h2 className="text-2xl font-bold text-on-surface mb-6">Thông tin liên hệ</h2>
              
              <ul className="space-y-6">
                <li className="flex items-start gap-4">
                  <span className="material-symbols-outlined text-primary mt-1">location_on</span>
                  <div>
                    <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Địa chỉ</h3>
                    <p className="text-base text-on-surface">{address}</p>
                  </div>
                </li>
                
                <li className="flex items-start gap-4">
                  <span className="material-symbols-outlined text-primary mt-1">call</span>
                  <div>
                    <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Điện thoại</h3>
                    <p className="text-base text-on-surface">{hotline}</p>
                  </div>
                </li>
                
                <li className="flex items-start gap-4">
                  <span className="material-symbols-outlined text-primary mt-1">mail</span>
                  <div>
                    <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Email</h3>
                    <p className="text-base text-on-surface">{email}</p>
                  </div>
                </li>
                
                <li className="flex items-start gap-4">
                  <span className="material-symbols-outlined text-primary mt-1">schedule</span>
                  <div>
                    <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Giờ làm việc</h3>
                    <p className="text-base text-on-surface whitespace-pre-wrap">{workingHours}</p>
                  </div>
                </li>
              </ul>
            </div>

            {/* Map */}
            <div 
              className="bg-surface border border-outline-variant/30 backdrop-blur-xl rounded-2xl h-[300px] relative overflow-hidden group"
              dangerouslySetInnerHTML={{ __html: mapIframe }}
              suppressHydrationWarning
            />
          </div>

          {/* Right Col (Form) */}
          <div>
            <ContactForm />
          </div>
          
        </div>
      </section>

      <Footer />
    </main>
  );
}
