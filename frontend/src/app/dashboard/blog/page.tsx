import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Blog',
}

export const dynamic = 'force-dynamic';


const filterChips = [
  { label: 'Tất cả', active: true },
  { label: 'Cập nhật', active: false },
  { label: 'TikTok Tips', active: false },
  { label: 'FB Ads', active: false },
  { label: 'SEO', active: false },
]

export default async function BlogPage() {
  let articles: any[] = [];
  try {
    const res = await fetch('http://localhost:4000/api/posts', { cache: 'no-store' });
    if (res.ok) {
      articles = await res.json();
    }
  } catch(err) {
    console.error(err);
  }

  return (
    <>
      {/* Hero Section (Hidden because there are no articles yet) */}

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-2">
        {filterChips.map((chip) => (
          <button
            key={chip.label}
            className={`rounded-full px-4 py-2 font-label-sm transition-colors ${
              chip.active
                ? 'bg-primary-container text-on-primary-container'
                : 'glass-card text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Article Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {articles.length === 0 ? (
          <div className="col-span-1 md:col-span-3 py-12 text-center text-on-surface-variant glass-card rounded-2xl">
            Chưa có bài viết nào được công khai.
          </div>
        ) : articles.map((article) => (
          <Link href={`/dashboard/blog/${article.id}`} key={article.id}>
            <article
              className="glass-card glow-hover rounded-2xl overflow-hidden flex flex-col h-full cursor-pointer hover:-translate-y-1 transition-transform duration-300"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video overflow-hidden">
                <img
                  src={article.thumbnail}
                  alt={article.title}
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-3 left-3 rounded-full bg-primary-container/90 backdrop-blur-sm px-3 py-1 font-label-sm text-on-primary-container">
                  {article.category === 'tiktok' ? 'TikTok Tips' : article.category === 'fb' ? 'FB Ads' : article.category === 'seo' ? 'SEO' : article.category}
                </span>
              </div>

              {/* Content */}
              <div className="flex flex-col flex-1 p-5 gap-3">
                <h3 className="font-headline-md text-on-surface line-clamp-2">
                  {article.title}
                </h3>
                <div 
                  className="font-body-md text-on-surface-variant line-clamp-3 flex-1"
                  dangerouslySetInnerHTML={{ __html: article.content }}
                />

                {/* Meta */}
                <div className="flex items-center gap-3 text-on-surface-variant font-label-sm">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                    {new Date(article.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">visibility</span>
                    {article.views}
                  </span>
                </div>

                {/* CTA */}
                <button className="mt-2 inline-flex items-center gap-1 self-start font-label-sm text-secondary hover:text-secondary/80 transition-colors pointer-events-none">
                  Xem thêm
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </>
  )
}
