'use client';

import { useState, useEffect, useCallback } from 'react';

export interface Schedule {
  id: string;
  name: string;
  days: string;
  time: string;
  meetLink: string;
}

export interface Enrollment {
  courseId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  completedCurriculumIndexes: number[]; // Store indexes of completed curriculum items
  registeredSchedule?: Schedule;
  registeredScheduleId?: string;
  registeredSchedules?: Schedule[];
  history?: any[];
}

export interface Course {
  id: string;
  title: string;
  instructor: string;
  instructorId?: string;
  type: 'single' | 'combo';
  tag: string;
  tagColor: string;
  importPrice?: number;
  originalPrice: number;
  salePrice: number;
  status: 'active' | 'inactive';
  thumbnail: string;
  videoDemo?: string;
  description?: string;
  rating: number;
  students: string;
  lessons: number; // or coursesCount for combos
  coursesCount?: number;
  curriculum: string[];
  schedules?: Schedule[];
}

export function useCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [purchasedCourseIds, setPurchasedCourseIds] = useState<Set<string>>(new Set());
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const fetchCourses = useCallback(async () => {
    try {
      const token = localStorage.getItem('tq_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/courses', { cache: 'no-store', headers });
      if (res.ok) {
        const data = await res.json();
        setCourses(data);
      }
    } catch (err) {
      console.error('Failed to fetch courses:', err);
    }
  }, []);

  const fetchEnrollments = useCallback(async () => {
    const token = localStorage.getItem('tq_token');
    if (!token) {
      setIsLoaded(true);
      return;
    }
    try {
      const res = await fetch('/api/enrollments', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        setEnrollments(data);
        setPurchasedCourseIds(new Set(data.map((e: any) => e.courseId)));
      }
    } catch (err) {
      console.error('Failed to fetch enrollments:', err);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchCourses(), fetchEnrollments()]).then(() => setIsLoaded(true));

    const handleLocalSync = () => {
      fetchCourses();
      fetchEnrollments();
    };
    window.addEventListener('tq_local_sync', handleLocalSync);
    return () => window.removeEventListener('tq_local_sync', handleLocalSync);
  }, [fetchCourses, fetchEnrollments]);

  const addCourse = async (course: Course) => {
    const token = localStorage.getItem('tq_token');
    if (!token) return;
    try {
      const res = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(course)
      });
      if (res.ok) {
        await fetchCourses();
        window.dispatchEvent(new Event('tq_local_sync'));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updateCourse = async (updatedCourse: Course) => {
    const token = localStorage.getItem('tq_token');
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/courses/${updatedCourse.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(updatedCourse)
      });
      if (res.ok) {
        await fetchCourses();
        window.dispatchEvent(new Event('tq_local_sync'));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteCourse = async (id: string) => {
    const token = localStorage.getItem('tq_token');
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/courses/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchCourses();
        window.dispatchEvent(new Event('tq_local_sync'));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const buyCourse = async (id: string, voucherCode?: string, discount?: number) => {
    const token = localStorage.getItem('tq_token');
    if (!token) {
      alert("Bạn cần đăng nhập để mua khóa học");
      return;
    }
    try {
      const res = await fetch(`/api/courses/${id}/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ voucherCode, discount })
      });
      if (res.ok) {
        await fetchEnrollments();
        window.dispatchEvent(new Event('tq_local_sync'));
        return true;
      } else {
        const data = await res.json();
        throw new Error(data.error || "Có lỗi xảy ra");
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message);
      return false;
    }
  };

  const updateEnrollmentProgress = async (courseId: string, userId: string, completedIndexes: number[]) => {
    const token = localStorage.getItem('tq_token');
    if (!token) return;
    try {
      const res = await fetch('/api/enrollments/progress', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ courseId, userId, completedIndexes })
      });
      if (res.ok) {
        await fetchEnrollments();
        window.dispatchEvent(new Event('tq_local_sync'));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const registerSchedule = async (courseId: string, scheduleIds: string[]) => {
    const token = localStorage.getItem('tq_token');
    if (!token) return;
    try {
      const res = await fetch('/api/enrollments/schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ courseId, scheduleIds })
      });
      if (res.ok) {
        await fetchEnrollments();
        window.dispatchEvent(new Event('tq_local_sync'));
        return true;
      }
    } catch (err) {
      console.error(err);
    }
    return false;
  };

  const getEnrollment = (courseId: string, userId: string) => {
    return enrollments.find(e => e.courseId === courseId && e.userId === userId);
  };

  return {
    courses,
    purchasedCourseIds,
    enrollments,
    isLoaded,
    addCourse,
    updateCourse,
    deleteCourse,
    buyCourse,
    updateEnrollmentProgress,
    registerSchedule,
    getEnrollment
  };
}
