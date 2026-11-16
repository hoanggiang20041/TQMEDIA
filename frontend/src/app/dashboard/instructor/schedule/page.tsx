'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRole } from '@/context/RoleContext'
import { useCourses } from '@/hooks/useCourses'

export default function InstructorSchedulePage() {
  const { role } = useRole()
  const router = useRouter()
  const { courses, isLoaded } = useCourses()
  const [todaySchedules, setTodaySchedules] = useState<any[]>([])

  useEffect(() => {
    if (role && role !== 'INSTRUCTOR' && role !== 'ADMIN') {
      router.push('/dashboard')
    }
  }, [role, router])

  useEffect(() => {
    if (!isLoaded || courses.length === 0) return;

    // Get today's day string in Vietnamese (e.g. "Thứ 2", "Chủ nhật")
    const daysMap = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const todayStr = daysMap[new Date().getDay()];
    
    // format YYYY-MM-DD for checking exact dates if they picked from a date picker
    const localDate = new Date();
    const yyyy = localDate.getFullYear();
    const mm = String(localDate.getMonth() + 1).padStart(2, '0');
    const dd = String(localDate.getDate()).padStart(2, '0');
    const todayDateStr = `${yyyy}-${mm}-${dd}`;

    const schedules: any[] = [];

    courses.forEach(course => {
      if (course.schedules && Array.isArray(course.schedules)) {
        course.schedules.forEach(schedule => {
          // Check if schedule.days includes todayStr or equals todayDateStr
          if (schedule.days && (schedule.days.includes(todayStr) || schedule.days === todayDateStr)) {
            schedules.push({
              course,
              schedule
            });
          }
        });
      }
    });

    setTodaySchedules(schedules);
  }, [isLoaded, courses]);

  if (role !== 'INSTRUCTOR' && role !== 'ADMIN') return null;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Lịch dạy Hôm nay</h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Danh sách các ca học bạn cần phụ trách giảng dạy trong ngày hôm nay.
          </p>
        </div>
        <div className="px-4 py-2 bg-primary/10 border border-primary/20 rounded-xl flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">calendar_today</span>
          <span className="text-white font-semibold">
            {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </div>

      {!isLoaded ? (
        <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant">
          <span className="material-symbols-outlined text-4xl animate-spin text-primary mb-4">progress_activity</span>
          <p>Đang tải lịch dạy...</p>
        </div>
      ) : todaySchedules.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {todaySchedules.map((item, idx) => (
            <div key={idx} className="bg-surface-variant/30 border border-outline-variant/30 rounded-2xl p-6 flex flex-col hover:border-primary/50 transition-colors shadow-lg">
              <div className="flex items-start gap-4 mb-4">
                <img src={item.course.thumbnail} alt={item.course.title} className="w-24 h-16 object-cover rounded-lg border border-outline-variant/20" />
                <div>
                  <h3 className="font-bold text-white text-lg leading-tight mb-1">{item.course.title}</h3>
                  <span className="px-2 py-1 bg-surface rounded-md text-xs font-semibold text-primary border border-primary/20">
                    Mã ca: {item.schedule.name}
                  </span>
                </div>
              </div>

              <div className="bg-surface/50 rounded-xl p-4 border border-outline-variant/20 mb-6 flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <span className="material-symbols-outlined text-tertiary">schedule</span>
                  <div>
                    <p className="text-xs text-on-surface-variant">Thời gian dạy</p>
                    <p className="font-bold text-white text-sm">{item.schedule.time}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-green-400">group</span>
                  <div>
                    <p className="text-xs text-on-surface-variant">Học viên tham gia</p>
                    <p className="font-bold text-white text-sm">{item.course.students} học viên</p>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => window.open(item.schedule.meetLink, '_blank')}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all flex items-center justify-center gap-2 shadow-md"
              >
                <img src="https://img.icons8.com/color/48/google-meet--v1.png" alt="Google Meet" className="w-5 h-5" />
                Vào Google Meet Dạy Học
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-surface-variant/30 border border-outline-variant/30 rounded-2xl p-12 flex flex-col items-center justify-center text-center opacity-80">
          <span className="material-symbols-outlined text-6xl text-outline mb-4">event_available</span>
          <h3 className="text-xl font-bold text-white mb-2">Hôm nay bạn không có lịch dạy</h3>
          <p className="text-on-surface-variant">Hãy dành thời gian nghỉ ngơi hoặc chuẩn bị tài liệu cho các ngày tiếp theo nhé!</p>
        </div>
      )}
    </div>
  )
}
