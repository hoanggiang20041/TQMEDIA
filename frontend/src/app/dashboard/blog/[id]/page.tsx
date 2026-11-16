import Link from 'next/link';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let title = 'Chi tiết bài viết';
  try {
    const res = await fetch(`http://localhost:4000/api/posts/${id}`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      title = data.title;
    }
  } catch (err) {}
  return { title };
}

export default async function BlogPostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let post: any = null;

  try {
    const res = await fetch(`http://localhost:4000/api/posts/${id}`, { cache: 'no-store' });
    if (res.ok) {
      post = await res.json();
    }
  } catch (err) {
    console.error(err);
  }

  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
        <span className="material-symbols-outlined text-6xl text-error">error</span>
        <h2 className="text-2xl font-bold text-[var(--on-surface)]">Không tìm thấy bài viết</h2>
        <p className="text-[var(--on-surface-variant)]">Bài viết này có thể đã bị xóa hoặc không còn công khai.</p>
        <Link href="/dashboard/blog" className="mt-4 px-6 py-2 bg-primary text-on-primary rounded-xl font-medium flex items-center gap-2">
          <span className="material-symbols-outlined">arrow_back</span>
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  return (
    <article className="max-w-4xl mx-auto w-full pb-12">
      {/* Back button */}
      <div className="mb-6">
        <Link href="/dashboard/blog" className="inline-flex items-center gap-2 text-[var(--on-surface-variant)] hover:text-[var(--primary)] transition-colors font-medium">
          <span className="material-symbols-outlined">arrow_back</span>
          Quay lại Blog
        </Link>
      </div>

      {/* Header */}
      <header className="mb-8 flex flex-col gap-4">
        <span className="self-start px-3 py-1 rounded-full bg-[var(--primary-container)] text-[var(--on-primary-container)] font-label-sm uppercase tracking-wider">
          {post.category === 'tiktok' ? 'TikTok Tips' : post.category === 'fb' ? 'FB Ads' : post.category === 'seo' ? 'SEO' : post.category}
        </span>
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-display-lg font-bold text-[var(--on-surface)] leading-tight">
          {post.title}
        </h1>
        <div className="flex items-center gap-4 text-[var(--on-surface-variant)] font-body-sm mt-2 border-b border-[var(--outline-variant)]/50 pb-6">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-lg">calendar_today</span>
            {new Date(post.createdAt).toLocaleDateString('vi-VN')}
          </span>
          <span className="w-1 h-1 rounded-full bg-[var(--on-surface-variant)]"></span>
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-lg">visibility</span>
            {post.views} lượt xem
          </span>
        </div>
      </header>

      {/* Thumbnail */}
      <div className="w-full aspect-[21/9] rounded-3xl overflow-hidden mb-10 shadow-2xl relative border border-[var(--outline-variant)]/30">
        <img src={post.thumbnail} alt={post.title} className="w-full h-full object-cover" />
      </div>

      {/* Content */}
      <div 
        className="prose prose-invert max-w-none text-[var(--on-surface)] text-lg leading-relaxed prose-headings:text-[var(--on-surface)] prose-a:text-[var(--primary)] prose-strong:text-[var(--on-surface)] prose-blockquote:border-[var(--primary)] prose-blockquote:bg-[var(--surface-container)] prose-blockquote:px-6 prose-blockquote:py-2 prose-blockquote:rounded-r-2xl"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
    </article>
  );
}
