'use client';

import React, { useState } from 'react';

import { useCourses } from '@/hooks/useCourses';
import { useRole } from '@/context/RoleContext';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
const MySwal = withReactContent(Swal);

export default function MyCoursesPage() {
  const { courses, purchasedCourseIds, enrollments, isLoaded, registerSchedule, updateEnrollmentProgress } = useCourses();
  const { settings } = useRole();
  const [isRegistering, setIsRegistering] = useState(false);
  const [selectedSchedulesMap, setSelectedSchedulesMap] = useState<Record<string, string[]>>({});
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  const [demoState, setDemoState] = useState<'idle' | 'playing' | 'finished'>('idle');

  const getYoutubeEmbedUrl = (url: string) => {
    if (!url) return null;
    // Check YouTube
    const ytRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const ytMatch = url.match(ytRegExp);
    if (ytMatch && ytMatch[2].length === 11) {
      return `https://www.youtube.com/embed/${ytMatch[2]}?start=0&end=15&controls=0&rel=0&disablekb=1`;
    }
    // Check Google Drive
    const driveRegExp = /drive\.google\.com\/file\/d\/([^/]+)/;
    const driveMatch = url.match(driveRegExp);
    if (driveMatch && driveMatch[1]) {
      return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
    }
    return null;
  };

  const handlePlayDemo = () => {
    if (demoState === 'finished') return;
    setDemoState('playing');
    setTimeout(() => {
      setDemoState('finished');
    }, 15000); // Strictly stop after 15 seconds
  };

  const toggleExpand = (courseId: string) => {
    if (expandedCourseId === courseId) {
      setExpandedCourseId(null);
    } else {
      setExpandedCourseId(courseId);
      setDemoState('idle');
      // Initialize selected schedules
      const enrollment = enrollments.find(e => e.courseId === courseId);
      if (enrollment) {
        const ids = enrollment.registeredSchedules?.map(s => s.id) || (enrollment.registeredScheduleId ? [enrollment.registeredScheduleId] : []);
        setSelectedSchedulesMap(prev => ({ ...prev, [courseId]: ids }));
      }
    }
  };

  if (!isLoaded) return null;

  const myPurchasedCourses = courses.filter(course => purchasedCourseIds.has(course.id));

  const handleRegister = async (courseId: string, scheduleIds: string[]) => {
    setIsRegistering(true);
    const success = await registerSchedule(courseId, scheduleIds);
    setIsRegistering(false);
    if (success) {
      MySwal.fire({ icon: 'info', title: 'Thông báo', text: 'Cập nhật đăng ký ca học thành công!' })
    } else {
      MySwal.fire({ icon: 'error', title: 'Thất bại', text: 'Cập nhật thất bại, vui lòng thử lại.' })
    }
  };

  const handleToggleSchedule = (courseId: string, scheduleId: string) => {
    setSelectedSchedulesMap(prev => {
      const current = prev[courseId] || [];
      if (current.includes(scheduleId)) {
        return { ...prev, [courseId]: current.filter(id => id !== scheduleId) };
      }
      return { ...prev, [courseId]: [...current, scheduleId] };
    });
  };

  const handleOpenMeet = (link: string) => {
    window.open(link, '_blank');
  };

  const handleToggleLesson = async (courseId: string, idx: number) => {
    const enrollment = enrollments.find(e => e.courseId === courseId);
    if (!enrollment) return;
    const current = enrollment.completedCurriculumIndexes || [];
    const newIndexes = current.includes(idx) ? current.filter(i => i !== idx) : [...current, idx];
    await updateEnrollmentProgress(courseId, enrollment.userId, newIndexes);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-display-sm font-display-lg text-on-surface">Khóa học của tôi</h1>
        <p className="text-on-surface-variant font-body-md mt-2">
          Hành trình nâng cấp kỹ năng của bạn. Đừng quên đăng ký Ca học Live để tương tác trực tiếp với Người hướng dẫn!
        </p>
      </div>

      {myPurchasedCourses.length === 0 ? (
        <div className="glass-card p-12 rounded-3xl border border-outline-variant/30 flex flex-col items-center justify-center text-center shadow-lg">
          <span className="material-symbols-outlined text-6xl text-outline mb-4">school</span>
          <h2 className="text-xl font-bold text-on-surface mb-2">Bạn chưa sở hữu khóa học nào</h2>
          <p className="text-on-surface-variant mb-6">Hãy đến Cửa hàng để khám phá và đăng ký các khóa học tuyệt vời.</p>
          <button onClick={() => window.location.href = '/dashboard/courses'} className="btn-primary px-6 py-3 rounded-xl font-bold">
            Khám phá Khóa học
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {myPurchasedCourses.map(course => {
            const isExpanded = expandedCourseId === course.id;
            const enrollment = enrollments.find(e => e.courseId === course.id);
            const completedCurriculumIndexes = enrollment?.completedCurriculumIndexes || [];
            const totalLessons = course.curriculum?.length || 0;
            const completedLessons = completedCurriculumIndexes.length;
            const progressPercentage = totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);

            if (!isExpanded) {
              return (
                <div key={course.id} className="glass-card p-4 rounded-3xl border border-outline-variant/30 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 shadow-md hover:border-primary/30 transition-colors">
                  <div className="w-full sm:w-40 aspect-video rounded-xl overflow-hidden shrink-0">
                    <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 w-full sm:w-auto">
                    <h3 className="text-lg font-bold text-on-surface line-clamp-2">{course.title}</h3>
                    <p className="text-xs text-on-surface-variant mb-2 sm:mb-3">Trainer: {course.instructor}</p>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex justify-between items-end mb-1 text-xs">
                          <span className="font-bold text-on-surface">Tiến độ</span>
                          <span className="text-primary font-bold">{progressPercentage}%</span>
                        </div>
                        <div className="w-full bg-surface-variant/50 rounded-full h-1.5 overflow-hidden border border-outline-variant/20 shadow-inner">
                          <div className="bg-primary h-1.5 rounded-full" style={{ width: `${progressPercentage}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => toggleExpand(course.id)}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-primary/10 text-primary font-bold hover:bg-primary hover:text-on-primary transition-colors whitespace-nowrap mt-2 sm:mt-0 text-center"
                  >
                    Vào Học
                  </button>
                </div>
              );
            }

            return (
              <div key={course.id} className="glass-card p-6 md:p-8 rounded-3xl border border-outline-variant/30 flex flex-col xl:flex-row gap-8 shadow-lg relative">
                <button 
                  onClick={() => setExpandedCourseId(null)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-surface-variant/50 flex items-center justify-center text-on-surface-variant hover:text-white transition-colors z-50"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
                
                {/* Left: Course Info */}
                <div className="w-full xl:w-1/3 flex flex-col gap-4 pt-4">
                  <div className="relative aspect-video rounded-2xl overflow-hidden border border-outline-variant/20 shadow-md bg-black group">
                    {course.videoDemo ? (
                      <>
                        {demoState === 'idle' && (
                          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center cursor-pointer bg-black/40 hover:bg-black/20 transition-colors" onClick={handlePlayDemo}>
                            <img src={course.thumbnail} alt="Thumbnail" className="absolute inset-0 w-full h-full object-cover opacity-50" />
                            <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center text-white z-10 shadow-[0_0_20px_rgba(6,182,212,0.5)] group-hover:scale-110 transition-transform">
                              <span className="material-symbols-outlined text-4xl">play_arrow</span>
                            </div>
                            <span className="z-10 mt-3 font-bold text-white tracking-wider">XEM DEMO (15 GIÂY)</span>
                          </div>
                        )}

                        {demoState === 'playing' && (() => {
                          const ytUrl = getYoutubeEmbedUrl(course.videoDemo);
                          if (ytUrl) {
                            return (
                              <iframe 
                                src={`${ytUrl}&autoplay=1`}
                                className="w-full h-full border-0 relative z-10"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              ></iframe>
                            );
                          }
                          return (
                            <video 
                              autoPlay
                              controls={false}
                              className="w-full h-full object-cover relative z-10 pointer-events-none"
                            >
                              <source src={course.videoDemo} type="video/mp4" />
                              Trình duyệt của bạn không hỗ trợ thẻ video.
                            </video>
                          );
                        })()}

                        {demoState === 'finished' && (
                          <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in z-30">
                            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary mb-4 shadow-[0_0_30px_rgba(6,182,212,0.3)]">
                              <span className="material-symbols-outlined text-4xl">lock</span>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Đã hết thời gian Demo</h3>
                            <p className="text-on-surface-variant text-sm mb-6 max-w-sm">
                              Khóa học này đang trong giai đoạn Live Class. Video trọn bộ sẽ được cập nhật sau khi Live Class kết thúc.
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                    )}
                    <div className="absolute top-2 left-2 px-3 py-1 rounded-full text-xs font-bold shadow-lg bg-primary/20 text-primary backdrop-blur-md pointer-events-none z-40">
                      Đã sở hữu
                    </div>
                  </div>
                  
                  <div>
                    <h2 className="text-xl font-bold text-on-surface mb-1">{course.title}</h2>
                    <p className="text-sm text-on-surface-variant mb-4">Người hướng dẫn: <span className="font-semibold text-primary">{course.instructor}</span></p>
                    
                    <div className="space-y-4 mb-4">
                      {/* Progress Bar */}
                      <div>
                        <div className="flex justify-between items-end mb-1">
                          <span className="text-sm font-bold text-on-surface">Tiến độ học tập</span>
                          <span className="text-primary font-bold text-lg leading-none">{progressPercentage}%</span>
                        </div>
                        <div className="w-full bg-surface-variant/50 rounded-full h-2.5 overflow-hidden border border-outline-variant/20 shadow-inner">
                          <div className="bg-primary h-2.5 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(6,182,212,0.5)]" style={{ width: `${progressPercentage}%` }}></div>
                        </div>
                      </div>

                      {/* Curriculum List */}
                      {totalLessons > 0 && (
                        <div className="bg-surface-variant/20 rounded-xl p-3 border border-outline-variant/30 space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                          <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Lộ trình của bạn</h4>
                          {course.curriculum.map((lesson, idx) => {
                            const isCompleted = completedCurriculumIndexes.includes(idx);
                            return (
                              <div 
                                key={idx} 
                                className="flex items-start gap-2 cursor-pointer hover:bg-surface-variant/30 p-1.5 rounded-lg transition-colors"
                                onClick={() => handleToggleLesson(course.id, idx)}
                              >
                                <span className={`material-symbols-outlined text-[16px] mt-0.5 ${isCompleted ? 'text-green-500' : 'text-outline-variant'}`}>
                                  {isCompleted ? 'check_circle' : 'radio_button_unchecked'}
                                </span>
                                <span className={`text-sm select-none ${isCompleted ? 'text-on-surface-variant line-through opacity-70' : 'text-on-surface font-medium'}`}>
                                  {lesson}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-auto space-y-2">
              <div className="p-3 bg-surface-variant/30 rounded-xl border border-outline-variant/30 text-sm text-on-surface-variant mb-4">
                <p>Khóa học này được tổ chức dưới dạng <strong>Live Class (Google Meet)</strong>.</p>
                <p className="mt-1">Vui lòng xem lịch và đăng ký Ca học ở bảng bên cạnh.</p>
              </div>
              <button onClick={() => {
                if (settings?.contact_zalo) {
                  window.open(settings.contact_zalo, '_blank');
                } else {
                  MySwal.fire({ icon: 'info', title: 'Thông báo', text: 'Giảng viên chưa cấu hình số Zalo liên hệ.' });
                }
              }} className="w-full bg-[#0068FF] hover:bg-[#0068FF]/90 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-md">
                <img src="https://img.icons8.com/color/48/zalo.png" alt="Zalo" className="w-5 h-5 bg-white rounded-full p-0.5" />
                Liên hệ Zalo Người hướng dẫn
              </button>
            </div>
          </div>

          {/* Right: Live Class Schedules */}
          <div className="flex-1 flex flex-col bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/20">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-tertiary/20 flex items-center justify-center text-tertiary">
                <span className="material-symbols-outlined">video_camera_front</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-on-surface">Đăng ký Ca học (Live Class)</h3>
                <p className="text-sm text-on-surface-variant">Học trực tuyến qua Google Meet</p>
              </div>
            </div>

            {course.schedules && course.schedules.length > 0 ? (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {course.schedules.map((schedule) => {
                    const enrollment = enrollments.find(e => e.courseId === course.id);
                    const isRegistered = enrollment?.registeredSchedules?.some((s: any) => typeof s === 'string' ? s === schedule.id : s?.id === schedule.id) || enrollment?.registeredScheduleId === schedule.id;
                    const isSelected = (selectedSchedulesMap[course.id] || []).includes(schedule.id);

                    return (
                      <div key={schedule.id} className={`p-4 rounded-2xl border transition-all cursor-pointer ${isSelected ? 'bg-primary/5 border-primary/50' : 'bg-surface-variant/30 border-outline-variant/30 hover:border-tertiary/40'}`} onClick={() => handleToggleSchedule(course.id, schedule.id)}>
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected ? 'bg-primary border-primary text-on-primary' : 'border-outline-variant/50 bg-surface'}`}>
                              {isSelected && <span className="material-symbols-outlined text-[14px]">check</span>}
                            </div>
                            <h4 className="font-bold text-on-surface text-sm">{schedule.name}</h4>
                          </div>
                          {isRegistered && (
                            <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 text-[9px] font-bold rounded flex items-center gap-1">
                              <span className="material-symbols-outlined text-[10px]">check_circle</span>
                            </span>
                          )}
                        </div>
                        
                        <div className="space-y-1 mb-3 pl-7">
                          <div className="flex items-center gap-2 text-[13px] text-on-surface-variant">
                            <span className="material-symbols-outlined text-[14px]">calendar_month</span>
                            <span className="font-medium">{schedule.days || 'Chưa cập nhật ngày'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[13px] text-on-surface-variant">
                            <span className="material-symbols-outlined text-[14px]">schedule</span>
                            <span className="font-medium">Thời gian (Từ - Đến): {schedule.time}</span>
                          </div>
                        </div>

                        {isRegistered && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleOpenMeet(schedule.meetLink); }}
                            className="ml-7 w-[calc(100%-28px)] py-1.5 rounded-lg bg-blue-600/90 hover:bg-blue-500 text-white font-medium transition-all flex items-center justify-center gap-1 shadow-md text-[13px]"
                          >
                            <img src="https://img.icons8.com/color/48/google-meet--v1.png" alt="Google Meet" className="w-4 h-4" />
                            Tham gia Meet
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                <button 
                  onClick={() => handleRegister(course.id, selectedSchedulesMap[course.id] || [])}
                  disabled={isRegistering}
                  className="w-full py-3 rounded-xl bg-tertiary hover:bg-tertiary/90 text-surface font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2 shadow-[0_0_15px_rgba(20,184,166,0.2)]"
                >
                  <span className="material-symbols-outlined text-[20px]">save</span>
                  {isRegistering ? 'Đang lưu...' : 'Lưu đăng ký Ca học'}
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-70 p-6">
                <span className="material-symbols-outlined text-4xl mb-2 text-outline">event_busy</span>
                <p className="text-on-surface-variant">Khóa học này hiện chưa có lịch Live Class.</p>
              </div>
            )}
            
            <div className="mt-auto pt-6 flex items-start gap-3 opacity-80">
              <span className="material-symbols-outlined text-tertiary text-[20px] mt-0.5">info</span>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Sau khi bấm <strong>"Đăng ký"</strong>, link phòng học Google Meet sẽ hiện ra ngay lập tức. Sếp/Học viên nhớ lưu lại khung giờ để vào học đúng giờ nhé. Nếu người hướng dẫn thêm link mới, hệ thống sẽ tự động cập nhật tại đây.
              </p>
            </div>
          </div>
        </div>
        );
      })}
        </div>
      )}
    </div>
  );
}
