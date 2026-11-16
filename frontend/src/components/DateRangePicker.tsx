import React, { useState, useEffect } from 'react';

interface DateRangePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (startDate: Date, endDate: Date) => void;
  initialStart?: Date;
  initialEnd?: Date;
}

export default function DateRangePicker({ isOpen, onClose, onApply, initialStart, initialEnd }: DateRangePickerProps) {
  const [activeTab, setActiveTab] = useState<'from' | 'to'>('from');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [startDate, setStartDate] = useState<Date | null>(initialStart || null);
  const [endDate, setEndDate] = useState<Date | null>(initialEnd || null);

  useEffect(() => {
    if (isOpen) {
      setStartDate(initialStart || null);
      setEndDate(initialEnd || null);
      setCurrentMonth(initialStart || new Date());
      setActiveTab('from');
    }
  }, [isOpen, initialStart, initialEnd]);

  if (!isOpen) return null;

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // Adjust so Monday is 0, Sunday is 6
  };

  const currentYear = currentMonth.getFullYear();
  const currentMonthIdx = currentMonth.getMonth();

  const numDays = daysInMonth(currentYear, currentMonthIdx);
  const firstDay = firstDayOfMonth(currentYear, currentMonthIdx);

  const prevMonth = () => {
    setCurrentMonth(new Date(currentYear, currentMonthIdx - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentYear, currentMonthIdx + 1, 1));
  };

  const handleDateClick = (day: number) => {
    const selectedDate = new Date(currentYear, currentMonthIdx, day);
    
    if (activeTab === 'from') {
      setStartDate(selectedDate);
      if (endDate && selectedDate > endDate) {
        setEndDate(null); // Reset end date if from date is after to date
      }
      setActiveTab('to');
    } else {
      if (startDate && selectedDate < startDate) {
        setStartDate(selectedDate);
      } else {
        setEndDate(selectedDate);
      }
    }
  };

  const handleApply = () => {
    if (startDate && endDate) {
      onApply(startDate, endDate);
    } else if (startDate && !endDate) {
      // If only start date is selected, treat it as a single day range
      onApply(startDate, startDate);
    }
    onClose();
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getDate() === d2.getDate() && 
           d1.getMonth() === d2.getMonth() && 
           d1.getFullYear() === d2.getFullYear();
  };

  const isDateInRange = (day: number) => {
    if (!startDate || !endDate) return false;
    const date = new Date(currentYear, currentMonthIdx, day);
    return date > startDate && date < endDate;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface border border-outline-variant/30 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-slide-up">
        
        {/* Header */}
        <div className="p-4 border-b border-outline-variant/30 flex justify-between items-center">
          <h3 className="font-headline-sm text-on-surface">Chọn thời gian</h3>
          <button className="text-primary text-sm font-semibold">Toàn thời gian</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-4">
          <button 
            onClick={() => setActiveTab('from')}
            className={`flex-1 py-2 px-4 rounded-full text-sm font-bold border transition-all ${activeTab === 'from' ? 'border-primary text-primary bg-primary/10' : 'border-outline-variant/30 text-on-surface-variant'}`}
          >
            Từ ngày
          </button>
          <button 
            onClick={() => setActiveTab('to')}
            className={`flex-1 py-2 px-4 rounded-full text-sm font-bold border transition-all ${activeTab === 'to' ? 'border-primary text-primary bg-primary/10' : 'border-outline-variant/30 text-on-surface-variant'}`}
          >
            Đến ngày
          </button>
        </div>

        {/* Calendar Nav */}
        <div className="flex justify-between items-center px-4 pb-2">
          <button onClick={prevMonth} className="p-1 text-on-surface-variant hover:text-white hover:bg-surface-variant/50 rounded-lg">
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <div className="font-bold text-on-surface flex items-center gap-1">
            {currentMonth.toLocaleString('vi-VN', { month: 'long', year: 'numeric' })}
            <span className="material-symbols-outlined text-sm">expand_more</span>
          </div>
          <button onClick={nextMonth} className="p-1 text-on-surface-variant hover:text-white hover:bg-surface-variant/50 rounded-lg">
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="p-4 pt-0">
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => (
              <div key={d} className="text-xs font-semibold text-on-surface-variant py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-2 gap-x-1 text-center">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="p-2"></div>
            ))}
            {Array.from({ length: numDays }).map((_, i) => {
              const day = i + 1;
              const date = new Date(currentYear, currentMonthIdx, day);
              const isStart = startDate ? isSameDay(date, startDate) : false;
              const isEnd = endDate ? isSameDay(date, endDate) : false;
              const inRange = isDateInRange(day);
              
              let bgClass = "hover:bg-surface-variant/50 text-on-surface";
              if (isStart || isEnd) bgClass = "bg-primary text-on-primary font-bold";
              else if (inRange) bgClass = "bg-primary/20 text-on-surface";

              return (
                <button 
                  key={day} 
                  onClick={() => handleDateClick(day)}
                  className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center text-sm transition-colors ${bgClass}`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-outline-variant/30 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3 px-4 border border-outline-variant/30 text-primary font-bold rounded-xl hover:bg-surface-variant/30 transition-colors"
          >
            Quay lại
          </button>
          <button 
            onClick={handleApply}
            disabled={!startDate}
            className="flex-1 py-3 px-4 bg-primary text-on-primary font-bold rounded-xl disabled:opacity-50 hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
          >
            Áp dụng
          </button>
        </div>

      </div>
    </div>
  );
}
