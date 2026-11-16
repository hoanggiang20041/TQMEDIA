'use client';

import React, { useState } from 'react';
import Image from 'next/image';

import { useCourses, Course, Schedule } from '@/hooks/useCourses';
import { useRole } from '@/context/RoleContext';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
const MySwal = withReactContent(Swal);

export default function AdminCoursesPage() {
  const { courses, enrollments, updateEnrollmentProgress, addCourse, updateCourse, deleteCourse, isLoaded } = useCourses();
  const { role, user } = useRole();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [currentCourse, setCurrentCourse] = useState<Partial<Course>>({});
  const [instructors, setInstructors] = useState<any[]>([]);

  // Fetch instructors if admin
  React.useEffect(() => {
    if (role === 'ADMIN') {
      const token = localStorage.getItem('tq_token');
      fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => setInstructors(Array.isArray(data) ? data.filter((u: any) => u.role === 'INSTRUCTOR') : []))
        .catch(console.error);
    }
  }, [role]);

  const displayedCourses = role === 'INSTRUCTOR' ? courses.filter(c => c.instructorId === user?.id) : courses;

  // States for Progress Modal
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [selectedCourseForProgress, setSelectedCourseForProgress] = useState<Course | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  if (!isLoaded) return null;

  const toggleSelectAll = () => {
    if (selectedIds.size === displayedCourses.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayedCourses.map(c => c.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleToggleStatus = (id: string) => {
    const course = displayedCourses.find(c => c.id === id);
    if (course) {
      updateCourse({ ...course, status: course.status === 'active' ? 'inactive' : 'active' });
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const openAddModal = () => {
    setModalMode('add');
    setCurrentCourse({});
    setIsModalOpen(true);
  };

  const openEditModal = (course: Course) => {
    setModalMode('edit');
    setCurrentCourse(course);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const openProgressModal = (course: Course) => {
    setSelectedCourseForProgress(course);
    const courseEnrollments = enrollments.filter(e => e.courseId === course.id);
    if (courseEnrollments.length > 0) {
      setSelectedStudentId(courseEnrollments[0].userId);
    } else {
      setSelectedStudentId(null);
    }
    setIsProgressModalOpen(true);
  };

  const closeProgressModal = () => {
    setIsProgressModalOpen(false);
    setSelectedCourseForProgress(null);
    setSelectedStudentId(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (modalMode === 'add') {
      const newCourse: Course = {
        id: Math.random().toString(36).substr(2, 9),
        title: currentCourse.title || '',
        instructor: role === 'INSTRUCTOR' ? user?.name || '' : currentCourse.instructor || '',
        instructorId: role === 'INSTRUCTOR' ? user?.id : currentCourse.instructorId,
        type: currentCourse.type || 'single',
        tag: currentCourse.tag || 'Mới',
        tagColor: currentCourse.tagColor || 'bg-primary-container/30 text-primary',
        importPrice: Number(currentCourse.importPrice) || 0,
        originalPrice: Number(currentCourse.originalPrice) || 0,
        salePrice: Number(currentCourse.salePrice) || 0,
        status: currentCourse.status || 'active',
        thumbnail: currentCourse.thumbnail || 'https://lh3.googleusercontent.com/d/1vA5WdFzS5j8K7t2WbB3Z6o5J6wHk7V1L',
        videoDemo: currentCourse.videoDemo,
        description: currentCourse.description,
        rating: currentCourse.rating || 5.0,
        students: currentCourse.students || '0',
        lessons: currentCourse.lessons || 0,
        curriculum: currentCourse.curriculum || [],
        schedules: currentCourse.schedules || [],
      };
      addCourse(newCourse);
    } else {
      updateCourse({ ...(courses.find(c => c.id === currentCourse.id)!), ...currentCourse } as Course);
    }
    closeModal();
  };

  const handleAddSchedule = () => {
    const newSchedule: Schedule = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      days: '',
      time: '',
      meetLink: ''
    };
    setCurrentCourse({
      ...currentCourse,
      schedules: [...(currentCourse.schedules || []), newSchedule]
    });
  };

  const handleUpdateSchedule = (id: string, field: keyof Schedule, value: string) => {
    setCurrentCourse({
      ...currentCourse,
      schedules: currentCourse.schedules?.map(s => s.id === id ? { ...s, [field]: value } : s)
    });
  };

  const handleRemoveSchedule = (id: string) => {
    setCurrentCourse({
      ...currentCourse,
      schedules: currentCourse.schedules?.filter(s => s.id !== id)
    });
  };

  const handleDeleteCourse = async (id: string) => {
    const __confirmResult = await MySwal.fire({ title: 'Xác nhận', text: 'Bạn có chắc chắn muốn xóa khóa học này?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Đồng ý', cancelButtonText: 'Hủy' });
    if (__confirmResult.isConfirmed) {
      deleteCourse(id);
    }
  };

  const totalCourses = courses.length;
  const totalStudents = new Set(enrollments.map(e => e.userId)).size;
  const totalRevenue = enrollments.reduce((sum, curr) => {
    const course = courses.find(c => c.id === curr.courseId);
    return sum + (course ? course.salePrice : 0);
  }, 0);

  const formatShort = (val: number) => {
    if (val === 0) return '0';
    if (val >= 1000000) return (val / 1000000).toFixed(1).replace('.0', '') + 'M';
    if (val >= 1000) return (val / 1000).toFixed(1).replace('.0', '') + 'K';
    return val.toString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-headline-md text-on-surface">Quản lý Khóa học</h1>
          <p className="text-on-surface-variant font-body-md mt-1">Quản lý thông tin và trạng thái các khóa học</p>
        </div>
        {role === 'ADMIN' && (
          <button
            onClick={openAddModal}
            className="btn-primary inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-background font-medium hover:bg-primary/90 transition-colors"
          >
            <span className="material-symbols-outlined">add</span>
            Thêm Khóa học
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className={`grid grid-cols-1 ${role === 'ADMIN' ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-6`}>
        <div className="glass-card bg-surface/50 border border-on-surface-variant/20 rounded-2xl p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-2xl">library_books</span>
          </div>
          <div>
            <p className="text-on-surface-variant text-sm font-medium">{role === 'ADMIN' ? 'Tổng Khóa học' : 'Khóa học đang quản lý'}</p>
            <h3 className="text-2xl font-display-lg text-on-surface mt-1">{totalCourses}</h3>
          </div>
        </div>
        
        <div className="glass-card bg-surface/50 border border-on-surface-variant/20 rounded-2xl p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center text-secondary">
            <span className="material-symbols-outlined text-2xl">school</span>
          </div>
          <div>
            <p className="text-on-surface-variant text-sm font-medium">{role === 'ADMIN' ? 'Học viên đã mua' : 'Số học viên quản lý'}</p>
            <h3 className="text-2xl font-display-lg text-on-surface mt-1">{formatShort(totalStudents)}</h3>
          </div>
        </div>

        {role === 'ADMIN' && (
          <div className="glass-card bg-surface/50 border border-on-surface-variant/20 rounded-2xl p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-tertiary/20 flex items-center justify-center text-tertiary">
              <span className="material-symbols-outlined text-2xl">payments</span>
            </div>
            <div>
              <p className="text-on-surface-variant text-sm font-medium">Doanh thu</p>
              <h3 className="text-2xl font-display-lg text-on-surface mt-1">{formatShort(totalRevenue)}</h3>
            </div>
          </div>
        )}
      </div>

      {/* Table Section */}
      <div className="glass-panel bg-surface/40 border border-on-surface-variant/20 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface/60 border-b border-on-surface-variant/20">
                <th className="p-4 w-12 text-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-on-surface-variant/30 bg-surface text-primary focus:ring-primary/50"
                    checked={selectedIds.size === courses.length && courses.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="p-4 text-on-surface font-medium text-sm">Ảnh bìa</th>
                <th className="p-4 text-on-surface font-medium text-sm min-w-[200px]">Tên khóa học</th>
                <th className="p-4 text-on-surface font-medium text-sm">Loại</th>
                <th className="p-4 text-on-surface font-medium text-sm">Người hướng dẫn</th>
                <th className="p-4 text-on-surface font-medium text-sm">Giá gốc</th>
                <th className="p-4 text-on-surface font-medium text-sm">Giá bán</th>
                <th className="p-4 text-on-surface font-medium text-sm">Trạng thái</th>
                <th className="p-4 text-on-surface font-medium text-sm text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-on-surface-variant/10">
              {displayedCourses.map((course) => (
                <tr key={course.id} className="hover:bg-on-surface-variant/5 transition-colors">
                  <td className="p-4 text-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-on-surface-variant/30 bg-surface text-primary focus:ring-primary/50"
                      checked={selectedIds.has(course.id)}
                      onChange={() => toggleSelect(course.id)}
                    />
                  </td>
                  <td className="p-4">
                    <div className="relative w-16 h-12 rounded overflow-hidden">
                      <Image
                        src={course.thumbnail}
                        alt={course.title}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  </td>
                  <td className="p-4 text-on-surface font-medium">{course.title}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${course.type === 'combo' ? 'bg-tertiary/20 text-tertiary' : 'bg-primary/20 text-primary'}`}>
                      {course.type === 'combo' ? 'Combo' : 'Khóa lẻ'}
                    </span>
                  </td>
                  <td className="p-4 text-on-surface-variant">{course.instructor}</td>
                  <td className="p-4 text-on-surface-variant line-through text-sm">{formatPrice(course.originalPrice)}</td>
                  <td className="p-4 text-secondary font-medium">{formatPrice(course.salePrice)}</td>
                  <td className="p-4">
                    <button
                      onClick={() => { if (role === 'ADMIN') handleToggleStatus(course.id) }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        course.status === 'active' ? 'bg-primary' : 'bg-on-surface-variant/30'
                      } ${role !== 'ADMIN' ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                      disabled={role !== 'ADMIN'}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                          course.status === 'active' ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <span className="ml-2 text-sm text-on-surface-variant">
                      {course.status === 'active' ? 'Đang bán' : 'Tạm ngưng'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      {role === 'ADMIN' && (
                        <>
                          <button
                            onClick={() => openEditModal(course)}
                            className="p-1 text-on-surface-variant hover:text-primary transition-colors"
                            title="Sửa"
                          >
                            <span className="material-symbols-outlined text-xl">edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteCourse(course.id)}
                            className="p-1 text-on-surface-variant hover:text-error transition-colors"
                            title="Xóa"
                          >
                            <span className="material-symbols-outlined text-xl">delete</span>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-2xl bg-surface border border-on-surface-variant/20 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-on-surface-variant/20 flex items-center justify-between">
              <h2 className="text-xl font-headline-md text-on-surface">
                {modalMode === 'add' ? 'Thêm Khóa học Mới' : 'Cập nhật Khóa học'}
              </h2>
              <button
                onClick={closeModal}
                className="text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              <form id="course-form" onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-sm text-on-surface-variant font-medium">Tên khóa học</label>
                    <input
                      type="text"
                      required
                      className="input-glass w-full px-4 py-2 bg-background/50 border border-on-surface-variant/20 rounded-lg text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      value={currentCourse.title || ''}
                      onChange={(e) => setCurrentCourse({ ...currentCourse, title: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm text-on-surface-variant font-medium">Người hướng dẫn</label>
                    <select
                      required
                      className="input-glass w-full px-4 py-2 bg-background/50 border border-on-surface-variant/20 rounded-lg text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
                      value={role === 'INSTRUCTOR' ? user?.id : (currentCourse.instructorId || '')}
                      disabled={role === 'INSTRUCTOR'}
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        const selectedInst = instructors.find(i => i.id === selectedId);
                        setCurrentCourse({ 
                          ...currentCourse, 
                          instructorId: selectedId, 
                          instructor: selectedInst ? selectedInst.name : '' 
                        });
                      }}
                    >
                      {role === 'INSTRUCTOR' ? (
                         <option value={user?.id || ''}>{user?.name} ({user?.email})</option>
                      ) : (
                         <>
                           <option value="" disabled>-- Chọn Người hướng dẫn --</option>
                           {instructors.map(inst => (
                             <option key={inst.id} value={inst.id}>{inst.name} ({inst.email})</option>
                           ))}
                         </>
                      )}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm text-on-surface-variant font-medium">Loại khóa học</label>
                    <select
                      className="input-glass w-full px-4 py-2 bg-background/50 border border-on-surface-variant/20 rounded-lg text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      value={currentCourse.type || 'single'}
                      onChange={(e) => setCurrentCourse({ ...currentCourse, type: e.target.value as 'single' | 'combo' })}
                    >
                      <option value="single">Khóa lẻ</option>
                      <option value="combo">Combo</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm text-on-surface-variant font-medium">Trạng thái</label>
                    <select
                      className="input-glass w-full px-4 py-2 bg-background/50 border border-on-surface-variant/20 rounded-lg text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      value={currentCourse.status || 'active'}
                      onChange={(e) => setCurrentCourse({ ...currentCourse, status: e.target.value as 'active' | 'inactive' })}
                    >
                      <option value="active">Đang bán</option>
                      <option value="inactive">Tạm ngưng</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm text-on-surface-variant font-medium">Nhãn nổi bật (Badge)</label>
                    <input
                      type="text"
                      className="input-glass w-full px-4 py-2 bg-background/50 border border-on-surface-variant/20 rounded-lg text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      value={currentCourse.tag || ''}
                      placeholder="VD: HOT DEAL, Best Seller, Mới"
                      onChange={(e) => setCurrentCourse({ ...currentCourse, tag: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm text-on-surface-variant font-medium">Màu sắc Nhãn (Classes Tailwind)</label>
                    <select
                      className="input-glass w-full px-4 py-2 bg-background/50 border border-on-surface-variant/20 rounded-lg text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-mono text-sm"
                      value={currentCourse.tagColor || 'bg-primary-container/30 text-primary'}
                      onChange={(e) => setCurrentCourse({ ...currentCourse, tagColor: e.target.value })}
                    >
                      <option value="bg-primary-container/30 text-primary">Mặc định (Xanh ngọc)</option>
                      <option value="bg-error/20 text-error animate-pulse font-bold">HOT (Đỏ nhấp nháy)</option>
                      <option value="bg-tertiary/20 text-tertiary font-bold">Premium (Vàng)</option>
                      <option value="bg-secondary/20 text-secondary">Basic (Cam)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm text-on-surface-variant font-medium">Giá nhập (Cost)</label>
                    <input
                      type="number"
                      className="input-glass w-full px-4 py-2 bg-background/50 border border-on-surface-variant/20 rounded-lg text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
                      value={currentCourse.importPrice || ''}
                      disabled={role === 'INSTRUCTOR'}
                      onChange={(e) => setCurrentCourse({ ...currentCourse, importPrice: Number(e.target.value) })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm text-on-surface-variant font-medium">Giá gốc (VNĐ)</label>
                    <input
                      type="number"
                      required
                      className="input-glass w-full px-4 py-2 bg-background/50 border border-on-surface-variant/20 rounded-lg text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
                      value={currentCourse.originalPrice || ''}
                      disabled={role === 'INSTRUCTOR'}
                      onChange={(e) => setCurrentCourse({ ...currentCourse, originalPrice: Number(e.target.value) })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm text-on-surface-variant font-medium">Giá bán (VNĐ)</label>
                    <input
                      type="number"
                      required
                      className="input-glass w-full px-4 py-2 bg-background/50 border border-on-surface-variant/20 rounded-lg text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
                      value={currentCourse.salePrice || ''}
                      disabled={role === 'INSTRUCTOR'}
                      onChange={(e) => setCurrentCourse({ ...currentCourse, salePrice: Number(e.target.value) })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm text-on-surface-variant font-medium">Điểm đánh giá (VD: 5.0)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="5"
                      className="input-glass w-full px-4 py-2 bg-background/50 border border-on-surface-variant/20 rounded-lg text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      value={currentCourse.rating || ''}
                      onChange={(e) => setCurrentCourse({ ...currentCourse, rating: Number(e.target.value) })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm text-on-surface-variant font-medium">Số Học viên ảo (VD: 1200+)</label>
                    <input
                      type="text"
                      className="input-glass w-full px-4 py-2 bg-background/50 border border-on-surface-variant/20 rounded-lg text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      value={currentCourse.students || ''}
                      onChange={(e) => setCurrentCourse({ ...currentCourse, students: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="text-sm text-on-surface-variant font-medium">Link Ảnh bìa</label>
                    <input
                      type="url"
                      className="input-glass w-full px-4 py-2 bg-background/50 border border-on-surface-variant/20 rounded-lg text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      value={currentCourse.thumbnail || ''}
                      onChange={(e) => setCurrentCourse({ ...currentCourse, thumbnail: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="text-sm text-on-surface-variant font-medium">Link Video giới thiệu</label>
                    <input
                      type="url"
                      className="input-glass w-full px-4 py-2 bg-background/50 border border-on-surface-variant/20 rounded-lg text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      value={currentCourse.videoDemo || ''}
                      onChange={(e) => setCurrentCourse({ ...currentCourse, videoDemo: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="text-sm text-on-surface-variant font-medium">Mô tả chi tiết</label>
                    <textarea
                      rows={4}
                      className="input-glass w-full px-4 py-2 bg-background/50 border border-on-surface-variant/20 rounded-lg text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
                      value={currentCourse.description || ''}
                      onChange={(e) => setCurrentCourse({ ...currentCourse, description: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="text-sm text-on-surface-variant font-medium">Lộ trình học (Mỗi bài học 1 dòng)</label>
                    <textarea
                      rows={5}
                      className="input-glass w-full px-4 py-2 bg-background/50 border border-on-surface-variant/20 rounded-lg text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
                      value={(currentCourse.curriculum || []).join('\n')}
                      onChange={(e) => setCurrentCourse({ ...currentCourse, curriculum: e.target.value.split('\n').filter(Boolean) })}
                      placeholder="Ngày 1: Tư duy Marketing&#10;Ngày 2: Thực hành Facebook Ads"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-on-surface-variant/20">
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-sm text-on-surface-variant font-bold">Quản lý Ca học (Lịch Live Class)</label>
                    <button type="button" onClick={handleAddSchedule} className="text-xs bg-primary/20 text-primary px-3 py-1.5 rounded-lg font-medium hover:bg-primary/30 transition-colors flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">add</span> Thêm Ca học
                    </button>
                  </div>
                  
                  {(!currentCourse.schedules || currentCourse.schedules.length === 0) ? (
                    <div className="text-center py-6 bg-surface-variant/30 rounded-xl border border-dashed border-outline-variant/30">
                      <span className="material-symbols-outlined text-outline text-3xl mb-2">calendar_month</span>
                      <p className="text-sm text-on-surface-variant">Chưa có ca học nào được cấu hình.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {currentCourse.schedules.map((schedule, index) => (
                        <div key={schedule.id} className="p-4 bg-surface-variant/30 rounded-xl border border-outline-variant/30 flex flex-col gap-3 relative">
                          <div className="absolute top-2 right-2 flex items-center gap-2">
                            <span className="text-xs font-bold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded">Ca {index + 1}</span>
                            <button type="button" onClick={() => handleRemoveSchedule(schedule.id)} className="text-error hover:bg-error/10 p-1 rounded transition-colors">
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                            <div className="space-y-1">
                              <label className="text-xs text-on-surface-variant">Tên Ca (VD: Ca Tối)</label>
                              <input
                                type="text"
                                className="input-glass w-full px-3 py-1.5 bg-background/50 border border-on-surface-variant/20 rounded-md text-sm"
                                value={schedule.name}
                                onChange={(e) => handleUpdateSchedule(schedule.id, 'name', e.target.value)}
                                placeholder="Nhập tên ca học..."
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-on-surface-variant">Ngày học</label>
                              <input
                                type="date"
                                className="input-glass w-full px-3 py-1.5 bg-background/50 border border-on-surface-variant/20 rounded-md text-sm cursor-pointer"
                                value={schedule.days || ''}
                                onChange={(e) => handleUpdateSchedule(schedule.id, 'days', e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-on-surface-variant">Thời gian (Giờ : Phút)</label>
                              <div className="flex items-center gap-2">
                                <select
                                  className="input-glass flex-1 px-3 py-1.5 bg-background/50 border border-on-surface-variant/20 rounded-md text-sm cursor-pointer"
                                  value={schedule.time ? schedule.time.split(' - ')[0] : ''}
                                  onChange={(e) => {
                                    const end = schedule.time ? schedule.time.split(' - ')[1] : '';
                                    handleUpdateSchedule(schedule.id, 'time', `${e.target.value} - ${end || ''}`);
                                  }}
                                >
                                  <option value="">Bắt đầu</option>
                                  {Array.from({ length: 24 * 4 }).map((_, i) => {
                                    const h = Math.floor(i / 4).toString().padStart(2, '0');
                                    const m = ((i % 4) * 15).toString().padStart(2, '0');
                                    return <option key={`start-${h}:${m}`} value={`${h}:${m}`}>{h}:{m}</option>;
                                  })}
                                </select>
                                <span className="text-on-surface-variant font-bold">-</span>
                                <select
                                  className="input-glass flex-1 px-3 py-1.5 bg-background/50 border border-on-surface-variant/20 rounded-md text-sm cursor-pointer"
                                  value={schedule.time ? schedule.time.split(' - ')[1] : ''}
                                  onChange={(e) => {
                                    const start = schedule.time ? schedule.time.split(' - ')[0] : '';
                                    handleUpdateSchedule(schedule.id, 'time', `${start || ''} - ${e.target.value}`);
                                  }}
                                >
                                  <option value="">Kết thúc</option>
                                  {Array.from({ length: 24 * 4 }).map((_, i) => {
                                    const h = Math.floor(i / 4).toString().padStart(2, '0');
                                    const m = ((i % 4) * 15).toString().padStart(2, '0');
                                    return <option key={`end-${h}:${m}`} value={`${h}:${m}`}>{h}:{m}</option>;
                                  })}
                                </select>
                              </div>
                            </div>
                            <div className="space-y-1 md:col-span-2">
                              <label className="text-xs text-on-surface-variant">Link Google Meet</label>
                              <input
                                type="url"
                                className="input-glass w-full px-3 py-1.5 bg-background/50 border border-on-surface-variant/20 rounded-md text-sm"
                                value={schedule.meetLink}
                                onChange={(e) => handleUpdateSchedule(schedule.id, 'meetLink', e.target.value)}
                                placeholder="https://meet.google.com/..."
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </form>
            </div>
            
            <div className="p-6 border-t border-on-surface-variant/20 flex justify-end gap-3 bg-surface/50">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 rounded-lg border border-on-surface-variant/30 text-on-surface hover:bg-on-surface-variant/10 transition-colors font-medium"
              >
                Hủy
              </button>
              <button
                type="submit"
                form="course-form"
                className="btn-primary px-4 py-2 rounded-lg bg-primary text-background font-medium hover:bg-primary/90 transition-colors"
              >
                {modalMode === 'add' ? 'Thêm mới' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress Modal */}
      {isProgressModalOpen && selectedCourseForProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-4xl bg-surface border border-on-surface-variant/20 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-on-surface-variant/20 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-headline-md text-on-surface">Tiến độ Học viên</h2>
                <p className="text-sm text-on-surface-variant mt-1">Khóa học: <span className="font-semibold text-primary">{selectedCourseForProgress.title}</span></p>
              </div>
              <button onClick={closeProgressModal} className="text-on-surface-variant hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
              {/* Left Column: Student List */}
              <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-on-surface-variant/20 bg-surface-variant/10 overflow-y-auto custom-scrollbar">
                <div className="p-4 border-b border-on-surface-variant/10">
                  <h3 className="font-bold text-on-surface text-sm uppercase tracking-wider">Danh sách Học viên</h3>
                </div>
                
                {(() => {
                  const courseEnrollments = enrollments.filter(e => e.courseId === selectedCourseForProgress.id);
                  if (courseEnrollments.length === 0) {
                    return <div className="p-6 text-center text-sm text-on-surface-variant italic">Chưa có học viên nào đăng ký khóa này.</div>;
                  }

                  const totalLessons = selectedCourseForProgress.curriculum?.length || 0;

                  return (
                    <div className="divide-y divide-on-surface-variant/10">
                      {courseEnrollments.map(enrollment => {
                        const isSelected = selectedStudentId === enrollment.userId;
                        const completedLessons = enrollment.completedCurriculumIndexes?.length || 0;
                        const progressPercentage = totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);

                        return (
                          <button
                            key={enrollment.userId}
                            onClick={() => setSelectedStudentId(enrollment.userId)}
                            className={`w-full text-left p-4 hover:bg-surface-variant/30 transition-colors flex items-center justify-between gap-3 ${isSelected ? 'bg-primary/10 border-l-4 border-primary' : 'border-l-4 border-transparent'}`}
                          >
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center text-secondary shrink-0 font-bold text-xs">
                                {(enrollment.userName || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div className="truncate">
                                <p className={`text-sm font-medium truncate ${isSelected ? 'text-primary' : 'text-on-surface'}`}>{enrollment.userName || enrollment.userId}</p>
                                <p className="text-xs text-on-surface-variant mt-0.5">{completedLessons}/{totalLessons} bài học</p>
                              </div>
                            </div>
                            <div className="text-xs font-bold text-tertiary">{progressPercentage}%</div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Right Column: Checklist */}
              <div className="w-full md:w-2/3 p-6 overflow-y-auto custom-scrollbar bg-surface/30">
                {selectedStudentId ? (
                  <div>
                    <h4 className="font-bold text-on-surface mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-tertiary">task_alt</span> Lộ trình học thuật
                    </h4>
                    {(!selectedCourseForProgress.curriculum || selectedCourseForProgress.curriculum.length === 0) ? (
                      <p className="text-sm text-on-surface-variant italic">Chưa có lộ trình nào được cấu hình cho khóa này.</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedCourseForProgress.curriculum.map((item, index) => {
                          const enrollment = enrollments.find(e => e.courseId === selectedCourseForProgress.id && e.userId === selectedStudentId);
                          const completedCurriculumIndexes = enrollment?.completedCurriculumIndexes || [];
                          const isCompleted = completedCurriculumIndexes.includes(index);

                          const handleToggleCompletion = () => {
                            let newCompleted = [...completedCurriculumIndexes];
                            if (isCompleted) {
                              newCompleted = newCompleted.filter(i => i !== index);
                            } else {
                              newCompleted.push(index);
                            }
                            updateEnrollmentProgress(selectedCourseForProgress.id, selectedStudentId, newCompleted);
                          };

                          return (
                            <label key={index} className="flex items-center gap-3 p-3 rounded-xl border border-outline-variant/30 hover:bg-surface-variant/20 cursor-pointer transition-colors">
                              <input 
                                type="checkbox" 
                                checked={isCompleted}
                                onChange={handleToggleCompletion}
                                className="w-5 h-5 rounded border-on-surface-variant/30 bg-surface text-primary focus:ring-primary/50"
                              />
                              <span className={`text-sm ${isCompleted ? 'line-through text-on-surface-variant opacity-70' : 'text-on-surface font-medium'}`}>
                                {item}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                    <span className="material-symbols-outlined text-5xl mb-3">person_search</span>
                    <p>Vui lòng chọn một học viên bên trái để xem tiến độ.</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-6 border-t border-on-surface-variant/20 flex justify-end bg-surface/50">
              <button onClick={closeProgressModal} className="btn-primary px-6 py-2 rounded-lg bg-primary text-background font-medium hover:bg-primary/90 transition-colors">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
