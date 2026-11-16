'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import RichTextEditor from '@/components/ui/RichTextEditor';
const MySwal = withReactContent(Swal);

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<any>(null);
  const [editorContent, setEditorContent] = useState('');

  // Fetch posts on mount
  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const token = localStorage.getItem('tq_token');
      const res = await fetch('/api/admin/posts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const formatted = data.map((p: any) => ({
          ...p,
          date: new Date(p.createdAt).toLocaleDateString('vi-VN')
        }));
        setPosts(formatted);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(posts.map(p => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleToggleStatus = async (id: string) => {
    const post = posts.find(p => p.id === id);
    if (!post) return;
    const newStatus = post.status === 'Công khai' ? 'Bản nháp' : 'Công khai';
    try {
      const token = localStorage.getItem('tq_token');
      const res = await fetch(`/api/admin/posts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ...post, status: newStatus })
      });
      if (res.ok) {
        setPosts(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenModal = (post: any = null) => {
    setEditingPost(post);
    setEditorContent(post?.content || '');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingPost(null);
    setEditorContent('');
    setIsModalOpen(false);
  };

  const handleSavePost = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const category = formData.get('category') as string;
    const thumbnail = formData.get('thumbnail') as string;

    const payload = {
      title,
      category,
      thumbnail: thumbnail || 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?q=80&w=800&auto=format&fit=crop',
      content: editorContent,
      status: editingPost ? editingPost.status : 'Bản nháp'
    };

    try {
      const token = localStorage.getItem('tq_token');
      const url = editingPost 
        ? `/api/admin/posts/${editingPost.id}`
        : `/api/admin/posts`;
      const method = editingPost ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        fetchPosts();
        setIsModalOpen(false);
        MySwal.fire({ icon: 'success', title: 'Thành công', text: 'Đã lưu bài viết!' });
      }
    } catch (err) {
      console.error(err);
      MySwal.fire({ icon: 'error', title: 'Lỗi', text: 'Không thể lưu bài viết' });
    }
  };

  const handleDeletePost = async (id: string) => {
    const __confirmResult = await MySwal.fire({ title: 'Xác nhận', text: 'Bạn có chắc chắn muốn xóa bài viết này?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Đồng ý', cancelButtonText: 'Hủy' });
    if (__confirmResult.isConfirmed) {
      try {
        const token = localStorage.getItem('tq_token');
        const res = await fetch(`/api/admin/posts/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          setPosts(posts.filter(p => p.id !== id));
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="flex flex-col gap-8 p-6 lg:p-8 w-full max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-display-lg text-3xl font-bold text-[var(--on-surface)] neon-glow">
            Quản lý Bài viết
          </h1>
          <p className="font-body-md text-[var(--on-surface-variant)] mt-1">
            Thêm, sửa, xóa các bài viết trên Blog
          </p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn-primary px-6 py-2.5 rounded-xl font-label-sm font-semibold flex items-center gap-2 glow-hover transition-all">
          <span className="material-symbols-outlined text-[20px]">edit_document</span>
          Viết bài mới
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 rounded-2xl border border-outline-variant/30 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)] to-transparent opacity-5 group-hover:opacity-10 transition-opacity"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-[rgba(165,243,252,0.1)] flex items-center justify-center text-[var(--primary)]">
              <span className="material-symbols-outlined text-2xl">article</span>
            </div>
            <div>
              <p className="text-[var(--on-surface-variant)] font-body-sm mb-1">Tổng Bài viết</p>
              <p className="text-2xl font-bold text-[var(--on-surface)]">{posts.length}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl border border-outline-variant/30 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--secondary)] to-transparent opacity-5 group-hover:opacity-10 transition-opacity"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-[rgba(76,215,246,0.1)] flex items-center justify-center text-[var(--secondary)]">
              <span className="material-symbols-outlined text-2xl">visibility</span>
            </div>
            <div>
              <p className="text-[var(--on-surface-variant)] font-body-sm mb-1">Lượt xem (30 ngày)</p>
              <p className="text-2xl font-bold text-[var(--on-surface)]">{posts.reduce((sum, p) => sum + (p.views || 0), 0).toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl border border-outline-variant/30 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--tertiary)] to-transparent opacity-5 group-hover:opacity-10 transition-opacity"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-[rgba(255,183,132,0.1)] flex items-center justify-center text-[var(--tertiary)]">
              <span className="material-symbols-outlined text-2xl">draft</span>
            </div>
            <div>
              <p className="text-[var(--on-surface-variant)] font-body-sm mb-1">Bản nháp</p>
              <p className="text-2xl font-bold text-[var(--on-surface)]">{posts.filter(p => p.status === 'Bản nháp').length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-card p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between border border-outline-variant/30">
        <div className="relative w-full md:w-96 group">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[var(--on-surface-variant)] group-focus-within:text-[var(--primary)] transition-colors">
            search
          </span>
          <input 
            type="text" 
            placeholder="Tìm kiếm theo tiêu đề..." 
            className="input-glass w-full pl-10 pr-4 py-2.5 rounded-xl font-body-md bg-surface-container-high/50 border border-outline-variant/50 focus:outline-none focus:border-[var(--primary)] focus:bg-surface-variant text-[var(--on-surface)] placeholder:text-[var(--on-surface-variant)] transition-all"
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto relative group">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[var(--on-surface-variant)] pointer-events-none group-focus-within:text-[var(--primary)] transition-colors">
            filter_list
          </span>
          <select className="input-glass w-full md:w-auto pl-10 pr-10 py-2.5 rounded-xl font-body-md bg-surface-container-high/50 border border-outline-variant/50 focus:outline-none focus:border-[var(--primary)] focus:bg-surface-variant text-[var(--on-surface)] appearance-none cursor-pointer transition-all">
            <option value="all" className="bg-[var(--surface)] text-[var(--on-surface)]">Tất cả chuyên mục</option>
            <option value="tiktok" className="bg-[var(--surface)] text-[var(--on-surface)]">TikTok Tips</option>
            <option value="fb" className="bg-[var(--surface)] text-[var(--on-surface)]">FB Ads</option>
            <option value="seo" className="bg-[var(--surface)] text-[var(--on-surface)]">SEO</option>
          </select>
          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[var(--on-surface-variant)] pointer-events-none">
            expand_more
          </span>
        </div>
      </div>

      {/* Table Content */}
      <div className="glass-panel rounded-3xl overflow-hidden border border-outline-variant/50 glow-border">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="border-b border-outline-variant/50 bg-surface-container-high/50">
                <th className="p-5 w-12 text-center">
                  <input 
                    type="checkbox" 
                    onChange={handleSelectAll} 
                    checked={posts.length > 0 && selectedIds.length === posts.length} 
                    className="w-4 h-4 rounded cursor-pointer accent-[var(--primary)]" 
                  />
                </th>
                <th className="py-5 pr-5 font-label-sm font-semibold text-[var(--on-surface-variant)] w-28 uppercase tracking-wider text-xs">Ảnh bìa</th>
                <th className="p-5 font-label-sm font-semibold text-[var(--on-surface-variant)] uppercase tracking-wider text-xs">Tiêu đề</th>
                <th className="p-5 font-label-sm font-semibold text-[var(--on-surface-variant)] uppercase tracking-wider text-xs">Chuyên mục</th>
                <th className="p-5 font-label-sm font-semibold text-[var(--on-surface-variant)] uppercase tracking-wider text-xs">Ngày đăng</th>
                <th className="p-5 font-label-sm font-semibold text-[var(--on-surface-variant)] uppercase tracking-wider text-xs">Lượt xem</th>
                <th className="p-5 font-label-sm font-semibold text-[var(--on-surface-variant)] uppercase tracking-wider text-xs">Trạng thái</th>
                <th className="p-5 font-label-sm font-semibold text-[var(--on-surface-variant)] uppercase tracking-wider text-xs text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id} className="border-b border-outline-variant/30 hover:bg-surface-container transition-colors group">
                  <td className="p-5 text-center">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.includes(post.id)} 
                      onChange={() => handleSelect(post.id)} 
                      className="w-4 h-4 rounded cursor-pointer accent-[var(--primary)]" 
                    />
                  </td>
                  <td className="py-5 pr-5">
                    <div className="w-20 h-14 relative rounded-lg overflow-hidden bg-surface-variant/50 border border-outline-variant/50">
                      <Image 
                        src={post.thumbnail}
                        alt={post.title}
                        fill
                        className="object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                      />
                    </div>
                  </td>
                  <td className="p-5">
                    <p className="font-body-md font-medium text-[var(--on-surface)] line-clamp-2 max-w-sm group-hover:text-[var(--primary)] transition-colors">
                      {post.title}
                    </p>
                  </td>
                  <td className="p-5">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[rgba(165,243,252,0.1)] text-[var(--primary)] border border-[rgba(165,243,252,0.2)] whitespace-nowrap">
                      {post.category}
                    </span>
                  </td>
                  <td className="p-5 text-[var(--on-surface-variant)] font-body-sm whitespace-nowrap">
                    {post.date}
                  </td>
                  <td className="p-5 text-[var(--on-surface-variant)] font-body-sm font-medium">
                    {post.views.toLocaleString()}
                  </td>
                  <td className="p-5">
                    <div className="flex flex-col items-start gap-1.5">
                      <div 
                        onClick={() => handleToggleStatus(post.id)}
                        className={`w-10 h-5 flex items-center rounded-full p-1 cursor-pointer transition-colors ${post.status === 'Công khai' ? 'bg-[var(--primary)]' : 'bg-outline/30'}`}
                      >
                        <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform ${post.status === 'Công khai' ? 'translate-x-5' : 'translate-x-0'}`} />
                      </div>
                      <span className={`text-[10px] font-medium whitespace-nowrap ${post.status === 'Công khai' ? 'text-[var(--primary)]' : 'text-[var(--on-surface-variant)]'}`}>{post.status}</span>
                    </div>
                  </td>
                  <td className="p-5">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => handleOpenModal(post)} className="p-2 rounded-xl text-[var(--on-surface-variant)] hover:text-[var(--primary)] hover:bg-[rgba(165,243,252,0.1)] transition-all" title="Chỉnh sửa">
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                      </button>
                      <button 
                        onClick={() => handleDeletePost(post.id)}
                        className="p-2 rounded-xl text-[var(--on-surface-variant)] hover:text-[var(--error)] hover:bg-[rgba(255,180,171,0.1)] transition-all" 
                        title="Xóa"
                      >
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-outline-variant/30 flex items-center justify-between text-[var(--on-surface-variant)] font-body-sm">
          <span>Hiển thị 1 - {posts.length} trong {posts.length} bài viết</span>
          <div className="flex items-center gap-2">
            <button className="p-1 rounded-lg hover:bg-surface-variant transition-colors disabled:opacity-50" disabled>
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <button className="p-1 rounded-lg hover:bg-surface-variant transition-colors disabled:opacity-50" disabled>
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCloseModal}></div>
          <div className="glass-panel w-full max-w-2xl relative z-10 rounded-2xl overflow-hidden border border-outline-variant/50 flex flex-col max-h-[90vh] shadow-2xl">
            <div className="p-6 border-b border-outline-variant/50 flex justify-between items-center bg-surface-container-low">
              <h2 className="text-xl font-display-lg text-[var(--on-surface)] neon-glow">
                {editingPost ? 'Chỉnh sửa Bài viết' : 'Viết Bài mới'}
              </h2>
              <button onClick={handleCloseModal} className="text-[var(--on-surface-variant)] hover:text-[var(--error)] transition-colors rounded-lg p-1 hover:bg-[rgba(255,180,171,0.1)]">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex flex-col gap-5 custom-scrollbar">
              <form id="blog-form" onSubmit={handleSavePost} className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <label className="font-label-sm text-[var(--on-surface-variant)] font-medium">Tiêu đề <span className="text-[var(--error)]">*</span></label>
                  <input type="text" name="title" defaultValue={editingPost?.title} placeholder="Nhập tiêu đề bài viết..." className="input-glass w-full px-4 py-2.5 rounded-xl font-body-md bg-surface-container-high/50 border border-outline-variant/50 focus:outline-none focus:border-[var(--primary)] focus:bg-surface-variant text-[var(--on-surface)] transition-all" required />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-2">
                    <label className="font-label-sm text-[var(--on-surface-variant)] font-medium">Chuyên mục</label>
                    <div className="relative">
                      <select name="category" defaultValue={editingPost?.category || 'tiktok'} className="input-glass w-full px-4 py-2.5 rounded-xl font-body-md bg-surface-container-high/50 border border-outline-variant/50 focus:outline-none focus:border-[var(--primary)] focus:bg-surface-variant text-[var(--on-surface)] transition-all appearance-none cursor-pointer" required>
                        <option value="tiktok" className="bg-[var(--surface)]">TikTok Tips</option>
                        <option value="fb" className="bg-[var(--surface)]">FB Ads</option>
                        <option value="seo" className="bg-[var(--surface)]">SEO</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[var(--on-surface-variant)] pointer-events-none">
                        expand_more
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <label className="font-label-sm text-[var(--on-surface-variant)] font-medium">URL Ảnh Bìa</label>
                    <input type="text" name="thumbnail" defaultValue={editingPost?.thumbnail} placeholder="https://..." className="input-glass w-full px-4 py-2.5 rounded-xl font-body-md bg-surface-container-high/50 border border-outline-variant/50 focus:outline-none focus:border-[var(--primary)] focus:bg-surface-variant text-[var(--on-surface)] transition-all" />
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="font-label-sm text-[var(--on-surface-variant)] font-medium">Nội dung</label>
                  <RichTextEditor 
                    value={editorContent}
                    onChange={setEditorContent}
                    placeholder="Viết nội dung bài viết..."
                  />
                </div>
              </form>
            </div>
            
            <div className="p-6 border-t border-outline-variant/50 flex justify-end gap-4 bg-surface-container-highest/20">
              <button onClick={handleCloseModal} className="px-6 py-2.5 rounded-xl font-label-sm font-semibold text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] hover:bg-surface-variant transition-all">
                Hủy
              </button>
              <button type="submit" form="blog-form" className="btn-primary px-6 py-2.5 rounded-xl font-label-sm font-semibold flex items-center gap-2 glow-hover transition-all">
                <span className="material-symbols-outlined text-[20px]">save</span>
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
