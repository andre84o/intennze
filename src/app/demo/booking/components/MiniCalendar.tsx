'use client';

import { useState } from 'react';
import { getDaysInMonth, getMonthName, getWeekdayNames, formatDate } from '../lib/utils';

interface MiniCalendarProps {
  onDateSelect: (date: string) => void;
  selectedDates?: string[]; // Multiple dates can be selected/highlighted
  markedDates?: string[]; // Dates to show as marked (e.g., already blocked)
  allowPastDates?: boolean;
}

export default function MiniCalendar({
  onDateSelect,
  selectedDates = [],
  markedDates = [],
  allowPastDates = true
}: MiniCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const days = getDaysInMonth(year, month);
  const weekdays = getWeekdayNames();
  const today = formatDate(new Date());

  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const isCurrentMonth = (date: Date) => date.getMonth() === month;
  const isPastDate = (date: Date) => {
    if (allowPastDates) return false;
    const dateStr = formatDate(date);
    return dateStr < today;
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={previousMonth}
          type="button"
          className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-full transition-colors text-zinc-600 dark:text-zinc-400"
          aria-label="Föregående månad"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
          {getMonthName(month)} {year}
        </h3>

        <button
          onClick={nextMonth}
          type="button"
          className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-full transition-colors text-zinc-600 dark:text-zinc-400"
          aria-label="Nästa månad"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekdays.map(day => (
          <div key={day} className="text-center text-xs font-medium text-zinc-500 dark:text-zinc-500 py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((date, index) => {
          const dateStr = formatDate(date);
          const isSelected = selectedDates.includes(dateStr);
          const isMarked = markedDates.includes(dateStr);
          const isToday = dateStr === today;
          const inCurrentMonth = isCurrentMonth(date);
          const isPast = isPastDate(date);

          return (
            <button
              key={index}
              type="button"
              onClick={() => !isPast && inCurrentMonth && onDateSelect(dateStr)}
              disabled={isPast || !inCurrentMonth}
              className={`
                aspect-square text-sm font-medium rounded-lg transition-all min-h-[40px]
                ${!inCurrentMonth ? 'text-zinc-300 dark:text-zinc-700' : 'text-zinc-700 dark:text-zinc-300'}
                ${isSelected ? 'bg-rose-500 text-white shadow-sm' : ''}
                ${isMarked && !isSelected ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 ring-1 ring-rose-300 dark:ring-rose-700' : ''}
                ${!isSelected && !isMarked && isToday ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-white font-bold' : ''}
                ${!isSelected && !isMarked && !isToday && inCurrentMonth && !isPast ? 'hover:bg-zinc-100 dark:hover:bg-zinc-700' : ''}
                ${isPast && !allowPastDates ? 'opacity-30 cursor-not-allowed' : ''}
                ${inCurrentMonth && !isPast ? 'cursor-pointer' : 'cursor-default'}
              `}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-zinc-500 dark:text-zinc-500">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-rose-100 dark:bg-rose-900/30 ring-1 ring-rose-300 dark:ring-rose-700 rounded"></div>
          <span>Redan blockerad</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
          <span>Idag</span>
        </div>
      </div>
    </div>
  );
}
