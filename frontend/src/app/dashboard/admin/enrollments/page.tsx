'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
const MySwal = withReactContent(Swal);
import { useRole } from '@/context/RoleContext'

export default function AdminEnrollmentsPage() {
  const { role } = useRole()
  const router = useRouter()
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [searchQuery, setSearchQuery] = useState('')
  const [expandedUsers, setExpandedUsers] = useState<Record<string, boolean>>({})
  const toggleUserExpanded = (userId: string) => setExpandedUsers(prev => ({...prev, [userId]: !prev[userId]}))

  // Progress Modal
  const [selectedEnrollment, setSelectedEnrollment] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [selectedDetails, setSelectedDetails] = useState<any>(null)

  // Add Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [addEmail, setAddEmail] = useState('')
  const [addCourseId, setAddCourseId] = useState('')
  const [availableCourses, setAvailableCourses] = useState<any[]>([])
  const [availableUsers, setAvailableUsers] = useState<any[]>([])

  useEffect(() => {
    if (role && role !== 'ADMIN' && role !== 'INSTRUCTOR' && role !== 'TECHNICIAN') {
      router.push('/dashboard')
    }
  }, [role, router])

  useEffect(() => {
    const fetchEnrollments = async () => {
      try {
        const token = localStorage.getItem('tq_token')
        const res = await fetch('/api/enrollments?all=true', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          setEnrollments(data)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    
    const fetchCourses = async () => {
      try {
        const res = await fetch('/api/courses', { headers: { 'Authorization': `Bearer ${localStorage.getItem('tq_token')}` } })
        if (res.ok) setAvailableCourses(await res.json())
      } catch (err) {}
    }

    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('tq_token')
        const res = await fetch('/api/admin/users', { headers: { 'Authorization': `Bearer ${token}` } })
        if (res.ok) setAvailableUsers(await res.json())
      } catch (err) {}
    }
    
    if (role === 'ADMIN' || role === 'INSTRUCTOR' || role === 'TECHNICIAN') {
      fetchEnrollments()
      fetchCourses()
      fetchUsers()
    }
  }, [role])

  const handleDelete = async (courseId: string, userId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa học viên khỏi khóa học này?')) return
    try {
      const token = localStorage.getItem('tq_token')
      const res = await fetch(`/api/admin/enrollments/${courseId}/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        setEnrollments(prev => prev.filter(e => !(e.courseId === courseId && e.userId === userId)))
      } else {
        const data = await res.json()
        alert(data.error || 'Lỗi khi xóa')
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addEmail || !addCourseId) return alert('Vui lòng nhập email và chọn khóa học')
    try {
      const token = localStorage.getItem('tq_token')
      const res = await fetch('/api/admin/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ email: addEmail, courseId: addCourseId })
      })
      if (res.ok) {
        setIsAddModalOpen(false)
        setAddEmail('')
        setAddCourseId('')
        // Refresh enrollments
        const refreshRes = await fetch('/api/enrollments?all=true', { headers: { 'Authorization': `Bearer ${token}` }})
        if (refreshRes.ok) setEnrollments(await refreshRes.json())
        MySwal.fire({ icon: 'success', title: 'Thành công', text: 'Thêm học viên thành công!' })
      } else {
        const data = await res.json()
        MySwal.fire({ icon: 'error', title: 'Thất bại', text: data.error || 'Lỗi khi thêm' })
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleToggleLesson = async (courseId: string, userId: string, idx: number, currentIndexes: number[]) => {
    try {
      const newIndexes = currentIndexes.includes(idx) ? currentIndexes.filter(i => i !== idx) : [...currentIndexes, idx];
      const token = localStorage.getItem('tq_token');
      const res = await fetch('/api/enrollments/progress', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ courseId, userId, completedIndexes: newIndexes })
      });
      if (res.ok) {
        setEnrollments(prev => prev.map(e => {
          if (e.courseId === courseId && e.userId === userId) {
            return { ...e, completedCurriculumIndexes: newIndexes };
          }
          return e;
        }));
        if (selectedEnrollment) {
          setSelectedEnrollment({ ...selectedEnrollment, completedCurriculumIndexes: newIndexes });
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openProgressModal = (enrollment: any) => {
    setSelectedEnrollment(enrollment);
    setIsModalOpen(true);
  };

  const filteredEnrollments = enrollments.filter(e => 
    (e.userName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (e.userEmail || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (e.courseTitle || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (role !== 'ADMIN' && role !== 'INSTRUCTOR' && role !== 'TECHNICIAN') return null

  const groupedEnrollments = React.useMemo(() => {
    const groups: { [userId: string]: { user: any, enrollments: any[] } } = {};
    filteredEnrollments.forEach(e => {
      if (!groups[e.userId]) {
        groups[e.userId] = { user: { id: e.userId, name: e.userName, email: e.userEmail }, enrollments: [] };
      }
      groups[e.userId].enrollments.push(e);
    });
    return Object.values(groups);
  }, [filteredEnrollments]);

  return (
    <div className="w-full space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Danh sách Học viên</h1>
          <p className="text-on-surface-variant text-sm mt-1">Quản lý học viên và lịch học đã đăng ký.</p>
        </div>
        <div className="flex gap-3 relative">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/70 text-lg">search</span>
            <input 
              type="text"
              placeholder="Tìm kiếm học viên, khóa học..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-xl bg-surface-variant/50 border border-outline-variant/30 text-sm text-white focus:outline-none focus:border-cyan-500/50 w-full sm:w-64 transition-colors"
            />
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-on-primary px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-[0_0_15px_rgba(var(--primary),0.3)] whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[20px]">person_add</span>
            Thêm học viên
          </button>
        </div>
      </div>

      <div className="bg-surface-variant/30 border border-outline-variant/30 backdrop-blur-xl rounded-2xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.1)] w-full overflow-hidden">
        {loading ? (
          <div className="text-center py-20 text-on-surface-variant flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-4xl animate-spin text-cyan-400">progress_activity</span>
            <span>Đang tải dữ liệu...</span>
          </div>
        ) : filteredEnrollments.length === 0 ? (
          <div className="text-center py-20 text-on-surface-variant flex flex-col items-center gap-3 opacity-70">
            <span className="material-symbols-outlined text-5xl mb-2">inbox</span>
            <span>Chưa có học viên nào đăng ký khóa học hoặc không tìm thấy kết quả.</span>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left min-w-[800px]">
              <thead>
                <tr className="text-on-surface-variant text-xs uppercase tracking-widest border-b border-outline-variant/30">
                  <th className="pb-4 pl-4 pr-4 font-semibold">Học viên</th>
                  <th className="pb-4 pr-4 font-semibold">Khóa học</th>
                  <th className="pb-4 pr-4 font-semibold">Lịch học Live Class</th>
                  <th className="pb-4 pr-4 font-semibold">Tiến độ Video</th>
                  <th className="pb-4 pr-4 font-semibold text-right">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {groupedEnrollments.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-on-surface-variant">Không có dữ liệu</td></tr>
                ) : (
                  groupedEnrollments.map((group, idx) => {
                    const isExpanded = expandedUsers[group.user.id];
                    return (
                      <React.Fragment key={idx}>
                        <tr 
                          onClick={() => toggleUserExpanded(group.user.id)}
                          className="border-b border-outline-variant/30 last:border-0 hover:bg-surface-variant/50 transition-colors group cursor-pointer bg-surface-variant/10"
                        >
                          <td className="py-4 pl-4 pr-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 text-cyan-400 flex items-center justify-center font-bold text-lg border border-cyan-500/30 shrink-0 shadow-inner">
                                {group.user.name?.charAt(0).toUpperCase() || '?'}
                              </div>
                              <div>
                                <p className="text-white text-sm font-semibold group-hover:text-cyan-400 transition-colors">{group.user.name}</p>
                                <p className="text-on-surface-variant text-xs font-mono mt-0.5">{group.user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 pr-4">
                            <span className="px-2.5 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold whitespace-nowrap">
                              {group.enrollments.length} khóa học
                            </span>
                          </td>
                          <td className="py-4 pr-4"></td>
                          <td className="py-4 pr-4"></td>
                          <td className="py-4 pr-4 text-right">
                            <div className="flex justify-end pr-2">
                              <span className={`material-symbols-outlined transition-transform duration-300 text-on-surface-variant ${isExpanded ? "rotate-180 text-primary" : ""}`}>
                                expand_more
                              </span>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && group.enrollments.map((enrollment, eIdx) => (
                          <tr key={idx + "-" + eIdx} className="border-b border-outline-variant/10 bg-surface-variant/5 hover:bg-surface-variant/20 transition-colors">
                            <td className="py-3 pl-4 pr-4 border-l-2 border-primary/30">
                              <div className="flex items-center text-outline-variant pl-4">
                                <span className="material-symbols-outlined text-[18px]">subdirectory_arrow_right</span>
                              </div>
                            </td>
                            <td className="py-3 pr-4">
                              <span className="text-white text-sm font-semibold block line-clamp-2 max-w-xs">
                                {enrollment.courseTitle}
                              </span>
                            </td>
                            <td className="py-3 pr-4">
                              {enrollment.registeredSchedules && enrollment.registeredSchedules.length > 0 ? (
                                <div className="bg-surface-variant/50 p-2.5 rounded-xl border border-outline-variant/30">
                                  <p className="text-sm font-bold text-white mb-1">Đã đăng ký {enrollment.registeredSchedules.length} ca</p>
                                  <button onClick={(e) => { e.stopPropagation(); setSelectedDetails(enrollment); setIsDetailsModalOpen(true); }} className="text-xs text-primary hover:underline">Xem chi tiết</button>
                                </div>
                              ) : enrollment.registeredSchedule ? (
                                <div className="bg-surface-variant/50 p-2.5 rounded-xl border border-outline-variant/30">
                                  <p className="text-sm font-bold text-white mb-1">{enrollment.registeredSchedule.name}</p>
                                  <div className="flex flex-col gap-1 text-xs text-on-surface-variant">
                                    <span className="flex items-center gap-1">
                                      <span className="material-symbols-outlined text-[14px]">calendar_month</span> 
                                      {enrollment.registeredSchedule.days || 'Chưa có ngày'}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-orange-500/10 text-orange-400 text-xs font-medium border border-orange-500/20">
                                  <span className="material-symbols-outlined text-[14px]">warning</span> Chưa đăng ký ca
                                </span>
                              )}
                            </td>
                            <td className="py-3 pr-4">
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-green-400">check_circle</span>
                                <span className="text-sm font-bold text-white whitespace-nowrap">{enrollment.completedCurriculumIndexes?.length || 0} / {enrollment.courseCurriculum?.length || 0} bài</span>
                              </div>
                            </td>
                            <td className="py-3 pr-4 text-right">
                              <button 
                                onClick={(e) => { e.stopPropagation(); openProgressModal(enrollment); }}
                                className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm mr-2 whitespace-nowrap mb-2 sm:mb-0"
                              >
                                Đánh dấu
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDelete(enrollment.courseId, enrollment.userId); }}
                                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm"
                                title="Xóa khỏi khóa học"
                              >
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-outline-variant rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-outline-variant/50 flex justify-between items-center bg-surface-variant/30">
              <h3 className="text-lg font-bold text-white">Thêm Học Viên</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-on-surface-variant hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleAdd} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-on-surface-variant">Học Viên</label>
                <input 
                  type="text"
                  list="users-list"
                  autoComplete="off"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  className="w-full bg-[#1c1c1e] border border-outline-variant/50 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-primary/50"
                  placeholder="Nhập email hoặc tìm kiếm..."
                  required
                />
                <datalist id="users-list">
                  {availableUsers.map(u => (
                    <option key={u.id} value={u.email}>{u.name} - {u.email}</option>
                  ))}
                </datalist>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-on-surface-variant">Khóa Học</label>
                <select
                  value={addCourseId}
                  onChange={(e) => setAddCourseId(e.target.value)}
                  className="w-full bg-[#1c1c1e] border border-outline-variant/50 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-primary/50 [&>option]:bg-[#1c1c1e]"
                  required
                >
                  <option value="">-- Chọn khóa học --</option>
                  {availableCourses.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:text-white transition-colors">
                  Hủy
                </button>
                <button type="submit" className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary hover:bg-primary-hover text-on-primary transition-colors shadow-[0_0_15px_rgba(var(--primary),0.3)]">
                  Thêm vào
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {isDetailsModalOpen && selectedDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-outline-variant rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-outline-variant/50 flex justify-between items-center bg-surface-variant/30">
              <div>
                <h3 className="text-lg font-bold text-white">Chi tiết Học viên: {selectedDetails.userName}</h3>
                <p className="text-xs text-on-surface-variant">{selectedDetails.courseTitle}</p>
              </div>
              <button onClick={() => setIsDetailsModalOpen(false)} className="text-on-surface-variant hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <h4 className="text-sm font-bold text-on-surface uppercase tracking-widest mb-3 border-b border-outline-variant/30 pb-2">Các Ca Học Đã Đăng Ký</h4>
                {selectedDetails.registeredSchedules && selectedDetails.registeredSchedules.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedDetails.registeredSchedules.map((sched: any, idx: number) => {
                      const scheduleId = typeof sched === 'string' ? sched : sched?.id;
                      const schedule = selectedDetails.course?.schedules?.find((s: any) => s.id === scheduleId) || (typeof sched === 'object' ? sched : null);
                      return (
                      <div key={idx} className="bg-surface-variant/30 p-3 rounded-xl border border-outline-variant/30">
                        <p className="text-sm font-bold text-white mb-1">{schedule?.name || 'Ca học không xác định'}</p>
                        <div className="flex flex-col gap-1 text-xs text-on-surface-variant">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">calendar_month</span> 
                            {schedule?.days || 'Chưa có ngày'}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">schedule</span> 
                            Thời gian: {schedule?.time || 'N/A'}
                          </span>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                ) : selectedDetails.registeredSchedule ? (
                  <div className="bg-surface-variant/30 p-3 rounded-xl border border-outline-variant/30 inline-block">
                    <p className="text-sm font-bold text-white mb-1">{typeof selectedDetails.registeredSchedule === 'object' ? selectedDetails.registeredSchedule.name : 'Ca học không xác định'}</p>
                    <div className="flex flex-col gap-1 text-xs text-on-surface-variant">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">calendar_month</span> 
                        {typeof selectedDetails.registeredSchedule === 'object' ? selectedDetails.registeredSchedule.days : 'Chưa có ngày'}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">schedule</span> 
                        Thời gian: {typeof selectedDetails.registeredSchedule === 'object' ? selectedDetails.registeredSchedule.time : 'N/A'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-on-surface-variant text-sm italic">Chưa đăng ký ca học nào.</p>
                )}
              </div>

              <div>
                <h4 className="text-sm font-bold text-on-surface uppercase tracking-widest mb-3 border-b border-outline-variant/30 pb-2">Lịch Sử Thao Tác</h4>
                {selectedDetails.history && selectedDetails.history.length > 0 ? (
                  <div className="space-y-3">
                    {selectedDetails.history.map((log: any, idx: number) => (
                      <div key={idx} className="flex gap-3 text-sm bg-surface-container-lowest p-3 rounded-lg border border-outline-variant/20">
                        <span className="material-symbols-outlined text-primary text-[18px] shrink-0 mt-0.5">history</span>
                        <div>
                          <p className="text-white">{log.action}</p>
                          <p className="text-xs text-on-surface-variant mt-1">{new Date(log.timestamp || log.time).toLocaleString('vi-VN')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-on-surface-variant text-sm italic">Chưa có lịch sử nào.</p>
                )}
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-outline-variant/50 flex justify-end bg-surface-variant/30">
              <button onClick={() => setIsDetailsModalOpen(false)} className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-surface hover:bg-surface-variant text-white border border-outline-variant/50 transition-colors">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress Modal */}
      {isModalOpen && selectedEnrollment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-outline-variant rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-outline-variant/50 flex justify-between items-center bg-surface-variant/30">
              <div>
                <h3 className="text-lg font-bold text-white">Tiến độ: {selectedEnrollment.userName}</h3>
                <p className="text-xs text-on-surface-variant">{selectedEnrollment.courseTitle}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-on-surface-variant hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {selectedEnrollment.courseCurriculum && selectedEnrollment.courseCurriculum.length > 0 ? (
                <div className="space-y-2">
                  {selectedEnrollment.courseCurriculum.map((lesson: string, idx: number) => {
                    const completed = selectedEnrollment.completedCurriculumIndexes || [];
                    const isCompleted = completed.includes(idx);
                    return (
                      <button 
                        key={idx} 
                        onClick={() => handleToggleLesson(selectedEnrollment.courseId, selectedEnrollment.userId, idx, completed)}
                        className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${isCompleted ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-surface-variant/30 border-outline-variant/30 hover:border-primary/40 text-on-surface'}`}
                      >
                        <span className={`material-symbols-outlined text-[20px] mt-0.5 ${isCompleted ? 'text-green-500' : 'text-outline-variant'}`}>
                          {isCompleted ? 'check_circle' : 'radio_button_unchecked'}
                        </span>
                        <span className={`text-sm ${isCompleted ? 'line-through opacity-70' : 'font-medium'}`}>
                          {lesson}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-on-surface-variant py-8">Khóa học này chưa có lộ trình bài học.</p>
              )}
            </div>
            <div className="px-6 py-4 border-t border-outline-variant/50 flex justify-end bg-surface-variant/30">
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-surface hover:bg-surface-variant text-white border border-outline-variant/50 transition-colors">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
